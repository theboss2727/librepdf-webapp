import React, { useState } from 'react';
import {
  FileCheck2,
  UploadCloud,
  Layers,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getPdfPageCount, inspectPdfDetails } from '../services/pdfEngine';
import type { ToolId } from '../types/pdf';

interface EngineeringHeroProps {
  onSelectTool: (id: ToolId) => void;
  onOpenPythonStudio: () => void;
  onFilePreloaded?: (file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const EngineeringHero: React.FC<EngineeringHeroProps> = ({
  onSelectTool,
  onFilePreloaded,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [analyzedDoc, setAnalyzedDoc] = useState<{
    file: File;
    pageCount: number;
    dimensionsMm?: string;
    hasForms?: boolean;
  } | null>(null);

  const handleIncomingFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return;
    }

    let count = 1;
    let dimStr = '';
    let forms = false;
    try {
      const details = await inspectPdfDetails(file);
      count = details.pageCount;
      dimStr = `${details.pageWidthMm} × ${details.pageHeightMm} mm`;
      forms = details.hasAcroForm;
    } catch {
      try {
        count = await getPdfPageCount(file);
      } catch {
        // Encrypted
      }
    }

    setAnalyzedDoc({
      file,
      pageCount: count,
      dimensionsMm: dimStr,
      hasForms: forms,
    });
    onFilePreloaded?.(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 transition-colors shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Clean Concise Overview */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Task PDF 100% Locali
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Conversioni Solo Alta Fedeltà
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
            Suite Documentale <span className="text-rose-600 dark:text-rose-500">LibrePDF</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            Manipolazione PDF illimitata sul tuo browser (privacy totale) e conversioni Office garantite esclusivamente in alta qualità (FreeConvert API o motore nativo desktop).
          </p>
        </div>

        {/* Right Column: Compact PDF Inspector Dropzone */}
        <div className="lg:col-span-5">
          {analyzedDoc ? (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[210px]">
                      {analyzedDoc.file.name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {formatBytes(analyzedDoc.file.size)} · {analyzedDoc.pageCount} pag {analyzedDoc.dimensionsMm && `· ${analyzedDoc.dimensionsMm}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAnalyzedDoc(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-mono cursor-pointer"
                >
                  Cambia
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => onSelectTool('pdf-to-docx')}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium truncate">In Word (Top)</span>
                </button>
                <button
                  onClick={() => onSelectTool('pdf-to-xlsx')}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium truncate">In Excel (Top)</span>
                </button>
                <button
                  onClick={() => onSelectTool('pdf-to-images')}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                  <span className="font-medium truncate">In JPG / PNG</span>
                </button>
                <button
                  onClick={() => onSelectTool('organize')}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-medium truncate">Tavolo Pagine</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`p-4 rounded-xl border border-dashed transition-all flex items-center justify-between gap-3 cursor-pointer ${
                dragActive
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-slate-800/80'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                  <UploadCloud className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    Ispezione Rapida PDF
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Trascina un PDF per leggere pagine & formato
                  </p>
                </div>
              </div>
              <label className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shrink-0 shadow-2xs">
                Sfoglia
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleIncomingFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
