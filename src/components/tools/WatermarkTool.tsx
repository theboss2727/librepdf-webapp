import React, { useState } from 'react';
import { Stamp, Download, CheckCircle2, Loader2, Code2, Eye, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { addWatermark, renderPageToImage } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';
import type { WatermarkOptions } from '../../types/pdf';

interface WatermarkToolProps {
  onSuccess: () => void;
  onOpenPythonStudio: () => void;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({
  onSuccess,
  onOpenPythonStudio,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [text, setText] = useState('CONFIDENZIALE');
  const [color, setColor] = useState('#ef4444'); // PyMuPDF Red
  const [fontSize, setFontSize] = useState(50); // PyMuPDF default
  const [rotation, setRotation] = useState(45); // PyMuPDF default
  const [opacity, setOpacity] = useState(0.3); // PyMuPDF default
  const [pageTarget, setPageTarget] = useState<'all' | 'odd' | 'even'>('all');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'watermark',
    onSuccess,
  });

  const fileItem = files[0];

  const handlePreviewWatermark = async () => {
    if (!fileItem) return;
    setIsPreviewing(true);
    setErrorMsg(null);
    try {
      const options: WatermarkOptions = {
        text,
        color,
        fontSize,
        rotation,
        opacity,
        pages: pageTarget,
      };
      const resultBytes = await addWatermark(fileItem.file, options);
      const rendered = await renderPageToImage(resultBytes, 1, 1.4);
      setPreviewImageUrl(rendered.dataUrl);
    } catch (err: any) {
      console.error('Errore anteprima filigrana:', err);
      setErrorMsg(`Errore generazione anteprima: ${err.message || err}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApplyWatermark = async () => {
    if (!fileItem) return;
    setErrorMsg(null);

    await run(
      async () => {
        const options: WatermarkOptions = {
          text,
          color,
          fontSize,
          rotation,
          opacity,
          pages: pageTarget,
        };

        const bytes = await addWatermark(fileItem.file, options);
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setResultBlob(blob);
        setResultBytes(blob.size);

        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_filigrana.pdf`;

        await persist({
          name: outName,
          originalSize: fileItem.file.size,
          data: blob,
        });

        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Filigrana incisa con successo', errorPrefix: 'Errore applicazione filigrana' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setResultBytes(null);
    setPreviewImageUrl(null);
    setFiles([]);
    setErrorMsg(null);
  };

  const outFileName = fileItem
    ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_filigrana.pdf`
    : 'documento_filigrana.pdf';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Stamp className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Incisione Filigrana Vettoriale
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                PyMuPDF Pattern (1,0,0)
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Inserimento timbri diagonali e diciture legali secondo il protocollo coordinate PyMuPDF.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenPythonStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-zinc-400 transition cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Snippet Python PyMuPDF</span>
        </button>
      </div>

      {downloadUrl ? (
        <div className="text-center py-8 space-y-5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-6 sm:p-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Filigrana Applicata con Successo
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il documento PDF con la filigrana vettoriale è pronto per il download.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <PdfPreviewButton data={resultBlob} fileName={outFileName} />

            <a
              href={downloadUrl}
              download={outFileName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-rose-500" />
              <span>Scarica PDF Stampato ({resultBytes ? (resultBytes / 1024 / 1024).toFixed(2) : 0} MB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Elabora un altro file
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
            title="Seleziona il PDF per l'incisione filigrana"
            subtitle="Elaborazione 100% in memoria locale senza upload"
          />

          {fileItem && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
              {/* Parameters Column */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Testo Filigrana:
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="es. CONFIDENZIALE, BOZZA, COPIA"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Colore Incisione:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer p-0.5 bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setColor('#ef4444')}
                        className="px-2 py-1 text-[11px] font-mono rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300"
                      >
                        Rosso PyMuPDF
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Angolo: {rotation}°
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRotation(45)}
                        className={`px-2.5 py-1 text-xs font-medium rounded border ${
                          rotation === 45
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900'
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        45° Diagonale
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotation(0)}
                        className={`px-2.5 py-1 text-xs font-medium rounded border ${
                          rotation === 0
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900'
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        0° Piano
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Dimensione: {fontSize} pt
                    </label>
                    <input
                      type="range"
                      min={18}
                      max={90}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Opacità: {Math.round(opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Applicazione su Pagine:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'Tutte' },
                      { id: 'odd', label: 'Dispari' },
                      { id: 'even', label: 'Pari' },
                    ].map((tg) => (
                      <button
                        key={tg.id}
                        type="button"
                        onClick={() => setPageTarget(tg.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border ${
                          pageTarget === tg.id
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        {tg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Technical Simulator & Real Page Preview */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-white dark:bg-[#111218] rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between w-full px-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    {previewImageUrl ? 'Anteprima Documento Reale' : 'Simulatore Tecnico'}
                  </span>
                  <button
                    type="button"
                    onClick={handlePreviewWatermark}
                    disabled={isPreviewing}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                  >
                    {isPreviewing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Rendering...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>{previewImageUrl ? 'Aggiorna Anteprima' : 'Genera Anteprima Reale'}</span>
                      </>
                    )}
                  </button>
                </div>

                {previewImageUrl ? (
                  <div className="relative max-h-64 overflow-auto rounded border border-zinc-300 dark:border-zinc-800 shadow-sm bg-white p-1">
                    <img
                      src={previewImageUrl}
                      alt="Anteprima Filigrana su Pagina 1"
                      className="max-h-60 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="relative w-40 h-56 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded shadow-xs overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-3 space-y-2 opacity-15">
                      <div className="h-1.5 bg-zinc-400 rounded w-3/4"></div>
                      <div className="h-1 bg-zinc-400 rounded w-full"></div>
                      <div className="h-1 bg-zinc-400 rounded w-5/6"></div>
                      <div className="h-1 bg-zinc-400 rounded w-full"></div>
                      <div className="h-1 bg-zinc-400 rounded w-4/5"></div>
                    </div>

                    <div
                      style={{
                        transform: `rotate(-${rotation}deg)`,
                        color: color,
                        opacity: opacity,
                        fontSize: `${Math.max(11, fontSize * 0.32)}px`,
                      }}
                      className="font-bold whitespace-nowrap select-none pointer-events-none tracking-wider text-center"
                    >
                      {text || 'FILIGRANA'}
                    </div>
                  </div>
                )}

                <span className="text-[10px] font-mono text-zinc-500">
                  Target (rect.w/4, rect.h/2) · rot:{rotation}° · opacità: {Math.round(opacity * 100)}%
                </span>
              </div>

              {/* Error Notification */}
              {errorMsg && (
                <div className="lg:col-span-12 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-3">
                  <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />
                  <button
                    type="button"
                    disabled={isPreviewing}
                    onClick={handlePreviewWatermark}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isPreviewing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                        <span>Elaborazione Anteprima...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-rose-500" />
                        <span>Verifica Anteprima su Documento</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={handleApplyWatermark}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Incisione in corso...</span>
                    </>
                  ) : (
                    <>
                      <Stamp className="w-3.5 h-3.5 text-rose-500" />
                      <span>Conferma & Salva Filigrana</span>
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
