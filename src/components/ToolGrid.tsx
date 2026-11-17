import React, { useState } from 'react';
import {
  Files,
  Scissors,
  LayoutGrid,
  RotateCw,
  Stamp,
  Hash,
  FileText,
  Image as ImageIcon,
  Images,
  Minimize2,
  Lock,
  Database,
  ScanText,
  FileCode2,
  FileCode,
  FileSpreadsheet,
  Table,
  Search,
  ArrowRight,
  SunMedium,
  Layers,
  Wrench,
  PenTool,
  Cloud,
  Cpu,
  Zap,
  Sparkles,
  Eraser,
  ShieldCheck,
  GitCompare,
  Unlock,
  Tag,
} from 'lucide-react';
import type { ToolId } from '../types/pdf';

interface ToolGridProps {
  onSelectTool: (id: ToolId) => void;
  selectedToolId: ToolId | null;
}

interface GroupedItem {
  id: ToolId;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  badge?: string;
}

const PDF_ORGANIZE_ITEMS: GroupedItem[] = [
  { id: 'merge', title: 'Unisci PDF', subtitle: 'Combina più PDF in uno', icon: Files, iconColor: 'text-rose-500' },
  { id: 'split', title: 'Dividi & Ritaglia', subtitle: 'Estrai pagine o intervalli', icon: Scissors, iconColor: 'text-amber-500' },
  { id: 'compare-pdf', title: 'Confronta 2 PDF', subtitle: 'Visual Diff & differenze testo', icon: GitCompare, iconColor: 'text-indigo-500', badge: 'Novità' },
  { id: 'organize', title: 'Tavolo di Montaggio', subtitle: 'Riordina ed elimina pagine', icon: LayoutGrid, iconColor: 'text-purple-500' },
  { id: 'rotate', title: 'Ruota Pagine', subtitle: 'Orientamento 90° / 180°', icon: RotateCw, iconColor: 'text-sky-500' },
];

const PDF_EDIT_SECURITY_ITEMS: GroupedItem[] = [
  { id: 'verify-signature', title: 'Verifica Firme & Integrità', subtitle: 'Audit PAdES e Checksum SHA-256', icon: ShieldCheck, iconColor: 'text-blue-500', badge: 'Audit' },
  { id: 'sign-pdf', title: 'Firma & Timbro Certificato', subtitle: 'Data, ora e hash SHA-256', icon: PenTool, iconColor: 'text-emerald-500', badge: 'Certificato' },
  { id: 'unlock-pdf', title: 'Sblocca PDF', subtitle: 'Rimuovi password conosciuta', icon: Unlock, iconColor: 'text-amber-500', badge: 'Novità' },
  { id: 'metadata-pdf', title: 'Ispezione & Metadati', subtitle: 'Proprietà e Privacy Sanitizer', icon: Tag, iconColor: 'text-violet-500', badge: 'Novità' },
  { id: 'redact-pdf', title: 'Oscuramento Permanente', subtitle: 'Cancella dati sensibili e metadati', icon: Eraser, iconColor: 'text-rose-500', badge: 'Sanitizer' },
  { id: 'edit-pdf', title: 'Modifica & Firme PDF', subtitle: 'Testi, timbri e firma a mano', icon: PenTool, iconColor: 'text-rose-600' },
  { id: 'watermark', title: 'Filigrana Diagonale', subtitle: 'Timbro di riservatezza 45°', icon: Stamp, iconColor: 'text-emerald-500' },
  { id: 'page-numbers', title: 'Numerazione Pagine', subtitle: 'Inserisci numeri di pagina', icon: Hash, iconColor: 'text-indigo-500' },
  { id: 'flatten', title: 'Appiattisci Moduli', subtitle: 'Consolida firme e campi form', icon: Layers, iconColor: 'text-blue-500' },
  { id: 'compress', title: 'Comprimi PDF', subtitle: 'Riduci peso del documento', icon: Minimize2, iconColor: 'text-cyan-500' },
  { id: 'protect', title: 'Proteggi con Password', subtitle: 'Cifratura locale standard', icon: Lock, iconColor: 'text-red-500' },
];

const PDF_EXTRACT_MEDIA_ITEMS: GroupedItem[] = [
  { id: 'ocr-pdf', title: 'OCR Tesseract (Locale)', subtitle: 'Testo da scansioni e foto', icon: ScanText, iconColor: 'text-blue-500' },
  { id: 'pdf-to-images', title: 'PDF in Immagini (JPG/PNG)', subtitle: 'Esporta pagine ad alta DPI', icon: ImageIcon, iconColor: 'text-orange-500' },
  { id: 'images-to-pdf', title: 'Immagini in PDF', subtitle: 'Unisci foto JPG/PNG in PDF', icon: Images, iconColor: 'text-pink-500' },
  { id: 'extract-text', title: 'Estrai Testo Puro', subtitle: 'Testo vettoriale e metadati', icon: FileText, iconColor: 'text-teal-500' },
  { id: 'pdf-to-markdown', title: 'PDF in Markdown / HTML', subtitle: 'Esporta per editor e web', icon: FileCode2, iconColor: 'text-violet-500' },
  { id: 'grayscale', title: 'Scala di Grigi', subtitle: 'Conversione stampa B/N', icon: SunMedium, iconColor: 'text-slate-500' },
  { id: 'repair', title: 'Ripara Struttura XRef', subtitle: 'Recupera PDF danneggiati', icon: Wrench, iconColor: 'text-emerald-600' },
];

