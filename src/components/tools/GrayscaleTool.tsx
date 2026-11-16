import React, { useState } from 'react';
import { SunMedium, Download, CheckCircle2, Loader2, Code2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertPdfToGrayscale } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';

interface GrayscaleToolProps {
  onSuccess: () => void;
  onOpenPythonStudio: () => void;
}

export const GrayscaleTool: React.FC<GrayscaleToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [scale, setScale] = useState<number>(2.0); // 144 DPI
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'grayscale',
    onSuccess,
  });

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;
    setProgress(5);

    await run(
      async () => {
        const bytes = await convertPdfToGrayscale(
          fileItem.file,
          scale,
          (pct, cur, tot) => {
            setProgress(pct);
            setCurrentPage(cur);
            setTotalPages(tot);
          }
        );

        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setResultBytes(blob.size);
        setResultBlob(blob);

        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_monocromatico.pdf`;

        await persist({ name: outName, originalSize: fileItem.file.size, data: blob });
        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Conversione in scala di grigi completata', errorPrefix: 'Errore conversione in scala di grigi' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setResultBlob(null);
    setFiles([]);
    setProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <SunMedium className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Scala di Grigi & Monocromatico
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                ITU-R BT.601
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Converte tutte le componenti cromatiche in tonalità di grigio ottimizzate per stampa offset e contratti.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPythonStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-zinc-400 transition cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Equivalente PyMuPDF csGRAY</span>
        </button>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Conversione Monocromatica Completata
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il documento è stato desaturato con successo ed è salvato nell'archivio locale.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <PdfPreviewButton
              data={resultBlob}
              fileName={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_monocromatico.pdf`
                  : 'documento_monocromatico.pdf'
              }
            />
            <a
              href={downloadUrl}
              download={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_monocromatico.pdf`
                  : 'documento_monocromatico.pdf'
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica PDF Monocromatico ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
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
            title="Trascina qui il documento PDF a colori"
            subtitle="I canali RGB vengono convertiti in luminanza luma Y in locale senza perdita di impaginazione."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Risoluzione di campionamento e qualità di stampa:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { scale: 1.5, label: 'Bozza Leggera', desc: '108 DPI • Dimensioni minime' },
                    { scale: 2.0, label: 'Stampa Standard', desc: '144 DPI • Consigliato' },
                    { scale: 3.0, label: 'Alta Fedeltà', desc: '216 DPI • Nitidezza massima' },
                  ].map((opt) => (
                    <button
                      key={opt.scale}
                      type="button"
                      onClick={() => setScale(opt.scale)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center ${
                        scale === opt.scale
                          ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800 shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    <span>
                      Conversione pagina {currentPage} di {totalPages}...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-700 dark:bg-zinc-300 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={isProcessing}
                  onClick={handleConvert}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                      <span>Elaborazione pagine...</span>
                    </>
                  ) : (
                    <>
                      <span>Converti in Scala di Grigi</span>
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
