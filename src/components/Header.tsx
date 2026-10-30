import React from 'react';
import {
  Code2,
  HardDrive,
  Cloud,
  FileCheck2,
  Sun,
  Moon,
  Search,
  Command,
  ShieldCheck,
  Cpu,
  Lock,
  PenTool,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { ToolId } from '../types/pdf';

interface HeaderProps {
  onOpenVault: () => void;
  onOpenPythonStudio: () => void;
  onSelectTool: (id: ToolId) => void;
  vaultCount: number;
  cloudSyncActive: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onQuickSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVault,
  onOpenPythonStudio,
  onSelectTool,
  vaultCount,
  cloudSyncActive,
  theme,
  onToggleTheme,
  onQuickSearchClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-6">
        {/* Zone 1: Single element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => onSelectTool('merge')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/80 dark:bg-slate-900 dark:border-slate-700/80 text-rose-600 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <FileCheck2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Libre<span className="text-rose-600 dark:text-rose-500">PDF</span>
              </span>
              <span className="text-[11px] font-mono tracking-normal text-slate-400 dark:text-slate-500">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
          <button
            onClick={() => onSelectTool('merge')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Strumenti
          </button>
          <button
            onClick={() => onSelectTool('edit-pdf')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Modifica PDF</span>
          </button>
          <button
            onClick={() => onSelectTool('ocr-pdf')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Motore OCR
          </button>
          <button
            onClick={() => onSelectTool('organize')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Tavolo Montaggio
          </button>
          <button
            onClick={() => onSelectTool('reserved-python')}
            className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
            title="Area Riservata Sviluppatore (Codice Python e build .exe)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Area Riservata</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Search Shortcut Trigger */}
          <button
            onClick={onQuickSearchClick}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
            title="Cerca comandi o strumenti (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Cerca utilità...</span>
            <kbd className="text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
            title={theme === 'dark' ? 'Passa al tema Chiaro' : 'Passa al tema Scuro'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Local Vault Trigger */}
          <button
            onClick={onOpenVault}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Archivio locale sandbox sul tuo disco"
          >
            {cloudSyncActive ? (
              <Cloud className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">Vault</span>
            {vaultCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {vaultCount}
              </span>
            )}
          </button>

          {/* Primary Action Button: Python Desktop Engine */}
          <button
            onClick={onOpenPythonStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5 text-rose-400 dark:text-rose-600" />
            <span>Python .EXE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
