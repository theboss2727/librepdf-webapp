import React, { useState } from 'react';
import {
  FileCheck2,
  ArrowRight,
  UploadCloud,
  Scissors,
  Stamp,
  ScanText,
  LayoutGrid,
  SunMedium,
  Layers,
  Wrench,
  Files,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
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
  onOpenPythonStudio,
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
      alert('Seleziona un documento PDF valido.');
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 transition-colors shadow-xs">
      {/* Top Spec Bar - Clean unboxed text */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="text-slate-800 dark:text-slate-200 font-semibold">WASM RUNTIME CLIENT-SIDE</span>
          <span>·</span>
          <span className="hidden sm:inline">ZERO TRASMISSIONE RETE</span>
          <span className="hidden sm:inline">·</span>
          <span>ELABORAZIONE LOCALE 100% RISERVATA</span>
        </div>
      </div>

      {/* Main Grid: Headline + Quick Action Ingestion Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
        {/* Left Column: Mission & Architecture */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              Studio di Ingegneria Documentale{' '}
              <span className="text-rose-600 dark:text-rose-500">PDF & Vettori</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Ambiente professionale di manipolazione ad alte prestazioni su architettura WebAssembly locale. Nessun file lascia mai il tuo dispositivo: massima velocità, riservatezza totale e compatibilità desktop con script Python.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <button
              onClick={() => onSelectTool('merge')}
              className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs cursor-pointer"
            >
              Unisci PDF
            </button>
            <button
              onClick={() => onSelectTool('pdf-to-docx')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 transition cursor-pointer shadow-2xs"
            >
              PDF in Word (.docx)
            </button>
            <button
              onClick={() => onSelectTool('pdf-to-xlsx')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 transition cursor-pointer shadow-2xs"
            >
              PDF in Excel (.xlsx)
            </button>
            <button
              onClick={() => onSelectTool('pdf-to-images')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-semibold hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 transition cursor-pointer shadow-2xs"
            >
              PDF in JPG / PNG
            </button>
            <button
              onClick={() => onSelectTool('ocr-pdf')}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              OCR Tesseract
            </button>
          </div>
        </div>

        {/* Right Column: Unified Ingestion Dropzone */}
        <div className="lg:col-span-5">
          {analyzedDoc ? (
            /* Document quick inspection state */
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[210px]">
                      {analyzedDoc.file.name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {formatBytes(analyzedDoc.file.size)} · {analyzedDoc.pageCount} pagine {analyzedDoc.dimensionsMm && `· ${analyzedDoc.dimensionsMm}`}
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

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-semibold">
                  Operazioni consigliate per questo file:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    onClick={() => onSelectTool('pdf-to-docx')}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium truncate text-slate-800 dark:text-slate-200">Converti in Word</span>
                  </button>
                  <button
                    onClick={() => onSelectTool('pdf-to-xlsx')}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium truncate text-slate-800 dark:text-slate-200">Converti in Excel</span>
                  </button>
                  <button
                    onClick={() => onSelectTool('pdf-to-images')}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                    <span className="font-medium truncate text-slate-800 dark:text-slate-200">Estrai JPG / PNG</span>
                  </button>
                  <button
                    onClick={() => onSelectTool('flatten')}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium truncate text-slate-800 dark:text-slate-200">Appiattisci Moduli</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Fast Ingestion Drop Target */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`p-6 rounded-xl border border-dashed transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                dragActive
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-slate-800/80 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100/50'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs">
                <UploadCloud className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Trascina qui qualsiasi file PDF
                </p>
                <p className="text-[11px] text-slate-500">
                  Ispezione vettoriale istantanea & selezione modulo
                </p>
              </div>
              <label className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs">
                Sfoglia file
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
