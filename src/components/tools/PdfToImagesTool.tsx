import React, { useState } from 'react';
import { Image as ImageIcon, Download, CheckCircle2, Loader2, FolderArchive, ArrowRight } from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { renderPageToImage } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';

interface PdfToImagesToolProps {
  onSuccess: () => void;
}

export const PdfToImagesTool: React.FC<PdfToImagesToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [scale, setScale] = useState(2.0); // HD 144 DPI default
  const [quality, setQuality] = useState(0.92); // 92% quality for JPEG
  const [progress, setProgress] = useState(0);
  const [renderedPages, setRenderedPages] = useState<
    { pageNumber: number; dataUrl: string; blob: Blob }[]
  >([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'pdf-to-images',
    onSuccess,
  });

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;
    setProgress(5);

    await run(
      async () => {
        const buffer = await fileItem.file.arrayBuffer();
        const pageCount = fileItem.pageCount || 1;
        const pagesOut: { pageNumber: number; dataUrl: string; blob: Blob }[] = [];

        for (let i = 1; i <= pageCount; i++) {
          const rendered = await renderPageToImage(buffer, i, scale, format, quality);
          pagesOut.push({
            pageNumber: i,
            dataUrl: rendered.dataUrl,
            blob: rendered.blob,
          });
          setProgress(Math.round((i / pageCount) * 100));
        }

        setRenderedPages(pagesOut);

        // Create ZIP bundle
        const zip = new JSZip();
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        pagesOut.forEach((p) => {
          zip.file(`${baseName}_pagina_${p.pageNumber}.${ext}`, p.blob);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zUrl = URL.createObjectURL(zipBlob);
        setZipUrl(zUrl);

        // Save ZIP to vault
        await persist({
          name: `${baseName}_immagini_${ext}.zip`,
          originalSize: fileItem.file.size,
          resultSize: zipBlob.size,
          data: zipBlob,
        });

        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Pagine esportate in immagini con successo', errorPrefix: 'Errore conversione in immagini' }
    );
  };

  const handleReset = () => {
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setRenderedPages([]);
    setZipUrl(null);
    setFiles([]);
    setProgress(0);
  };

  const ext = format === 'jpeg' ? 'jpg' : 'png';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-slate-800 border border-orange-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400 shadow-2xs">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                PDF in Immagini (JPG & PNG)
              </h2>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Sub-pixel Rasterizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estrai ogni pagina in immagini JPG ad alta compressione o PNG nitide senza perdita di qualità.
            </p>
          </div>
        </div>
      </div>

      {renderedPages.length > 0 ? (
        <div className="space-y-5 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {renderedPages.length} Pagine Convertite in .{ext.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Elaborazione completata al 100% in memoria locale.
                </p>
              </div>
            </div>

            {zipUrl && (
              <a
                href={zipUrl}
                download={`pagine_${ext}.zip`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs transition hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
              >
                <FolderArchive className="w-4 h-4 text-orange-500 dark:text-orange-600" />
                <span>Scarica Tutte in ZIP (.{ext.toUpperCase()})</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-auto p-1">
            {renderedPages.map((p) => (
              <div
                key={p.pageNumber}
                className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center group shadow-2xs"
              >
                <div className="w-full aspect-3/4 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 mb-2">
                  <img
                    src={p.dataUrl}
                    alt={`Pagina ${p.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between w-full pt-0.5">
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    Pagina {p.pageNumber}
                  </span>
                  <a
                    href={p.dataUrl}
                    download={`pagina_${p.pageNumber}.${ext}`}
                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title={`Scarica .${ext.toUpperCase()}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              Converti un altro PDF
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
            title="Trascina qui il file PDF da convertire in immagini JPG o PNG"
            subtitle="I frame vengono renderizzati in memoria grafica locale ad alta precisione."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              {/* Format selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Formato immagine desiderato:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat('jpeg')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      format === 'jpeg'
                        ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>JPG (JPEG)</span>
                      <span className="font-mono text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300 px-1.5 py-0.2 rounded">Compatto</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Ideale per foto, documenti condivisi e file leggeri.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('png')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      format === 'png'
                        ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>PNG</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.2 rounded">Lossless</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Massima fedeltà pixel-perfect, ideale per grafici e schemi.</p>
                  </button>
                </div>
              </div>

              {/* JPG Quality slider if JPEG */}
              {format === 'jpeg' && (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Qualità di compressione JPEG:</span>
                    <span className="font-mono text-orange-600 font-bold">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>File leggero (60%)</span>
                    <span>Bilanciato (85%)</span>
                    <span>Massima qualità (100%)</span>
                  </div>
                </div>
              )}

              {/* Resolution options */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Risoluzione di rendering:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { scale: 1.0, label: 'Standard (72 DPI)', desc: 'Web & anteprima' },
                    { scale: 2.0, label: 'Alta Definizione (144 DPI)', desc: 'Consigliato' },
                    { scale: 3.0, label: 'Ultra HD (216 DPI)', desc: 'Stampa e grafica' },
                  ].map((opt) => (
                    <button
                      key={opt.scale}
                      type="button"
                      onClick={() => setScale(opt.scale)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center ${
                        scale === opt.scale
                          ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>Rendering pagine in corso...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={isProcessing}
                  onClick={handleConvert}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span>Elaborazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Converti in Immagini .{ext.toUpperCase()}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
