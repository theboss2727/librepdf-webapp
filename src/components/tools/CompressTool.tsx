import React, { useState } from 'react';
import { Minimize2, Download, CheckCircle2, Loader2, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { compressPdf } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfViewerModal } from '../PdfViewerModal';

interface CompressToolProps {
  onSuccess: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const CompressTool: React.FC<CompressToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [level, setLevel] = useState<'standard' | 'aggressive'>('aggressive');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [origSize, setOrigSize] = useState<number>(0);
  const [resultSize, setResultSize] = useState<number>(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'compress',
    onSuccess,
  });
  const fileItem = files[0];

  const handleCompress = async () => {
    if (!fileItem) return;
    setOrigSize(fileItem.file.size);

    await run(
      async () => {
        const bytes = await compressPdf(fileItem.file, level);
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setResultBlob(blob);
        setResultSize(blob.size);

        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        await persist({ name: `${baseName}_ottimizzato.pdf`, originalSize: fileItem.file.size, data: blob });
        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Compressione completata', errorPrefix: 'Errore compressione PDF' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setFiles([]);
  };

  const savedPercentage = origSize > 0 ? Math.max(0, Math.round(((origSize - resultSize) / origSize) * 100)) : 0;
  const outFileName = fileItem
    ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_ottimizzato.pdf`
    : 'documento_ottimizzato.pdf';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Minimize2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Ottimizzazione & Compressione Flussi
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ricompila gli stream FlateDecode ed elimina metadati obsoleti preservando la leggibilità visiva.
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
              Compressione Completata
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il documento ottimizzato è pronto per l'anteprima, l'archiviazione o il download.
            </p>
          </div>

          {/* Before / After comparison stats */}
          <div className="max-w-xs mx-auto grid grid-cols-2 gap-3 p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left font-mono">
            <div className="border-r border-zinc-100 dark:border-zinc-800 pr-2">
              <span className="text-[10px] text-zinc-400 uppercase">Iniziale</span>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{formatBytes(origSize)}</p>
            </div>
            <div className="pl-2">
              <span className="text-[10px] text-emerald-500 uppercase flex items-center gap-1">
                <span>Ottimizzato</span>
                {savedPercentage > 0 && <span>(-{savedPercentage}%)</span>}
              </span>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatBytes(resultSize)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs shadow-xs transition hover:bg-emerald-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-emerald-500" />
              <span>Anteprima PDF</span>
            </button>

            <a
              href={downloadUrl}
              download={outFileName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica File Ottimizzato</span>
            </a>

            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Comprimi un altro file
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
            title="Trascina il PDF per l'ottimizzazione"
            subtitle="Deflazione lossless di oggetti e flussi in memoria locale"
          />

          {fileItem && (
            <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Profilo di Compressione:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLevel('aggressive')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      level === 'aggressive'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Compressione Aggressiva</span>
                      <span className="text-[10px] font-mono text-zinc-500">Ottimale</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Comprime i flussi stream ed elimina metadati secondari per minimizzare l'ingombro.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLevel('standard')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      level === 'standard'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Compressione Conservativa</div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Compatta la struttura interna preservando tutti i metadati e tag originali.
                    </div>
                  </button>
                </div>
              </div>

              {/* Preview Toggle & Processing Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={isProcessing}
                  onClick={handleCompress}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Elaborazione flussi...</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Ottimizza PDF ({formatBytes(fileItem.file.size)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        pdfBlob={resultBlob}
        fileName={outFileName}
      />
    </div>
  );
};
