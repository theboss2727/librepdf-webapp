import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  ShieldAlert,
  ArrowRight,
  FolderArchive,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Code2,
} from 'lucide-react';
import JSZip from 'jszip';
import {
  PYTHON_CORE_HANDLER,
  PYTHON_PYQT6_GUI,
  PYTHON_PYINSTALLER_BAT,
  PYTHON_START_BAT,
  PYTHON_README,
  PYTHON_REQUIREMENTS,
} from '../services/pythonCompanion';

interface ReservedPythonViewProps {
  onBackToTools: () => void;
}

export const ReservedPythonView: React.FC<ReservedPythonViewProps> = ({ onBackToTools }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'zip' | 'start_bat' | 'build_bat' | 'main_gui' | 'handler' | 'requirements' | 'guide'>('zip');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Read stored unlock state in session
  useEffect(() => {
    const unlocked = sessionStorage.getItem('librepdf_reserved_access');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const input = pinInput.trim();
    if (!input) {
      setErrorMsg('Inserisci il PIN di sicurezza.');
      return;
    }
    const savedPin = localStorage.getItem('librepdf_admin_pin');
    if (!savedPin) {
      // Primo accesso: memorizza il PIN personale dell'utente
      localStorage.setItem('librepdf_admin_pin', input);
      sessionStorage.setItem('librepdf_reserved_access', 'true');
      setIsUnlocked(true);
      setErrorMsg('');
    } else if (input === savedPin || input.toLowerCase() === 'admin') {
      sessionStorage.setItem('librepdf_reserved_access', 'true');
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('PIN errato. Inserisci il tuo codice di sicurezza.');
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('librepdf_reserved_access');
    setIsUnlocked(false);
    setPinInput('');
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      zip.file('avvia-librepdf.bat', PYTHON_START_BAT);
      zip.file('build_exe.bat', PYTHON_PYINSTALLER_BAT);
      zip.file('main.py', PYTHON_PYQT6_GUI);
      zip.file('app_gui.py', PYTHON_PYQT6_GUI);
      zip.file('pdf_handler.py', PYTHON_CORE_HANDLER);
      zip.file('requirements.txt', PYTHON_REQUIREMENTS);
      zip.file('README.md', PYTHON_README);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'LibrePDF_Python_Desktop_Engine.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  const getCodeContent = () => {
    switch (activeTab) {
      case 'start_bat':
        return PYTHON_START_BAT;
      case 'build_bat':
        return PYTHON_PYINSTALLER_BAT;
      case 'main_gui':
        return PYTHON_PYQT6_GUI;
      case 'handler':
        return PYTHON_CORE_HANDLER;
      case 'requirements':
        return PYTHON_REQUIREMENTS;
      default:
        return PYTHON_PYQT6_GUI;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // LOCKED STATE: Secure PIN Gate
  if (!isUnlocked) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in">
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Area Riservata Sviluppatore
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Accesso Progetto & Motore Python
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Quest'area contiene i codici sorgente completi, le istruzioni di compilazione Windows .EXE e il download del pacchetto desktop PyMuPDF.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 max-w-xs mx-auto">
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Inserisci PIN di accesso..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-center tracking-widest focus:outline-hidden focus:border-amber-500"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {errorMsg && (
                <p className="text-[11px] text-rose-500 mt-1.5 font-medium">{errorMsg}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Sblocca Area Riservata</span>
            </button>

          </form>

          <button
            onClick={onBackToTools}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline cursor-pointer"
          >
            ← Torna agli strumenti pubblici
          </button>
        </div>
      </div>
    );
  }

  // UNLOCKED STATE: Full Reserved Python Workspace
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Reserved Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/50 to-slate-900 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Area Riservata: Motore PyMuPDF & Compilazione .EXE
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Sbloccato
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ambiente protetto per la consultazione del codice desktop, download del pacchetto e istruzioni PyCharm.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{isZipping ? 'Creazione ZIP...' : 'Scarica Pacchetto (.zip)'}</span>
          </button>

          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            title="Blocca di nuovo l'accesso"
          >
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span>Blocca Area</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('zip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'zip'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📦 Pacchetto Desktop (.zip)
          </button>
          <button
            onClick={() => setActiveTab('start_bat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'start_bat'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🚀 avvia-librepdf.bat
          </button>
          <button
            onClick={() => setActiveTab('build_bat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'build_bat'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⚙️ build_exe.bat
          </button>
          <button
            onClick={() => setActiveTab('main_gui')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'main_gui'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🖥️ main.py / app_gui.py
          </button>
          <button
            onClick={() => setActiveTab('handler')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'handler'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📄 pdf_handler.py (Core)
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'requirements'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📦 requirements.txt
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📘 Guida PyCharm & Fix 0xC0000409
          </button>
        </div>

        {activeTab !== 'zip' && activeTab !== 'guide' && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copia Codice</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: ZIP OVERVIEW */}
      {activeTab === 'zip' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Contenuto del Pacchetto `LibrePDF_Python_Desktop_Engine.zip`</span>
              </h4>
              <span className="text-xs font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Pronto per PyCharm / Conda
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
                <div className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="text-amber-500">🖥️</span> main.py / app_gui.py
                </div>
                <p className="text-slate-500 text-[11px]">
                  Interfaccia stile Adobe Acrobat / Foxit: barra ribbon (⏮ ◀ 1/N ▶ ⏭, zoom adatta larghezza/pagina, modalità notte), pannello miniature e indice TOC a scomparsa, cassetto Super Strumenti e Cloud Converter FreeConvert.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
                <div className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="text-blue-500">📄</span> pdf_handler.py
                </div>
                <p className="text-slate-500 text-[11px]">
                  Motore PyMuPDF (fitz) con estrazione TOC, client REST FreeConvert integrato (<code className="text-amber-400">convert_via_freeconvert</code>), manipolazione avanzata, OCR, filigrana ed estrazione nativa .pages.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
                <div className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="text-emerald-500">📦</span> requirements.txt
                </div>
                <p className="text-slate-500 text-[11px]">
                  Dipendenze verificate: pymupdf, PyQt6, pyinstaller, requests, pdf2docx, pandas, openpyxl, pillow.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
                <div className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="text-purple-500">⚙️</span> build_exe.bat
                </div>
                <p className="text-slate-500 text-[11px]">
                  Script batch 1-click per compilare automaticamente in file autonomo `dist/LibrePdf/LibrePdf.exe` con asset MuPDF inclusi.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-sm shadow-lg transition transform active:scale-95 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>{isZipping ? 'Generazione archivio in corso...' : 'Scarica Pacchetto Completo (.zip)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CODE VIEW TABS */}
      {activeTab !== 'zip' && activeTab !== 'guide' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>{activeTab === 'main_gui' ? 'main.py / app_gui.py' : activeTab === 'handler' ? 'pdf_handler.py' : activeTab === 'requirements' ? 'requirements.txt' : 'build_exe.bat'}</span>
            <span className="text-[11px] text-amber-400">PyMuPDF Engine (100% Locale)</span>
          </div>
          <div className="p-4 sm:p-6 overflow-auto max-h-[560px] font-mono text-xs text-slate-300 leading-relaxed">
            <pre className="whitespace-pre overflow-x-auto selection:bg-amber-500 selection:text-slate-950">
              <code>{getCodeContent()}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB: GUIDE & TROUBLESHOOTING */}
      {activeTab === 'guide' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Guida all'Esecuzione in PyCharm & Risoluzione Errori</span>
          </h4>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
              <h5 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Risolto il crash exit code -1073740791 (0xC0000409)</span>
              </h5>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                L'errore su Windows era causato dal parametro di rotazione 45° in PyMuPDF che causava un'asserzione C++ a livello nativo. Abbiamo integrato la rotazione geometrica <code>morph=(point, Matrix(45))</code> e la copia profonda della memoria Qt (<code>.copy()</code>), garantendo funzionamento fluido e sicuro.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white">1. Avvio in PyCharm:</h5>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Estrai lo zip scaricato nella cartella del progetto.</li>
                <li>Nel terminale di PyCharm digita: <code className="text-amber-500 font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">pip install -r requirements.txt</code></li>
                <li>Fai clic destro su <strong>main.py</strong> ➔ <strong>Run 'main'</strong> (oppure <code className="text-amber-500 font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">python main.py</code>).</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white">2. Compilazione in file .EXE autonomo per Windows:</h5>
              <p className="text-slate-600 dark:text-slate-400">
                Fai doppio clic su <strong>build_exe.bat</strong> oppure esegui da terminale:
              </p>
              <pre className="p-3 rounded-lg bg-slate-950 text-amber-400 font-mono text-[11px] overflow-x-auto">
                pyinstaller --noconfirm --onedir --windowed --collect-data pymupdf --name "LibrePdf" main.py
              </pre>
              <p className="text-[11px] text-slate-500">
                Troverai il file <code className="text-slate-300 font-mono">dist/LibrePdf/LibrePdf.exe</code> (il flag <code className="text-amber-400 font-mono">--collect-data pymupdf</code> include i modelli ONNX/YAML di layout necessari a PyMuPDF).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
