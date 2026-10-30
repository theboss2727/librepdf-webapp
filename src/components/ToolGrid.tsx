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
  Terminal,
  Database,
  ScanText,
  FileCode2,
  FileCode,
  FileSpreadsheet,
  Table,
  Search,
  ArrowRight,
  List,
  Grid,
  SunMedium,
  Layers,
  Wrench,
  PenTool,
} from 'lucide-react';
import { PDF_TOOLS } from '../config/tools';
import type { ToolId, ToolCategory } from '../types/pdf';

interface ToolGridProps {
  onSelectTool: (id: ToolId) => void;
  selectedToolId: ToolId | null;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Files,
  Scissors,
  LayoutGrid,
  RotateCw,
  PenTool,
  Stamp,
  Hash,
  FileText,
  FileCode,
  FileSpreadsheet,
  Table,
  Image: ImageIcon,
  Images,
  Minimize2,
  Lock,
  Terminal,
  Database,
  ScanText,
  FileCode2,
  SunMedium,
  Layers,
  Wrench,
};

const TOOL_COLOR_STYLES: Record<string, string> = {
  merge: 'bg-rose-50 text-rose-600 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40',
  split: 'bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
  'edit-pdf': 'bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
  watermark: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
  'page-numbers': 'bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40',
  rotate: 'bg-sky-50 text-sky-600 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/40',
  organize: 'bg-purple-50 text-purple-600 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40',
  'ocr-pdf': 'bg-blue-50 text-blue-600 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40',
  'pdf-to-docx': 'bg-blue-50 text-blue-600 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40',
  'docx-to-pdf': 'bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40',
  'pdf-to-xlsx': 'bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
  'xlsx-to-pdf': 'bg-teal-50 text-teal-600 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/40',
  'extract-text': 'bg-teal-50 text-teal-600 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/40',
  'pdf-to-markdown': 'bg-violet-50 text-violet-600 border-violet-200/80 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/40',
  'pdf-to-images': 'bg-orange-50 text-orange-600 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/40',
  'images-to-pdf': 'bg-pink-50 text-pink-600 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900/40',
  compress: 'bg-cyan-50 text-cyan-600 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900/40',
  protect: 'bg-red-50 text-red-600 border-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40',
  grayscale: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  flatten: 'bg-blue-50 text-blue-600 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40',
  repair: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
  vault: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'python-studio': 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40',
};

export const ToolGrid: React.FC<ToolGridProps> = ({
  onSelectTool,
  selectedToolId,
}) => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  const categories: { id: ToolCategory; label: string }[] = [
    { id: 'all', label: 'Tutti i Moduli' },
    { id: 'organize', label: 'Organizzazione Flussi' },
    { id: 'convert', label: 'Conversione & OCR' },
    { id: 'edit', label: 'Manipolazione & Filigrana' },
    { id: 'security', label: 'Sicurezza & Storage' },
    { id: 'developer', label: 'Python & .EXE' },
  ];

  const filteredTools = PDF_TOOLS.filter((tool) => {
    const matchesCategory =
      activeCategory === 'all' || tool.category === activeCategory;
    const matchesSearch =
      tool.title.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      (tool.technicalSpec && tool.technicalSpec.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Control Bar: Categories + View Switcher + Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-1">
        {/* Category Segmented Control */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View mode toggle + Quick filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtra moduli per nome o specifica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 shadow-2xs"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vista Griglia"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vista Compatta"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Compact View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredTools.map((tool) => {
            const IconComp = ICON_MAP[tool.iconName] || Files;
            const isSelected = selectedToolId === tool.id;
            const colorClass = TOOL_COLOR_STYLES[tool.id] || 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`relative flex flex-col justify-between p-4.5 rounded-2xl border transition-all cursor-pointer group bg-white dark:bg-slate-900 ${
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div>
                  {/* Card Header: Icon + Technical Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs ${colorClass}`}>
                      <IconComp className="w-4.5 h-4.5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tool.shortcutKey && (
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {tool.shortcutKey}
                        </span>
                      )}
                      {tool.badge && (
                        <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">
                    {tool.subtitle}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Card Footer: Spec string + Subtle Arrow */}
                <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400">
                  <span className="truncate pr-2 font-medium">{tool.technicalSpec || 'Wasm Pipeline'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          {filteredTools.map((tool) => {
            const IconComp = ICON_MAP[tool.iconName] || Files;
            const colorClass = TOOL_COLOR_STYLES[tool.id] || 'bg-slate-100 text-slate-700 border-slate-200';
            return (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors">
                        {tool.title}
                      </span>
                      {tool.badge && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {tool.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="hidden md:inline font-mono text-[10px] text-slate-400">
                    {tool.technicalSpec}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
