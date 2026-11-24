import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode2,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Eye,
  Edit3,
  Sparkles,
  Printer,
  Copy,
  Check,
  FileText,
  RotateCcw,
  SlidersVertical,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { convertMarkdownToPdf, type MarkdownPdfOptions } from '../../services/markdownToPdf';
import { saveToVault } from '../../services/storageVault';
import { getBaseFileName } from '../../utils/stringUtils';

const SAMPLE_MARKDOWN = `# Documento Tecnico & Relazione di Progetto
*Autore: Team di Sviluppo LibrePDF | Data: Novembre 2026*

---

## 1. Introduzione e Obiettivi
Questa documentazione illustra l'architettura del **motore tipografico vettoriale** di LibrePDF per la conversione diretta da **Markdown (.md) a PDF**.

> [!NOTE]
> La conversione avviene **100% offline nel browser** tramite calcolo geometrico vettoriale, garantendo testi selezionabili, immagini nitide e zero dipendenze da server esterni.

### Punti Chiave del Sistema
- **Fedeltà Tipografica**: Spaziature proporzionali, font sans-serif e serif ad alta leggibilità.
- **Supporto Markdown Esteso**: Tabelle, liste numerate, elenchi puntati e blocchi di codice.
- **Privacy Assoluta**: Nessun dato viene trasmesso sulla rete.

---

## 2. Checklist Funzionalità & Stato Avanzamento
- [x] Parser token Markdown con analisi inline (**grassetto**, *corsivo*, \`codice\`)
- [x] Riconoscimento blocchi di codice multi-riga con box colorato
- [x] Generazione tabelle con intestazioni evidenziate e righe alternate
- [x] Numerazione automatica delle pagine in calce (*Pagina X di Y*)
- [ ] Supporto diagrammi Mermaid vettoriali nativi

---

## 3. Specifiche Tecniche & Prestazioni

| Componente | Tecnologia | Tempo Elaborazione | Fedeltà |
| :--- | :---: | :---: | ---: |
| **Parser AST** | Tokenizer Regex Nativo | < 5 ms | 100% |
| **Motore Vettoriale** | pdf-lib Wasm / JS | < 120 ms | 1:1 Vector |
| **Output Storage** | IndexedDB Local Vault | Immediato | Crittografato |

---

## 4. Esempio di Codice Sorgente
Di seguito il modulo principale per l'inizializzazione del flusso documentale:

\`\`\`typescript
import { convertMarkdownToPdf } from './markdownToPdf';

// Esempio di conversione con tema personalizzato
const result = await convertMarkdownToPdf(markdownContent, {
  theme: 'github',
  pageSize: 'a4',
  orientation: 'portrait',
  showPageNumbers: true
});

console.log(\`PDF generato: \${result.pageCount} pagine, \${result.wordCount} parole\`);
\`\`\`

> [!TIP]
> Puoi personalizzare in qualsiasi momento il tema visivo (GitHub, Accademico, Corporate, Monospace) prima dell'esportazione.

---

### Conclusioni
Il motore Markdown di LibrePDF offre un'esperienza analoga a strumenti professionali desktop come Typora o Pandoc, direttamente all'interno della workstation web.
`;

interface MarkdownToPdfToolProps {
  onSuccess: () => void;
}

