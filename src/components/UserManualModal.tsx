import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  X,
  Search,
  Printer,
  ShieldCheck,
  Cpu,
  Laptop,
  Key,
  FileText,
  FileSpreadsheet,
  FileCode,
  PenTool,
  Stamp,
  HardDrive,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Download,
  Terminal,
  Lock,
  Zap,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPythonStudio?: () => void;
  onOpenVault?: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  shortTitle: string;
  category: 'intro' | 'tools' | 'engine' | 'security' | 'faq';
  icon: React.ElementType;
  badge?: string;
  content: React.ReactNode;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenPythonStudio,
  onOpenVault,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('intro');
  const [searchQuery, setSearchQuery] = useState('');

  const sections: ManualSection[] = useMemo(
    () => [
      {
        id: 'intro',
        title: '1. Benvenuto & Architettura Local-First (Privacy Assoluta)',
        shortTitle: 'Panoramica & Privacy',
        category: 'intro',
        icon: ShieldCheck,
        badge: 'Zero-Data-Leak',
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 dark:text-emerald-200">
                  Privacy Garantita al 100% per legge tecnologica
                </h4>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80 mt-1">
                  A differenza dei servizi commerciali online (iLovePDF, Smallpdf) che caricano i tuoi documenti su server remoti, 
                  <strong> LibrePDF Studio esegue l'elaborazione interamente nella memoria RAM del tuo dispositivo</strong> tramite WebAssembly e TypedArrays. 
                  Nessun file viene memorizzato o trasmesso a terzi.
                </p>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 pt-2">
              Come funziona LibrePDF
            </h3>
            <p>
              LibrePDF adotta un'architettura <strong>Local-First ibrida</strong> progettata per unire la semplicità di una moderna interfaccia web alla potenza di calcolo del tuo computer:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>
                <strong>Strumenti Standard (Unisci, Dividi, OCR, Filigrana, Firma, ecc.)</strong>: operano al 100% nel browser tramite motori WebAssembly certificati (<code>pdf-lib</code>, <code>pdfjs-dist</code>, <code>Tesseract.js</code>). Funzionano anche in aereo senza connessione Internet.
              </li>
              <li>
                <strong>Conversioni Office ad Alta Fedeltà 1:1 (PDF ↔ Word, PDF ↔ Excel)</strong>: utilizzano in tempo reale il motore Python locale del tuo PC (<code>pdf2docx</code>, <code>pdfplumber</code>, <code>openpyxl</code>, <code>docx2pdf</code>) per garantirti un layout vettoriale identico a Microsoft Office a costo zero.
              </li>
              <li>
                <strong>Cloud Fallback Opzionale (FreeConvert API)</strong>: se navighi da uno smartphone o da un PC dove non puoi installare Python, puoi appoggiarti alle API FreeConvert inserendo una chiave API gratuita (750 minuti/mese).
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'tools-organize',
        title: '2. Strumenti di Organizzazione & Pagine',
        shortTitle: 'Organizza, Unisci & Dividi',
        category: 'tools',
        icon: Layers,
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Strumenti per la gestione della struttura del documento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">🗂️ Unisci PDF</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Trascina molteplici documenti PDF, riordinali con facilità e uniscili in un unico file continuo con ricostruzione automatica dell'albero delle pagine.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">✂️ Dividi PDF</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estrai intervalli specifici di pagine (es. <code>1-5, 8, 12-15</code>) oppure genera un file PDF separato per ogni singola pagina in un comodo archivio ZIP.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">🔄 Ruota Pagine</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Correggi l'orientamento di fogli scansionati storte ruotando tutte le pagine di 90°, 180° o 270° in senso orario o antiorario.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">🔢 Numera Pagine</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aggiungi numerazione automatica con formule personalizzabili (es. <code>Pagina {'{n}'} di {'{total}'}</code>) in basso al centro o a destra.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5 md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">📋 Tavolo di Montaggio (Organizza Pagine)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualizza le miniature visive di tutte le pagine, trascinale per riordinarle col drag & drop, ruota le singole pagine ed elimina i fogli indesiderati con 1 clic prima di salvare.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'tools-office',
        title: '3. Conversioni Office 1:1 (Word, Excel & Immagini)',
        shortTitle: 'Conversioni Office 1:1',
        category: 'tools',
        icon: FileSpreadsheet,
        badge: 'Alta Fedeltà',
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              Le conversioni Office di LibrePDF sono progettate per garantire la **stessa qualità visiva dei convertitori commerciali**, ricostruendo tabelle, colonne e stili di carattere.
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>PDF in Word (.docx) & Word in PDF</span>
                </div>
                <p className="text-xs text-blue-950/80 dark:text-blue-300/80 leading-relaxed">
                  • <strong>PDF in Word</strong>: sfrutta la libreria locale <code>pdf2docx</code> che isola i paragrafi, calcola le larghezze delle celle e crea un file <code>.docx</code> nativo modificabile in Microsoft Word o LibreOffice Writer.<br />
                  • <strong>Word in PDF</strong>: sfrutta il motore nativo di Microsoft Word tramite <code>docx2pdf</code> sul tuo PC locale, per un rendering tipografico impeccabile identico alla stampa.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>PDF in Excel (.xlsx) & Excel in PDF</span>
                </div>
                <p className="text-xs text-emerald-950/80 dark:text-emerald-300/80 leading-relaxed">
                  • <strong>PDF in Excel</strong>: utilizza <code>pdfplumber</code> e <code>openpyxl</code> per riconoscere linee vettoriali di tabelle e spaziatura celle, esportando ciascuna tabella in fogli di calcolo dedicati con griglie ordinate.<br />
                  • <strong>Excel in PDF</strong>: combina l'automazione COM di Excel (se installato) con il motore vettoriale <strong>PyMuPDF Story</strong>, generando un PDF in formato A4 Landscape (Orizzontale) elegante e pulito senza richiedere software esterni.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  <span>Universal Cloud Converter (1500+ formati)</span>
                </div>
                <p className="text-xs text-purple-950/80 dark:text-purple-300/80 leading-relaxed">
                  Consente di convertire documenti speciali (come i file <strong>Apple Pages <code>.pages</code></strong>, Keynote, eBook EPUB, immagini HEIC da iPhone, presentazioni PowerPoint <code>.pptx</code>) tramite la REST API di FreeConvert.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'tools-security',
        title: '4. Sicurezza, Firme Digitali & Oscuramento',
        shortTitle: 'Firma, SHA-256 & Privacy',
        category: 'security',
        icon: Key,
        badge: 'Legale & PAdES',
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Integrità Crittografica & Strumenti Giuridici
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <PenTool className="w-4 h-4 text-rose-500" />
                  <span>Firma PDF con Sigillo Grafico Immutabile</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Inserisce un timbro di firma visibile calcolato graficamente ad alta risoluzione Retina (3.5x).
                  <strong>Protezione Anti-Modifica</strong>: il timbro viene fissato come livello grafico rasterizzato e allegato a un'annotazione di tipo <code>/Sig</code> con flag <code>ReadOnly + Locked</code>, impedendo la selezione o modifica del testo della firma nei visualizzatori comuni (GearPDF, Acrobat).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verifica Firma & Hash SHA-256 (64 Caratteri)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Permette di verificare l'autenticità di qualsiasi documento firmato:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <li><strong>Match Totale Certificato (64/64 char)</strong>: conferma l'identità matematica assoluta del documento bit a bit.</li>
                  <li><strong>Hash Pre-Firma vs Post-Firma</strong>: calcola separatamente l'impronta del contenuto prima e dopo l'apposizione del timbro.</li>
                  <li><strong>Rilevamento Manomissioni</strong>: evidenzia se anche un singolo byte del PDF è stato modificato dopo la firma.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Stamp className="w-4 h-4 text-amber-500" />
                  <span>Oscura Dati Riservati (Redaction & Sanitizzazione)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  A differenza di semplici barre nere disegnate sopra il testo, questo strumento <strong>cancella definitivamente le coordinate di testo, i flussi vettoriali sottostanti e i metadati nascosti</strong> (autore, cronologia modifiche, software di creazione), impedendo qualsiasi recupero di IBAN, codici fiscali o dati sensibili.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'tools-advanced',
        title: '5. OCR Tesseract, Modifica PDF & Riparazione',
        shortTitle: 'OCR, Modifica & Ripara',
        category: 'tools',
        icon: Sparkles,
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">🔍 OCR (Riconoscimento Ottico Testo)</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estrae il testo da fogli scansionati, documenti cartacei fotografati o immagini raster tramite <code>Tesseract.js</code> in memoria, con supporto multilingua (Italiano, Inglese, Francese, Spagnolo, Tedesco).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">✏️ Modifica PDF Vettoriale</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aggiungi caselle di testo personalizzate, sfondi opachi/trasparenti, bordi colorati, firme manoscritte e immagini con ridimensionamento e posizionamento drag & drop.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">🗜️ Comprimi & Ottimizza</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Riduci il peso del file PDF per l'invio via email rimuovendo oggetti duplicati e comprimendo i flussi vettoriali e le immagini.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">🩹 Ripara PDF & Appiattisci</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ricostruisci la tabella dei riferimenti incrociati (XRef) di PDF corrotti o non apribili, e appiattisci (flatten) moduli interattivi AcroForm prima della firma definitiva.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'engine-local',
        title: '6. Guida Motore Locale Windows & Script Desktop',
        shortTitle: 'Motore Locale Windows',
        category: 'engine',
        icon: Laptop,
        badge: '100% Offline',
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Come utilizzare il Motore Locale sul tuo PC
            </h3>
            <p>
              Nella cartella del progetto trovi la cartella dedicata <code>area-riservata/</code> e lo script <code>avvia-librepdf.bat</code>.
            </p>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                <Terminal className="w-4 h-4 text-blue-500" />
                <span>Avvio con 1 Clic (`avvia-librepdf.bat`)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                1. Fai doppio clic su <code>avvia-librepdf.bat</code>.<br />
                2. Lo script verifica automaticamente che Node.js e Python siano presenti.<br />
                3. Avvia il server interno in background e apre il tuo browser su <code>http://localhost:3000</code>.<br />
                4. Tutte le conversioni Word ed Excel avverranno istantaneamente tramite le risorse del tuo PC.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span>Compilatore Eseguibile Windows (.EXE con PyInstaller)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Se desideri un'applicazione desktop autonoma senza aprire terminali o browser:
                fai doppio clic su <code>area-riservata/build_exe.bat</code>.
                Troverai l'eseguibile compilato in <code>dist/LibrePdf/LibrePdf.exe</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                <Laptop className="w-4 h-4 text-emerald-500" />
                <span>Installazione come PWA Desktop (Chrome / Edge)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Quando l'app è aperta nel browser, clicca sull'icona <strong>"Installa LibrePDF"</strong> nella barra degli indirizzi in alto a destra. L'applicazione verrà aggiunta al Menu Start e sul Desktop di Windows come app a finestra autonoma.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'vault-guide',
        title: '7. Cassaforte Locale (Vault IndexedDB)',
        shortTitle: 'Vault Locale Sandbox',
        category: 'security',
        icon: HardDrive,
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Archiviazione Locale Riservata (IndexedDB)
            </h3>
            <p>
              Ogni volta che converti o firmi un documento, LibrePDF può salvarlo automaticamente nel tuo <strong>Vault Locale</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Zero Cloud</strong>: i file risiedono esclusivamente nel database cifrato <code>IndexedDB</code> del tuo browser su disco. Nessun dato lascia il computer.</li>
              <li><strong>Download Multiplo o Singolo</strong>: puoi riscaricare i documenti elaborati in qualsiasi momento o esportarli tutti insieme in un unico archivio ZIP.</li>
              <li><strong>Svuotamento Istantaneo</strong>: puoi ripulire la cronologia o i file con un clic sul pulsante "Svuota Vault".</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'faq',
        title: '8. Domande Frequenti (FAQ) & Risoluzione Problemi',
        shortTitle: 'FAQ & Risoluzione',
        category: 'faq',
        icon: HelpCircle,
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  D: Perché sul sito Netlify mi chiede una chiave API anche se ho Python sul PC?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  R: Per i protocolli di sicurezza internazionali W3C di tutti i browser, una pagina web scaricata da Internet (Netlify) non può accedere all'hard disk o ai programmi del tuo computer. Per utilizzare il tuo Python locale gratis, basta aprire LibrePDF tramite il file <code>avvia-librepdf.bat</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  D: Come mai la conversione da Excel a PDF non richiede LibreOffice?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  R: Abbiamo implementato un motore intelligente a doppio livello: se Excel è installato sfrutta le librerie COM di Windows; in caso contrario, utilizza <code>openpyxl</code> e <code>PyMuPDF Story</code> per creare un PDF A4 Landscape perfetto senza bisogno di installare LibreOffice.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  D: È possibile modificare i dati della firma applicata su un PDF?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  R: No. Il timbro viene rasterizzato in un sigillo grafico ad alta fedeltà con flag protetti <code>/Sig ReadOnly</code>. Se qualcuno prova a modificare il file in un editor esadecimale o PDF, il verificatore di firma segnalerà immediatamente la discrepanza del codice hash SHA-256.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  D: Dove trovo la chiave API di FreeConvert per la versione cloud?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  R: È sufficiente registrarsi gratuitamente su <a href="https://www.freeconvert.com/api" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">freeconvert.com/api</a>. Il piano gratuito include 750 minuti di conversione al mese senza carta di credito.
                </p>
              </div>
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.shortTitle.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Modale */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Manuale d'Uso LibrePDF Studio
                </h2>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900/60">
                  v2.0 Ufficiale
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guida operativa completa, architettura offline e risoluzione problemi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              title="Stampa o Salva il Manuale come PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Stampa / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Chiudi Manuale"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca argomento nel manuale (es. firma, excel, ocr, pwa, python, sha-256)..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-mono"
            >
              Azzera
            </button>
          )}
        </div>

        {/* Body a due colonne (Indice a sinistra, Contenuto a destra) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Indice */}
          <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto p-3 space-y-1 shrink-0">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Indice Capitoli ({filteredSections.length})
            </div>

            {filteredSections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === activeSection.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSectionId(s.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-xs font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{s.shortTitle}</span>
                  </div>
                  {s.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Contenuto Sezione */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-white dark:bg-slate-950">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                <span>Capitolo Ufficiale</span>
                <ChevronRight className="w-3 h-3" />
                <span>{activeSection.category.toUpperCase()}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                {activeSection.title}
              </h2>
            </div>

            {activeSection.content}
          </div>
        </div>

        {/* Footer Modale */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Manuale verificato · Motore 100% Offline integrato</span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenPythonStudio && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPythonStudio();
                }}
                className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
              >
                Area Riservata & Codice Python
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition hover:bg-slate-800 cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
