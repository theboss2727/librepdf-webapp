import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  RotateCw,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Download,
  CheckCircle2,
  Loader2,
  FileText,
  GripVertical,
  MousePointerClick,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { organizePdfPages, renderAllThumbnails, type PageConfig } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';

interface OrganizeItem {
  id: string;
  originalIndex: number;
  rotation: number;
  thumbnailUrl?: string;
}

interface OrganizeToolProps {
  onSuccess: () => void;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pages, setPages] = useState<OrganizeItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'organize',
    onSuccess,
  });

  const fileItem = files[0];

  useEffect(() => {
    if (!fileItem) {
      setPages([]);
      return;
    }

    const initPages = async () => {
      setLoadingThumbnails(true);
      try {
        const initialCount = fileItem.pageCount || 1;
        setPages(
          Array.from({ length: initialCount }, (_, i) => ({
            id: `page_${i}_${Date.now()}_${Math.random()}`,
            originalIndex: i,
            rotation: 0,
          }))
        );

        const buffer = await fileItem.file.arrayBuffer();

        // Open PDF once and stream thumbnails for all pages in real time
        await renderAllThumbnails(
          buffer,
          (pageIdx, dataUrl, total) => {
            setPages((prev) => {
              // Expand list if document actually has more pages than initial guess
              if (prev.length < total) {
                const fullList: OrganizeItem[] = Array.from({ length: total }, (_, i) => {
                  const existing = prev.find((p) => p.originalIndex === i);
                  return (
                    existing || {
                      id: `page_${i}_${Date.now()}_${Math.random()}`,
                      originalIndex: i,
                      rotation: 0,
                    }
                  );
                });
                return fullList.map((p) =>
                  p.originalIndex === pageIdx ? { ...p, thumbnailUrl: dataUrl } : p
                );
              }
              return prev.map((p) =>
                p.originalIndex === pageIdx ? { ...p, thumbnailUrl: dataUrl } : p
              );
            });
          },
          100,
          0.45
        );
      } catch (err) {
        console.error('Errore generazione miniature tavolo di montaggio:', err);
      } finally {
        setLoadingThumbnails(false);
      }
    };

    initPages();
  }, [fileItem]);

  const handleRotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      toast.error('Il documento deve contenere almeno una pagina.');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDuplicatePage = (index: number) => {
    const target = pages[index];
    const newPage: OrganizeItem = {
      ...target,
      id: `copy_${Date.now()}_${Math.random()}`,
    };
    const newList = [...pages];
    newList.splice(index + 1, 0, newPage);
    setPages(newList);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;
    const reordered = [...pages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setPages(reordered);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDropCard = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...pages];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setPages(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveOrganized = async () => {
    if (!fileItem || pages.length === 0) return;

    await run(
      async () => {
        const pageConfigs: PageConfig[] = pages.map((p) => ({
          originalIndex: p.originalIndex,
          rotation: p.rotation,
        }));

        const bytes = await organizePdfPages(fileItem.file, pageConfigs);
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setResultBlob(blob);
        setResultBytes(blob.size);

        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_riorganizzato.pdf`;

        await persist({
          name: outName,
          originalSize: fileItem.file.size,
          data: blob,
        });

        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Sequenza salvata con successo', errorPrefix: 'Errore salvataggio pagine' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setResultBytes(null);
    setFiles([]);
    setPages([]);
  };

  const outFileName = fileItem
    ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_riorganizzato.pdf`
    : 'documento_riorganizzato.pdf';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <LayoutGrid className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Tavolo di Montaggio & Architettura Pagine
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Disponi visivamente le pagine in griglia, inverti la sequenza, ruota singoli fogli o elimina quelli superflui.
            </p>
          </div>
        </div>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Sequenza Riorganizzata con Successo
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il documento PDF finale ({pages.length} pagine) è pronto per il download.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <PdfPreviewButton data={resultBlob} fileName={outFileName} />

            <a
              href={downloadUrl}
              download={outFileName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>Scarica PDF ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Modifica un altro file
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
            title="Trascina il PDF per il tavolo di montaggio"
            subtitle="Tutte le pagine verranno visualizzate come tessere interattive ad alta risoluzione"
          />

          {fileItem && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="font-mono text-zinc-600 dark:text-zinc-300">
                  Sequenza corrente: <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{pages.length}</strong> fogli (sorgente: {fileItem.pageCount || 0})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPages((prev) =>
                        prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 font-medium text-xs transition"
                  >
                    Ruota tutte 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => setPages((prev) => [...prev].reverse())}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 font-medium text-xs transition"
                  >
                    Inverti ordine
                  </button>
                </div>
              </div>

              {loadingThumbnails && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>Rasterizzazione anteprime pagine in memoria...</span>
                </div>
              )}

              {/* Drag and Drop Helper Banner */}
              <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                <MousePointerClick className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  <b>Trascina le pagine col mouse</b>: afferra qualsiasi miniatura e rilasciala nella posizione desiderata per riordinare la sequenza al volo.
                </span>
              </div>

              {/* Grid of Pages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {pages.map((p, idx) => {
                  const isBeingDragged = draggedIndex === idx;
                  const isTarget = dragOverIndex === idx && draggedIndex !== idx;

                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={() => handleDragLeave(idx)}
                      onDrop={(e) => handleDropCard(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex flex-col items-center bg-white dark:bg-zinc-900 p-2.5 rounded-xl border transition-all duration-150 select-none cursor-grab active:cursor-grabbing group ${
                        isBeingDragged
                          ? 'opacity-30 scale-95 border-dashed border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-none'
                          : isTarget
                          ? 'border-blue-500 ring-2 ring-blue-500/60 scale-102 bg-blue-50/70 dark:bg-blue-950/40 shadow-lg'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs'
                      }`}
                      title="Trascina con il mouse per spostare questa pagina nella nuova posizione"
                    >
                      {/* Page sequence index badge */}
                      <span className="absolute top-2 left-2 z-10 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs pointer-events-none">
                        #{idx + 1}
                      </span>

                      {/* Drag Grip Handle in top-center */}
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 opacity-30 group-hover:opacity-100 transition text-zinc-500 group-hover:text-blue-500 flex items-center justify-center p-1 pointer-events-none">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Rotation badge if rotated */}
                      {p.rotation !== 0 && (
                        <span className="absolute top-2 right-2 z-10 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-rose-500 text-white shadow-xs pointer-events-none">
                          {p.rotation}°
                        </span>
                      )}

                      {/* Thumbnail Container */}
                      <div className="w-full aspect-3/4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center relative mb-2 pointer-events-none">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={`Pagina ${idx + 1}`}
                            style={{
                              transform: `rotate(${p.rotation}deg)`,
                              transition: 'transform 0.2s ease',
                            }}
                            className="w-full h-full object-contain p-1 pointer-events-none"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 pointer-events-none">
                            <FileText className="w-6 h-6 mb-1 opacity-40" />
                            <span className="text-[10px] font-mono text-zinc-500">
                              P.{p.originalIndex + 1}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Page Action Toolbar */}
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex items-center justify-between w-full pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
                      >
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'left')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 cursor-pointer"
                          title="Sposta a sinistra"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleRotatePage(idx)}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-500 cursor-pointer"
                          title="Ruota 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicatePage(idx)}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                          title="Duplica"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeletePage(idx)}
                          className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          disabled={idx === pages.length - 1}
                          onClick={() => handleMove(idx, 'right')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 cursor-pointer"
                          title="Sposta a destra"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={isProcessing}
                  onClick={handleSaveOrganized}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Compilazione PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span>Salva Sequenza ({pages.length} fogli)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