export const MarkdownToPdfTool: React.FC<MarkdownToPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [markdownText, setMarkdownText] = useState<string>(SAMPLE_MARKDOWN);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');

  // Options
  const [theme, setTheme] = useState<'github' | 'academic' | 'modern' | 'mono'>('github');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margins, setMargins] = useState<'compact' | 'standard' | 'generous'>('standard');
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showRunningHeader, setShowRunningHeader] = useState(true);
  const [customTitle, setCustomTitle] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);
  const [resultPages, setResultPages] = useState<number>(0);
  const [outputFilename, setOutputFilename] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // When a file is dropped, load its text content
  useEffect(() => {
    if (files.length > 0 && files[0].file) {
      const file = files[0].file;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setMarkdownText(text);
          const baseName = getBaseFileName(file.name);
          setCustomTitle(baseName);
        }
      };
      reader.readAsText(file);
    }
  }, [files]);

  const wordCount = markdownText.trim() ? markdownText.trim().split(/\s+/).length : 0;
  const lineCount = markdownText.split('\n').length;

  const handleConvert = async () => {
    if (!markdownText.trim()) {
      setErrorMsg('Inserisci del testo Markdown o trascina un file .md per avviare la conversione.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setProgress(5);

    try {
      const options: MarkdownPdfOptions = {
        theme,
        pageSize,
        orientation,
        margins,
        showPageNumbers,
        showRunningHeader,
        documentTitle: customTitle.trim() || undefined,
      };

      const result = await convertMarkdownToPdf(markdownText, options, (pct, msg) => {
        setProgress(pct);
        setStatusMsg(msg);
      });

      const baseName = customTitle.trim() || result.title.replace(/[^\w\s-]/gi, '').trim() || 'documento';
      const filename = `${baseName}.pdf`;

      const blob = new Blob([result.pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setResultBytes(blob.size);
      setResultPages(result.pageCount);
      setOutputFilename(filename);

      await saveToVault({
        toolId: 'markdown-to-pdf',
        name: filename,
        originalSize: new Blob([markdownText]).size,
        resultSize: blob.size,
        data: blob,
      });

      onSuccess();
      confetti({ particleCount: 50, spread: 60 });
    } catch (err: any) {
      console.error('Errore conversione Markdown to PDF:', err);
      setErrorMsg(err.message || 'Si è verificato un errore durante la generazione del PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setResultBytes(null);
    setProgress(0);
    setStatusMsg('');
    setErrorMsg(null);
  };

  const handleLoadSample = () => {
    setMarkdownText(SAMPLE_MARKDOWN);
    setCustomTitle('Documento Tecnico');
    setFiles([]);
    handleReset();
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPreview = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-slate-800 border border-violet-200/80 dark:border-slate-700/60 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 shadow-2xs">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Markdown (.md) in PDF
                </h2>
                <span className="font-mono text-[10px] text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-300 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-900/60 font-semibold">
                  100% Vettoriale • Alta Fedeltà
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Impaginazione editoriale, tabelle, blocchi di codice e numerazione pagine automatica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/70 transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Carica Esempio Completo</span>
            </button>
          </div>
        </div>
      </div>

      {downloadUrl ? (
        /* Result Screen */
        <div className="text-center py-8 space-y-5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 sm:p-8 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              PDF Vettoriale Generato con Successo!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Documento con {resultPages} {resultPages === 1 ? 'pagina' : 'pagine'}, testo selezionabile e formattazione vettoriale 1:1.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={downloadUrl}
              download={outputFilename}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs transition hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Scarica {outputFilename} ({resultBytes ? (resultBytes / 1024).toFixed(1) : 0} KB)</span>
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              Modifica e Converti di Nuovo
            </button>
          </div>
        </div>
      ) : (
        /* Main Configuration & Editor Area */
        <div className="space-y-6">
          {/* File Dropzone */}
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            multiple={false}
            title="Trascina qui il tuo file Markdown (.md, .markdown) o selezionalo"
            subtitle="Oppure scrivi e incolla direttamente il testo Markdown nell'editor qui sotto."
          />

          {/* Options Toolbar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersVertical className="w-4 h-4 text-violet-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Opzioni di Impaginazione & Stile
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {wordCount} parole • {lineCount} righe
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Theme */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Tema Tipografico
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="github">GitHub Modern (Sans-serif)</option>
                  <option value="academic">Academic Paper (Times / Serif)</option>
                  <option value="modern">Corporate Tech (Indigo)</option>
                  <option value="mono">Technical Specification (Courier)</option>
                </select>
              </div>

              {/* Page Format */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Formato Foglio
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="a4">Standard A4 (210 Ã— 297 mm)</option>
                  <option value="letter">US Letter (8.5 Ã— 11 in)</option>
                </select>
              </div>

              {/* Orientation */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Orientamento
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="portrait">Verticale (Portrait)</option>
                  <option value="landscape">Orizzontale (Landscape)</option>
                </select>
              </div>

              {/* Margins */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Margini di Stampa
                </label>
                <select
                  value={margins}
                  onChange={(e) => setMargins(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="standard">Standard (16 mm)</option>
                  <option value="compact">Compatti (11 mm)</option>
                  <option value="generous">Ampi (21 mm)</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>Numerazione pagine (*Pagina X di Y*)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRunningHeader}
                  onChange={(e) => setShowRunningHeader(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>Intestazione superiore con titolo documento</span>
              </label>
            </div>
          </div>

          {/* Dual Tab Editor / Preview */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Tab Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'editor'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sorgente Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Anteprima Tipografica</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  title="Copia sorgente negli appunti"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiato' : 'Copia'}</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            {activeTab === 'editor' ? (
              <div className="p-4">
                <textarea
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  placeholder="Scrivi o incolla qui il codice Markdown..."
                  rows={16}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed resize-y"
                />
              </div>
            ) : (
              <div className="p-6 sm:p-8 max-h-[520px] overflow-y-auto bg-slate-50/40 dark:bg-slate-950/20">
                <div
                  className={`max-w-2xl mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs leading-relaxed text-slate-800 dark:text-slate-200 ${
                    theme === 'academic' ? 'font-serif' : theme === 'mono' ? 'font-mono' : 'font-sans'
                  }`}
                >
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      Anteprima Documento A4
                    </span>
                    <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                      {customTitle || markdownText.split('\n')[0].replace(/^#+\s*/, '') || 'Documento Markdown'}
                    </h1>
                  </div>

                  {/* Render preview paragraphs & elements */}
                  <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      I titoli, i blocchi di codice, le tabelle e gli elenchi verranno impaginati con precisione vettoriale millimetrica sul PDF finale.
                    </p>

                    <div className="p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border-l-4 border-violet-500 text-violet-900 dark:text-violet-200 font-medium">
                      Nota: Il layout PDF rispetterÃ  i margini {margins}, l'orientamento {orientation} e la numerazione pagine attiva.
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                      <code>{`// Esempio blocco codice compilato
const pdf = await convertMarkdownToPdf(markdown, { theme: '${theme}' });`}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Convert Progress */}
          {isProcessing && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span>{statusMsg || 'Conversione vettoriale in corso...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              100% Elaborazione locale nel browser (Zero Server)
            </span>

            <button
              disabled={isProcessing || !markdownText.trim()}
              onClick={handleConvert}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                !isProcessing && markdownText.trim()
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generazione PDF Vettoriale...</span>
                </>
              ) : (
                <>
                  <span>Converti in PDF (Alta Fedeltà 1:1)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
