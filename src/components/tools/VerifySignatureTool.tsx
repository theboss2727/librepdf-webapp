import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Copy,
  Check,
  Download,
  Clock,
  User,
  Key,
  Layers,
  FileCode,
  Info,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { inspectPdfSignatures, type PdfSignatureInspection } from '../../services/pdfEngine';
import { useLoading } from '../../context/LoadingContext';

interface VerifySignatureToolProps {
  onSuccess?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const VerifySignatureTool: React.FC<VerifySignatureToolProps> = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [report, setReport] = useState<PdfSignatureInspection | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [queryHash, setQueryHash] = useState('');
  const { showLoading, hideLoading } = useLoading();

  const fileItem = files[0];

  const handleFilesChange = async (newFiles: FileItem[]) => {
    setFiles(newFiles);
    setQueryHash('');
    if (newFiles.length === 0) {
      setReport(null);
      return;
    }

    const file = newFiles[0].file;
    showLoading();
    try {
      const inspection = await inspectPdfSignatures(file);
      setReport(inspection);
      toast.success('Analisi crittografica completata');
    } catch (err: any) {
      console.error('Errore ispezione firme:', err);
      toast.error('Errore durante l\'analisi del documento PDF');
    } finally {
      hideLoading();
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copiato negli appunti');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_verifica_${report.fileName.replace(/\.pdf$/i, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFiles([]);
    setReport(null);
    setQueryHash('');
  };

  // Compare queryHash against current file hashes
  const trimmedQuery = queryHash.trim().toLowerCase();
  let matchType: 'postSign' | 'preSign' | 'byteRange' | 'sha1' | 'none' | null = null;
  let isFullMatch = false;
  let matchedDetail: string | undefined;

  if (trimmedQuery.length >= 6 && report) {
    if (trimmedQuery === report.sha256.toLowerCase()) {
      matchType = 'postSign';
      isFullMatch = true;
      matchedDetail = 'Impronta SHA-256 del File Firmato Attuale';
    } else if (report.sha256.toLowerCase().startsWith(trimmedQuery)) {
      matchType = 'postSign';
      isFullMatch = false;
      matchedDetail = 'Prefisso Impronta SHA-256 del File Firmato';
    } else if (trimmedQuery === report.sha1.toLowerCase()) {
      matchType = 'sha1';
      isFullMatch = true;
      matchedDetail = 'Impronta SHA-1 del File';
    } else {
      for (const s of report.signatures) {
        if (s.preSignSha256) {
          const sPre = s.preSignSha256.toLowerCase();
          if (trimmedQuery === sPre) {
            matchType = 'preSign';
            isFullMatch = true;
            matchedDetail = `Impronta Documento Originale (Pre-Firma - ${s.signerName})`;
            break;
          } else if (sPre.startsWith(trimmedQuery)) {
            matchType = 'preSign';
            isFullMatch = false;
            matchedDetail = `Prefisso Hash Pre-Firma (${trimmedQuery.length}/64 caratteri)`;
            break;
          }
        }
        if (s.byteRangeSha256) {
          const sBr = s.byteRangeSha256.toLowerCase();
          if (trimmedQuery === sBr) {
            matchType = 'byteRange';
            isFullMatch = true;
            matchedDetail = `ByteRange Crittografico PAdES (${s.signerName})`;
            break;
          } else if (sBr.startsWith(trimmedQuery)) {
            matchType = 'byteRange';
            isFullMatch = false;
            matchedDetail = `Prefisso ByteRange PAdES (${trimmedQuery.length}/64 caratteri)`;
            break;
          }
        }
      }
      if (!matchType) {
        matchType = 'none';
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Verifica Firme & Integrità PDF
              </h2>
              <span className="font-mono text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                PAdES / CAdES / Hash SHA-256
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ispeziona certificati digitali X.509, calcola l'impronta crittografica e verifica che il file non sia stato alterato dopo la firma.
            </p>
          </div>
        </div>
      </div>

      {!report ? (
        <FileDropzone
          files={files}
          onFilesChange={handleFilesChange}
          accept=".pdf"
          multiple={false}
          title="Trascina qui il file PDF da verificare"
          subtitle="Ispezione 100% in locale nel tuo browser. Nessun documento viene caricato su server esterni."
        />
      ) : (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Status Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              report.isModifiedAfterSigning
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                : report.hasSignatures
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  report.isModifiedAfterSigning
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    : report.hasSignatures
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}
              >
                {report.isModifiedAfterSigning ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : report.hasSignatures ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  {report.isModifiedAfterSigning
                    ? 'Attenzione: File Modificato dopo la Firma'
                    : report.hasSignatures
                    ? 'Firma Elettronica Rilevata & Valida'
                    : 'Documento Valido (Nessuna Firma Crittografica PAdES)'}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  {report.isModifiedAfterSigning
                    ? `Il file contiene firme, ma sono state rilevate ${report.revisionCount} revisioni incrementali successive alla firma.`
                    : report.hasSignatures
                    ? `Il documento include ${report.signatures.length} firma/e integra/e a copertura completa del contenuto.`
                    : 'Il file PDF è strutturalmente integro e pronto per il calcolo delle impronte di conformità.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
                title="Esporta dossier di verifica in formato JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Scarica Dossier Audit</span>
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
                title="Verifica un altro file"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Signatures List Section */}
          {report.signatures.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Certificati e Firme Rilevate ({report.signatures.length})</span>
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {report.signatures.map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          {sig.type}
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{sig.signerName}</span>
                        </span>
                      </div>

                      {sig.signingTime && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{sig.signingTime}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {sig.reason && (
                        <div className="text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Motivo: </span>
                          <span>{sig.reason}</span>
                        </div>
                      )}
                      {sig.subFilter && (
                        <div className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Filtro: </span>
                          <span>{sig.subFilter}</span>
                        </div>
                      )}
                      {sig.location && (
                        <div className="text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Luogo / Info: </span>
                          <span>{sig.location}</span>
                        </div>
                      )}
                      <div className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Integrità copertura: </span>
                        {sig.isCoveringFullFile ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>100% (Intero Documento)</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Parziale (Revisione Storica)</span>
                          </span>
                        )}
                      </div>

                      {/* Stamped Pre-Sign Hash (if visual seal) */}
                      {sig.preSignSha256 && (
                        <div className="col-span-full mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs">
                          <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hash Documento Originale (Pre-Firma nel Timbro):</span>
                            </span>
                            <button
                              onClick={() => copyToClipboard(sig.preSignSha256!, `pre-${idx}`)}
                              className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              {copiedKey === `pre-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === `pre-${idx}` ? 'Copiato' : 'Copia'}</span>
                            </button>
                          </div>
                          <div className="font-mono text-[11px] text-emerald-950 dark:text-emerald-200 break-all select-all">
                            {sig.preSignSha256}
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                            Questo hash certifica l'integrità del contenuto originario prima dell'apposizione del timbro visivo.
                          </p>
                        </div>
                      )}

                      {/* ByteRange Hash (if PAdES) */}
                      {sig.byteRangeSha256 && (
                        <div className="col-span-full mt-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs">
                          <div className="flex items-center justify-between font-semibold text-blue-800 dark:text-blue-300 mb-1">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Hash SHA-256 ByteRange Firmato PAdES:</span>
                            </span>
                            <button
                              onClick={() => copyToClipboard(sig.byteRangeSha256!, `br-${idx}`)}
                              className="flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {copiedKey === `br-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === `br-${idx}` ? 'Copiato' : 'Copia'}</span>
                            </button>
                          </div>
                          <div className="font-mono text-[11px] text-blue-950 dark:text-blue-200 break-all select-all">
                            {sig.byteRangeSha256}
                          </div>
                          <p className="text-[10px] text-blue-700 dark:text-blue-400 mt-1">
                            Impronta esatta dei byte firmati digitalmente dal certificato (escluso il contenitore di firma).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Hashes (SHA-256 / SHA-1) */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              <span>Impronte Crittografiche di Integrità (Checksum)</span>
            </h3>

            {/* SHA-256 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Digest SHA-256 (Standard eIDAS / PA):</span>
                <button
                  onClick={() => copyToClipboard(report.sha256, 'sha256')}
                  className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {copiedKey === 'sha256' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'sha256' ? 'Copiato' : 'Copia Hash'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 font-mono text-xs break-all text-zinc-800 dark:text-zinc-200 select-all">
                {report.sha256}
              </div>
            </div>

            {/* SHA-1 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Digest SHA-1 (Retrocompatibilità):</span>
                <button
                  onClick={() => copyToClipboard(report.sha1, 'sha1')}
                  className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {copiedKey === 'sha1' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'sha1' ? 'Copiato' : 'Copia'}</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 font-mono text-xs break-all text-zinc-600 dark:text-zinc-400 select-all">
                {report.sha1}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Nota di Sicurezza & Architettura:</strong> Quando un PDF viene firmato con timbro grafico o certificato, il documento finale acquisisce una nuova impronta (<strong>Post-Firma</strong>) poiché incorpora i nuovi oggetti vettoriali e i metadati. Il timbro visivo include l'impronta (<strong>Pre-Firma</strong>) del documento originario.
              </span>
            </div>
          </div>

          {/* Interactive Hash Comparator / Check Tool */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Verifica & Confronto Istantaneo di un Hash Atteso</span>
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Incolla qui l'hash SHA-256 (intero o parziale dal timbro grafico, marca temporale o ricevuta PEC) per verificare se corrisponde al file firmato o all'originale:
              </p>

              <div className="relative">
                <input
                  type="text"
                  value={queryHash}
                  onChange={(e) => setQueryHash(e.target.value)}
                  placeholder="Incolla qui l'hash SHA-256 (64 caratteri esadecimali o prefisso dal timbro)..."
                  className="w-full pl-9 pr-24 py-2 text-xs font-mono rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <span className="absolute right-3 top-2.5 text-[10px] font-mono text-zinc-400">
                  {trimmedQuery.length}/64 char
                </span>
              </div>

              {matchType && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                    matchType === 'none'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                      : isFullMatch
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {matchType === 'none' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : isFullMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    {matchType === 'postSign' && (
                      <div>
                        <span className="font-bold">
                          {isFullMatch ? 'MATCH TOTALE (64/64 Caratteri): ' : 'MATCH PREFISSO FILE FIRMATO: '}
                        </span>
                        <span>
                          {isFullMatch
                            ? 'Coincidenza esatta al 100% con l\'impronta crittografica del File PDF Firmato Attuale (Post-Firma).'
                            : `I primi ${trimmedQuery.length} caratteri coincidono con l'inizio dell'impronta complessiva del file.`}
                        </span>
                      </div>
                    )}
                    {matchType === 'preSign' && (
                      <div>
                        <span className="font-bold">
                          {isFullMatch ? 'MATCH TOTALE PRE-FIRMA (64/64 Caratteri): ' : 'MATCH PREFISSO TIMBRO: '}
                        </span>
                        <span>
                          {isFullMatch
                            ? `Coincidenza esatta integrale con l'impronta del Documento Originale prima della firma (${matchedDetail}).`
                            : `I ${trimmedQuery.length} caratteri inseriti corrispondono al prefisso dell'impronta integrale a 64 cifre sigillata nel timbro / metadati (${matchedDetail}).`}
                        </span>
                      </div>
                    )}
                    {matchType === 'byteRange' && (
                      <div>
                        <span className="font-bold">
                          {isFullMatch ? 'MATCH TOTALE BYTERANGE PAdES: ' : 'MATCH PREFISSO PAdES: '}
                        </span>
                        <span>
                          Coincide con il blocco firmato digitalmente dal certificato X.509 ({matchedDetail}).
                        </span>
                      </div>
                    )}
                    {matchType === 'sha1' && (
                      <div>
                        <span className="font-bold">CORRISPONDENZA SHA-1: </span>
                        <span>Coincide con l'impronta legacy SHA-1 del file.</span>
                      </div>
                    )}
                    {matchType === 'none' && (
                      <div>
                        <span className="font-bold">NESSUNA CORRISPONDENZA: </span>
                        <span>L'hash inserito non appartiene né al file firmato attuale, né al documento originale pre-firma. Il file potrebbe essere stato modificato.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Technical Metadata & File Structure */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Struttura del Documento & Cronologia Revisioni</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Dimensione</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatBytes(report.fileSizeBytes)}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Versione PDF</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{report.metadata.pdfVersion || '%PDF-1.7'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Revisioni Incrementali</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{report.revisionCount} %%EOF</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Software Produttore</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block" title={report.metadata.producer}>
                  {report.metadata.producer || 'Standard'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
