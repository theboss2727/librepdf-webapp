import React from 'react';
import {
  ShieldCheck,
  Code2,
  Terminal,
  Cpu,
  Lock,
} from 'lucide-react';

interface FooterProps {
  onOpenPythonStudio: () => void;
  onOpenVault: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPythonStudio,
  onOpenVault,
}) => {
  return (
    <footer className="mt-20 border-t border-slate-200/90 dark:border-slate-800 py-10 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Libre<span className="text-rose-600 dark:text-rose-500">PDF</span> Studio
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-[11px] text-slate-500">Motore Client-Side</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              Elaborazione documenti eseguita interamente in memoria sandbox locale tramite WebAssembly e TypedArrays. 
              Nessun dato viene inviato a server esterni per garantire privacy assoluta.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={onOpenPythonStudio}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer flex items-center gap-1 font-semibold"
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Area Riservata Sviluppatore</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={onOpenVault}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              Vault Locale (IndexedDB)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
          <div>
            <span>© {new Date().getFullYear()} LibrePDF Studio · Open Source & Local-First.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>WASM 64-bit Core</span>
            <span>·</span>
            <span>PyMuPDF Native Ingestion</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
