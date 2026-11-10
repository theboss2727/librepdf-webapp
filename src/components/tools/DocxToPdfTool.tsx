import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Code2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Info,
  Cloud,
  Cpu,
  Zap,
  Key,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertDocxToPdf, convertPagesToPdf } from '../../services/officeConverters';
import {
  getStoredApiKey,
  setStoredApiKey,
  convertFileWithFreeConvert,
} from '../../services/freeConvertApi';
import { saveToVault } from '../../services/storageVault';

interface DocxToPdfToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
  onSwitchToCloudConverter?: () => void;
}

type ConversionEngine = 'cloud' | 'desktop-python' | 'browser-fast';

export const DocxToPdfTool: React.FC<DocxToPdfToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
  onSwitchToCloudConverter,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [engine, setEngine] = useState<ConversionEngine>('cloud');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

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
    } else {
      setShowKeyInput(true);
    }
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
    const fileName = fileItem.file.name.toLowerCase();
    const isPages = fileName.endsWith('.pages');
    const isLegacyDoc = fileName.endsWith('.doc') && !fileName.endsWith('.docx');

    setErrorMsg(null);
    setIsProcessing(true);
    setProgress(10);

    const baseName = fileItem.file.name.replace(/\.(docx|doc|pages)$/i, '');
    const pdfName = `${baseName}.pdf`;

    try {
      if (engine === 'cloud' || isLegacyDoc) {
        // High fidelity conversion via FreeConvert API (also handles .doc legacy and .pages natively)
        const keyToUse = apiKey.trim() || getStoredApiKey();
        if (!keyToUse) {
          setShowKeyInput(true);
          throw new Error('Inserisci la tua API Key di FreeConvert per la conversione ad alta fedeltà.');
        }

        setStatusMsg('Invio al motore Cloud FreeConvert...');
        const result = await convertFileWithFreeConvert(
          fileItem.file,
          'pdf',
          keyToUse,
          (pct, msg) => {
            setProgress(pct);
            setStatusMsg(msg);
          }
        );

        setOutputName(result.outputFilename || pdfName);
        setDownloadUrl(result.downloadUrl);
        setResultBytes(result.resultBlob.size);

        await saveToVault({
          toolId: 'docx-to-pdf',
          name: result.outputFilename || pdfName,
          originalSize: fileItem.file.size,
          resultSize: result.resultBlob.size,
          data: result.resultBlob,
        });
      } else {
        // In-browser conversion
        setStatusMsg(isPages ? 'Analisi pacchetto Apple Pages...' : 'Elaborazione nel browser...');
        const buffer = await fileItem.file.arrayBuffer();
        const pdfBytes = isPages
          ? await convertPagesToPdf(buffer, (pct, msg) => {
              setProgress(pct);
              setStatusMsg(msg);
            })
          : await convertDocxToPdf(buffer, (pct, msg) => {
              setProgress(pct);
              setStatusMsg(msg);
            });

        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputName(pdfName);
        setDownloadUrl(url);
        setResultBytes(blob.size);

        await saveToVault({
          toolId: 'docx-to-pdf',
          name: pdfName,
          originalSize: fileItem.file.size,
          resultSize: blob.size,
          data: blob,
        });
      }

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la conversione in PDF.');
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
                Word (.docx, .doc) & Pages (.pages) in PDF
              </h2>
              <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/60">
                Multi-Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scegli il motore di conversione: Cloud FreeConvert (100% identico a Word), Desktop nativo o Browser.
            </p>
          </div>
        </div>
      </div>

      {/* Engine Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Scegli come convertire:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Engine 1: Cloud FreeConvert (Recommended) */}
          <div
            onClick={() => setEngine('cloud')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
              engine === 'cloud'
                ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-400 dark:border-sky-600 ring-2 ring-sky-400/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3" />
                CONSIGLIATO
              </span>
              <span className="text-[10px] text-slate-400 font-mono">100% Fedele</span>
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              FreeConvert Cloud API
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Fedeltà perfetta: layout, font, tabelle, immagini, .docx, .doc legacy e .pages.
            </p>
          </div>

          {/* Engine 2: Desktop Python */}
          <div
            onClick={() => setEngine('desktop-python')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
              engine === 'desktop-python'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                <Cpu className="w-3 h-3" />
                ZERO CLOUD
              </span>
              <span className="text-[10px] text-indigo-500 font-mono">Locale</span>
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Desktop Nativo (Word/LibreOffice)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Usa il motore Microsoft Word sul tuo computer con lo script batch a 1 clic.
            </p>
          </div>

          {/* Engine 3: Fast Browser */}
          <div
            onClick={() => setEngine('browser-fast')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
              engine === 'browser-fast'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" />
                BASE
              </span>
              <span className="text-[10px] text-amber-500 font-mono">Browser</span>
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Browser Veloce (Mammoth)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Estrae testi e tabelle semplici nel browser. Non supporta i font proprietari Windows.
            </p>
          </div>
        </div>
      </div>

      {/* FreeConvert API Key Box */}
      {engine === 'cloud' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                FreeConvert API Key personale
              </span>
              {isKeySaved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" /> Attiva (750 crediti/mese)
                </span>
              )}
            </div>

            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {showKeyInput ? 'Nascondi configurazione' : 'Modifica chiave API'}
            </button>
          </div>

          {showKeyInput && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                FreeConvert offre <strong>750 conversioni gratuite al mese per sempre</strong> con layout 1:1 identico a Word. La chiave viene salvata solo nel tuo browser in modo sicuro.
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
                  Salva Chiave
                </button>
              </div>
              <a
                href="https://www.freeconvert.com/api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline pt-1"
              >
                <span>Non hai una chiave? Ottieni 750 crediti gratis su FreeConvert</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Desktop Python Box */}
      {engine === 'desktop-python' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span>Conversione Nativa Word sul tuo PC (docx2pdf)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sfrutta Microsoft Word o LibreOffice installato sul tuo sistema. Zero limiti di pagine, batch su intere cartelle.
              </p>
            </div>
            {onOpenPythonStudio && (
              <button
                onClick={onOpenPythonStudio}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Apri Studio Python</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-slate-500">Comando rapido da terminale:</span>
            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto space-y-1">
              <p className="text-slate-400"># Installa ed esegui la conversione nativa:</p>
              <p className="text-emerald-400">pip install docx2pdf</p>
              <p className="text-sky-300">docx2pdf input.docx output.pdf</p>
            </div>
          </div>
        </div>
      )}

      {/* Result Card */}
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
            accept=".docx,.doc,.pages"
            multiple={false}
            title="Trascina qui il documento Word (.docx, .doc) o Apple Pages (.pages)"
            subtitle={
              engine === 'cloud'
                ? 'Elaborazione ad alta fedeltà con layout 100% identico a Microsoft Word.'
                : engine === 'desktop-python'
                ? 'Conversione locale nativa tramite motore di sistema Word / LibreOffice.'
                : 'Conversione rapida in-browser per testi e tabelle standard.'
            }
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
                      <span>
                        Converti in PDF con {engine === 'cloud' ? 'FreeConvert (100% Fedele)' : engine === 'desktop-python' ? 'Desktop Nativo' : 'Browser'}
                      </span>
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
