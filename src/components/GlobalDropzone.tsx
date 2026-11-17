import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Files,
  Scissors,
  GitCompare,
  PenTool,
  Minimize2,
  FileCode,
  Table,
  Tag,
  ScanText,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { ToolId } from '../types/pdf';

interface GlobalDropzoneProps {
  onSelectTool: (toolId: ToolId) => void;
  isActive: boolean; // Only active when home is shown
}

export const GlobalDropzone: React.FC<GlobalDropzoneProps> = ({ onSelectTool, isActive }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounter++;
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDraggingOver(false);
        dragCounter = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      dragCounter = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const fileList = Array.from(e.dataTransfer.files);
        setDroppedFiles(fileList);
        processDroppedFiles(fileList);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isActive]);

  const processDroppedFiles = (files: File[]) => {
    // Single file detection
    if (files.length === 1) {
      const name = files[0].name.toLowerCase();
      if (/\.(docx?|doc|pages)$/.test(name)) {
        onSelectTool('docx-to-pdf');
        return;
      }
      if (/\.(xlsx?|xls|csv|numbers|ods)$/.test(name)) {
        onSelectTool('xlsx-to-pdf');
        return;
      }
      if (/\.(jpe?g|png|webp|avif)$/.test(name)) {
        onSelectTool('images-to-pdf');
        return;
      }
      // If 1 PDF, show quick choice menu
      if (name.endsWith('.pdf')) {
        setShowActionModal(true);
        return;
      }
    }

    // Two files detection
    if (files.length === 2 && files.every((f) => f.name.toLowerCase().endsWith('.pdf'))) {
      setShowActionModal(true);
      return;
    }

    // 3 or more PDFs: default directly to merge
    if (files.length >= 3 && files.every((f) => f.name.toLowerCase().endsWith('.pdf'))) {
      onSelectTool('merge');
      return;
    }

    // Default: show action modal
    setShowActionModal(true);
  };

  const handleSelectAction = (toolId: ToolId) => {
    setShowActionModal(false);
    onSelectTool(toolId);
  };

  return (
    <>
      {/* Full-Screen Drag-Over Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="p-8 sm:p-12 rounded-3xl border-3 border-dashed border-red-500 bg-red-500/10 text-center space-y-4 max-w-lg mx-4 shadow-2xl scale-105 transition transform">
            <div className="w-20 h-20 rounded-2xl bg-red-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-red-600/30 animate-bounce">
              <UploadCloud className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">
                Rilascia qui i tuoi file!
              </h3>
              <p className="text-sm text-slate-300">
                LibrePDF analizzerà automaticamente il tipo di documento proponendoti l'azione ideale.
              </p>
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
              100% Elaborazione Locale
            </span>
          </div>
        </div>
      )}

      {/* Action Choice Modal */}
      {showActionModal && droppedFiles.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {droppedFiles.length === 1
                      ? 'Cosa desideri fare con questo file?'
                      : `Rilevati ${droppedFiles.length} file`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                    {droppedFiles.map((f) => f.name).join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Choices */}
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* If 2 PDFs: Highlight Compare vs Merge */}
              {droppedFiles.length === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <button
                    onClick={() => handleSelectAction('compare-pdf')}
                    className="p-4 rounded-xl border-2 border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-left transition space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                      <GitCompare className="w-4 h-4" />
                      <span>Confronta i 2 PDF</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trova differenze di testo, parole aggiunte o rimosse affiancate.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectAction('merge')}
                    className="p-4 rounded-xl border-2 border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-left transition space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                      <Files className="w-4 h-4" />
                      <span>Unisci in un unico PDF</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Assembla i 2 documenti in un unico stream vettoriale continuo.
                    </p>
                  </button>
                </div>
              )}

              {/* General 1-PDF actions grid */}
              {droppedFiles.length === 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleSelectAction('edit-pdf')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Modifica & Testi</span>
                    <span className="text-[10px] text-slate-400">Note e annotazioni</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('sign-pdf')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Firma & Timbro</span>
                    <span className="text-[10px] text-slate-400">Firma certificata SHA-256</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('compress')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <Minimize2 className="w-4 h-4 text-teal-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Comprimi</span>
                    <span className="text-[10px] text-slate-400">Riduci peso file</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('pdf-to-docx')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">In Word (.docx)</span>
                    <span className="text-[10px] text-slate-400">Conversione 1:1</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('pdf-to-xlsx')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <Table className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">In Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-400">Estrai tabelle</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('metadata-pdf')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <Tag className="w-4 h-4 text-violet-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Metadati Privacy</span>
                    <span className="text-[10px] text-slate-400">Ispezione e pulizia</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('split')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <Scissors className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Dividi & Pagine</span>
                    <span className="text-[10px] text-slate-400">Estrai o separa</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('ocr-pdf')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <ScanText className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">OCR Scansione</span>
                    <span className="text-[10px] text-slate-400">Estrai testo ottico</span>
                  </button>

                  <button
                    onClick={() => handleSelectAction('unlock-pdf')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-yellow-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition flex flex-col gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Sblocca Password</span>
                    <span className="text-[10px] text-slate-400">Rimuovi cifratura</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
