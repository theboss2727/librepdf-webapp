import React, { useState } from 'react';
import { Files, Download, CheckCircle2, ArrowRight, Loader2, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { mergePdfs } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfViewerModal } from '../PdfViewerModal';

interface MergeToolProps {
  onSuccess: () => void;
}

export const MergeTool: React.FC<MergeToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [outputName, setOutputName] = useState('documento_unito.pdf');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'merge',
    onSuccess,
  });
  const totalPages = files.reduce((acc, f) => acc + (f.pageCount || 0), 0);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProgressPercent(10);
    setProgressMsg('Inizializzazione stream assembly...');

    await run(
      async () => {
        const mergedBytes = await mergePdfs(
          files.map((f) => f.file),
          (pct, msg) => {
            setProgressPercent(pct);
            setProgressMsg(msg);
          }
        );

        const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setResultBlob(blob);
        setResultBytes(blob.size);

        const finalName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
        const totalOriginalSize = files.reduce((acc, f) => acc + f.file.size, 0);
        await persist({ name: finalName, originalSize: totalOriginalSize, data: blob });
        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Documenti uniti con successo', errorPrefix: "Errore durante l'unione dei PDF" }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setResultBytes(null);
    setFiles([]);
    setProgressPercent(0);
  };

  const finalFileName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Files className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Assemblaggio & Unione PDF
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Combina file multipli in un unico flusso mantenendo segnalibri e qualità vettoriale originale.
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
              Documento Unificato con Successo!
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Tutti i flussi di pagina sono stati assemblati ed indicizzati.
            </p>
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
              download={finalFileName}
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
              Crea un altro documento
            </button>
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={true}
            title="Trascina qui i PDF da unire"
            subtitle="Seleziona o trascina più documenti PDF insieme per combinarli in ordine."
          />

          {files.length > 0 && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nome file di output:
                  </label>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-500"
                    placeholder="documento_unito.pdf"
                  />
                </div>
                <div className="flex items-end pb-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  <span>
                    Riepilogo: <strong className="text-zinc-900 dark:text-zinc-100">{files.length} file</strong> per un totale di{' '}
                    <strong className="text-rose-500">{totalPages || 'variabili'} pagine</strong>.
                  </span>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    <span>{progressMsg}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={files.length < 2 || isProcessing}
                  onClick={handleMerge}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    files.length >= 2 && !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Elaborazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Unisci {files.length} Documenti</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
        fileName={finalFileName}
      />
    </div>
  );
};
