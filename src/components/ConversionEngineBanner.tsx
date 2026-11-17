import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Cloud,
  CheckCircle2,
  Loader2,
  Key,
  Download,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getEngineCapabilities,
  installLocalPackages,
  isLocalEngineCapable,
  type EngineCapabilities,
} from '../services/highFidelityConverter';
import { getStoredApiKey, setStoredApiKey } from '../services/freeConvertApi';

interface ConversionEngineBannerProps {
  sourceFormat: string;
  targetFormat: 'docx' | 'xlsx' | 'pdf';
  onCapabilitiesChange?: (caps: EngineCapabilities) => void;
  onApiKeyChange?: (key: string) => void;
  currentApiKey?: string;
}

export const ConversionEngineBanner: React.FC<ConversionEngineBannerProps> = ({
  sourceFormat,
  targetFormat,
  onCapabilitiesChange,
  onApiKeyChange,
  currentApiKey = '',
}) => {
  const [caps, setCaps] = useState<EngineCapabilities | null>(null);
  const [isLoadingCaps, setIsLoadingCaps] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showCloudSettings, setShowCloudSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(currentApiKey || getStoredApiKey());
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(Boolean(apiKeyInput.trim()));

  const loadCapabilities = async (force = false) => {
    setIsLoadingCaps(true);
    try {
      const detected = await getEngineCapabilities(force);
      setCaps(detected);
      onCapabilitiesChange?.(detected);
      if (force) {
        toast.success('Diagnostica aggiornata: risorse locali verificate');
      }
    } catch (err) {
      console.warn('Errore lettura capabilities:', err);
    } finally {
      setIsLoadingCaps(false);
    }
  };

  useEffect(() => {
    loadCapabilities(true);
  }, [sourceFormat, targetFormat]);

  const handleInstallPackages = async () => {
    setIsInstalling(true);
    const toastId = toast.loading('Installazione risorse locali con consenso in corso su questo PC...');
    try {
      const res = await installLocalPackages();
      setCaps(res.capabilities);
      onCapabilitiesChange?.(res.capabilities);
      toast.success('Risorse locali installate con successo! Motore 1:1 pronto all\'uso.', { id: toastId });
    } catch (err: any) {
      console.error('Errore installazione risorse locali:', err);
      toast.error(err?.message || 'Errore durante l\'installazione delle risorse locali.', { id: toastId });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setIsKeySaved(Boolean(apiKeyInput.trim()));
    onApiKeyChange?.(apiKeyInput.trim());
    if (apiKeyInput.trim()) {
      toast.success('API Key salvata per il motore Cloud');
    } else {
      toast.success('API Key rimossa');
    }
  };

  if (isLoadingCaps || !caps) {
    return (
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2.5 text-xs text-zinc-500 font-mono animate-pulse">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span>Verifica diagnostica ambiente locale in corso (Python / LibreOffice / Cloud)...</span>
        </div>
      </div>
    );
  }

  const dummyFileName = `documento.${sourceFormat}`;
  const isLocalReady = isLocalEngineCapable(caps, dummyFileName, targetFormat);
  const isWordToPdf = (sourceFormat.toLowerCase() === 'docx' || sourceFormat.toLowerCase() === 'doc') && targetFormat === 'pdf';

  return (
    <div className="space-y-3">
      {/* Scenario 1: Local engine is already capable and ready */}
      {isLocalReady ? (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Motore Locale Nativo 1:1 Attivo
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    100% Offline & Privato
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80 mt-0.5">
                  La conversione avverrà direttamente sul tuo computer ({caps.pythonVersion || 'Python'} / Librerie interne attive). Nessun dato lascerà il tuo PC.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => loadCapabilities(true)}
                title="Ricarica diagnostica ambiente locale"
                className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowCloudSettings(!showCloudSettings)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showCloudSettings ? 'Nascondi opzioni Cloud' : 'Opzioni Cloud FreeConvert'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCloudSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showCloudSettings && (
            <div className="mt-3.5 pt-3.5 border-t border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-2">
              <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                Il motore locale è già pronto per questo formato. Se preferisci comunque demandare il file al cloud FreeConvert (es. per formati esotici), puoi impostare la chiave API qui:
              </p>
              <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <input
                    type={showKeyPassword ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="API Key FreeConvert opzionale"
                    className="w-full text-xs pl-8 pr-8 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                  <Key className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs hover:bg-zinc-800 transition cursor-pointer"
                >
                  Salva
                </button>
              </div>
            </div>
          )}
        </div>
      ) : caps.pythonInstalled ? (
        /* Scenario 2: Python is installed on host, but missing specialized packages */
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100">
                  Ambiente Locale Rilevato ({caps.pythonVersion || 'Python'})
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                  Consenso Utente
                </span>
              </div>
              <p className="text-xs text-blue-900/85 dark:text-blue-200/80">
                Sul tuo PC è presente Python, ma per effettuare la conversione da <strong>{sourceFormat.toUpperCase()}</strong> a <strong>{targetFormat.toUpperCase()}</strong> con fedeltà 1:1 nativa servono le risorse specializzate (<code>{caps.missingPackages.join(', ') || 'pdf2docx'}</code>).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Choice A: Install local resources with user consent */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Opzione 1 (Consigliata)
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                  Installa Risorse Interne sul tuo PC
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Abilita la conversione nativa 1:1 illimitata a costo zero. I tuoi file non lasceranno mai il tuo computer.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isInstalling}
                  onClick={handleInstallPackages}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${!isInstalling
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-300 text-white cursor-wait'
                    }`}
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Installazione con pip in corso...</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Installa Risorse con il tuo Consenso</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => loadCapabilities(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rileva di nuovo (se già installate via terminale)</span>
                </button>
              </div>
            </div>

            {/* Choice B: Use FreeConvert Cloud API */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  Opzione 2
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                  Usa il Motore Cloud Esterno (FreeConvert)
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Non vuoi installare librerie sul computer? Puoi appoggiarti a FreeConvert inserendo la tua chiave API.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Incolla API Key FreeConvert"
                      className="w-full text-xs pl-8 pr-8 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    {isKeySaved ? <Check className="w-3.5 h-3.5" /> : 'Salva'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Serve una chiave?</span>
                  <a
                    href="https://www.freeconvert.com/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline flex items-center gap-0.5"
                  >
                    <span>Ottieni API Key gratuita</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isWordToPdf ? (
        /* Scenario 3-Word: Word to PDF on remote host (e.g. Netlify) requires Desktop or Cloud Key for 1:1 fidelity */
        apiKeyInput.trim() ? (
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5 sm:mt-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Motore Cloud 1:1 Attivo (FreeConvert)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                      Fedeltà 1:1 Microsoft Office
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900/85 dark:text-indigo-300/80">
                    La conversione Word in PDF verrà elaborata con fedeltà tipografica 1:1 via FreeConvert Cloud API, preservando font, margini e layout originali.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowCloudSettings(!showCloudSettings)}
                  className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showCloudSettings ? 'Nascondi chiave' : 'Modifica chiave API'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCloudSettings ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {showCloudSettings && (
              <div className="mt-3.5 pt-3.5 border-t border-indigo-200/60 dark:border-indigo-900/40 text-xs space-y-2">
                <div className="flex items-center gap-2 max-w-md">
                  <div className="relative flex-1">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="API Key FreeConvert"
                      className="w-full text-xs pl-8 pr-8 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Salva
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-950 dark:text-amber-100">
                    Conversione Word 1:1: Richiede LibrePDF Desktop o Chiave Cloud
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                    Fedeltà 1:1 Garantita
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
                  I documenti Word (.docx, .doc) contengono impaginazioni complesse e font Microsoft. Per non produrre file PDF deformati o sgranati, LibrePDF non effettua conversioni approssimate nel browser, ma richiede un motore di rendering completo:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Desktop */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200/70 dark:border-amber-900/60 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Opzione 1 (100% Locale & Gratuita)
                  </span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    LibrePDF Desktop per il tuo PC
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Esegui la versione Desktop di LibrePDF sul tuo computer per convertire file Word sfruttando direttamente il motore locale (Microsoft Word o LibreOffice), 100% offline e senza limiti.
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <a
                    href="https://github.com/theboss2727/librepdf-webapp"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
                  >
                    <span>Vedi LibrePDF Desktop su GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => loadCapabilities(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-[10px] transition cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Verifica se è già in esecuzione sul PC</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Cloud API Key */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200/70 dark:border-amber-900/60 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    Opzione 2 (Consigliata per il Web)
                  </span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    Converti subito online con Chiave Cloud
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Incolla la tua chiave API gratuita di FreeConvert per sbloccare all'istante la conversione 1:1 direttamente dal browser, senza installare nulla.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type={showKeyPassword ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Incolla API Key FreeConvert"
                        className="w-full text-xs pl-8 pr-8 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                      <Key className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                      <button
                        type="button"
                        onClick={() => setShowKeyPassword(!showKeyPassword)}
                        className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {isKeySaved ? <Check className="w-3.5 h-3.5" /> : 'Salva'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Serve una chiave?</span>
                    <a
                      href="https://www.freeconvert.com/api"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-0.5"
                    >
                      <span>Crea account gratuito (750 min/mese)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Scenario 3: Remote hosting (e.g. Netlify) for WebAssembly-capable tools (Excel to PDF, PDF to Word/Excel, etc.) */
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Motore Client-Side nel Browser (100% Locale)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    Zero Server • Nessuna Chiave Richiesta
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80">
                  La conversione da <strong>{sourceFormat.toUpperCase()}</strong> a <strong>{targetFormat.toUpperCase()}</strong> avverrà direttamente all'interno del tuo browser sul tuo dispositivo tramite WebAssembly e JavaScript. Nessun file o dato lascerà mai il tuo computer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowCloudSettings(!showCloudSettings)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showCloudSettings ? 'Nascondi opzioni Cloud' : 'Opzioni Cloud FreeConvert (Opzionali)'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCloudSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showCloudSettings && (
            <div className="mt-3.5 pt-3.5 border-t border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-2">
              <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                Il motore nel browser elabora già tutto gratis sul tuo PC. Se desideri appoggiarti facoltativamente al cloud di FreeConvert per la fedeltà 1:1 di Microsoft Office su server remoti, puoi inserire la tua chiave API qui:
              </p>
              <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <input
                    type={showKeyPassword ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Incolla API Key FreeConvert opzionale"
                    className="w-full text-xs pl-8 pr-8 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                  <Key className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs hover:bg-zinc-800 transition cursor-pointer"
                >
                  {isKeySaved ? 'Salvata' : 'Salva'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>Vuoi una chiave FreeConvert?</span>
                <a
                  href="https://www.freeconvert.com/api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Crea account gratuito (750 min/mese)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
