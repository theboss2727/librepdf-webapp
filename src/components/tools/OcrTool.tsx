import React, { useState } from 'react';
import {
  ScanText,
  Copy,
  Check,
  Download,
  Loader2,
  Code2,
  Search,
  CheckCircle2,
  FileCode,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { runOcrOnDocument } from '../../services/ocrEngine';
import { extractTextFromPdf } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import type { OcrOptions, OcrPageResult } from '../../types/pdf';

interface OcrToolProps {
  onSuccess: () => void;
  onOpenPythonStudio: () => void;
}

export const OcrTool: React.FC<OcrToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [language, setLanguage] = useState<OcrOptions['language']>('ita');
  const [processAllPages, setProcessAllPages] = useState(true);
  const [maxPagesToOcr, setMaxPagesToOcr] = useState(5);
  const [statusText, setStatusText] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pagePercent, setPagePercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live streaming results as each page is parsed
  const [livePages, setLivePages] = useState<OcrPageResult[]>([]);

  const [ocrResults, setOcrResults] = useState<{
    fullText: string;
    pages: OcrPageResult[];
    totalWords: number;
    averageConfidence: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'ocr-pdf',
    onSuccess,
  });

  const fileItem = files[0];

  // Quick native text extraction (for digital vector PDFs)
  const handleQuickExtract = async () => {
    if (!fileItem) return;
    setStatusText('Lettura diretta vettoriale del documento...');
    setErrorMsg(null);
    setLivePages([]);

    await run(async () => {
      try {
        const extracted = await extractTextFromPdf(fileItem.file, (p) => {
          setPagePercent(p);
        });

        const pagesList: OcrPageResult[] = extracted.pages.map((p) => {
          const words = p.text ? p.text.split(/\s+/).filter(Boolean).length : 0;
          return {
            pageNumber: p.pageNumber,
            text: p.text,
            confidence: 99,
            wordsCount: words,
          };
        });

        const results = {
          fullText: extracted.fullText,
          pages: pagesList,
          totalWords: extracted.wordCount,
          averageConfidence: 99,
        };

        setOcrResults(results);
        setLivePages(pagesList);

        const blob = new Blob([results.fullText], { type: 'text/plain;charset=utf-8' });
        const baseName = fileItem.file.name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_Testo_Nativo.txt`;

        await persist({ name: outName, originalSize: fileItem.file.size, data: blob });
        confetti({ particleCount: 40, spread: 50 });
      } catch (err: any) {
        setErrorMsg(`Errore estrazione testo: ${err.message || err}`);
      }
    });
    setStatusText('');
  };

  // Full neural WebAssembly OCR
  const handleRunOcr = async () => {
    if (!fileItem) return;
    setStatusText('Inizializzazione motore OCR WebAssembly SIMD...');
    setPagePercent(5);
    setErrorMsg(null);
    setLivePages([]);

    await run(async () => {
      try {
        const pageScope = processAllPages
          ? 'all'
          : Array.from(
              { length: Math.min(maxPagesToOcr, fileItem.pageCount || 1) },
              (_, i) => i + 1
            );

        const results = await runOcrOnDocument(
          fileItem.file,
          {
            language,
            pages: pageScope,
          },
          (progress) => {
            setStatusText(progress.status);
            setCurrentPage(progress.page);
            setTotalPages(progress.totalPages);
            setPagePercent(progress.percent);
          },
          (pageResult) => {
            // Live streaming preview as each page completes!
            setLivePages((prev) => [...prev, pageResult]);
          }
        );

        setOcrResults(results);

        // Save output to vault
        const blob = new Blob([results.fullText], { type: 'text/plain;charset=utf-8' });
        const baseName = fileItem.file.name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_OCR_${(language || 'ita').toUpperCase()}.txt`;

        await persist({ name: outName, originalSize: fileItem.file.size, data: blob });
        confetti({ particleCount: 50, spread: 55 });
      } catch (err: any) {
        setErrorMsg(
          `Si è verificato un errore durante l'elaborazione OCR: ${
            err.message || 'Errore worker WebAssembly'
          }. Puoi provare con la lingua "Inglese (eng)" o utilizzare il modulo Python Desktop con Tesseract nativo.`
        );
      }
    });
    setStatusText('');
  };

  const currentResults = ocrResults || (livePages.length > 0 ? {
    fullText: livePages.map((p) => `=== Pagina ${p.pageNumber} ===\n${p.text}`).join('\n\n'),
    pages: livePages,
    totalWords: livePages.reduce((acc, p) => acc + p.wordsCount, 0),
    averageConfidence: Math.round(
      livePages.reduce((acc, p) => acc + p.confidence, 0) / Math.max(1, livePages.length)
    ),
  } : null);

  const handleCopy = async () => {
    if (!currentResults) return;
    const textToCopy =
      activeTab === 'all'
        ? currentResults.fullText
        : currentResults.pages.find((p) => p.pageNumber === activeTab)?.text || '';
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!currentResults || !fileItem) return;
    const blob = new Blob([currentResults.fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileItem.file.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_OCR.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    if (!currentResults || !fileItem) return;
    const jsonStr = JSON.stringify(
      {
        fileName: fileItem.file.name,
        language,
        confidence: currentResults.averageConfidence,
        totalWords: currentResults.totalWords,
        pages: currentResults.pages.map((p) => ({
          page: p.pageNumber,
          confidence: p.confidence,
          words: p.wordsCount,
          text: p.text,
        })),
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileItem.file.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_OCR.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setOcrResults(null);
    setLivePages([]);
    setFiles([]);
    setSearchQuery('');
    setErrorMsg(null);
  };

  const activePageData =
    activeTab === 'all'
      ? null
      : currentResults?.pages.find((p) => p.pageNumber === activeTab);

  const displayedText = (() => {
    if (!currentResults) return '';
    if (activeTab === 'all') return currentResults.fullText;
    return activePageData?.text || '';
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-500">
            <ScanText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Riconoscimento Ottico Caratteri (OCR)
              </h2>
              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                Tesseract Wasm SIMD
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estrae e riconosce testo da PDF scansionati, ricevute e immagini con anteprima live in tempo reale.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPythonStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-zinc-400 transition cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Equivalente PyMuPDF get_textpage_ocr()</span>
        </button>
      </div>

      {/* Error Message Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="space-y-1">
            <p className="font-bold">Attenzione durante l'elaborazione OCR</p>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Active Results Display (Live streaming or completed) */}
      {currentResults && (
        <div className="space-y-5 bg-zinc-50 dark:bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in">
          {/* Top Stats Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">
                  Accuratezza Media
                </span>
                <span
                  className={`font-bold text-sm ${
                    currentResults.averageConfidence >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : currentResults.averageConfidence >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {currentResults.averageConfidence}% Confidenza
                </span>
              </div>
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">
                  Parole Rilevate
                </span>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {currentResults.totalWords.toLocaleString()}
                </span>
              </div>
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">
                  Pagine Elaborate
                </span>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {currentResults.pages.length} {isProcessing && '(in corso...)'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copia Testo</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>Scarica .TXT</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                title="Esporta JSON strutturato con metadati e confidenza"
              >
                <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                <span>JSON</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Nuovo File
              </button>
            </div>
          </div>

          {/* Navigation Tabs and Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Tutto il Documento ({currentResults.pages.length} pag.)
              </button>
              {currentResults.pages.map((p) => (
                <button
                  key={p.pageNumber}
                  onClick={() => setActiveTab(p.pageNumber)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === p.pageNumber
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span>Pag. {p.pageNumber}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {p.confidence}%
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Cerca parole nel testo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Side-by-side or Single View */}
          {activeTab !== 'all' && activePageData?.thumbnailUrl ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Scanned Page Image */}
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center">
                <span className="text-[11px] font-mono uppercase text-zinc-400 mb-2">
                  Immagine Sorgente Renderizzata
                </span>
                <div className="w-full max-h-[460px] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-2">
                  <img
                    src={activePageData.thumbnailUrl}
                    alt={`Scansione pagina ${activePageData.pageNumber}`}
                    className="max-h-[420px] object-contain shadow-2xs"
                  />
                </div>
              </div>

              {/* Right: Recognized Text */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] font-mono uppercase text-zinc-400">
                    Testo Riconosciuto da Tesseract Wasm
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    {activePageData.wordsCount} parole · {activePageData.confidence}% confidenza
                  </span>
                </div>
                <div className="flex-1 overflow-auto max-h-[460px] font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed select-text p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                  {displayedText || (
                    <span className="italic text-zinc-400">
                      Nessun testo rilevato su questa pagina.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Full Document View */
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 max-h-[460px] overflow-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
              {displayedText || (
                <span className="italic text-zinc-400">
                  In attesa di riconoscimento testo...
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload & Option Controls */}
      {!ocrResults && (
        <>
          <FileDropzone
            files={files}
            onFilesChange={(newFiles) => {
              setFiles(newFiles.slice(0, 1));
              setErrorMsg(null);
            }}
            accept=".pdf,image/png,image/jpeg,image/webp"
            multiple={false}
            title="Trascina qui il file PDF scansionato o immagine"
            subtitle="Supporta PDF cartacei, fatture, ricevute o foto JPG/PNG da sottoporre a OCR neurale."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Language Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Dizionario di Riconoscimento OCR:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  >
                    <option value="ita">Italiano (ita) - Addestrato standard</option>
                    <option value="eng">Inglese (eng) - Alta velocità</option>
                    <option value="fra">Francese (fra)</option>
                    <option value="deu">Tedesco (deu)</option>
                    <option value="spa">Spagnolo (spa)</option>
                  </select>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Il modello WebAssembly scaricherà il vocabolario per la massima fedeltà sui caratteri accentati.
                  </p>
                </div>

                {/* Page scope */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Pagine da analizzare:
                  </label>
                  <div className="space-y-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="ocrScope"
                        checked={processAllPages}
                        onChange={() => setProcessAllPages(true)}
                        className="accent-zinc-900 dark:accent-zinc-100"
                      />
                      <span>Tutte le pagine ({fileItem.pageCount || 1} pag.)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="radio"
                          name="ocrScope"
                          checked={!processAllPages}
                          onChange={() => setProcessAllPages(false)}
                          className="accent-zinc-900 dark:accent-zinc-100"
                        />
                        <span>Prime</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={fileItem.pageCount || 50}
                        value={maxPagesToOcr}
                        onChange={(e) => setMaxPagesToOcr(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={processAllPages}
                        className="w-16 px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                      />
                      <span className="text-xs text-zinc-500">pagine</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Progress Card */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-pulse">
                  <div className="flex justify-between text-xs text-amber-900 dark:text-amber-200 font-mono">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>{statusText}</span>
                    </span>
                    <span>
                      {currentPage > 0 ? `Pagina ${currentPage} di ${totalPages}` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${pagePercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Dual mode (Neural OCR vs Fast Native Extraction) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleQuickExtract}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                  title="Estrae il testo istantaneamente se il PDF contiene già caratteri digitali (senza scaricare pesanti modelli OCR)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Estrazione Testo Nativo Rapida</span>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={handleRunOcr}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Elaborazione OCR in corso...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-4 h-4 text-amber-500" />
                      <span>Avvia Riconoscimento OCR Neurale</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
