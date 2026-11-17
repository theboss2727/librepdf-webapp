import React, { useState } from 'react';
import { Download, Monitor, Share2, X, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone app, show clean subtle status or hide
  if (isInstalled) {
    return null;
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 transition cursor-pointer"
          title="Istruzioni installazione su iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installa su iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Installa su iPhone o iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 my-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <p>
                    Tocca l'icona <strong>Condividi</strong> (<Share2 className="w-3.5 h-3.5 inline text-blue-600" />) nella barra degli strumenti di Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <p>
                    Scorri in basso nel menu e seleziona <strong>"Aggiungi alla schermata Home"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <p>
                    LibrePDF funzionerà a schermo intero e anche in <strong>modalità offline senza connessione</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 py-2.5 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Chromium / Edge / Brave flow
  return (
    <>
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowModal(true);
          }
        }}
        className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all transform active:scale-95 cursor-pointer"
        title="Installa LibrePDF come applicazione desktop nativa (0 MB)"
      >
        <Monitor className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Installa Desktop</span>
        <span className="md:hidden">Installa</span>
      </button>

      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        canTriggerDirectly={isInstallable}
        onTriggerNativeInstall={install}
      />
    </>
  );
};
