import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Key,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { getStoredApiKey } from '../../services/freeConvertApi';
import { convertHighFidelity } from '../../services/highFidelityConverter';
import { saveToVault } from '../../services/storageVault';
import { ConversionEngineBanner } from '../ConversionEngineBanner';

interface DocxToPdfToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
  onSwitchToCloudConverter?: () => void;
}

export const DocxToPdfTool: React.FC<DocxToPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [apiKey, setApiKey] = useState(getStoredApiKey());

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [outputName, setOutputName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;
    setErrorMsg(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      const result = await convertHighFidelity(fileItem.file, 'pdf', apiKey, (pct, msg) => {
        setProgress(pct);
        setStatusMsg(msg);
      });

      setOutputName(result.outputFilename);
      setDownloadUrl(result.downloadUrl);
      setResultBytes(result.resultBlob.size);

      await saveToVault({
        toolId: 'docx-to-pdf',
        name: result.outputFilename,
        originalSize: fileItem.file.size,
        resultSize: result.resultBlob.size,
        data: result.resultBlob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      if (err.message === 'NEED_API_KEY') {
        setErrorMsg('È richiesta una API Key di FreeConvert oppure l\'attivazione del motore locale per avviare la conversione.');
      } else {
        setErrorMsg(err.message || 'Errore durante la conversione in PDF.');
      }
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
    setErrorMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 border border-indigo-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Word (.docx, .doc) & Pages in PDF
              </h2>
              <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/60">
                Alta Fedeltà 1:1
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Impaginazione, font, tabelle e immagini identici al documento originale Microsoft Word o Apple Pages.
            </p>
          </div>
        </div>
      </div>

      {/* Engine Selection & Diagnostic Banner */}
      <ConversionEngineBanner
        sourceFormat="docx"
        targetFormat="pdf"
        onApiKeyChange={setApiKey}
        currentApiKey={apiKey}
      />

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Documento PDF Generato con Successo!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              File PDF vettoriale ad alta fedeltà pronto per la consultazione e la stampa.
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
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".docx,.doc,.pages,.odt,.rtf"
            multiple={false}
            title="Trascina qui il documento Word (.docx, .doc) o Apple Pages (.pages)"
            subtitle="Conversione 1:1 con layout e font fedeli all'originale."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  File selezionato: <strong>{fileItem.file.name}</strong>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {(fileItem.file.size / 1024).toFixed(1)} KB
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>{statusMsg || 'Conversione in corso...'}</span>
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
                      <span>Conversione in corso...</span>
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
