# 🔒 LibrePDF - Area Riservata Sviluppatore & Motore Python PyMuPDF

Benvenuto nell'**Area Riservata** di LibrePDF.
Questa cartella contiene i sorgenti Python puri per gli sviluppatori che desiderano testare o estendere il motore desktop nativo basato su **PyMuPDF**, **PyQt6** e librerie di conversione Office 1:1.

---

## 📂 Contenuto della Cartella

| File | Scopo | Come si usa |
|---|---|---|
| **`main.py`** | 🖥️ **Applicazione Grafica Desktop PyQt6** | `python main.py` (interfaccia nativa desktop con lettore PDF e manipolatore vettoriale) |
| **`pdf_handler.py`** | 🧠 **Motore Logico PyMuPDF & Office** | Modulo Python che esegue le conversioni Word/Excel 1:1, estrazione tabelle, timbri e firme |
| **`requirements.txt`** | 📦 **Dipendenze Python Ufficiali** | `pip install -r requirements.txt` (include `pymupdf`, `PyQt6`, `pdf2docx`, `docx2pdf`, `pdfplumber`, `openpyxl`) |

---

## 🚀 Istruzioni di Avvio

1. **Installazione Dipendenze:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Esecuzione Interfaccia Python PyQt6:**
   ```bash
   python main.py
   ```
3. **Avvio Web Studio Locale:**
   Per avviare la suite completa nel browser con motore locale attivo, fai doppio clic su `avvia-librepdf.bat` nella cartella principale del progetto, oppure su `LibrePDF.lnk` per la modalità desktop standalone silenziosa.
