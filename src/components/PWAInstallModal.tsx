import React from 'react';
import {
  Download,
  X,
  Monitor,
  CheckCircle2,
  Sparkles,
  Zap,
  WifiOff,
  HardDrive,
  Share2,
  ArrowRight,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerNativeInstall?: () => void;
  canTriggerDirectly: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onTriggerNativeInstall,
  canTriggerDirectly,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Installa LibrePDF Desktop (PWA)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                  0 MB • Nessun .EXE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                L'applicazione nativa per Windows, macOS e Linux direttamente dal tuo browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {/* Direct 1-click install button if available */}
          {canTriggerDirectly && onTriggerNativeInstall && (
            <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-bold text-red-900 dark:text-red-200">
                  Browser pronto all'installazione immediata!
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Clicca il pulsante per aggiungere subito l'icona sul Desktop e nel Menu Start.
                </p>
              </div>
              <button
                onClick={() => {
                  onTriggerNativeInstall();
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Installa Adesso</span>
              </button>
            </div>
          )}

          {/* Key Advantages Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                <Zap className="w-4 h-4" />
                <span>Istantanea</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Avvio immediato in meno di 100 ms. Nessuna decompressione pesante come i vecchi file .exe.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
                <WifiOff className="w-4 h-4" />
                <span>100% Offline</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Funziona anche senza internet: i 20+ strumenti WebAssembly girano localmente sul tuo PC.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs">
                <HardDrive className="w-4 h-4" />
                <span>0 MB di Peso</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Non intasa il disco rigido. Si aggiorna automaticamente e in trasparenza a ogni novità.
              </p>
            </div>
          </div>

          {/* Simple 2-Step Guide for Chrome and Edge */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Come installarla in 2 secondi da Chrome o Edge</span>
            </h4>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Cerca l'icona "Installa" nella barra degli indirizzi
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    In alto a destra nella barra URL del browser, compare l'icona con lo schermo o tre quadratini. Cliccala e conferma con <strong>Installa</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    In alternativa: Menu del browser (3 puntini ⋮)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clicca sui tre puntini in alto a destra &rarr; seleziona <strong>"App"</strong> &rarr; <strong>"Installa LibrePDF come app"</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Icona pronta sul Desktop e nella Barra Applicazioni
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Windows aggiungerà l'icona sul Desktop. Da questo momento LibrePDF si aprirà in una finestra standalone ultra-pulita senza barra URL!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supporta Windows 10/11, macOS, ChromeOS e Linux.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs hover:bg-slate-800 dark:hover:bg-white transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
