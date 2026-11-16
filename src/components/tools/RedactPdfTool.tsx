import React, { useState, useEffect, useRef } from 'react';
import {
  Eraser,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { redactPdf, renderPageToImage, type RedactionArea } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';

interface RedactPdfToolProps {
  onSuccess: () => void;
}

interface LocalRedaction extends RedactionArea {
  id: string;
}

export const RedactPdfTool: React.FC<RedactPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [redactions, setRedactions] = useState<LocalRedaction[]>([]);
  const [fillColor, setFillColor] = useState<'black' | 'white'>('black');
  const [stripMetadata, setStripMetadata] = useState(true);

  // Drawing box state on overlay
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'redact-pdf',
    onSuccess,
  });

  const fileItem = files[0];
  const totalPages = fileItem?.pageCount || 1;

  // Load current page preview image
  useEffect(() => {
    if (!fileItem) {
      setPageImageUrl(null);
      return;
    }

    let isMounted = true;
    const loadPreview = async () => {
      setLoadingPage(true);
      try {
        const buffer = await fileItem.file.arrayBuffer();
        const rendered = await renderPageToImage(buffer, currentPage, 1.3);
        if (isMounted) setPageImageUrl(rendered.dataUrl);
      } catch (err) {
        console.error('Errore render pagina:', err);
      } finally {
        if (isMounted) setLoadingPage(false);
      }
    };

    loadPreview();
    return () => {
      isMounted = false;
    };
  }, [fileItem, currentPage]);

  // Handle Box Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !overlayRef.current) {
      setIsDrawing(false);
      setStartPos(null);
      setCurrentBox(null);
      return;
    }

    if (currentBox.width > 5 && currentBox.height > 5) {
      const rect = overlayRef.current.getBoundingClientRect();
      // Convert overlay px to standard PDF points (A4 ratio approx 595.28 x 841.89)
      const scaleX = 595.28 / rect.width;
      const scaleY = 841.89 / rect.height;

      const pdfX = currentBox.x * scaleX;
      // In PDF, Y=0 is bottom
      const pdfY = (rect.height - (currentBox.y + currentBox.height)) * scaleY;
      const pdfW = currentBox.width * scaleX;
      const pdfH = currentBox.height * scaleY;

      setRedactions((prev) => [
        ...prev,
        {
          id: `red_${Date.now()}_${Math.random()}`,
          pageNumber: currentPage,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          fillColor,
        },
      ]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const handleRemoveRedaction = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleApplyRedaction = async () => {
    if (!fileItem) return;

    await run(
      async () => {
        const redactedBytes = await redactPdf(
          fileItem.file,
          redactions,
          stripMetadata
        );

        const blob = new Blob([redactedBytes as any], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setResultBlob(blob);
        setResultBytes(blob.size);

        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_oscurato.pdf`;

        await persist({
          name: outName,
          originalSize: fileItem.file.size,
          data: blob,
        });

        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Dati sensibili oscurati e metadati rimossi', errorPrefix: 'Errore oscuramento PDF' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setResultBytes(null);
    setFiles([]);
    setRedactions([]);
  };

  const outFileName = fileItem
    ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_oscurato.pdf`
    : 'documento_oscurato.pdf';

  const currentPageRedactions = redactions.filter((r) => r.pageNumber === currentPage);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center font-bold">
            <Eraser className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Oscuramento Permanente & Sanificazione
              </h2>
              <span className="font-mono text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                Permanent Redaction
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Rimuove in modo irreversibile testi sensibili e metadati nascosti (autore, cronologia, XMP).
            </p>
          </div>
        </div>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Documento Sanificato & Pronto alla Diffusione
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Le aree selezionate sono state sovrascritte ed i metadati di tracciamento azzerati.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <PdfPreviewButton data={resultBlob} fileName={outFileName} />

            <a
              href={downloadUrl}
              download={outFileName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>
                Scarica ({resultBytes ? `${(resultBytes / 1024 / 1024).toFixed(2)} MB` : 'PDF'})
              </span>
            </a>

            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Sanifica un altro PDF
            </button>
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Trascina qui il documento PDF da sanificare"
            subtitle="I dati coperti con la redazione non saranno estraibili con copia/incolla o OCR."
          />

          {fileItem && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Canvas Preview for Drawing Redactions */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold">
                      Pagina {currentPage} di {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[11px] text-zinc-500">
                    Trascina il mouse sul foglio per disegnare un riquadro nero
                  </span>
                </div>

                {/* Page Interactive Display */}
                <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-3">
                  {loadingPage ? (
                    <div className="py-24 flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                      <span className="text-xs text-zinc-500 font-mono">Rendering foglio...</span>
                    </div>
                  ) : pageImageUrl ? (
                    <div
                      ref={overlayRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      className="relative select-none cursor-crosshair shadow-lg rounded"
                    >
                      <img
                        src={pageImageUrl}
                        alt={`Pagina ${currentPage}`}
                        className="max-h-[68vh] object-contain pointer-events-none block rounded"
                      />

                      {/* Display already drawn redactions on this page */}
                      {currentPageRedactions.map((red, idx) => {
                        const overlay = overlayRef.current;
                        if (!overlay) return null;
                        const rect = overlay.getBoundingClientRect();
                        const scaleX = rect.width / 595.28;
                        const scaleY = rect.height / 841.89;

                        const left = red.x * scaleX;
                        const top = rect.height - (red.y + red.height) * scaleY;
                        const w = red.width * scaleX;
                        const h = red.height * scaleY;

                        return (
                          <div
                            key={red.id}
                            style={{
                              left: `${left}px`,
                              top: `${top}px`,
                              width: `${w}px`,
                              height: `${h}px`,
                            }}
                            className={`absolute pointer-events-none border ${
                              red.fillColor === 'white'
                                ? 'bg-white border-zinc-400'
                                : 'bg-black border-black'
                            }`}
                          />
                        );
                      })}

                      {/* Currently drawing box */}
                      {isDrawing && currentBox && (
                        <div
                          style={{
                            left: `${currentBox.x}px`,
                            top: `${currentBox.y}px`,
                            width: `${currentBox.width}px`,
                            height: `${currentBox.height}px`,
                          }}
                          className={`absolute pointer-events-none border-2 border-dashed ${
                            fillColor === 'white'
                              ? 'bg-white/80 border-zinc-500'
                              : 'bg-black/80 border-rose-500'
                          }`}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right Column: Controls & Redaction List */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Parametri Redazione</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Colore Copertura:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setFillColor('black')}
                        className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                          fillColor === 'black'
                            ? 'border-zinc-900 dark:border-zinc-100 bg-black text-white shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-black border border-white" />
                        <span>Nero (Censura)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFillColor('white')}
                        className={`p-2 rounded-lg border font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                          fillColor === 'white'
                            ? 'border-zinc-900 dark:border-zinc-100 bg-white text-zinc-900 shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-white border border-zinc-400" />
                        <span>Bianco (Sbianca)</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <label className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripMetadata}
                        onChange={(e) => setStripMetadata(e.target.checked)}
                        className="rounded text-rose-600 mt-0.5"
                      />
                      <span>
                        <strong>Rimuovi tutti i metadati nascosti</strong> (Autore, Software creatore, keywords, cronologia XMP)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Redaction Area List */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      Aree da oscurare ({redactions.length})
                    </span>
                    {redactions.length > 0 && (
                      <button
                        onClick={() => setRedactions([])}
                        className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Cancella tutte
                      </button>
                    )}
                  </div>

                  {redactions.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 py-3 text-center italic">
                      Nessuna area disegnata. Trascina con il mouse sopra la pagina a sinistra.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {redactions.map((red, idx) => (
                        <div
                          key={red.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full border ${
                                red.fillColor === 'white' ? 'bg-white border-zinc-400' : 'bg-black'
                              }`}
                            />
                            <span className="font-mono text-[11px]">
                              Pag. {red.pageNumber} · Area #{idx + 1}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveRedaction(red.id)}
                            className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer"
                            title="Elimina riquadro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="space-y-3 pt-2">
                  <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                  <button
                    disabled={isProcessing || (redactions.length === 0 && !stripMetadata)}
                    onClick={handleApplyRedaction}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                      !isProcessing
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        <span>Sanificazione in corso...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-500" />
                        <span>Applica Redazione & Sanifica</span>
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
