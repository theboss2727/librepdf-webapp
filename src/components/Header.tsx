import React, { useState, useRef, useEffect } from 'react';
import {
  HardDrive,
  Cloud,
  FileCheck2,
  Sun,
  Moon,
  Search,
  Cpu,
  Lock,
  Zap,
  ChevronDown,
  Files,
  Scissors,
  LayoutGrid,
  RotateCw,
  PenTool,
  Stamp,
  Hash,
  Minimize2,
  ScanText,
  Image as ImageIcon,
  Images,
  FileText,
  FileCode,
  FileSpreadsheet,
  Table,
  Layers,
  Wrench,
  SunMedium,
  FileCode2,
  Sparkles,
  Palette,
  Eraser,
  ShieldCheck,
  BookOpen,
  GitCompare,
  Unlock,
  Tag,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useThemePreset } from '../context/ThemePresetProvider';
import type { ToolId } from '../types/pdf';

interface HeaderProps {
  onOpenVault: () => void;
  onOpenPythonStudio: () => void;
  onSelectTool: (id: ToolId) => void;
  onGoHome: () => void;
  selectedToolId: ToolId | null;
  vaultCount: number;
  cloudSyncActive: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onQuickSearchClick?: () => void;
  onOpenManual?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVault,
  onSelectTool,
  onGoHome,
  selectedToolId,
  vaultCount,
  cloudSyncActive,
  theme,
  onToggleTheme,
  onQuickSearchClick,
  onOpenManual,
}) => {
  const [openMenu, setOpenMenu] = useState<'pdf' | 'convert' | null>(null);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const { preset, setPreset, availablePresets } = useThemePreset();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const selectAndClose = (id: ToolId) => {
    onSelectTool(id);
    setOpenMenu(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Returns Home) */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => {
              onGoHome();
              setOpenMenu(null);
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Torna alla schermata principale"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/80 dark:bg-slate-900 dark:border-slate-700/80 text-rose-600 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <FileCheck2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Libre<span className="text-rose-600 dark:text-rose-500">PDF</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Visible Interactive Dropdown Menus */}
        <nav ref={navRef} className="flex items-center gap-2 shrink-0 relative">
          {/* Dropdown 1: Task PDF Locali */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'pdf' ? null : 'pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                openMenu === 'pdf'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              <span>Task PDF</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === 'pdf' ? 'rotate-180' : ''}`} />
            </button>

            {openMenu === 'pdf' && (
              <div className="absolute left-0 mt-2 w-[320px] sm:w-[520px] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 pb-1">
                    Organizza & Modifica
                  </div>
                  {[
                    { id: 'merge' as ToolId, label: 'Unisci PDF', icon: Files, color: 'text-rose-500' },
                    { id: 'split' as ToolId, label: 'Dividi & Ritaglia', icon: Scissors, color: 'text-amber-500' },
                    { id: 'compare-pdf' as ToolId, label: 'Confronta 2 PDF', icon: GitCompare, color: 'text-indigo-500' },
                    { id: 'organize' as ToolId, label: 'Tavolo di Montaggio', icon: LayoutGrid, color: 'text-purple-500' },
                    { id: 'rotate' as ToolId, label: 'Ruota Pagine', icon: RotateCw, color: 'text-sky-500' },
                    { id: 'edit-pdf' as ToolId, label: 'Editor & Firme PDF', icon: PenTool, color: 'text-rose-600' },
                    { id: 'watermark' as ToolId, label: 'Filigrana Diagonale', icon: Stamp, color: 'text-emerald-500' },
                    { id: 'page-numbers' as ToolId, label: 'Numerazione Pagine', icon: Hash, color: 'text-indigo-500' },
                    { id: 'flatten' as ToolId, label: 'Appiattisci Moduli', icon: Layers, color: 'text-blue-500' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectAndClose(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                        selectedToolId === item.id
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 pb-1">
                    Sicurezza, OCR & Immagini
                  </div>
                  {[
                    { id: 'verify-signature' as ToolId, label: 'Verifica Firme & Integrità', icon: ShieldCheck, color: 'text-blue-500' },
                    { id: 'sign-pdf' as ToolId, label: 'Firma & Timbro Certificato', icon: PenTool, color: 'text-emerald-500' },
                    { id: 'unlock-pdf' as ToolId, label: 'Sblocca PDF (Rimuovi Password)', icon: Unlock, color: 'text-amber-500' },
                    { id: 'metadata-pdf' as ToolId, label: 'Ispezione & Metadati Privacy', icon: Tag, color: 'text-violet-500' },
                    { id: 'redact-pdf' as ToolId, label: 'Oscuramento Permanente', icon: Eraser, color: 'text-rose-500' },
                    { id: 'compress' as ToolId, label: 'Comprimi PDF', icon: Minimize2, color: 'text-cyan-500' },
                    { id: 'protect' as ToolId, label: 'Proteggi con Password', icon: Lock, color: 'text-red-500' },
                    { id: 'ocr-pdf' as ToolId, label: 'OCR Tesseract (Locale)', icon: ScanText, color: 'text-blue-500' },
                    { id: 'pdf-to-images' as ToolId, label: 'PDF in Immagini (JPG/PNG)', icon: ImageIcon, color: 'text-orange-500' },
                    { id: 'images-to-pdf' as ToolId, label: 'Immagini in PDF', icon: Images, color: 'text-pink-500' },
                    { id: 'extract-text' as ToolId, label: 'Estrai Testo Vettoriale', icon: FileText, color: 'text-teal-500' },
                    { id: 'pdf-to-markdown' as ToolId, label: 'PDF in Markdown / HTML', icon: FileCode2, color: 'text-violet-500' },
                    { id: 'markdown-to-pdf' as ToolId, label: 'Markdown (.md) in PDF', icon: FileCode2, color: 'text-purple-500' },
                    { id: 'grayscale' as ToolId, label: 'Scala di Grigi', icon: SunMedium, color: 'text-slate-500' },
                    { id: 'repair' as ToolId, label: 'Ripara Struttura XRef', icon: Wrench, color: 'text-emerald-500' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectAndClose(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                        selectedToolId === item.id
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 2: Conversioni Alta Qualità */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'convert' ? null : 'convert')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                openMenu === 'convert'
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Convertitori Top</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === 'convert' ? 'rotate-180' : ''}`} />
            </button>

            {openMenu === 'convert' && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[310px] sm:w-[340px] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 pb-1">
                  Solo Motori Alta Fedeltà (1:1)
                </div>

                {[
                  {
                    id: 'cloud-converter' as ToolId,
                    label: 'Cloud Converter Universale',
                    sub: 'Pages, Numbers, Keynote, Word, Excel, Media (1500+)',
                    icon: Cloud,
                    color: 'text-sky-500',
                  },
                  {
                    id: 'pdf-to-docx' as ToolId,
                    label: 'PDF in Word (.docx)',
                    sub: 'Layout, colonne e tabelle fedeli 1:1',
                    icon: FileText,
                    color: 'text-blue-500',
                  },
                  {
                    id: 'docx-to-pdf' as ToolId,
                    label: 'Word (.docx, .doc) & Pages in PDF',
                    sub: 'Impaginazione identica a Microsoft Word',
                    icon: FileCode,
                    color: 'text-indigo-500',
                  },
                  {
                    id: 'pdf-to-xlsx' as ToolId,
                    label: 'PDF in Excel (.xlsx)',
                    sub: 'Estrazione tabellare ad alta precisione',
                    icon: FileSpreadsheet,
                    color: 'text-emerald-500',
                  },
                  {
                    id: 'xlsx-to-pdf' as ToolId,
                    label: 'Excel (.xlsx, .xls) in PDF',
                    sub: 'Mantiene bordi, colori e formattazione',
                    icon: Table,
                    color: 'text-teal-500',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectAndClose(item.id)}
                    className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                      selectedToolId === item.id
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 mt-0.5 ${item.color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => selectAndClose('reserved-python')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            title="Area Riservata Sviluppatore (Codice Python e build .exe)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Area Riservata</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search Shortcut Trigger */}
          <button
            onClick={onQuickSearchClick}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
            title="Cerca comandi o strumenti (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Cerca...</span>
            <kbd className="text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Manuale d'Uso Button */}
          {onOpenManual && (
            <button
              onClick={onOpenManual}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Consulta il Manuale d'Uso completo di LibrePDF"
            >
              <BookOpen className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Manuale</span>
            </button>
          )}

          {/* Theme Preset Palette Selector */}
          <div className="relative">
            <button
              onClick={() => setIsPresetOpen(!isPresetOpen)}
              className="flex items-center gap-1.5 p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
              title="Scegli tavolozza colori"
            >
              <Palette className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    availablePresets.find((p) => p.id === preset)?.colorHex || '#10b981',
                }}
              />
            </button>

            {isPresetOpen && (
              <div
                className="absolute right-0 mt-2 w-48 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 space-y-1"
                onMouseLeave={() => setIsPresetOpen(false)}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1">
                  Preset Tema
                </div>
                {availablePresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPreset(p.id);
                      setIsPresetOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      preset === p.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.colorHex }} />
                      <span>{p.name}</span>
                    </div>
                    {preset === p.id && <span className="text-emerald-500 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

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
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-mono">
                {vaultCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