const CONVERSION_TOP_ITEMS: GroupedItem[] = [
  {
    id: 'cloud-converter',
    title: 'Cloud Converter Universale',
    subtitle: 'Pages, Word, Excel, PPTX, HEIC e oltre 1500 formati 1:1',
    icon: Cloud,
    iconColor: 'text-sky-500',
    badge: '1500+ Formati',
  },
  {
    id: 'pdf-to-docx',
    title: 'PDF in Word (.docx)',
    subtitle: 'Layout, colonne, tabelle e stili fedeli 1:1 pronti da modificare',
    icon: FileText,
    iconColor: 'text-blue-500',
    badge: 'Alta Qualità',
  },
  {
    id: 'docx-to-pdf',
    title: 'Word (.docx, .doc) & Pages in PDF',
    subtitle: 'Impaginazione e font identici al documento originale',
    icon: FileCode,
    iconColor: 'text-indigo-500',
    badge: 'Alta Qualità',
  },
  {
    id: 'pdf-to-xlsx',
    title: 'PDF in Excel (.xlsx)',
    subtitle: 'Estrazione precisa di tabelle, celle e colonne in Excel',
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-500',
    badge: 'Alta Qualità',
  },
  {
    id: 'xlsx-to-pdf',
    title: 'Excel (.xlsx, .xls, .csv) in PDF',
    subtitle: 'Stampa vettoriale fedele 1:1 senza tagli o sovrapposizioni',
    icon: Table,
    iconColor: 'text-teal-500',
    badge: 'Alta Qualità',
  },
];

export const ToolGrid: React.FC<ToolGridProps> = ({
  onSelectTool,
  selectedToolId,
}) => {
  const [search, setSearch] = useState('');

  const filterFn = (item: GroupedItem) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
  };

  const renderRow = (item: GroupedItem) => {
    const isSelected = selectedToolId === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onSelectTool(item.id)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
          isSelected
            ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 shadow-2xs'
            : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shrink-0">
            <item.icon className={`w-4 h-4 ${item.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {item.title}
              </span>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-100/80 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shrink-0">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {item.subtitle}
            </p>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>
    );
  };

  const orgFiltered = PDF_ORGANIZE_ITEMS.filter(filterFn);
  const editFiltered = PDF_EDIT_SECURITY_ITEMS.filter(filterFn);
  const mediaFiltered = PDF_EXTRACT_MEDIA_ITEMS.filter(filterFn);
  const convFiltered = CONVERSION_TOP_ITEMS.filter(filterFn);

  const hasPdfResults = orgFiltered.length > 0 || editFiltered.length > 0 || mediaFiltered.length > 0;

  return (
    <div className="space-y-6">
      {/* Simple Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Tutte le funzioni sono raggruppate per tipologia ed esecuzione garantita.
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca modulo (es. unisci, word, ocr)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 shadow-2xs"
          />
        </div>
      </div>

      {/* GROUP 1: Conversioni Alta Qualità (Solo Top Fidelity) */}
      {convFiltered.length > 0 && (
        <section className="rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/70 dark:border-sky-800">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  1. Conversioni Documenti (Solo Alta Qualità 1:1)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tutte le conversioni vengono eseguite automaticamente con motori ad alta fedeltà 1:1.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {convFiltered.map(renderRow)}
          </div>
        </section>
      )}

      {/* GROUP 2: Task PDF Locali (100% Privacy & Istantanei) */}
      {hasPdfResults && (
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/70 dark:border-rose-800">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  2. Task PDF Locali (100% Privacy & Zero Limiti)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manipolazione nativa ad alte prestazioni sul tuo dispositivo: nessun upload e nessun limite di peso file.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sub-Group A: Organizza Pagine */}
            {orgFiltered.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 px-1">
                  Organizza Flussi
                </h3>
                <div className="space-y-2">{orgFiltered.map(renderRow)}</div>
              </div>
            )}

            {/* Sub-Group B: Modifica & Sicurezza */}
            {editFiltered.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 px-1">
                  Modifica, Firme & Sicurezza
                </h3>
                <div className="space-y-2">{editFiltered.map(renderRow)}</div>
              </div>
            )}

            {/* Sub-Group C: OCR, Testo & Immagini */}
            {mediaFiltered.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 px-1">
                  OCR, Testo & Immagini
                </h3>
                <div className="space-y-2">{mediaFiltered.map(renderRow)}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* GROUP 3: Archivio & Strumenti Sviluppatore */}
      {!search.trim() && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => onSelectTool('vault')}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer group text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Vault Locale (Archivio IndexedDB)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Recupera o riscarica tutti i file elaborati in precedenza
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => onSelectTool('reserved-python')}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 transition cursor-pointer group text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Area Riservata Python & Build .exe
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sorgenti desktop PyQt6 + PyMuPDF protetti da PIN
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
