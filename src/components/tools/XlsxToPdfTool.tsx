import React, { useState } from 'react';
import { Table, Download, CheckCircle2, Loader2, ArrowRight, Code2, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertXlsxToPdf } from '../../services/officeConverters';
import { saveToVault } from '../../services/storageVault';

interface XlsxToPdfToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
}

export const XlsxToPdfTool: React.FC<XlsxToPdfToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
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
    setStatusMsg('Lettura fogli di calcolo...');

    try {
      const buffer = await fileItem.file.arrayBuffer();
      const pdfBytes = await convertXlsxToPdf(
        buffer,
        { orientation },
        (pct, msg) => {
          setProgress(pct);
          setStatusMsg(msg);
        }
      );

      const baseName = fileItem.file.name.replace(/\.(xlsx|xls|csv)$/i, '');
      const pdfName = `${baseName}.pdf`;
      setOutputName(pdfName);

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      await saveToVault({
        toolId: 'xlsx-to-pdf',
        name: pdfName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore conversione Excel in PDF: ${err.message}`);
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
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-teal-600 dark:text-teal-400 shadow-2xs">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Excel (.xlsx, .xls, .csv) in PDF
              </h2>
              <span className="font-mono text-[10px] text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-900/60">
                Auto-fit Vector Grid
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trasforma tabelle e fogli Excel in documenti PDF eleganti con intestazioni a contrasto, righe alternate e impaginazione automatica.
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
              PDF da Foglio Excel Generato con Successo!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Impaginazione orizzontale ottimizzata con divisione automatica delle pagine per elenchi lunghi.
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
              Converti un altro file Excel
            </button>
          </div>

          {onOpenPythonStudio && (
            <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <button
                onClick={onOpenPythonStudio}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Visualizza codice Python / PyMuPDF per questo modulo</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple={false}
            title="Trascina qui il file Excel (.xlsx, .xls o .csv) da convertire in PDF"
            subtitle="I dati vengono analizzati localmente ed esportati in griglia PDF A4."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Orientamento di Stampa PDF:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      orientation === 'landscape'
                        ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Orizzontale (Landscape)</span>
                      <span className="font-mono text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 px-1.5 py-0.2 rounded">Consigliato</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Massima larghezza per ospitare molte colonne senza sovrapposizioni.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      orientation === 'portrait'
                        ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Verticale (Portrait)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Ideale per tabelle strette con poche colonne e molte righe.</p>
                  </button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>{statusMsg || 'Composizione tabella PDF...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-300"
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
                      <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                      <span>Generazione PDF in corso...</span>
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
