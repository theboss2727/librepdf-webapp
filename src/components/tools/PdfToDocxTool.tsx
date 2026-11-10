import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Code2,
  Sparkles,
  Cloud,
  Cpu,
  Zap,
  Key,
  ExternalLink,
  AlertTriangle,
  Info,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertPdfToDocx } from '../../services/officeConverters';
import {
  getStoredApiKey,
  setStoredApiKey,
  convertFileWithFreeConvert,
} from '../../services/freeConvertApi';
import { saveToVault } from '../../services/storageVault';

interface PdfToDocxToolProps {
  onSuccess: () => void;
  onOpenPythonStudio?: () => void;
  onSwitchToCloudConverter?: () => void;
}

type ConversionEngine = 'cloud' | 'desktop-python' | 'browser-fast';

export const PdfToDocxTool: React.FC<PdfToDocxToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
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
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
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
    setErrorMsg(null);
    setIsProcessing(true);
    setProgress(5);

    const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
    const docxName = `${baseName}.docx`;

    try {
      if (engine === 'cloud') {
        // High fidelity conversion via FreeConvert API
        const keyToUse = apiKey.trim() || getStoredApiKey();
        if (!keyToUse) {
          setShowKeyInput(true);
          throw new Error('Inserisci la tua API Key di FreeConvert per la conversione ad alta fedeltà.');
        }

        setStatusMsg('Invio al motore Cloud FreeConvert...');
        const result = await convertFileWithFreeConvert(
          fileItem.file,
          'docx',
          keyToUse,
          (pct, msg) => {
            setProgress(pct);
            setStatusMsg(msg);
          }
        );

        setOutputName(result.outputFilename || docxName);
        setDownloadUrl(result.downloadUrl);
        setResultBlob(result.resultBlob);

        await saveToVault({
          toolId: 'pdf-to-docx',
          name: result.outputFilename || docxName,
          originalSize: fileItem.file.size,
          resultSize: result.resultBlob.size,
          data: result.resultBlob,
        });
      } else {
        // In-browser basic text extractor fallback
        setStatusMsg('Estrazione testo nel browser (bozza semplice)...');
        const buffer = await fileItem.file.arrayBuffer();
        const blob = await convertPdfToDocx(buffer, {}, (pct, msg) => {
          setProgress(pct);
          setStatusMsg(msg);
        });

        setOutputName(docxName);
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setResultBlob(blob);

        await saveToVault({
          toolId: 'pdf-to-docx',
          name: docxName,
          originalSize: fileItem.file.size,
          resultSize: blob.size,
          data: blob,
        });
      }

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la conversione in Word.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setFiles([]);
    setProgress(0);
    setStatusMsg('');
    setErrorMsg(null);
  };

  // Python local script for 100% desktop local conversion using pdf2docx
  const pythonScript = `# Script Python Locale: Conversione PDF in Word (.docx) con pdf2docx
# Zero cloud, 100% fedeltà tipografica, gratuito e illimitato
# Esegui nel terminale: pip install pdf2docx
from pdf2docx import Converter
import os

pdf_file = "${fileItem ? fileItem.file.name : 'documento.pdf'}"
docx_file = "${fileItem ? fileItem.file.name.replace(/\.pdf$/i, '.docx') : 'documento.docx'}"

print(f"Conversione in corso: {pdf_file} -> {docx_file}")
cv = Converter(pdf_file)
cv.convert(docx_file, start=0, end=None)
cv.close()
print("Conversione completata con successo al 100%!")
`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                PDF in Microsoft Word (.docx)
              </h2>
              <span className="font-mono text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                Multi-Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scegli il motore di conversione in base alla fedeltà richiesta (Cloud perfetta o desktop locale).
            </p>
          </div>
        </div>
      </div>

      {/* Engine Selection: Crystal Clear Choice */}
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
              Fedeltà perfetta: colonne, tabelle, immagini, formattazione Word identica all'originale.
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
              Desktop Python (pdf2docx)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Alta fedeltà sul tuo computer. Zero file inviati su internet, illimitato e gratuito.
            </p>
          </div>

          {/* Engine 3: Fast Browser Text */}
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
              <span className="text-[10px] text-amber-500 font-mono">Solo Testo</span>
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Bozza Veloce nel Browser
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Estrae solo testo grezzo. Non mantiene il layout grafico né le colonne complesse.
            </p>
          </div>
        </div>
      </div>

      {/* FreeConvert API Key Box when Cloud Engine is selected */}
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
                FreeConvert offre <strong>750 conversioni gratuite al mese per sempre</strong> con layout 1:1 perfetto. La chiave viene salvata solo nel tuo browser in modo sicuro.
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

      {/* Warning when Browser-Fast is selected */}
      {engine === 'browser-fast' && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p>
            <strong>Attenzione:</strong> Il motore in-browser estrae solo il testo semplice e titoli. Se il PDF contiene colonne, impaginazioni speciali o tabelle complesse, il file risultante non manterrà la grafica originale. Per una qualità perfetta 1:1 seleziona <strong>FreeConvert Cloud API</strong> in alto.
          </p>
        </div>
      )}

      {/* Desktop Python Script Box */}
      {engine === 'desktop-python' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span>Conversione Fedele 100% sul tuo PC con pdf2docx</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nessun file lascia il tuo computer. Mantiene colonne, tabelle e formattazione con la libreria Python open source.
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
            <span className="text-[11px] font-mono text-slate-500">Istruzioni rapide:</span>
            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto space-y-1">
              <p className="text-slate-400"># 1. Installa la libreria nel terminale:</p>
              <p className="text-emerald-400">pip install pdf2docx</p>
              <p className="text-slate-400 pt-1"># 2. Converti direttamente da riga di comando:</p>
              <p className="text-sky-300">pdf2docx convert input.pdf output.docx</p>
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
              Documento Word (.docx) Generato con Successo!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              File compatibile con Microsoft Word, Google Docs, LibreOffice e Pages.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={outputName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs transition hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica {outputName} ({resultBlob ? (resultBlob.size / 1024).toFixed(1) : 0} KB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              Converti un altro PDF
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
            title="Trascina qui il file PDF da convertire in Word (.docx)"
            subtitle={
              engine === 'cloud'
                ? 'Elaborazione ad alta fedeltà con layout, tabelle e grafica identici al 100%.'
                : engine === 'desktop-python'
                ? 'Conversione locale ad alta fedeltà con motore pdf2docx.'
                : 'Estrazione rapida del solo testo nel browser.'
            }
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    File selezionato: <strong>{fileItem.file.name}</strong>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {fileItem.pageCount ? `${fileItem.pageCount} pagine` : 'PDF'}
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
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
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
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Conversione in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Converti in Word con {engine === 'cloud' ? 'FreeConvert (100% Fedele)' : engine === 'desktop-python' ? 'pdf2docx Desktop' : 'Bozza Veloce'}
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
