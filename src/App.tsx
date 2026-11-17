/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Header } from './components/Header';
import { EngineeringHero } from './components/EngineeringHero';
import { ToolGrid } from './components/ToolGrid';
import { CommandPalette } from './components/CommandPalette';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Footer } from './components/Footer';
import { useStudioTheme } from './hooks/useStudioTheme';
import { getAllVaultItems, getCloudSyncSettings } from './services/storageVault';
import { PDF_TOOLS } from './config/tools';
import type { ToolId } from './types/pdf';
import { ToastProvider } from './context/ToastProvider';
import { LoadingProvider } from './context/LoadingContext';
import { ThemePresetProvider } from './context/ThemePresetProvider';
import { ProgressBarOverlay } from './components/ProgressBarOverlay';
import { LoadingOverlay } from './components/LoadingOverlay';

// Code-split all heavy tools and modals for instant initial page load
const MergeTool = lazy(() => import('./components/tools/MergeTool').then((m) => ({ default: m.MergeTool })));
const SplitTool = lazy(() => import('./components/tools/SplitTool').then((m) => ({ default: m.SplitTool })));
const WatermarkTool = lazy(() => import('./components/tools/WatermarkTool').then((m) => ({ default: m.WatermarkTool })));
const PageNumbersTool = lazy(() => import('./components/tools/PageNumbersTool').then((m) => ({ default: m.PageNumbersTool })));
const RotateTool = lazy(() => import('./components/tools/RotateTool').then((m) => ({ default: m.RotateTool })));
const OrganizeTool = lazy(() => import('./components/tools/OrganizeTool').then((m) => ({ default: m.OrganizeTool })));
const ExtractTextTool = lazy(() => import('./components/tools/ExtractTextTool').then((m) => ({ default: m.ExtractTextTool })));
const OcrTool = lazy(() => import('./components/tools/OcrTool').then((m) => ({ default: m.OcrTool })));
const PdfToMarkdownTool = lazy(() => import('./components/tools/PdfToMarkdownTool').then((m) => ({ default: m.PdfToMarkdownTool })));
const PdfToImagesTool = lazy(() => import('./components/tools/PdfToImagesTool').then((m) => ({ default: m.PdfToImagesTool })));
const ImagesToPdfTool = lazy(() => import('./components/tools/ImagesToPdfTool').then((m) => ({ default: m.ImagesToPdfTool })));
const CompressTool = lazy(() => import('./components/tools/CompressTool').then((m) => ({ default: m.CompressTool })));
const ProtectTool = lazy(() => import('./components/tools/ProtectTool').then((m) => ({ default: m.ProtectTool })));
const GrayscaleTool = lazy(() => import('./components/tools/GrayscaleTool').then((m) => ({ default: m.GrayscaleTool })));
const FlattenTool = lazy(() => import('./components/tools/FlattenTool').then((m) => ({ default: m.FlattenTool })));
const RepairTool = lazy(() => import('./components/tools/RepairTool').then((m) => ({ default: m.RepairTool })));
const EditPdfTool = lazy(() => import('./components/tools/EditPdfTool').then((m) => ({ default: m.EditPdfTool })));
const ReservedPythonView = lazy(() => import('./components/ReservedPythonView').then((m) => ({ default: m.ReservedPythonView })));
const PdfToDocxTool = lazy(() => import('./components/tools/PdfToDocxTool').then((m) => ({ default: m.PdfToDocxTool })));
const DocxToPdfTool = lazy(() => import('./components/tools/DocxToPdfTool').then((m) => ({ default: m.DocxToPdfTool })));
const PdfToXlsxTool = lazy(() => import('./components/tools/PdfToXlsxTool').then((m) => ({ default: m.PdfToXlsxTool })));
const XlsxToPdfTool = lazy(() => import('./components/tools/XlsxToPdfTool').then((m) => ({ default: m.XlsxToPdfTool })));
const CloudConverterTool = lazy(() => import('./components/tools/CloudConverterTool').then((m) => ({ default: m.CloudConverterTool })));
const PythonStudioModal = lazy(() => import('./components/PythonStudioModal').then((m) => ({ default: m.PythonStudioModal })));
const VaultModal = lazy(() => import('./components/VaultModal').then((m) => ({ default: m.VaultModal })));
const SignPdfTool = lazy(() => import('./components/tools/SignPdfTool').then((m) => ({ default: m.SignPdfTool })));
const RedactPdfTool = lazy(() => import('./components/tools/RedactPdfTool').then((m) => ({ default: m.RedactPdfTool })));
const VerifySignatureTool = lazy(() => import('./components/tools/VerifySignatureTool').then((m) => ({ default: m.VerifySignatureTool })));
const UserManualModal = lazy(() => import('./components/UserManualModal').then((m) => ({ default: m.UserManualModal })));

