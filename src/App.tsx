/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  HardDrive,
  Code2,
  Lock,
  ArrowLeft,
  ChevronRight,
  Terminal,
  Cpu,
} from 'lucide-react';
import { Header } from './components/Header';
import { EngineeringHero } from './components/EngineeringHero';
import { ToolGrid } from './components/ToolGrid';
import { CommandPalette } from './components/CommandPalette';
import { MergeTool } from './components/tools/MergeTool';
import { SplitTool } from './components/tools/SplitTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import { PageNumbersTool } from './components/tools/PageNumbersTool';
import { RotateTool } from './components/tools/RotateTool';
import { OrganizeTool } from './components/tools/OrganizeTool';
import { ExtractTextTool } from './components/tools/ExtractTextTool';
import { OcrTool } from './components/tools/OcrTool';
import { PdfToMarkdownTool } from './components/tools/PdfToMarkdownTool';
import { PdfToImagesTool } from './components/tools/PdfToImagesTool';
import { ImagesToPdfTool } from './components/tools/ImagesToPdfTool';
import { CompressTool } from './components/tools/CompressTool';
import { ProtectTool } from './components/tools/ProtectTool';
import { GrayscaleTool } from './components/tools/GrayscaleTool';
import { FlattenTool } from './components/tools/FlattenTool';
import { RepairTool } from './components/tools/RepairTool';
import { EditPdfTool } from './components/tools/EditPdfTool';
import { ReservedPythonView } from './components/ReservedPythonView';
import { PdfToDocxTool } from './components/tools/PdfToDocxTool';
import { DocxToPdfTool } from './components/tools/DocxToPdfTool';
import { PdfToXlsxTool } from './components/tools/PdfToXlsxTool';
import { XlsxToPdfTool } from './components/tools/XlsxToPdfTool';
import { PythonStudioModal } from './components/PythonStudioModal';
import { VaultModal } from './components/VaultModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Footer } from './components/Footer';
import { useStudioTheme } from './hooks/useStudioTheme';
import { getAllVaultItems, getCloudSyncSettings } from './services/storageVault';
import { PDF_TOOLS } from './config/tools';
import type { ToolId } from './types/pdf';

export default function App() {
  const { theme, toggleTheme } = useStudioTheme();
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(null);
  const [isPythonStudioOpen, setIsPythonStudioOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [vaultCount, setVaultCount] = useState(0);
  const [cloudSyncActive, setCloudSyncActive] = useState(false);

  const refreshVaultStats = async () => {
    try {
      const items = await getAllVaultItems();
      setVaultCount(items.length);
      const settings = getCloudSyncSettings();
      setCloudSyncActive(settings.enabled);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshVaultStats();
  }, []);

  // Listen for global Cmd/Ctrl + K shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSelectTool = (id: ToolId) => {
    if (id === 'python-studio' || id === 'reserved-python') {
      setSelectedToolId('reserved-python');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (id === 'vault') {
      setIsVaultOpen(true);
      return;
    }
    setSelectedToolId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedToolConfig = PDF_TOOLS.find((t) => t.id === selectedToolId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Application Header */}
      <Header
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenPythonStudio={() => handleSelectTool('reserved-python')}
        onSelectTool={handleSelectTool}
        vaultCount={vaultCount}
        cloudSyncActive={cloudSyncActive}
        theme={theme}
        onToggleTheme={toggleTheme}
        onQuickSearchClick={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {selectedToolId ? (
          /* Active Workstation Stage */
          <div className="space-y-5 animate-in fade-in">
            {/* Context Breadcrumb & Quick Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  onClick={() => setSelectedToolId(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Workstation</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Moduli</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedToolId === 'reserved-python' ? 'Area Riservata Sviluppatore 🔒' : selectedToolConfig?.title}
                </span>
                {selectedToolConfig?.technicalSpec && (
                  <span className="hidden md:inline font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 ml-2">
                    {selectedToolConfig.technicalSpec}
                  </span>
                )}
              </div>

              {/* Quick Jump Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedToolId || ''}
                  onChange={(e) => handleSelectTool(e.target.value as ToolId)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="reserved-python">🔒 Area Riservata Python</option>
                  {PDF_TOOLS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Tool Canvas */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-5 shadow-xs">
              {selectedToolId === 'reserved-python' && (
                <ReservedPythonView onBackToTools={() => setSelectedToolId(null)} />
              )}
              {selectedToolId === 'edit-pdf' && (
                <EditPdfTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'merge' && (
                <MergeTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'split' && (
                <SplitTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'watermark' && (
                <WatermarkTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'page-numbers' && (
                <PageNumbersTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'rotate' && (
                <RotateTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'organize' && (
                <OrganizeTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'extract-text' && (
                <ExtractTextTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                  onSwitchToOcr={() => setSelectedToolId('ocr-pdf')}
                />
              )}
              {selectedToolId === 'ocr-pdf' && (
                <OcrTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'pdf-to-markdown' && (
                <PdfToMarkdownTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'pdf-to-docx' && (
                <PdfToDocxTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'docx-to-pdf' && (
                <DocxToPdfTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'pdf-to-xlsx' && (
                <PdfToXlsxTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'xlsx-to-pdf' && (
                <XlsxToPdfTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'pdf-to-images' && (
                <PdfToImagesTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'images-to-pdf' && (
                <ImagesToPdfTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'compress' && (
                <CompressTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'protect' && (
                <ProtectTool onSuccess={refreshVaultStats} />
              )}
              {selectedToolId === 'grayscale' && (
                <GrayscaleTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'flatten' && (
                <FlattenTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
              {selectedToolId === 'repair' && (
                <RepairTool
                  onSuccess={refreshVaultStats}
                  onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
                />
              )}
            </div>
          </div>
        ) : (
          /* Homepage: Engineering Hero + Modular Tool Grid */
          <div className="space-y-8">
            <EngineeringHero
              onSelectTool={handleSelectTool}
              onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
            />

            <ToolGrid
              onSelectTool={handleSelectTool}
              selectedToolId={selectedToolId}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
      />

      {/* Quick Command Palette (Cmd/Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTool={handleSelectTool}
        onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Python Studio Modal */}
      <PythonStudioModal
        isOpen={isPythonStudioOpen}
        onClose={() => setIsPythonStudioOpen(false)}
        currentToolId={selectedToolId || 'watermark'}
      />

      {/* Local & Cloud Sync Vault Modal */}
      <VaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        onItemUpdated={refreshVaultStats}
      />
    </div>
  );
}
