import React, { useState } from 'react';
import { Images, Download, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { imagesToPdf } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

interface ImagesToPdfToolProps {
  onSuccess: () => void;
}

export const ImagesToPdfTool: React.FC<ImagesToPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [orientation, setOrientation] = useState<'fit' | 'portrait' | 'landscape'>('fit');
  const [margin, setMargin] = useState(20);
  const [outputName, setOutputName] = useState('immagini_unite.pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const bytes = await imagesToPdf(
        files.map((f) => f.file),
        { orientation, margin }
      );
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(blob.size);

      const outName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      const originalTotal = files.reduce((acc, f) => acc + f.file.size, 0);

      await saveToVault({
        toolId: 'images-to-pdf',
        name: outName,
        originalSize: originalTotal,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore conversione immagini in PDF: ${err.message}`);
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
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-slate-800 border border-pink-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-pink-600 dark:text-pink-400 shadow-2xs">
            <Images className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Immagini (JPG, PNG, WebP) in PDF
              </h2>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Multi-frame Binder
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assembla fotografie JPG, PNG e WebP in un flusso PDF impaginato con orientamento e margini calibrabili.
            </p>
          </div>
        </div>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              PDF da Immagini Generato con Successo
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              Le {files.length} immagini sono state legate in un documento PDF vettoriale continuo.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs transition hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica PDF ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              Converti altre immagini
            </button>
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept="image/png,image/jpeg,image/webp"
            multiple={true}
            title="Trascina qui le immagini JPG o PNG da convertire in PDF"
            subtitle="Supporta PNG, JPG, JPEG e WebP (trascina per aggiungere più file)."
          />

          {files.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Orientamento Pagina:
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="fit">Adatta automaticamente alle proporzioni della foto</option>
                    <option value="portrait">Verticale (Portrait A4 fisso)</option>
                    <option value="landscape">Orizzontale (Landscape A4 fisso)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome File PDF di Output:
                  </label>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono focus:outline-hidden"
                    placeholder="immagini_unite.pdf"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Margine Bordo Pagina: <span className="font-mono text-pink-600 font-bold">{margin} pt</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-2">
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
                      <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      <span>Legatura frame in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Assembla {files.length} Immagini in PDF</span>
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
