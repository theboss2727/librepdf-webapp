import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Command,
  FileCheck2,
  Terminal,
  Database,
  Sparkles,
} from 'lucide-react';
import { PDF_TOOLS } from '../config/tools';
import type { ToolId } from '../types/pdf';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (id: ToolId) => void;
  onOpenPythonStudio: () => void;
  onOpenVault: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  onOpenPythonStudio,
  onOpenVault,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via parent
        }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = PDF_TOOLS.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleExecute = (id: ToolId) => {
    if (id === 'python-studio' || id === 'reserved-python') onSelectTool('reserved-python');
    else if (id === 'vault') onOpenVault();
    else onSelectTool(id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cerca utilità PDF, azioni o script (es. unisci, ocr, py)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm focus:outline-hidden placeholder-slate-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-mono"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nessuno strumento trovato per "{query}"
            </div>
          ) : (
            filtered.map((tool, idx) => (
              <div
                key={tool.id}
                onClick={() => handleExecute(tool.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-rose-50 dark:bg-slate-800 text-rose-900 dark:text-white font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate">{tool.title}</span>
                      {tool.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {tool.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {tool.technicalSpec && (
                    <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
                      {tool.technicalSpec}
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Seleziona</span>
            <span>↵ Apri</span>
            <span>ESC Chiudi</span>
          </div>
          <span className="font-mono">LibrePDF Workstation Engine</span>
        </div>
      </div>
    </div>
  );
};
