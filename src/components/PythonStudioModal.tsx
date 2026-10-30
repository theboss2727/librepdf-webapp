import React, { useState } from 'react';
import {
  X,
  Code2,
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  FolderArchive,
  Layers,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import {
  PYTHON_CORE_HANDLER,
  PYTHON_PYQT6_GUI,
  PYTHON_PYINSTALLER_BAT,
  PYTHON_README,
  PYTHON_REQUIREMENTS,
  getSnippetForTool,
} from '../services/pythonCompanion';

interface PythonStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToolId?: string;
}

export const PythonStudioModal: React.FC<PythonStudioModalProps> = ({
  isOpen,
  onClose,
  currentToolId = 'watermark',
}) => {
  const [activeTab, setActiveTab] = useState<'handler' | 'gui' | 'requirements' | 'tool_snippet' | 'build_bat'>('gui');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const currentContent = {
    handler: PYTHON_CORE_HANDLER,
    gui: PYTHON_PYQT6_GUI,
    requirements: PYTHON_REQUIREMENTS,
    tool_snippet: getSnippetForTool(currentToolId),
    build_bat: PYTHON_PYINSTALLER_BAT,
  }[activeTab];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      zip.file('main.py', PYTHON_PYQT6_GUI);
      zip.file('app_gui.py', PYTHON_PYQT6_GUI); // entrambi presenti così qualsiasi file avvii funziona!
      zip.file('pdf_handler.py', PYTHON_CORE_HANDLER);
      zip.file('requirements.txt', PYTHON_REQUIREMENTS);
      zip.file('build_exe.bat', PYTHON_PYINSTALLER_BAT);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Terminal className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Motore Python PyMuPDF & Generatore .EXE
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Compatibile al 100%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                La stessa architettura usata dal browser, pronta per essere integrata nel tuo progetto desktop .exe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Tabs */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('gui')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'gui'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🖥️ main.py / app_gui.py (GUI Completa)
            </button>
            <button
              onClick={() => setActiveTab('handler')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'handler'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📄 pdf_handler.py (Core)
            </button>
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'requirements'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📦 requirements.txt
            </button>
            <button
              onClick={() => setActiveTab('tool_snippet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'tool_snippet'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Snippet Strumento
            </button>
            <button
              onClick={() => setActiveTab('build_bat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'build_bat'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚙️ build_exe.bat
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia Codice</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Creazione ZIP...' : 'Scarica Pacchetto Desktop (.zip)'}</span>
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed">
          <pre className="whitespace-pre overflow-x-auto selection:bg-amber-500 selection:text-slate-950">
            <code>{currentContent}</code>
          </pre>
        </div>

        {/* Footer Info Banner */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Per compilare in .exe: <code className="text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">pyinstaller --noconsole --onefile app_gui.py</code>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Dipendenze: pip install pymupdf PyQt6 pyinstaller
          </span>
        </div>
      </div>
    </div>
  );
};
