import React, { useState } from 'react';
import { Hash, Download, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { addPageNumbers } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';
import type { PageNumberOptions } from '../../types/pdf';

interface PageNumbersToolProps {
  onSuccess: () => void;
}

export const PageNumbersTool: React.FC<PageNumbersToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [position, setPosition] = useState<PageNumberOptions['position']>('bottom-center');
  const [format, setFormat] = useState<PageNumberOptions['format']>('page_of_total');
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(11);
  const [margin, setMargin] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const fileItem = files[0];

  const handleAddNumbers = async () => {
    if (!fileItem) return;
    setIsProcessing(true);

    try {
      const options: PageNumberOptions = {
        position,
        format,
        startFrom,
        fontSize,
        margin,
      };

      const result = await addPageNumbers(fileItem.file, options);
      const blob = new Blob([result as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_numerato.pdf`;

      await saveToVault({
        toolId: 'page-numbers',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore inserimento numeri di pagina: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Hash className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Numerazione Pagine Vettoriale
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                Coordinate Inscription
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Inserisci progressione numerica esatta calibrando margini, formato e posizione su ogni pagina.
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
              Numerazione Applicata con Successo
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il documento con le coordinate numeriche incise è pronto per il download.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_numerato.pdf`
                  : 'documento_numerato.pdf'
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica PDF Numerato ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Numera un altro documento
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
            title="Trascina qui il file PDF da numerare"
            subtitle="I numeri di pagina vengono scritti direttamente nel flusso vettoriale."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Formato Numerazione:
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  >
                    <option value="page_of_total">Pagina &#123;n&#125; di &#123;totale&#125; (Standard Editoriale)</option>
                    <option value="simple">Solo Numero Progressivo (es. 1, 2, 3...)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Inizia dal numero:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={startFrom}
                    onChange={(e) => setStartFrom(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Posizione sul Foglio:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'top-left', label: 'Alto a sinistra' },
                    { id: 'top-center', label: 'Alto al centro' },
                    { id: 'top-right', label: 'Alto a destra' },
                    { id: 'bottom-left', label: 'Basso a sinistra' },
                    { id: 'bottom-center', label: 'Basso al centro' },
                    { id: 'bottom-right', label: 'Basso a destra' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPosition(pos.id as any)}
                      className={`p-2 rounded-lg text-xs font-medium border transition cursor-pointer text-center ${
                        position === pos.id
                          ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Dimensione Font: {fontSize} pt
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Margine dal Bordo: {margin} pt
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={margin}
                    onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleAddNumbers}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Incisione in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Inserisci Numeri di Pagina</span>
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
