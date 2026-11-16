import React, { useState, useEffect } from 'react';
import {
  Table,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Key,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { getStoredApiKey, setStoredApiKey } from '../../services/freeConvertApi';
import { convertHighFidelity, getEngineCapabilities } from '../../services/highFidelityConverter';
import { saveToVault } from '../../services/storageVault';

interface XlsxToPdfToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
  onSwitchToCloudConverter?: () => void;
}

export const XlsxToPdfTool: React.FC<XlsxToPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [hasSilentEngine, setHasSilentEngine] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [outputName, setOutputName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    const saved = getStoredApiKey();
    if (saved) {
      setApiKey(saved);
      setIsKeySaved(true);
    }

    getEngineCapabilities().then((caps) => {
      const autoReady = caps.officeToPdf || caps.hasServerFreeConvertKey;
      setHasSilentEngine(autoReady);
      if (!autoReady && !saved) {
        setShowKeyInput(true);
      }
    });
  }, []);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey);
    setIsKeySaved(!!apiKey.trim());
    if (apiKey.trim()) {
      setShowKeyInput(false);
      setErrorMsg(null);
    }
  };

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
        toolId: 'xlsx-to-pdf',
        name: result.outputFilename,
        originalSize: fileItem.file.size,
        resultSize: result.resultBlob.size,
        data: result.resultBlob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      if (err.message === 'NEED_API_KEY') {
        setShowKeyInput(true);
        setErrorMsg('Inserisci la tua API Key di FreeConvert qui sopra per avviare la conversione 1:1.');
      } else {
        setErrorMsg(err.message || 'Errore durante la conversione Excel in PDF.');
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
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-teal-600 dark:text-teal-400 shadow-2xs">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Excel (.xlsx, .xls, .csv) in PDF
              </h2>
              <span className="font-mono text-[10px] text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-900/60">
                Alta Fedeltà 1:1
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mantiene colori, grafici, bordi e formattazione esatta delle celle senza tagli.
            </p>
          </div>
        </div>
      </div>

      {(!hasSilentEngine || showKeyInput) && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Motore Alta Fedeltà (FreeConvert)
              </span>
              {isKeySaved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" /> Attivo
                </span>
              )}
            </div>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {showKeyInput ? 'Nascondi' : 'Configura chiave API'}
            </button>
          </div>

          {showKeyInput && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inserisci una volta la tua API Key gratuita di FreeConvert (750 conversioni/mese).
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Incolla qui la tua API Key di FreeConvert..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  Salva
                </button>
              </div>
              <a
                href="https://www.freeconvert.com/api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
              >
                <span>Ottieni gratis la tua API Key su FreeConvert</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

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
              Formattazione, colori e impaginazione mantenuti al 100%.
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
              Converti altro file Excel
            </button>
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".xlsx,.xls,.csv,.numbers,.ods"
            multiple={false}
            title="Trascina qui il file Excel (.xlsx, .xls, .csv) o Numbers da convertire in PDF"
            subtitle="Stampa vettoriale fedele 1:1 senza tagli."
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
