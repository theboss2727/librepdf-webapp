import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all transform active:scale-95 cursor-pointer"
        title="Installa LibrePDF come applicazione desktop o mobile nativa"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installa App (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 active:bg-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition cursor-pointer"
          title="Istruzioni installazione su iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Installa su iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Installa su iPhone o iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <p>
                    Tocca l'icona <strong>Condividi</strong> (<Share2 className="w-3.5 h-3.5 inline text-blue-600" />) nella barra degli strumenti di Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <p>
                    Scorri in basso nel menu e seleziona <strong>"Aggiungi alla schermata Home"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <p>
                    LibrePDF funzionerà a schermo intero e anche in <strong>modalità offline senza connessione</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
