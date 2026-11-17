import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eraser,
  Eye,
  Info,
  Calendar,
  User,
  Tag,
  FileType,
  Loader2,
  HardDrive,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { inspectPdfDetails, updatePdfMetadata, type PdfMetadataPayload } from '../../services/pdfEngine';
import { saveToVault } from '../../services/storageVault';

export const MetadataPdfTool: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Technical details
  const [details, setDetails] = useState<any>(null);

  // Editable Form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const fileItem = files[0];

  useEffect(() => {
    if (!fileItem) {
      setDetails(null);
      return;
    }

    const loadDetails = async () => {
      setIsInspecting(true);
      try {
        const info = await inspectPdfDetails(fileItem.file);
        setDetails(info);
        setTitle(info.title || '');
        setAuthor(info.author || '');
        setSubject('');
        setCreator(info.creator || '');
        setProducer(info.producer || '');
      } catch (e) {
        console.warn('Errore lettura metadati:', e);
      } finally {
        setIsInspecting(false);
      }
    };

    loadDetails();
  }, [fileItem]);

  const handleSaveMetadata = async (stripAll = false) => {
    if (!fileItem) return;
    setIsSaving(true);

    try {
      const payload: PdfMetadataPayload = {
        title: title.trim(),
        author: author.trim(),
        subject: subject.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        creator: creator.trim(),
        producer: producer.trim(),
      };

      const updatedBytes = await updatePdfMetadata(fileItem.file, payload, stripAll);
      const blob = new Blob([updatedBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = fileItem.file.name.replace(/\.pdf$/i, '');
      const outName = stripAll ? `${baseName}_sanitizzato.pdf` : `${baseName}_metadati.pdf`;

      setDownloadUrl(url);
      setOutputName(outName);
      setResultBytes(blob.size);

      await saveToVault({
        toolId: 'edit-pdf',
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: blob.size,
        data: blob,
      });

      confetti({ particleCount: 45, spread: 55 });
    } catch (err: any) {
      alert('Errore aggiornamento metadati: ' + (err?.message || 'Errore interno'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setFiles([]);
    setDetails(null);
    setTitle('');
    setAuthor('');
    setSubject('');
    setKeywords('');
    setCreator('');
    setProducer('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-slate-800 border border-violet-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 shadow-2xs">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Ispezione & Editor Metadati Privacy
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
                Privacy Sanitizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualizza e modifica i dati nascosti del documento, oppure applica la sanificazione 1-clic per cancellare traccianti e autori prima della condivisione.
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
            title="Seleziona il PDF da ispezionare o modificare"
            subtitle="Tutte le modifiche ai metadati avvengono in memoria locale sul tuo computer."
          />

          {isInspecting && (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center gap-3 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              <span>Decodifica struttura XRef e dizionario Info...</span>
            </div>
          )}

          {details && !isInspecting && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Technical Inspection Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Info className="w-4 h-4 text-violet-500" />
                  <span>Dati Strutturali Rilevati</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Pagine</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{details.pageCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Dimensioni Foglio</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {details.pageWidthMm} &times; {details.pageHeightMm} mm
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Moduli Interattivi</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {details.hasAcroForm ? 'Presenti (AcroForm)' : 'Nessuno'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Data Creazione</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {details.creationDate ? new Date(details.creationDate).toLocaleDateString() : 'Non indicata'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Metadata Form */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-violet-500" />
                    <span>Proprietà Documento e Tag</span>
                  </h4>
                  <button
                    onClick={() => handleSaveMetadata(true)}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Cancella tutti i metadati e traccianti in un colpo solo"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Sanitizzazione Privacy Totale</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Titolo Documento</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="es. Bilancio Annuale 2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Autore</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="es. Mario Rossi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Oggetto / Descrizione</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="es. Relazione tecnica e prospetto economico"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Parole Chiave (separate da virgola)</label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="es. finanza, bilancio, q4, audit"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Applicazione Creatrice (Creator)</label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      placeholder="es. LibrePDF Studio"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Produttore PDF (Producer)</label>
                    <input
                      type="text"
                      value={producer}
                      onChange={(e) => setProducer(e.target.value)}
                      placeholder="es. LibrePDF Client Engine"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => handleSaveMetadata(false)}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-violet-600/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvataggio in corso...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Applica Modifiche Metadati</span>
                      </>
                    )}
                  </button>
                </div>
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
              Metadati Aggiornati con Successo!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Il documento PDF è stato rigenerato con le nuove proprietà richieste.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{outputName}</p>
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
              <span>Scarica PDF Aggiornato</span>
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ispeziona un Altro PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
