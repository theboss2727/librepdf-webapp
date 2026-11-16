import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Upload,
  Type,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { signPdf } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import { PdfPreviewButton } from '../PdfPreviewButton';

interface SignPdfToolProps {
  onSuccess: () => void;
}

export const SignPdfTool: React.FC<SignPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [signerName, setSignerName] = useState('Dott. Mario Rossi');
  const [reason, setReason] = useState('Per approvazione e conformità');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'bottom-center'>('bottom-right');
  const [pageNumber, setPageNumber] = useState(1);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeDocHash, setIncludeDocHash] = useState(true);
  const [immutableLock, setImmutableLock] = useState(true);

  // Signature Drawing Canvas
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState('Mario Rossi');
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [auditHashes, setAuditHashes] = useState<{ preSign: string; postSign: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'sign-pdf',
    onSuccess,
  });

  const fileItem = files[0];

  useEffect(() => {
    if (fileItem && fileItem.pageCount) {
      setPageNumber(fileItem.pageCount); // default last page
    }
  }, [fileItem]);

  // Drawing Canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Convert typed name to PNG base64
  const generateTypedSignatureBase64 = (name: string): string => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 300;
    offscreen.height = 100;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.font = 'italic 34px "Brush Script MT", cursive, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name || 'Firma', 150, 50);
    }
    return offscreen.toDataURL('image/png');
  };

  const handleApplySignature = async () => {
    if (!fileItem) return;

    await run(
      async () => {
        let signatureImageBase64 = '';
        if (sigMode === 'draw' && canvasRef.current && hasDrawn) {
          signatureImageBase64 = canvasRef.current.toDataURL('image/png');
        } else if (sigMode === 'type') {
          signatureImageBase64 = generateTypedSignatureBase64(typedName);
        } else if (sigMode === 'upload' && uploadedSigUrl) {
          signatureImageBase64 = uploadedSigUrl;
        }

        const signedBytes = await signPdf(fileItem.file, {
          signatureImageBase64,
          signerName,
          reason,
          pageNumber,
          positionPreset: position,
          includeTimestamp,
          includeDocHash,
          immutableLock,
        });

        // Compute pre-sign and post-sign SHA-256 for audit
        let preSign = '';
        let postSign = '';
        if (typeof crypto !== 'undefined' && crypto.subtle) {
          const preBuf = await fileItem.file.arrayBuffer();
          const preDigest = await crypto.subtle.digest('SHA-256', preBuf);
          preSign = Array.from(new Uint8Array(preDigest)).map((b) => b.toString(16).padStart(2, '0')).join('');

          const postDigest = await crypto.subtle.digest('SHA-256', signedBytes as any);
          postSign = Array.from(new Uint8Array(postDigest)).map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        setAuditHashes({ preSign, postSign });

        const blob = new Blob([signedBytes as any], { type: 'application/pdf' });
        setDownloadUrl(URL.createObjectURL(blob));
        setResultBlob(blob);
        setResultBytes(blob.size);

        const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_firmato.pdf`;

        await persist({
          name: outName,
          originalSize: fileItem.file.size,
          data: blob,
        });

        confetti({ particleCount: 50, spread: 55 });
      },
      { successMessage: 'Firma e timbro apposti con successo', errorPrefix: 'Errore firma PDF' }
    );
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBlob(null);
    setResultBytes(null);
    setAuditHashes(null);
    setFiles([]);
    clearCanvas();
  };

  const copyHash = (hash: string, key: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedKey(key);
    toast.success('Impronta SHA-256 copiata negli appunti');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const outFileName = fileItem
    ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_firmato.pdf`
    : 'documento_firmato.pdf';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold">
            <PenTool className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Firma Digitale & Timbro Certificato
              </h2>
              <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                SHA-256 Verified
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Apponi una firma autografa o timbro con marcatura temporale ISO e impronta crittografica di integrità.
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
              Documento Sigillato & Firmato con Successo!
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Il timbro grafico e i metadati di verifica sono stati incorporati nel flusso vettoriale.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <PdfPreviewButton data={resultBlob} fileName={outFileName} />

            <a
              href={downloadUrl}
              download={outFileName}
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
              Firma un altro PDF
            </button>
          </div>

          {/* Cryptographic Audit Trail */}
          {auditHashes && (
            <div className="mt-6 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/30 text-left space-y-3 shadow-xs max-w-2xl mx-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Riepilogo Impronte Crittografiche (SHA-256)</span>
              </div>

              {/* Post-Sign */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    1. Impronta File Firmato (Post-Firma SHA-256):
                  </span>
                  <button
                    onClick={() => copyHash(auditHashes.postSign, 'post')}
                    className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'post' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'post' ? 'Copiato' : 'Copia'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 break-all select-all border border-zinc-200 dark:border-zinc-700">
                  {auditHashes.postSign}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Questa è l'impronta complessiva del file PDF generato (quella calcolata dai software di verifica checksum).
                </p>
              </div>

              {/* Pre-Sign */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    2. Impronta Documento Originale (Pre-Firma SHA-256):
                  </span>
                  <button
                    onClick={() => copyHash(auditHashes.preSign, 'pre')}
                    className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === 'pre' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'pre' ? 'Copiato' : 'Copia'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 break-all select-all border border-zinc-200 dark:border-zinc-700">
                  {auditHashes.preSign}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Questa è l'impronta registrata nel timbro e nei metadati che attesta il contenuto prima dell'apposizione della firma.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Trascina qui il documento PDF da firmare o timbrare"
            subtitle="I documenti vengono elaborati in locale. Nessun certificato o firma lascia il tuo browser."
          />

          {fileItem && (
            <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-5">
              {/* Step 1: Signature Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Metodo Firma / Timbro:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSigMode('draw')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      sigMode === 'draw'
                        ? 'border-emerald-500 bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Disegna</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode('type')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      sigMode === 'type'
                        ? 'border-emerald-500 bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>Digita Nome</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode('upload')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      sigMode === 'upload'
                        ? 'border-emerald-500 bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carica PNG</span>
                  </button>
                </div>
              </div>

              {/* Signature Input Canvas / Box */}
              {sigMode === 'draw' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Disegna con mouse o dito:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Cancella tratto</span>
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 cursor-crosshair touch-none"
                  />
                </div>
              )}

              {sigMode === 'type' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nome per firma corsiva:
                  </label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="Mario Rossi"
                  />
                  <div className="mt-2 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center font-serif italic text-2xl text-zinc-800 dark:text-zinc-200">
                    {typedName || 'Firma Esempio'}
                  </div>
                </div>
              )}

              {sigMode === 'upload' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Carica immagine firma trasparente (.png):
                  </label>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setUploadedSigUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-zinc-200 dark:file:bg-zinc-700 file:text-zinc-800 dark:file:text-zinc-200 cursor-pointer"
                  />
                  {uploadedSigUrl && (
                    <div className="mt-2 p-2 bg-white dark:bg-zinc-800 rounded-lg border inline-block">
                      <img src={uploadedSigUrl} alt="Firma caricata" className="max-h-16" />
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nome Firmatario:
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Motivo / Titolo Firma:
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    placeholder="Per approvazione / Conforme all'originale"
                  />
                </div>
              </div>

              {/* Page & Position Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Applica sulla Pagina:
                  </label>
                  <select
                    value={pageNumber}
                    onChange={(e) => setPageNumber(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {Array.from({ length: fileItem.pageCount || 1 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Pagina {i + 1} {i + 1 === fileItem.pageCount ? '(Ultima pagina)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Posizionamento Timbro:
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="bottom-right">In Basso a Destra (Classico)</option>
                    <option value="bottom-left">In Basso a Sinistra</option>
                    <option value="bottom-center">In Basso al Centro</option>
                  </select>
                </div>
              </div>

              {/* Verification Badges Toggles */}
              <div className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={immutableLock}
                    onChange={(e) => setImmutableLock(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    🔒 Sigillo Immutabile & Blocco Modifiche (Impedisce l'editing del testo in GearPDF, Foxit o Acrobat)
                  </span>
                </label>

                <div className="flex flex-wrap gap-4 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimestamp}
                      onChange={(e) => setIncludeTimestamp(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Includi Marcatura Temporale ISO</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDocHash}
                      onChange={(e) => setIncludeDocHash(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Includi Digest Impronta Crittografica SHA-256</span>
                  </label>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

                <button
                  disabled={isProcessing}
                  onClick={handleApplySignature}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Sigillatura in corso...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Apponi Firma & Salva PDF</span>
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
