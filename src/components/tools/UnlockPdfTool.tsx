import React, { useState } from 'react';
import {
  Unlock,
  Key,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { unlockPdf } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

interface UnlockPdfToolProps {
  onSuccess?: () => void;
}

export const UnlockPdfTool: React.FC<UnlockPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const fileItem = files[0];

  const handleUnlock = async () => {
    if (!fileItem || !password) return;
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const unlockedBytes = await unlockPdf(fileItem.file, password);
      const blob = new Blob([unlockedBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_sbloccato.pdf`;

      setDownloadUrl(url);
      setOutputName(outName);
      setResultBytes(blob.size);

      await saveToVault({
        toolId: 'protect',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      confetti({ particleCount: 50, spread: 60 });
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Password errata o documento non valido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setFiles([]);
    setPassword('');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-slate-800 border border-amber-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 shadow-2xs">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Sblocca PDF (Rimozione Password)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                100% Client-Side Wasm
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rimuovi in modo permanente la password da un PDF cifrato di cui conosci la chiave, per archiviarlo, visualizzarlo o stamparlo liberamente.
            </p>
          </div>
        </div>
      </div>

      {/* Main Flow */}
      {!downloadUrl ? (
        <div className="space-y-6">
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Seleziona il PDF protetto da password"
            subtitle="Elaborazione immediata sul tuo computer. Nessun dato lascia il dispositivo."
          />

          {fileItem && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Inserisci la Password del Documento:</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digita la password del PDF..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pr-11 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUnlock();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleUnlock}
                  disabled={!password || isProcessing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Decrittazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Sblocca e Rimuovi Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Success Phase */
        <div className="p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              PDF Sbloccato con Successo!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La protezione crittografica è stata rimossa. Ora il file può essere aperto liberamente senza password.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {outputName}
            </p>
            <p className="text-slate-500">
              Dimensione: {resultBytes ? `${(resultBytes / 1024).toFixed(1)} KB` : 'N/D'} • Salvato anche nel Vault Locale
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={outputName}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Scarica PDF Sbloccato</span>
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Sblocca un Altro PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
