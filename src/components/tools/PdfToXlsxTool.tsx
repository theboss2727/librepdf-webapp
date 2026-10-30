import React, { useState } from 'react';
import { Table, Download, CheckCircle2, Loader2, ArrowRight, Code2, Eye, FileSpreadsheet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertPdfToXlsx } from '../../services/officeConverters';
import { saveToVault } from '../../services/storageVault';

interface PdfToXlsxToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
}

export const PdfToXlsxTool: React.FC<PdfToXlsxToolProps> = ({
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
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [totalSheets, setTotalSheets] = useState(1);

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusMsg('Analisi tabellare PDF...');

    try {
      const buffer = await fileItem.file.arrayBuffer();
      const { workbookBytes, previewRows: pRows, totalSheets: tSheets } = await convertPdfToXlsx(
        buffer,
        (pct, msg) => {
          setProgress(pct);
          setStatusMsg(msg);
        }
      );

      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const xlsxName = `${baseName}.xlsx`;
      setOutputName(xlsxName);
      setPreviewRows(pRows);
      setTotalSheets(tSheets);

      const blob = new Blob([workbookBytes as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      await saveToVault({
        toolId: 'pdf-to-xlsx',
        name: xlsxName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore conversione PDF in Excel (.xlsx): ${err.message}`);
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
    setPreviewRows([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800 border border-emerald-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                PDF in Fogli Microsoft Excel (.xlsx)
              </h2>
              <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                Matrix Cluster Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estrae tabelle, rendiconti, fatture e colonne strutturate in fogli di calcolo Excel nativi (.xlsx).
            </p>
          </div>
        </div>
      </div>

      {downloadUrl ? (
        <div className="space-y-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Cartella Excel (.xlsx) Generata con Successo!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {totalSheets} fogli generati con coordinate vettoriali allineate.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
                Altro PDF
              </button>
            </div>
          </div>

          {/* Table Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Anteprima dati estratti (prime {previewRows.length} righe):</span>
              </div>
              <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? 'bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700' : 'border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'}
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 px-3 border-r border-slate-200/60 dark:border-slate-800 font-mono text-[11px] truncate max-w-xs">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {onOpenPythonStudio && (
            <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <button
                onClick={onOpenPythonStudio}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Visualizza codice Python / PyMuPDF per l'estrazione tabelle</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Trascina qui il file PDF da convertire in Excel (.xlsx)"
            subtitle="Ideale per estratti conto, tabelle di bilancio, listini e dati tabellari."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Clustering automatico colonne tramite coordinate vettoriali
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {fileItem.pageCount ? `${fileItem.pageCount} pagine` : 'PDF'}
                </span>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>{statusMsg || 'Conversione tabellare in corso...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
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
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Generazione foglio .xlsx...</span>
                    </>
                  ) : (
                    <>
                      <span>Converti in Microsoft Excel (.xlsx)</span>
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
