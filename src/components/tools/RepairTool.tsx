import React, { useState } from 'react';
import { Wrench, Download, CheckCircle2, Loader2, Code2, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { repairPdf, inspectPdfDetails } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

interface RepairToolProps {
  onSuccess: () => void;
  onOpenPythonStudio: () => void;
}

export const RepairTool: React.FC<RepairToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [inspectedInfo, setInspectedInfo] = useState<any | null>(null);

  const fileItem = files[0];

  const handleRepair = async () => {
    if (!fileItem) return;
    setIsProcessing(true);

    try {
      const bytes = await repairPdf(fileItem.file);
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      // Also inspect repaired doc
      try {
        const info = await inspectPdfDetails(fileItem.file);
        setInspectedInfo(info);
      } catch {
        // Ignored if corrupt
      }

      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_riparato.pdf`;

      await saveToVault({
        toolId: 'repair',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore riparazione PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setInspectedInfo(null);
    setFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Riparazione Strutturale & XRef
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                Cross-Reference Rebuild
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ricostruisce la tabella degli indici interni del PDF, sanifica i nodi della gerarchia delle pagine e ricompila gli stream.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPythonStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-zinc-400 transition cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Equivalente PyMuPDF garbage=4</span>
        </button>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Documento Riparato & Rigenerato
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              La tabella degli indici è stata ricostruita e il file è stato salvato nel tuo archivio locale.
            </p>
          </div>

          {inspectedInfo && (
            <div className="max-w-md mx-auto text-left p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1 font-mono">
              <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Diagnostica Strutturale:</div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Pagine integre:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{inspectedInfo.pageCount}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Geometria base:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {inspectedInfo.pageWidthMm} × {inspectedInfo.pageHeightMm} mm ({inspectedInfo.pageWidthPt} × {inspectedInfo.pageHeightPt} pt)
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Produttore PDF:</span>
                <span className="truncate max-w-[200px] text-zinc-900 dark:text-zinc-100">{inspectedInfo.producer || 'Standard'}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_riparato.pdf`
                  : 'documento_riparato.pdf'
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica PDF Riparato ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Ripara un altro PDF
            </button>
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Trascina qui il file PDF corrotto o danneggiato"
            subtitle="Il motore scansiona la tabella XRef byte per byte e risincronizza gli offset degli oggetti."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Cosa include la riparazione strutturale:</span>
                </div>
                <ul className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 list-disc list-inside space-y-0.5">
                  <li>Ricostruzione e risincronizzazione della tabella XRef (Cross-Reference)</li>
                  <li>Sanificazione dei puntatori di dizionario orfani o non validi</li>
                  <li>Compattazione e ri-serializzazione standard compatibile con tutti i visualizzatori</li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleRepair}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Ricostruzione XRef in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Avvia Ricostruzione & Riparazione</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
