import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Loader2,
  Code2,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { extractTextFromPdf } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

interface ExtractTextToolProps {
  onSuccess: () => void;
  onOpenPythonStudio: () => void;
  onSwitchToOcr?: () => void;
}

export const ExtractTextTool: React.FC<ExtractTextToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
  onSwitchToOcr,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<{
    fullText: string;
    pages: { pageNumber: number; text: string }[];
    wordCount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fileItem = files[0];

  const handleExtract = async () => {
    if (!fileItem) return;
    setIsExtracting(true);
    setProgress(5);

    try {
      const data = await extractTextFromPdf(fileItem.file, (pct) => {
        setProgress(pct);
      });

      setExtractedData(data);

      const blob = new Blob([data.fullText], { type: 'text/plain;charset=utf-8' });
      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_testo.txt`;

      await saveToVault({
        toolId: 'extract-text',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore estrazione testo: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedData) return;
    const textToCopy =
      activeTab === 'all'
        ? extractedData.fullText
        : extractedData.pages.find((p) => p.pageNumber === activeTab)?.text || '';
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!extractedData || !fileItem) return;
    const blob = new Blob([extractedData.fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileItem.file.name.replace(/\.pdf$/i, '')}_testo.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setExtractedData(null);
    setFiles([]);
    setSearchQuery('');
  };

  const displayedText = (() => {
    if (!extractedData) return '';
    if (activeTab === 'all') return extractedData.fullText;
    return extractedData.pages.find((p) => p.pageNumber === activeTab)?.text || '';
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Estrazione Testo Vettoriale
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                Native Stream Parser
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estrai i flussi di testo nativi con conteggio parole, navigazione per pagina e ricerca rapida.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPythonStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-zinc-400 transition cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Equivalente PyMuPDF extract_text()</span>
        </button>
      </div>

      {extractedData ? (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
              <span>
                Parole totali: <strong className="text-zinc-900 dark:text-zinc-100">{extractedData.wordCount.toLocaleString()}</strong>
              </span>
              <span>·</span>
              <span>
                Pagine elaborate: <strong className="text-zinc-900 dark:text-zinc-100">{extractedData.pages.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copiato negli Appunti!</span>
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
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-500" />
                <span>Esporta .TXT</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                Nuovo File
              </button>
            </div>
          </div>

          {/* Page Tabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Tutto il Documento
              </button>
              {extractedData.pages.map((p) => (
                <button
                  key={p.pageNumber}
                  onClick={() => setActiveTab(p.pageNumber)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === p.pageNumber
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Pag. {p.pageNumber}
                </button>
              ))}
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Cerca nel testo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Text Output Box */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 max-h-96 overflow-auto whitespace-pre-wrap leading-relaxed select-text">
            {displayedText || (
              <span className="italic text-zinc-400">
                Nessun carattere vettoriale individuato in questa pagina.
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Trascina qui il file PDF da cui estrarre il testo"
            subtitle="I caratteri vettoriali e i font incorporati vengono decodificati direttamente nella memoria del client."
          />

          {fileItem && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Pronto per decodificare il testo da{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">{fileItem.file.name}</strong> ({fileItem.pageCount || '1+'} pagine).
                </span>

                <button
                  disabled={isExtracting}
                  onClick={handleExtract}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isExtracting
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                      <span>Decodifica ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Estrai Tutto il Testo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {onSwitchToOcr && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      È una scansione da fotocamera o immagine senza testo vettoriale selezionabile?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onSwitchToOcr}
                    className="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Avvia Motore OCR Tesseract Wasm &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
