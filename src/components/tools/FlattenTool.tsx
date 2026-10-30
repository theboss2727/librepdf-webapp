import React, { useState } from 'react';
import { Layers, Download, CheckCircle2, Loader2, Code2, ArrowRight, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { flattenPdf } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

interface FlattenToolProps {
  onSuccess: () => void;
  onOpenPythonStudio: () => void;
}

export const FlattenTool: React.FC<FlattenToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const fileItem = files[0];

  const handleFlatten = async () => {
    if (!fileItem) return;
    setIsProcessing(true);

    try {
      const bytes = await flattenPdf(fileItem.file);
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_appiattito.pdf`;

      await saveToVault({
        toolId: 'flatten',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore appiattimento PDF: ${err.message}`);
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Appiattisci Moduli & Firme
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                AcroForm Flattening
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Trasforma campi di testo compilabili, caselle di controllo e annotazioni in elementi grafici vettoriali permanenti.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPythonStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-zinc-400 transition cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Equivalente PyMuPDF doc.bake()</span>
        </button>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Moduli & Annotazioni Fissati con Successo
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il documento PDF finale non contiene più campi interattivi ed è pronto per l'archiviazione ufficiale.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_appiattito.pdf`
                  : 'documento_appiattito.pdf'
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica PDF Appiattito ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Appiattisci un altro PDF
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
            title="Trascina qui il PDF compilato con campi modulo o firme"
            subtitle="I contenuti dei campi compilati vengono fusi per sempre nelle pagine del PDF."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Perché appiattire un documento PDF?</span>
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  I moduli compilabili possono apparire vuoti o corrotti su alcuni lettori PDF, browser mobili o sistemi di archiviazione legale. 
                  L'appiattimento trasforma il testo digitato e le firme grafiche in vettori non modificabili, preservandone l'aspetto identico su qualsiasi dispositivo.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleFlatten}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Fissaggio elementi...</span>
                    </>
                  ) : (
                    <>
                      <span>Appiattisci Campi & Firme</span>
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
