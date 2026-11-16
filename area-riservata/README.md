# 🔒 LibrePDF - Area Riservata Sviluppatore & Desktop Engine

Benvenuto nell'**Area Riservata** di LibrePDF.
Questa cartella contiene tutti gli script, il codice sorgente Python e i file necessari per eseguire l'applicazione offline al 100% sul tuo PC Windows e per compilare l'eseguibile autonomo `.exe`.

---

## 📂 Contenuto della Cartella

| File | Scopo | Come si usa |
|---|---|---|
| **`avvia-librepdf.bat`** | 🚀 **Avvio Locale con 1 Clic** | Doppio clic: controlla Node.js & Python, avvia il server ed apre il browser su `http://localhost:3000` |
| **`build_exe.bat`** | 🔨 **Compilatore Eseguibile Windows (.EXE)** | Doppio clic: installa le dipendenze e genera `LibrePdf.exe` con PyInstaller |
| **`requirements.txt`** | 📦 **Dipendenze Python Ufficiali** | `pip install -r requirements.txt` (include `pymupdf`, `PyQt6`, `pdf2docx`, `docx2pdf`, `pdfplumber`, `openpyxl`) |
| **`main.py` / `app_gui.py`** | 🖥️ **Applicazione Grafica Desktop PyQt6** | `python main.py` (interfaccia desktop con lettore PDF e super-strumenti) |
| **`pdf_handler.py`** | 🧠 **Motore Logico PyMuPDF & Office** | Modulo Python che esegue le conversioni 1:1, OCR, timbri e firme |

---

## 🚀 Guida all'Uso

### 1. Avvio Locale Immediato (Web Studio Locale 1:1)
Fai semplicemente **doppio clic su `avvia-librepdf.bat`**.
* Il server locale si avvia in background.
* Si apre automaticamente `http://localhost:3000`.
* Tutte le conversioni (PDF ↔ Word, PDF ↔ Excel) avvengono al **100% sul tuo PC, gratis e senza inviare file all'esterno**.

### 2. Creazione dell'Applicazione Desktop (.EXE)
Fai **doppio clic su `build_exe.bat`**.
Al termine della procedura troverai l'eseguibile standalone pronto all'uso in:
```
dist\LibrePdf\LibrePdf.exe
```
Puoi creare un collegamento a questo file sul Desktop o distribuire la cartella `LibrePdf` su qualsiasi PC Windows.

### 3. Installazione PWA Desktop (Opzione Alternativa)
Quando LibrePDF è aperto in **Google Chrome** o **Microsoft Edge**:
1. Clicca sull'icona **"Installa LibrePDF"** nella barra degli indirizzi in alto a destra.
2. L'app si aprirà in una finestra autonoma (senza barre del browser) e aggiungerà l'icona sul Desktop e nel Menu Start.
