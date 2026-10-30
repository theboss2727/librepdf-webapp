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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { organizePdfPages, renderPageToImage, type PageConfig } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (!fileItem) {
      setPages([]);
      return;
    }

    const initPages = async () => {
      setLoadingThumbnails(true);
      try {
        const count = fileItem.pageCount || 1;
        const initialList: OrganizeItem[] = Array.from({ length: count }, (_, i) => ({
          id: `page_${i}_${Date.now()}_${Math.random()}`,
          originalIndex: i,
          rotation: 0,
        }));
        setPages(initialList);

        const buffer = await fileItem.file.arrayBuffer();
        for (let i = 0; i < Math.min(count, 30); i++) {
          try {
            const { dataUrl } = await renderPageToImage(buffer, i + 1, 0.4);
            setPages((prev) =>
              prev.map((p) => (p.originalIndex === i ? { ...p, thumbnailUrl: dataUrl } : p))
            );
          } catch {
            // thumbnail fallback
          }
        }
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
      alert('Il documento deve contenere almeno una pagina.');
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

  const handleSaveOrganized = async () => {
    if (!fileItem || pages.length === 0) return;
    setIsProcessing(true);

    try {
      const pageConfigs: PageConfig[] = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
      }));

      const bytes = await organizePdfPages(fileItem.file, pageConfigs);
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_riorganizzato.pdf`;

      await saveToVault({
        toolId: 'organize',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore salvataggio pagine: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setFiles([]);
    setPages([]);
  };

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
            <a
              href={downloadUrl}
              download={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_riorganizzato.pdf`
                  : 'documento_riorganizzato.pdf'
              }
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

              {/* Grid of Pages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    className="relative flex flex-col items-center bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs transition group"
                  >
                    {/* Page sequence index badge */}
                    <span className="absolute top-2 left-2 z-10 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs">
                      #{idx + 1}
                    </span>

                    {/* Rotation badge if rotated */}
                    {p.rotation !== 0 && (
                      <span className="absolute top-2 right-2 z-10 font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-rose-500 text-white shadow-xs">
                        {p.rotation}°
                      </span>
                    )}

                    {/* Thumbnail Container */}
                    <div className="w-full aspect-3/4 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center relative mb-2">
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={`Pagina ${idx + 1}`}
                          style={{
                            transform: `rotate(${p.rotation}deg)`,
                            transition: 'transform 0.2s ease',
                          }}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-400">
                          <FileText className="w-6 h-6 mb-1 opacity-40" />
                          <span className="text-[10px] font-mono text-zinc-500">
                            P.{p.originalIndex + 1}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Page Action Toolbar */}
                    <div className="flex items-center justify-between w-full pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'left')}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 cursor-pointer"
                        title="Sposta prima"
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
                        title="Sposta dopo"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
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
