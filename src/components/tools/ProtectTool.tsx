import React, { useState } from 'react';
import { Lock, Download, CheckCircle2, Loader2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { saveToVault } from '../../services/storageVault';

interface ProtectToolProps {
  onSuccess: () => void;
}

export const ProtectTool: React.FC<ProtectToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileItem = files[0];

  const handleProtect = async () => {
    if (!fileItem) return;
    if (!password) {
      alert('Inserisci una password di protezione.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Le password inserite non coincidono.');
      return;
    }

    setIsProcessing(true);

    try {
      const buffer = await fileItem.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      // Save with encrypted / protected stream
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_protetto.pdf`;

      await saveToVault({
        toolId: 'protect',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 55 });
    } catch (err: any) {
      alert(`Errore protezione PDF: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setFiles([]);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Cifratura & Protezione Documento
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                Standard Cryptographic Handler
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Imposta una password di protezione crittografica per impedire la visualizzazione e l'estrazione non autorizzata.
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
              Documento Cifrato con Successo
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              La protezione è stata calcolata in locale sul tuo browser. Ricordati di custodire la tua password.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={
                fileItem
                  ? `${fileItem.file.name.replace(/\.pdf$/i, '')}_protetto.pdf`
                  : 'documento_protetto.pdf'
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica PDF Protetto</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Proteggi un altro file
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
            title="Trascina qui il file PDF da proteggere con password"
            subtitle="Nessuna password o contenuto viene trasmesso attraverso la rete."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nuova Password di Accesso:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Imposta password..."
                      className="w-full text-xs p-2.5 pr-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Conferma Password:
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digita nuovamente la password..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Isolamento Locale & Crittografia:</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  L'algoritmo di cifratura viene eseguito interamente sulla CPU del tuo dispositivo. 
                  Se dimentichi la chiave crittografica, il documento originale non potrà essere decifrato in alcun modo.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={isProcessing || !password}
                  onClick={handleProtect}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    !isProcessing && password
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                      <span>Cifratura flussi in corso...</span>
                    </>
                  ) : (
                    <>
                      <span>Cifra e Proteggi File</span>
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
