import React, { useState } from 'react';
import { Scissors, Download, CheckCircle2, Loader2, FolderArchive } from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { splitPdf } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';

interface SplitToolProps {
  onSuccess: () => void;
}

export const SplitTool: React.FC<SplitToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [splitMode, setSplitMode] = useState<'ranges' | 'all-pages' | 'fixed-chunks'>('ranges');
  const [rangeString, setRangeString] = useState('1-3');
  const [chunkSize, setChunkSize] = useState(2);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ name: string; blob: Blob; url: string }[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'split',
    onSuccess,
  });
  const fileItem = files[0];

  const handleSplit = async () => {
    if (!fileItem) return;
    setProgress(15);

    await run(async () => {
      const splitOutputs = await splitPdf(
        fileItem.file,
        splitMode,
        rangeString,
        chunkSize,
        (pct) => setProgress(pct)
      );

      const items = splitOutputs.map((out) => {
        const blob = new Blob([out.data as any], { type: 'application/pdf' });
        return {
          name: out.name,
          blob,
          url: URL.createObjectURL(blob),
        };
      });

      setResults(items);

      // Create ZIP if multiple files
      if (items.length > 1) {
        const zip = new JSZip();
        items.forEach((item) => {
          zip.file(item.name, item.blob);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setZipUrl(URL.createObjectURL(zipBlob));
      }

      if (items.length > 0) {
        await persist({
          name: items[0].name,
          originalSize: fileItem.file.size,
          data: items[0].blob,
        });
      }

      confetti({ particleCount: 50, spread: 55 });
    }, { successMessage: 'Segmentazione completata', errorPrefix: 'Errore divisione PDF' });
  };

  const handleReset = () => {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setResults([]);
    setZipUrl(null);
    setFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Scissors className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Segmentazione & Decoupling Flussi
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Isola intervalli di pagine specifici, estrai singoli fogli o fraziona il documento in blocchi.
            </p>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-5 bg-zinc-50 dark:bg-zinc-900/60 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Segmentazione Completata ({results.length} segmenti generati)
              </h3>
              <p className="text-xs text-zinc-500">
                Tutti i file sono stati isolati localmente e sono pronti per l'esportazione.
              </p>
            </div>
          </div>

          {zipUrl && (
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FolderArchive className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Archivio ZIP Cumulativo</p>
                  <p className="text-[11px] text-zinc-500 font-mono">Tutti i {results.length} segmenti in un unico archivio</p>
                </div>
              </div>
              <a
                href={zipUrl}
                download="segmenti_pdf.zip"
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
              >
                Scarica Tutto (.zip)
              </a>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase text-zinc-400">Segmenti Generati:</span>
            <div className="max-h-60 overflow-auto space-y-1.5 pr-1">
              {results.map((res, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-2 font-mono">{res.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PdfPreviewButton
                      data={res.blob}
                      fileName={res.name}
                      label="Anteprima"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold hover:border-zinc-400 transition shrink-0 cursor-pointer"
                    />
                    <a
                      href={res.url}
                      download={res.name}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold hover:border-zinc-400 transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Scarica</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Fraziona un altro documento
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
            title="Trascina il file PDF per il frazionamento"
            subtitle="Supporta documenti multi-pagina di qualsiasi dimensione"
          />

          {fileItem && (
            <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Metodo di Segmentazione:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('ranges')}
                    className={`p-3 rounded-xl text-xs text-left border transition cursor-pointer ${
                      splitMode === 'ranges'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-bold">Intervalli Custom</div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">es. 1-3, 5, 8-10</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('all-pages')}
                    className={`p-3 rounded-xl text-xs text-left border transition cursor-pointer ${
                      splitMode === 'all-pages'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-bold">Tutte le Pagine</div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">1 pagina per file</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('fixed-chunks')}
                    className={`p-3 rounded-xl text-xs text-left border transition cursor-pointer ${
                      splitMode === 'fixed-chunks'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <div className="font-bold">A Blocchi Costanti</div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">Gruppi da N pagine</div>
                  </button>
                </div>
              </div>

              {splitMode === 'ranges' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Specifica intervalli (separati da virgola):
                  </label>
                  <input
                    type="text"
                    value={rangeString}
                    onChange={(e) => setRangeString(e.target.value)}
                    placeholder="es. 1-2, 4, 6-8"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                  <p className="text-[11px] font-mono text-zinc-500 mt-1">
                    Pagine totali sorgente: <strong>{fileItem.pageCount || 'N/D'}</strong>
                  </p>
                </div>
              )}

              {splitMode === 'fixed-chunks' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Pagine per blocco:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={fileItem.pageCount || 100}
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value, 10) || 1)}
                    className="w-32 text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              )}

              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-zinc-500 font-mono">
                    <span>Elaborazione segmenti...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={isProcessing}
                  onClick={handleSplit}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Frazionamento...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-3.5 h-3.5 text-amber-500" />
                      <span>Esegui Segmentazione</span>
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