export default function App() {
  const { theme, toggleTheme } = useStudioTheme();
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(null);
  const [isPythonStudioOpen, setIsPythonStudioOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isUserManualOpen, setIsUserManualOpen] = useState(false);
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
      // ignore errors
    }
  };

  useEffect(() => {
    refreshVaultStats();
  }, []);

  // Global Cmd/Ctrl+K shortcut to toggle command palette
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
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

  const selectedToolConfig = PDF_TOOLS.find(t => t.id === selectedToolId);

  return (
    <ThemePresetProvider>
      <ToastProvider>
        <LoadingProvider>
          <ProgressBarOverlay />
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
        {/* Header */}
        <Header
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenPythonStudio={() => handleSelectTool('reserved-python')}
          onSelectTool={handleSelectTool}
          onGoHome={() => setSelectedToolId(null)}
          selectedToolId={selectedToolId}
          vaultCount={vaultCount}
          cloudSyncActive={cloudSyncActive}
          theme={theme}
          onToggleTheme={toggleTheme}
          onQuickSearchClick={() => setIsCommandPaletteOpen(true)}
          onOpenManual={() => setIsUserManualOpen(true)}
        />

        {/* Main viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Navigation bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium">
              {selectedToolId ? (
                <>
                  <button
                    onClick={() => setSelectedToolId(null)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Tutti i Gruppi</span>
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedToolId === 'reserved-python' ? 'Area Riservata Python 🔒' : selectedToolConfig?.title}
                  </span>
                </>
              ) : (
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pannello Principale · Seleziona un gruppo qui sotto o dal menu a tendina →
                </span>
              )}
            </div>

            {/* Quick tool selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="quick-tool-select" className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                Menu Rapido:
              </label>
              <select
                id="quick-tool-select"
                value={selectedToolId || ''}
                onChange={e => {
                  const val = e.target.value as ToolId;
                  if (!val) setSelectedToolId(null);
                  else handleSelectTool(val);
                }}
                className="flex-1 sm:w-72 text-xs font-semibold py-2 px-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500 cursor-pointer shadow-2xs"
              >
                <option value="">🏠 Schermata Principale (Gruppi)</option>
                <optgroup label="✨ Conversioni Alta Qualità (Solo 1:1)">
                  <option value="cloud-converter">☁️ Cloud Converter Universale (FreeConvert)</option>
                  <option value="pdf-to-docx">📄 PDF in Word (.docx) — Alta Qualità</option>
                  <option value="docx-to-pdf">📝 Word (.docx, .doc) &amp; Pages in PDF</option>
                  <option value="pdf-to-xlsx">📊 PDF in Excel (.xlsx) — Alta Qualità</option>
                  <option value="xlsx-to-pdf">📈 Excel (.xlsx, .xls) in PDF</option>
                </optgroup>
                <optgroup label="⚡ Task PDF Locali (100% Privacy)">
                  <option value="merge">Unisci PDF</option>
                  <option value="split">Dividi &amp; Ritaglia</option>
                  <option value="organize">Tavolo di Montaggio</option>
                  <option value="rotate">Ruota Pagine</option>
                  <option value="edit-pdf">Modifica &amp; Firme PDF</option>
                  <option value="watermark">Filigrana Diagonale</option>
                  <option value="page-numbers">Numerazione Pagine</option>
                  <option value="flatten">Appiattisci Moduli</option>
                  <option value="compress">Comprimi PDF</option>
                  <option value="sign-pdf">✍️ Firma &amp; Timbro Certificato</option>
                  <option value="verify-signature">🔍 Verifica Firme &amp; Integrità SHA-256</option>
                  <option value="redact-pdf">🛡️ Oscuramento Permanente &amp; Sanificazione</option>
                  <option value="protect">Proteggi con Password</option>
                  <option value="ocr-pdf">OCR Tesseract (Locale)</option>
                  <option value="pdf-to-images">PDF in Immagini (JPG/PNG)</option>
                  <option value="images-to-pdf">Immagini in PDF</option>
                  <option value="extract-text">Estrai Testo Vettoriale</option>
                  <option value="pdf-to-markdown">PDF in Markdown / HTML</option>
                  <option value="grayscale">Scala di Grigi</option>
                  <option value="repair">Ripara Struttura XRef</option>
                </optgroup>
                <optgroup label="🔒 Sviluppatore">
                  <option value="reserved-python">🔒 Area Riservata Python &amp; Build .exe</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Tool rendering */}
          {selectedToolId ? (
            <div className="space-y-5 animate-in fade-in">
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-5 shadow-xs">
                <Suspense
                  fallback={
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Caricamento modulo in corso...
                      </span>
                    </div>
                  }
                >
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
                  <WatermarkTool onSuccess={refreshVaultStats} onOpenPythonStudio={() => setIsPythonStudioOpen(true)} />
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
                  <OcrTool onSuccess={refreshVaultStats} onOpenPythonStudio={() => setIsPythonStudioOpen(true)} />
                )}
                {selectedToolId === 'pdf-to-markdown' && (
                  <PdfToMarkdownTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'pdf-to-docx' && (
                  <PdfToDocxTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'docx-to-pdf' && (
                  <DocxToPdfTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'pdf-to-xlsx' && (
                  <PdfToXlsxTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'xlsx-to-pdf' && (
                  <XlsxToPdfTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'pdf-to-images' && (
                  <PdfToImagesTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'images-to-pdf' && (
                  <ImagesToPdfTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'cloud-converter' && (
                  <CloudConverterTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'compress' && (
                  <CompressTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'protect' && (
                  <ProtectTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'sign-pdf' && (
                  <SignPdfTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'verify-signature' && (
                  <VerifySignatureTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'redact-pdf' && (
                  <RedactPdfTool onSuccess={refreshVaultStats} />
                )}
                {selectedToolId === 'grayscale' && (
                  <GrayscaleTool onSuccess={refreshVaultStats} onOpenPythonStudio={() => setIsPythonStudioOpen(true)} />
                )}
                {selectedToolId === 'flatten' && (
                  <FlattenTool onSuccess={refreshVaultStats} onOpenPythonStudio={() => setIsPythonStudioOpen(true)} />
                )}
                {selectedToolId === 'repair' && (
                  <RepairTool onSuccess={refreshVaultStats} onOpenPythonStudio={() => setIsPythonStudioOpen(true)} />
                )}
                </Suspense>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <EngineeringHero onSelectTool={handleSelectTool} onOpenPythonStudio={() => setIsPythonStudioOpen(true)} />
              <ToolGrid onSelectTool={handleSelectTool} selectedToolId={selectedToolId} />
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer
          onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenManual={() => setIsUserManualOpen(true)}
        />

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectTool={handleSelectTool}
          onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenManual={() => setIsUserManualOpen(true)}
        />

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Modals */}
        <Suspense fallback={null}>
          <PythonStudioModal
            isOpen={isPythonStudioOpen}
            onClose={() => setIsPythonStudioOpen(false)}
            currentToolId={selectedToolId || 'watermark'}
          />
          <VaultModal
            isOpen={isVaultOpen}
            onClose={() => setIsVaultOpen(false)}
            onItemUpdated={refreshVaultStats}
          />
          <UserManualModal
            isOpen={isUserManualOpen}
            onClose={() => setIsUserManualOpen(false)}
            onOpenPythonStudio={() => setIsPythonStudioOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
          />
        </Suspense>

        {/* Global Loading Overlay */}
        <LoadingOverlay />
      </div>
        </LoadingProvider>
      </ToastProvider>
    </ThemePresetProvider>
  );
}
