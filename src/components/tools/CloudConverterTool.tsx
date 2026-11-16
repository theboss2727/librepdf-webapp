import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Key,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import {
  getSuggestedOutputFormats,
  getStoredApiKey,
  setStoredApiKey,
  convertFileWithFreeConvert,
  type FormatOption,
} from '../../services/freeConvertApi';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';

interface CloudConverterToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
}

export const CloudConverterTool: React.FC<CloudConverterToolProps> = ({
  onSuccess,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [customFormat, setCustomFormat] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [outputName, setOutputName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'cloud-converter',
    onSuccess,
  });

  const fileItem = files[0];

  // Load stored API key on mount
  useEffect(() => {
    const saved = getStoredApiKey();
    if (saved) {
      setApiKey(saved);
      setIsKeySaved(true);
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  // Compute format suggestions whenever file changes
  const suggestion = useMemo(() => {
    if (!fileItem) return null;
    return getSuggestedOutputFormats(fileItem.file.name);
  }, [fileItem]);

  // Set default format when a new file is loaded
  useEffect(() => {
    if (suggestion) {
      setSelectedFormat(suggestion.defaultFormat);
      setIsCustomMode(false);
      setCustomFormat('');
      setErrorMsg(null);
    }
  }, [suggestion]);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey);
    setIsKeySaved(!!apiKey.trim());
    if (apiKey.trim()) {
      setIsSettingsOpen(false);
    }
  };

  const handleConvert = async () => {
    if (!fileItem) return;
    if (!apiKey.trim()) {
      setIsSettingsOpen(true);
      setErrorMsg('Inserisci la tua API Key di FreeConvert per avviare la conversione.');
      return;
    }

    const finalFormat = isCustomMode ? customFormat.trim().toLowerCase() : selectedFormat;
    if (!finalFormat) {
      setErrorMsg('Seleziona o specifica un formato di output valido.');
      return;
    }

    setErrorMsg(null);
    setProgress(5);
    setStatusMsg('Avvio procedura di conversione cloud...');

    await run(
      async () => {
        const result = await convertFileWithFreeConvert(
          fileItem.file,
          finalFormat,
          apiKey,
          (pct, msg) => {
            setProgress(pct);
            setStatusMsg(msg);
          }
        );

        setDownloadUrl(result.downloadUrl);
        setResultBlob(result.resultBlob);
        setResultBytes(result.resultBlob.size);
        setOutputName(result.outputFilename);

        await persist({
          name: result.outputFilename,
          originalSize: fileItem.file.size,
          resultSize: result.resultBlob.size,
          data: result.resultBlob,
        });

        confetti({ particleCount: 50, spread: 60 });
      },
      { successMessage: 'Conversione cloud completata con successo', errorPrefix: 'Errore conversione cloud' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setResultBytes(null);
    setFiles([]);
    setProgress(0);
    setStatusMsg('');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 shadow-2xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Cloud Converter Universale
                </h2>
                <span className="font-mono text-[10px] text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-900/60">
                  FreeConvert REST API
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Converti qualsiasi formato in cloud (Apple Pages, Word, Numbers, HEIC, PDF, Audio, Video).
              </p>
            </div>
          </div>

          {/* Quick API Key Status Button */}
          <button
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-2xs ${
              isKeySaved
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isKeySaved ? 'API Key Attiva' : 'Configura API Key'}</span>
            <Sliders className="w-3 h-3 ml-0.5 opacity-60" />
          </button>
        </div>
      </div>

      {/* API Key Configuration Card (Collapsible) */}
      {isSettingsOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-500" />
                <span>Chiave API Personale FreeConvert.com</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                La chiave viene salvata nel tuo browser (localStorage) e non viene mai condivisa con terzi.
              </p>
            </div>

            <a
              href="https://www.freeconvert.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline shrink-0"
            >
              <span>Ottieni chiave gratuita (20 min/giorno)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Incolla qui la tua API Key di FreeConvert (es. fc_api_...)"
                className="w-full px-3.5 py-2 pr-10 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={handleSaveApiKey}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Salva Chiave</span>
            </button>
          </div>
        </div>
      )}

      {/* ERROR NOTICE */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* RESULT VIEW */}
      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Conversione Cloud Completata con Successo!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              File elaborato e convertito in formato <strong>{outputName}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {outputName.toLowerCase().endsWith('.pdf') && (
              <PdfPreviewButton data={resultBlob} fileName={outputName} />
            )}

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
              Converti un altro file
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* File Dropzone: accepts ANY file format */}
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept="*/*"
            multiple={false}
            title="Trascina qui il file da convertire (.pages, Word, Excel, HEIC, PDF, Audio, ecc.)"
            subtitle="Accetta qualsiasi formato di documento, immagine o media. I formati di output verranno suggeriti al volo."
          />

          {fileItem && suggestion && (
            <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
              {/* Detected Input Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs uppercase">
                    {suggestion.inputExt || 'FILE'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {fileItem.file.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {(fileItem.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {suggestion.categoryName} — {suggestion.description}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                  <Sparkles className="w-3 h-3" />
                  <span>Formati compatibili rilevati</span>
                </span>
              </div>

              {/* FORMAT SELECTION MATRIX */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                  Scegli il formato di output desiderato:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {suggestion.formats.map((opt: FormatOption) => {
                    const isSelected = !isCustomMode && selectedFormat === opt.format;

                    return (
                      <button
                        key={opt.format}
                        type="button"
                        onClick={() => {
                          setSelectedFormat(opt.format);
                          setIsCustomMode(false);
                        }}
                        className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/40 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100">
                            {opt.format}
                          </span>
                          {opt.isRecommended && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              ★ Consigliato
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                          {opt.description || opt.label}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Format Option */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode((prev) => !prev)}
                    className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isCustomMode ? '− Nascondi formato personalizzato' : '+ Oppure specifica un altro formato (es. djvu, tiff, flac)'}</span>
                  </button>

                  {isCustomMode && (
                    <div className="mt-2 flex items-center gap-2 max-w-xs">
                      <input
                        type="text"
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                        placeholder="es. mobi, tiff, wav..."
                        className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <span className="text-xs text-slate-400">formato</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>{statusMsg || 'Conversione in corso...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

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
                      <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                      <span>Conversione in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Converti in {(isCustomMode ? customFormat : selectedFormat).toUpperCase() || 'OUTPUT'}</span>
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
