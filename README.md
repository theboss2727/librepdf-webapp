# 📄 LibrePDF Studio

<div align="center">

**Suite Professionale di Strumenti PDF 100% Locali, Gratuiti e Open Source**

*Privacy Totale • Zero Upload su Server Terzi • WebAssembly • PWA Desktop Nativa*

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC.svg)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-success.svg)](https://web.dev/progressive-web-apps/)

</div>

---

## 🌟 Caratteristiche Principali

LibrePDF Studio è una workstation documentale progettata per offrire la potenza e la flessibilità dei software commerciali (come Adobe Acrobat o iLovePDF), garantendo al contempo **assoluta riservatezza e zero costi**:

- 🔒 **100% Locale e Privato:** Tutti i 24+ strumenti PDF (inclusi Word in PDF, Excel in PDF, OCR, firme e compressione) vengono eseguiti direttamente sul processore del tuo dispositivo tramite **WebAssembly** e JavaScript. Nessun file viene inviato a server esterni.
- ⚡ **Avvio Istantaneo Desktop (PWA):** Installa l'applicazione con 1 clic da Chrome o Edge. Si apre in una finestra autonoma nativa senza barre del browser e funziona anche **completamente offline senza connessione internet**.
- 🚀 **Motore Locale 1:1 per Windows (`avvia-desktop.vbs`):** Per chi lavora su Windows con file Word ed Excel complessi, il lanciatore silenzioso si interfaccia direttamente con Python 3 e Microsoft Office / LibreOffice locali per una fedeltà 1:1 assoluta.
- 🧲 **Smart Dropzone Globale:** Trascina qualsiasi file in qualunque punto della schermata iniziale per ottenere azioni rapide intelligenti e suggerimenti istantanei (Unisci, Confronta, Converti, Firma).

---

## 🛠️ Catalogo Strumenti Inclusi (24+ Moduli)

### 📂 Organizzazione & Pagine
- **Unisci PDF:** Assembla più documenti in un unico stream vettoriale continuo.
- **Dividi & Ritaglia:** Isola intervalli specifici di pagine o segmenta in singoli fogli.
- **Confronta 2 PDF (Visual & Text Diff):** Confronta due versioni affiancate con evidenziazione automatica del testo aggiunto (verde) e rimosso (rosso).
- **Tavolo di Montaggio:** Riorganizza, ruota o elimina singole pagine con anteprima ad alta fedeltà.
- **Ruota Orientamento:** Correzione angolare ortogonale 90° / 180° / 270°.

### ✏️ Modifica & Annotazioni
- **Editor PDF Completo:** Aggiungi note, testi formattati, immagini, loghi e firme a mano libera sul documento.
- **Filigrana Diagonale:** Timbro di riservatezza a 45° con calcolo geometrico conforme a PyMuPDF.
- **Numerazione Pagine:** Numerazione progressiva personalizzabile con margini e coordinate precise.
- **Appiattisci Moduli (Flatten):** Fissa campi interattivi AcroForm e annotazioni nel flusso immutabile.

### 🔄 Conversioni Office & Media (100% In-Browser)
- **Word (.docx, .doc) & Pages in PDF:** Conversione client-side istantanea senza server.
- **Excel (.xlsx, .xls, .csv) in PDF:** Impaginazione tabellare automatica A4 orizzontale.
- **PDF in Word (.docx):** Ricostruzione strutturata di paragrafi, stili e formattazione.
- **PDF in Excel (.xlsx):** Estrazione precisa di tabelle matriciali e celle.
- **PDF in Immagini (JPG / PNG):** Rasterizzazione ad alta densità (72 / 144 / 216 DPI) con download singolo o ZIP.
- **Immagini in PDF:** Compositing di foto JPG, PNG e WebP in layout vettoriale.
- **Markdown (.md) in PDF:** Conversione tipografica vettoriale ad alta fedeltà con tabelle, codice, impaginazione e numerazione pagine.
- **PDF in Markdown / HTML:** Transcodifica semantica per Notion, Obsidian e documentazione tecnica.
- **OCR Tesseract Wasm:** Riconoscimento ottico dei caratteri offline da scansioni cartacee e foto.
- **Scala di Grigi:** Desaturazione canali colore ITU-R BT.601 per stampa economica.

### 🛡️ Sicurezza & Integrità Digitale
- **Firma & Timbro Certificato:** Apposizione visiva con data, ora e impronta crittografica SHA-256.
- **Verifica Firme & Audit:** Ispezione certificati digitali PAdES / CAdES, digest SHA-256 e controllo alterazioni post-firma.
- **Sblocca PDF:** Rimozione permanente della password da PDF protetti di cui si conosce la chiave.
- **Ispezione & Editor Metadati Privacy:** Visualizzazione/modifica delle proprietà del documento e pulsante di **Sanitizzazione 1-Click** per eliminare traccianti nascosti.
- **Oscuramento Permanente (Redact):** Cancellazione irreversibile di dati sensibili (IBAN, codici fiscali, importi).
- **Cifratura con Password:** Protezione con algoritmo crittografico standard prima della distribuzione.
- **Riparazione XRef:** Sanificazione e ricostruzione della tabella dei riferimenti per file corrotti.
- **Ottimizzazione & Compressione:** Deflazione flussi e rimozione ridondanze per ridurre il peso del file.
- **Vault Locale (IndexedDB):** Cassaforte cifrata locale nel browser per salvare i propri file elaborati.

---

## 💻 Come Avviare l'Applicazione

### Metodo 1: Avvio Rapido Sviluppo (Node.js)
```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo
npm run dev
```
L'applicazione si aprirà su `http://localhost:3000`.

### Metodo 2: Desktop Windows Silenzioso (Consigliato per Windows)
1. Fai doppio clic su `crea-collegamento-desktop.bat` per posizionare l'icona sul tuo Desktop.
2. Fai doppio clic sull'icona **LibrePDF**: avvia il server in background in modo totalmente invisibile e apre la finestra nativa standalone.
3. Per arrestare il server quando hai finito, fai doppio clic su `arresta-desktop.bat`.

---

## 🏗️ Architettura & Stack Tecnologico

- **Frontend:** React 19, TypeScript 5, Tailwind CSS 4, Motion, Lucide Icons, Vite 8.
- **Motori PDF Client-Side (WebAssembly):** `pdf-lib`, `pdfjs-dist`, `tesseract.js`, `mammoth`, `SheetJS (xlsx)`, `docx`, `jszip`.
- **Backend Locale Opzionale:** Express 4, TypeScript via `tsx`.
- **Motore Locale Office 1:1:** Python 3 (PyMuPDF, openpyxl, pdfplumber, docx2pdf) e Microsoft Office COM.

---

## 📄 Licenza

Rilasciato sotto licenza Open Source **Apache 2.0**.
Uso libero per scopi personali, accademici e aziendali.
