import React, { useState, useEffect, useRef } from 'react';
import {
  GitCompare,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  SplitSquareVertical,
  MinusCircle,
  PlusCircle,
  FileCheck,
} from 'lucide-react';
import { extractTextFromPdf } from '../../services/pdfEngine';
import { pdfjsLib } from '../../services/pdfjsSetup';
import { computeWordDiff, type DiffToken, type ComparisonResult } from '../../utils/textDiff';

export const ComparePdfTool: React.FC = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'text-diff'>('side-by-side');

  // Canvas refs for visual rendering
  const canvasARef = useRef<HTMLCanvasElement | null>(null);
  const canvasBRef = useRef<HTMLCanvasElement | null>(null);

  const [pdfDocA, setPdfDocA] = useState<any>(null);
  const [pdfDocB, setPdfDocB] = useState<any>(null);

  const handleCompare = async () => {
    if (!fileA || !fileB) return;

    setIsProcessing(true);
    setProgressMsg('Caricamento documenti e decodifica stream...');

    try {
      // 1. Load pdfjs documents
      const bufA = await fileA.arrayBuffer();
      const bufB = await fileB.arrayBuffer();

      const docA = await pdfjsLib.getDocument({ data: new Uint8Array(bufA) }).promise;
      const docB = await pdfjsLib.getDocument({ data: new Uint8Array(bufB) }).promise;

      setPdfDocA(docA);
      setPdfDocB(docB);

      // 2. Extract texts
      setProgressMsg('Estrazione testo vettoriale documento A...');
      const textAData = await extractTextFromPdf(fileA);

      setProgressMsg('Estrazione testo vettoriale documento B...');
      const textBData = await extractTextFromPdf(fileB);

      // 3. Compare pages
      setProgressMsg('Calcolo differenze testuali e metriche di similarità...');
      const maxPages = Math.max(textAData.pages.length, textBData.pages.length);
      const pagesComparison = [];

      let totalAdded = 0;
      let totalRemoved = 0;

      for (let p = 1; p <= maxPages; p++) {
        const pageA = textAData.pages.find((pg) => pg.pageNumber === p)?.text || '';
        const pageB = textBData.pages.find((pg) => pg.pageNumber === p)?.text || '';

        const tokens = computeWordDiff(pageA, pageB);
        const hasChanges = pageA !== pageB;

        for (const tok of tokens) {
          if (tok.type === 'added') totalAdded += tok.value.trim().split(/\s+/).filter(Boolean).length;
          if (tok.type === 'removed') totalRemoved += tok.value.trim().split(/\s+/).filter(Boolean).length;
        }

        pagesComparison.push({
          pageNumber: p,
          tokens,
          hasChanges,
          textA: pageA,
          textB: pageB,
        });
      }

      const isIdentical =
        textAData.fullText === textBData.fullText &&
        fileA.size === fileB.size &&
        textAData.pages.length === textBData.pages.length;

      setComparison({
        docAName: fileA.name,
        docBName: fileB.name,
        docAPages: textAData.pages.length,
        docBPages: textBData.pages.length,
        docASize: fileA.size,
        docBSize: fileB.size,
        isIdentical,
        totalWordsA: textAData.wordCount,
        totalWordsB: textBData.wordCount,
        addedCount: totalAdded,
        removedCount: totalRemoved,
        pagesComparison,
      });

      setCurrentPage(1);
    } catch (err: any) {
      console.error('Errore durante il confronto PDF:', err);
      alert('Impossibile confrontare i documenti: ' + (err?.message || 'Errore decodifica'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Render current page onto canvases
  useEffect(() => {
    if (!comparison) return;

    const renderPage = async (doc: any, pageNum: number, canvas: HTMLCanvasElement | null) => {
      if (!doc || !canvas) return;
      if (pageNum > doc.numPages) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 300;
          canvas.height = 400;
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, 300, 400);
          ctx.fillStyle = '#64748b';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Pagina ${pageNum} inesistente`, 150, 200);
        }
        return;
      }

      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (e) {
        console.warn('Errore rendering canvas anteprima:', e);
      }
    };

    renderPage(pdfDocA, currentPage, canvasARef.current);
    renderPage(pdfDocB, currentPage, canvasBRef.current);
  }, [comparison, currentPage, pdfDocA, pdfDocB, viewMode]);

  const handleExportReport = () => {
    if (!comparison) return;
    let md = `# Report Confronto Documenti PDF\n\n`;
    md += `- **Documento A (Originale):** ${comparison.docAName} (${comparison.docAPages} pagine, ${(comparison.docASize / 1024).toFixed(1)} KB)\n`;
    md += `- **Documento B (Revisione):** ${comparison.docBName} (${comparison.docBPages} pagine, ${(comparison.docBSize / 1024).toFixed(1)} KB)\n`;
    md += `- **Esito:** ${comparison.isIdentical ? 'Documenti IDENTICI al 100%' : 'Rilevate DISCREPANZE'}\n`;
    md += `- **Parole aggiunte:** ~${comparison.addedCount}\n`;
    md += `- **Parole rimosse:** ~${comparison.removedCount}\n\n`;
    md += `## Dettaglio Differenze per Pagina\n\n`;

    comparison.pagesComparison.forEach((p) => {
      md += `### Pagina ${p.pageNumber}: ${p.hasChanges ? 'MODIFICATA' : 'Invariata'}\n`;
      if (p.hasChanges) {
        md += `\`\`\`diff\n`;
        p.tokens.forEach((t) => {
          if (t.type === 'added') md += `+ ${t.value.trim()}\n`;
          else if (t.type === 'removed') md += `- ${t.value.trim()}\n`;
        });
        md += `\`\`\`\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_Confronto_${comparison.docAName.replace(/\.pdf$/i, '')}_vs_${comparison.docBName.replace(/\.pdf$/i, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFileA(null);
    setFileB(null);
    setComparison(null);
    setPdfDocA(null);
    setPdfDocB(null);
    setCurrentPage(1);
  };

  const currentPageData = comparison?.pagesComparison.find((p) => p.pageNumber === currentPage);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Tool Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 border border-indigo-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confronta 2 PDF (Visual & Text Diff)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                100% Client-Side Wasm
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ispeziona e confronta visivamente due versioni di uno stesso documento, identificando aggiunte, cancellazioni e modifiche riga per riga.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Phase */}
      {!comparison && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box Doc A */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center space-y-3 relative hover:border-indigo-500 transition">
              <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileA(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {fileA ? fileA.name : 'Documento A (Versione Originale)'}
                </p>
                <p className="text-xs text-slate-500">
                  {fileA ? `${(fileA.size / 1024).toFixed(1)} KB` : 'Trascina o clicca per selezionare il primo PDF'}
                </p>
              </div>
              {fileA && (
                <span className="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> File A Caricato
                </span>
              )}
            </div>

            {/* Box Doc B */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center space-y-3 relative hover:border-indigo-500 transition">
              <input
                type="file"
                accept=".pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileB(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold">
                B
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {fileB ? fileB.name : 'Documento B (Versione Modificata / Nuova)'}
                </p>
                <p className="text-xs text-slate-500">
                  {fileB ? `${(fileB.size / 1024).toFixed(1)} KB` : 'Trascina o clicca per selezionare il secondo PDF'}
                </p>
              </div>
              {fileB && (
                <span className="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> File B Caricato
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={!fileA || !fileB || isProcessing}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{progressMsg || 'Confronto in corso...'}</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4" />
                  <span>Avvia Confronto Dettagliato</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results Phase */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              comparison.isIdentical
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  comparison.isIdentical
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {comparison.isIdentical ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-base">
                  {comparison.isIdentical
                    ? 'I due documenti sono IDENTICI al 100%'
                    : 'Rilevate differenze tra le due versioni'}
                </h3>
                <p className="text-xs opacity-80">
                  {comparison.isIdentical
                    ? 'Nessuna discrepanza nel testo, nel numero di pagine o nei contenuti.'
                    : `Trovate ~${comparison.addedCount} parole aggiunte e ~${comparison.removedCount} parole rimosse nel flusso testuale.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                onClick={handleExportReport}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Scarica Report (.md)</span>
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 text-slate-600 dark:text-slate-400 transition"
                title="Nuovo confronto"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Pagine Doc A / B</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {comparison.docAPages} vs {comparison.docBPages}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Peso Doc A / B</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {(comparison.docASize / 1024).toFixed(1)} KB vs {(comparison.docBSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold flex items-center gap-1">
                <PlusCircle className="w-3 h-3" /> Aggiunte nel Doc B
              </span>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                +{comparison.addedCount} parole
              </p>
            </div>
            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-semibold flex items-center gap-1">
                <MinusCircle className="w-3 h-3" /> Rimosse dal Doc A
              </span>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                -{comparison.removedCount} parole
              </p>
            </div>
          </div>

          {/* Controls: Mode switcher & Page Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'side-by-side'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>Vista Affiancata</span>
              </button>
              <button
                onClick={() => setViewMode('text-diff')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'text-diff'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Evidenziazione Testuale</span>
              </button>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pagina {currentPage} di {comparison.pagesComparison.length}
                {currentPageData?.hasChanges && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Modificata
                  </span>
                )}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(comparison.pagesComparison.length, p + 1))}
                disabled={currentPage >= comparison.pagesComparison.length}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Side-by-Side Visual View */}
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Doc A Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    Doc A: {comparison.docAName}
                  </span>
                  <span className="text-slate-400 font-mono">Pag. {currentPage}</span>
                </div>
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[480px] overflow-auto shadow-inner">
                  <canvas ref={canvasARef} className="max-w-full rounded-lg shadow-md" />
                </div>
              </div>

              {/* Doc B Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                    Doc B: {comparison.docBName}
                  </span>
                  <span className="text-slate-400 font-mono">Pag. {currentPage}</span>
                </div>
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[480px] overflow-auto shadow-inner">
                  <canvas ref={canvasBRef} className="max-w-full rounded-lg shadow-md" />
                </div>
              </div>
            </div>
          )}

          {/* Text Diff View */}
          {viewMode === 'text-diff' && currentPageData && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Differenze Testuali a Confronto • Pagina {currentPage}
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block"></span>
                    Aggiunto in Doc B
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 font-semibold">
                    <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40 inline-block"></span>
                    Rimosso da Doc A
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {currentPageData.tokens.map((token, idx) => {
                  if (token.type === 'added') {
                    return (
                      <span
                        key={idx}
                        className="bg-emerald-500/20 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-1 rounded border border-emerald-500/30"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  if (token.type === 'removed') {
                    return (
                      <span
                        key={idx}
                        className="bg-rose-500/20 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 line-through px-1 rounded border border-rose-500/30"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  return <span key={idx}>{token.value}</span>;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
