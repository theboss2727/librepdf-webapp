import React, { useState } from 'react';
import { FileCode, Download, CheckCircle2, Loader2, ArrowRight, Code2, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertDocxToPdf } from '../../services/officeConverters';
import { saveToVault } from '../../services/storageVault';

interface DocxToPdfToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
}

export const DocxToPdfTool: React.FC<DocxToPdfToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [outputName, setOutputName] = useState('');

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;
    setIsProcessing(true);
    setProgress(10);
    setStatusMsg('Caricamento file Word...');

    try {
      const buffer = await fileItem.file.arrayBuffer();
      const pdfBytes = await convertDocxToPdf(buffer, (pct, msg) => {
        setProgress(pct);
        setStatusMsg(msg);
      });

      const baseName = fileItem.file.name.replace(/\.(docx|doc)$/i, '');
      const pdfName = `${baseName}.pdf`;
      setOutputName(pdfName);

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      await saveToVault({
        toolId: 'docx-to-pdf',
        name: pdfName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore conversione Word in PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setFiles([]);
    setProgress(0);
    setStatusMsg('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 border border-indigo-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Word (.docx) in Documento PDF
              </h2>
              <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/60">
                Mammoth + Vector Canvas
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trascodifica i file Word in documenti PDF impaginati professionalmente con tabelle, elenchi e intestazioni.
            </p>
          </div>
        </div>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              PDF Generato dal File Word con Successo!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Impaginazione A4 conforme con numerazione pagine e resa tipografica vettoriale.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={outputName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs transition hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica {outputName} ({resultBytes ? (resultBytes / 1024).toFixed(1) : 0} KB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              Converti un altro documento
            </button>
          </div>

          {onOpenPythonStudio && (
            <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <button
                onClick={onOpenPythonStudio}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Visualizza snippet Python / PyMuPDF per questo modulo</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={false}
            title="Trascina qui il file Word (.docx) da convertire in PDF"
            subtitle="Elaborazione immediata nel browser senza caricare file su server esterni."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Conversione sicura eseguita in memoria locale senza perdita di riservatezza</span>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>{statusMsg || 'Trascodifica in corso...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleConvert}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Composizione PDF...</span>
                    </>
                  ) : (
                    <>
                      <span>Converti in PDF</span>
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
