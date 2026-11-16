/**
 * Python PyMuPDF Engine and Desktop (.exe) Companion Generator
 * Directly based on the user's PDFHandler architecture.
 * Fully supports PDF editing (texts, images, signatures, borders, outlines, backgrounds).
 */

export const PYTHON_REQUIREMENTS = `pymupdf>=1.23.0
PyQt6>=6.5.0
pyinstaller>=6.0.0
pdf2docx>=0.5.13
docx2pdf>=0.1.8
pdfplumber>=0.11.0
openpyxl>=3.1.0
pillow>=10.0.0
pandas>=2.0.0
requests>=2.28.0
`;

export const PYTHON_START_BAT = `@echo off
title LibrePDF Studio - Avvio Locale
chcp 65001 >nul
cls

echo ========================================================
echo         LibrePDF Studio - Avvio Locale (Windows)
echo ========================================================
echo.
echo [1/3] Verifica ambiente di sistema...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRORE] Node.js non trovato! Installa Node.js da https://nodejs.org/
    pause
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] Rilevato %%v
)

if not exist node_modules (
    echo.
    echo [INFO] Installazione dipendenze node_modules...
    call npm install
)

echo.
echo [2/3] Avvio server locale con motore di conversione...
start /b "" npx tsx server.ts

echo.
echo [3/3] Apertura di LibrePDF nel browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo  LibrePDF e' attivo all'indirizzo: http://localhost:3000
echo  - Motore locale 1:1: ATTIVO
echo  - Elaborazione file: 100%% OFFLINE E PRIVATA SUL TUO PC
echo ========================================================
echo.
pause >nul
`;

export const PYTHON_CORE_HANDLER = `"""
LibrePDF Python Engine - PDFHandler
Motore di elaborazione PDF locale compatibile con PyMuPDF (fitz)
Pronto per l'integrazione in applicazioni desktop PyQt6 e compilazione .exe
Supporta manipolazione avanzata e Modifica PDF (testi, contorni, immagini, firme)
"""

import os
import pymupdf  # pip install pymupdf


class PDFHandler:
    def __init__(self):
        self.doc = None
        self.filepath = ""

    def load_document(self, filepath: str):
        """Carica un documento PDF dal filesystem locale."""
        if self.doc:
            try:
                self.doc.close()
            except Exception:
                pass
        self.filepath = filepath
        self.doc = pymupdf.open(filepath)
        return self.doc

    def get_page_count(self) -> int:
        """Restituisce il numero totale di pagine."""
        return len(self.doc) if self.doc else 0

    def get_document_info(self) -> dict:
        """Restituisce metadati e statistiche del documento."""
        if not self.doc:
            return {}
        info = {
            "filepath": self.filepath,
            "filename": os.path.basename(self.filepath),
            "pages": len(self.doc),
            "is_encrypted": self.doc.is_encrypted,
            "metadata": self.doc.metadata or {}
        }
        if len(self.doc) > 0:
            p0 = self.doc[0]
            info["first_page_width"] = round(p0.rect.width, 1)
            info["first_page_height"] = round(p0.rect.height, 1)
        return info

    def render_page(self, page_num: int, zoom: float = 2.0, rotation: int = 0):
        """
        Genera i dati dell'immagine della pagina per l'interfaccia grafica PyQt6.
        Restituisce (samples_bytes, width, height, stride).
        Restituisce una copia 'bytes' immutabile per impedire deallocazioni da MuPDF C.
        """
        if not self.doc or page_num < 0 or page_num >= len(self.doc):
            return None
        
        try:
            page = self.doc.load_page(page_num)
            mat = pymupdf.Matrix(zoom, zoom)
            if rotation:
                mat.prerotate(rotation)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            # Copia esplicita in bytes per sicurezza di memoria su Windows
            return bytes(pix.samples), pix.width, pix.height, pix.stride
        except Exception as e:
            print(f"Errore render_page: {e}")
            return None

    # ------------------- MODIFICA PDF (TESTI, CONTORNI, IMMAGINI, FIRME) -------------------

    def insert_custom_text(
        self,
        page_num: int,
        text: str,
        x: float,
        y: float,
        width: float,
        height: float,
        fontsize: float = 18,
        color=(0, 0, 0),
        has_border: bool = False,
        border_color=(1, 0, 0),
        border_width: float = 1.5,
        has_bg: bool = False,
        bg_color=(1, 1, 1)
    ):
        """
        Inserisce un blocco di testo formattato su una specifica pagina del PDF,
        con supporto per contorno perimetrale (bordo), spessore e sfondo pieno.
        """
        if not self.doc or page_num < 0 or page_num >= len(self.doc):
            return False

        page = self.doc[page_num]
        rect = pymupdf.Rect(x, y, x + width, y + height)

        # Disegna il box rettangolare di contorno e/o sfondo se abilitato
        if has_border or has_bg:
            shape = page.new_shape()
            shape.draw_rect(rect)
            shape.finish(
                color=border_color if has_border else None,
                fill=bg_color if has_bg else None,
                width=border_width if has_border else 0
            )
            shape.commit()

        # Inserimento del testo con allineamento centrato e fallback di scala
        rc = page.insert_textbox(
            rect,
            text,
            fontsize=fontsize,
            color=color,
            align=pymupdf.TEXT_ALIGN_CENTER
        )
        if rc < 0:
            # Fallback se il rettangolo è stretto rispetto al testo: scala proporzionale
            scaled_font = max(7.0, min(fontsize, height * 0.6))
            rc2 = page.insert_textbox(
                rect,
                text,
                fontsize=scaled_font,
                color=color,
                align=pymupdf.TEXT_ALIGN_CENTER
            )
            if rc2 < 0:
                # Inserimento forzato del testo centrato
                baseline_y = y + (height / 2.0) + (scaled_font * 0.35)
                page.insert_text(
                    pymupdf.Point(x + 4, baseline_y),
                    text,
                    fontsize=scaled_font,
                    color=color
                )
        return True

    def insert_custom_image(
        self,
        page_num: int,
        image_path: str,
        x: float,
        y: float,
        width: float,
        height: float,
        has_border: bool = False,
        border_color=(0, 0, 0),
        border_width: float = 1.5
    ):
        """
        Inserisce un'immagine o firma grafica con coordinate e dimensioni specifiche,
        con cornice/contorno perimetrale opzionale.
        """
        if not self.doc or page_num < 0 or page_num >= len(self.doc):
            return False
        if not os.path.exists(image_path):
            return False

        page = self.doc[page_num]
        rect = pymupdf.Rect(x, y, x + width, y + height)

        # Inserimento dell'immagine (PNG, JPG, ecc.)
        page.insert_image(rect, filename=image_path)

        # Disegna la cornice/bordo intorno all'immagine se richiesto
        if has_border:
            shape = page.new_shape()
            shape.draw_rect(rect)
            shape.finish(color=border_color, width=border_width)
            shape.commit()

        return True

    def save_edited_document(self, output_path: str):
        """Salva in modo permanente tutte le modifiche apportate in un nuovo file PDF."""
        if not self.doc:
            return False
        same_file = os.path.abspath(output_path).lower() == os.path.abspath(self.filepath).lower()
        target_path = output_path + ".tmp.pdf" if same_file else output_path
        self.doc.save(target_path, deflate=True)
        if same_file:
            self.doc.close()
            os.replace(target_path, output_path)
            self.doc = pymupdf.open(self.filepath)
        return True

    # ------------------- OPERAZIONI CORE STANDARD -------------------

    def extract_text(self, page_num: int) -> str:
        """Estrae il testo puro da una specifica pagina (0-indexed)."""
        if self.doc and 0 <= page_num < len(self.doc):
            page = self.doc.load_page(page_num)
            return page.get_text("text")
        return ""

    def extract_text_ocr(self, page_num: int, language: str = "ita") -> str:
        """
        Estrae il testo da una pagina PDF scansionata o immagine usando
        il motore OCR integrato PyMuPDF con supporto Tesseract.
        """
        if self.doc and 0 <= page_num < len(self.doc):
            page = self.doc.load_page(page_num)
            try:
                tp = page.get_textpage_ocr(language=language, dpi=300, full=True)
                return page.get_text("text", textpage=tp)
            except Exception as e:
                return f"[Errore OCR: assicurati che Tesseract OCR sia installato nel sistema: {e}]"
        return ""

    def extract_all_text(self) -> str:
        """Estrae tutto il testo del documento."""
        if not self.doc:
            return ""
        full_text = []
        for i, page in enumerate(self.doc):
            full_text.append(f"--- Pagina {i + 1} ---\\n" + page.get_text("text"))
        return "\\n\\n".join(full_text)

    def extract_all_text_ocr(self, language: str = "ita") -> str:
        """Esegue l'OCR su tutte le pagine di un documento scansionato."""
        if not self.doc:
            return ""
        results = []
        for i, page in enumerate(self.doc):
            try:
                tp = page.get_textpage_ocr(language=language, dpi=300, full=True)
                results.append(f"--- Pagina {i + 1} (OCR {language}) ---\\n" + page.get_text("text", textpage=tp))
            except Exception as e:
                results.append(f"--- Pagina {i + 1} (OCR Errore: {e}) ---")
        return "\\n\\n".join(results)

    def extract_pages(self, start: int, end: int, output_path: str):
        """Salva un range di pagine in un nuovo file PDF (0-indexed)."""
        if not self.doc:
            return
        new_doc = pymupdf.open()
        new_doc.insert_pdf(self.doc, from_page=start, to_page=end)
        new_doc.save(output_path, deflate=True)
        new_doc.close()

    def split_all_pages(self, output_dir: str, prefix="pagina"):
        """Estrae ciascuna pagina in un file PDF singolo autonomo."""
        if not self.doc:
            return []
        os.makedirs(output_dir, exist_ok=True)
        created = []
        for i in range(len(self.doc)):
            out_file = os.path.join(output_dir, f"{prefix}_{i + 1}.pdf")
            new_doc = pymupdf.open()
            new_doc.insert_pdf(self.doc, from_page=i, to_page=i)
            new_doc.save(out_file, deflate=True)
            new_doc.close()
            created.append(out_file)
        return created

    def add_watermark(self, text: str, output_path: str, color=(1, 0, 0), fontsize=50, rotate=45, opacity=0.3):
        """
        Aggiunge una filigrana diagonale personalizzata a tutte le pagine.
        Utilizza il parametro 'morph' per rotazioni arbitrarie (evita crash di MuPDF su Windows)
        e gestisce in modo sicuro la sovrascrittura dello stesso file.
        """
        if not self.filepath or not os.path.exists(self.filepath):
            raise FileNotFoundError("Nessun documento PDF aperto.")

        same_file = os.path.abspath(output_path).lower() == os.path.abspath(self.filepath).lower()
        target_path = output_path + ".tmp.pdf" if same_file else output_path

        out_doc = pymupdf.open(self.filepath)
        for page in out_doc:
            rect = page.rect
            p = pymupdf.Point(rect.width * 0.15, rect.height * 0.55)
            try:
                if rotate % 90 == 0:
                    page.insert_text(
                        p,
                        text,
                        fontsize=fontsize,
                        color=color,
                        fill_opacity=opacity,
                        rotate=rotate,
                        overlay=True
                    )
                else:
                    mat = pymupdf.Matrix(rotate)
                    page.insert_text(
                        p,
                        text,
                        fontsize=fontsize,
                        color=color,
                        fill_opacity=opacity,
                        morph=(p, mat),
                        overlay=True
                    )
            except Exception:
                try:
                    page.insert_text(p, text, fontsize=fontsize, color=color, overlay=True)
                except Exception:
                    pass

        out_doc.save(target_path, deflate=True)
        out_doc.close()

        if same_file:
            if self.doc:
                self.doc.close()
            if os.path.exists(output_path):
                os.replace(target_path, output_path)
            else:
                os.rename(target_path, output_path)
            self.doc = pymupdf.open(self.filepath)

    def merge_with(self, other_filepaths: list[str], output_path: str):
        """Unisce uno o piu file PDF con il documento corrente."""
        if not self.doc:
            return
        merged_doc = pymupdf.open(self.filepath)
        for path in other_filepaths:
            if os.path.exists(path):
                doc_to_add = pymupdf.open(path)
                merged_doc.insert_pdf(doc_to_add)
                doc_to_add.close()
        merged_doc.save(output_path, deflate=True)
        merged_doc.close()

    def rotate_document(self, angle: int, output_path: str):
        """Ruota tutte le pagine di un angolo specificato (es. 90, 180, 270)."""
        if not self.filepath:
            return
        same_file = os.path.abspath(output_path).lower() == os.path.abspath(self.filepath).lower()
        target_path = output_path + ".tmp.pdf" if same_file else output_path

        out_doc = pymupdf.open(self.filepath)
        for page in out_doc:
            page.set_rotation((page.rotation + angle) % 360)
        out_doc.save(target_path, deflate=True)
        out_doc.close()

        if same_file:
            if self.doc:
                self.doc.close()
            if os.path.exists(output_path):
                os.replace(target_path, output_path)
            else:
                os.rename(target_path, output_path)
            self.doc = pymupdf.open(self.filepath)

    def add_page_numbers(self, output_path: str, format_str="Pagina {n} di {total}", fontsize=11):
        """Aggiunge la numerazione delle pagine in basso al centro."""
        if not self.filepath:
            return
        same_file = os.path.abspath(output_path).lower() == os.path.abspath(self.filepath).lower()
        target_path = output_path + ".tmp.pdf" if same_file else output_path

        out_doc = pymupdf.open(self.filepath)
        total = len(out_doc)
        for i, page in enumerate(out_doc):
            text = format_str.format(n=i + 1, total=total)
            rect = page.rect
            p = pymupdf.Point(rect.width / 2 - 40, rect.height - 25)
            page.insert_text(
                p,
                text,
                fontsize=fontsize,
                color=(0.2, 0.2, 0.2)
            )
        out_doc.save(target_path, deflate=True)
        out_doc.close()

        if same_file:
            if self.doc:
                self.doc.close()
            if os.path.exists(output_path):
                os.replace(target_path, output_path)
            else:
                os.rename(target_path, output_path)
            self.doc = pymupdf.open(self.filepath)

    def save_pages_as_images(self, output_dir: str, prefix="pagina", fmt="png", zoom=2.0):
        """Esporta ogni pagina come immagine ad alta risoluzione (PNG o JPG)."""
        if not self.doc:
            return []
        os.makedirs(output_dir, exist_ok=True)
        saved_files = []
        for i, page in enumerate(self.doc):
            mat = pymupdf.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            filename = os.path.join(output_dir, f"{prefix}_{i + 1}.{fmt.lower()}")
            pix.save(filename)
            saved_files.append(filename)
        return saved_files

    def convert_to_grayscale(self, output_path: str, dpi: int = 150):
        """Converte il documento in scala di grigi nativa (csGRAY) per risparmiare inchiostro."""
        if not self.doc:
            return
        out_doc = pymupdf.open()
        for page in self.doc:
            pix = page.get_pixmap(colorspace=pymupdf.csGRAY, dpi=dpi)
            new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(page.rect, stream=pix.tobytes())
        out_doc.save(output_path, deflate=True)
        out_doc.close()

    def repair_pdf(self, output_path: str):
        """Ricostruisce la tabella dei riferimenti incrociati (XRef) e sanifica il file."""
        if not self.filepath:
            return
        doc = pymupdf.open(self.filepath, filetype="pdf")
        doc.save(output_path, garbage=4, clean=True, deflate=True)
        doc.close()

    def flatten_pdf(self, output_path: str):
        """Fissa in modo permanente moduli interattivi (AcroForm) e annotazioni."""
        if not self.doc:
            return
        out_doc = pymupdf.open(self.filepath)
        out_doc.bake()
        out_doc.save(output_path, deflate=True)
        out_doc.close()

    def extract_tables_to_excel(self, output_path: str):
        """Rileva le tabelle con PyMuPDF ed esporta in formato Excel (.xlsx)."""
        if not self.doc:
            return
        import pandas as pd
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            found_any = False
            for i, page in enumerate(self.doc):
                tabs = page.find_tables()
                for t_idx, tab in enumerate(tabs):
                    df = tab.to_pandas()
                    sheet_name = f"Pag_{i+1}_Tab_{t_idx+1}"[:31]
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    found_any = True
            if not found_any:
                df_empty = pd.DataFrame({"Nota": ["Nessuna tabella vettoriale identificata nel documento."]})
                df_empty.to_excel(writer, sheet_name="Info", index=False)

    def convert_to_docx(self, output_path: str):
        """Converte il PDF in documento Word (.docx) usando pdf2docx."""
        try:
            from pdf2docx import Converter
            cv = Converter(self.filepath)
            cv.convert(output_path, start=0, end=None)
            cv.close()
        except ImportError:
            full_text = self.extract_all_text()
            with open(output_path.replace(".docx", ".txt"), "w", encoding="utf-8") as f:
                f.write(full_text)
            raise RuntimeError("Libreria 'pdf2docx' non installata. Installa con: pip install pdf2docx")

    def get_toc(self) -> list:
        """Restituisce l'indice (Table of Contents / Segnalibri) del documento."""
        if not self.doc:
            return []
        try:
            return self.doc.get_toc()
        except Exception:
            return []

    @staticmethod
    def convert_pages_to_pdf(pages_path: str, output_path: str) -> str:
        """Estrae l'anteprima PDF vettoriale nativa da un file Apple Pages (.pages)."""
        import zipfile
        with zipfile.ZipFile(pages_path, 'r') as z:
            for name in z.namelist():
                if 'quicklook' in name.lower() and name.lower().endswith('.pdf'):
                    with open(output_path, 'wb') as f_out:
                        f_out.write(z.read(name))
                    return output_path
        raise FileNotFoundError("Nessun PDF QuickLook incorporato nel file .pages")

    @staticmethod
    def convert_via_freeconvert(
        input_path: str,
        target_format: str,
        api_key: str,
        output_path: str = None,
        progress_callback=None
    ) -> str:
        """
        Converte qualsiasi file (Apple Pages .pages, Word, Excel, immagini, ecc.)
        utilizzando le API REST ufficiali di FreeConvert.com.
        
        Supporta upload multipart, polling asincrono dello stato e download finale.
        progress_callback: funzione opzionale f(percent: int, status_msg: str)
        """
        import requests
        import time

        if not api_key:
            raise ValueError("API Key FreeConvert non fornita. Inseriscila nelle impostazioni.")
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"File di input non trovato: {input_path}")

        if progress_callback:
            progress_callback(10, "Inizializzazione sessione di conversione FreeConvert...")

        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }

        target_fmt = target_format.lower().lstrip(".")
        filename = os.path.basename(input_path)
        base_name, _ = os.path.splitext(filename)
        if not output_path:
            output_path = os.path.join(os.path.dirname(input_path) or ".", f"{base_name}.{target_fmt}")

        # 1. Creazione del Job FreeConvert
        payload = {
            "tasks": {
                "import-1": {
                    "operation": "import/upload"
                },
                "convert-1": {
                    "operation": "convert",
                    "input": "import-1",
                    "output_format": target_fmt
                },
                "export-1": {
                    "operation": "export/url",
                    "input": "convert-1"
                }
            }
        }

        resp = requests.post("https://api.freeconvert.com/v1/process/jobs", json=payload, headers=headers)
        if resp.status_code >= 400:
            err_msg = resp.text
            try:
                err_data = resp.json()
                err_msg = err_data.get("message") or err_data.get("error") or str(err_data)
            except Exception:
                pass
            raise RuntimeError(f"Errore creazione Job FreeConvert (HTTP {resp.status_code}): {err_msg}")

        job_data = resp.json()
        job_id = job_data.get("id")
        tasks = job_data.get("tasks", [])
        import_task = next((t for t in tasks if t.get("name") == "import-1"), None)
        if not import_task or "result" not in import_task:
            raise RuntimeError("Risposta API FreeConvert non valida: operazione di upload non trovata.")

        form_info = import_task["result"]["form"]
        upload_url = form_info["url"]
        upload_params = form_info.get("parameters", {})

        # 2. Upload del file locale
        if progress_callback:
            progress_callback(30, f"Caricamento file '{filename}' su FreeConvert...")

        with open(input_path, "rb") as file_obj:
            files = {"file": file_obj}
            up_resp = requests.post(upload_url, data=upload_params, files=files)
            if up_resp.status_code >= 400:
                raise RuntimeError(f"Errore caricamento file su FreeConvert (HTTP {up_resp.status_code})")

        # 3. Monitoraggio avanzamento (Polling)
        if progress_callback:
            progress_callback(55, "Conversione in corso nei cloud server FreeConvert...")

        poll_headers = {"Authorization": f"Bearer {api_key.strip()}"}
        export_url = None
        max_attempts = 120  # fino a 4 minuti per file complessi
        for attempt in range(max_attempts):
            time.sleep(2)
            check_resp = requests.get(f"https://api.freeconvert.com/v1/process/jobs/{job_id}", headers=poll_headers)
            if check_resp.status_code >= 400:
                continue

            status_json = check_resp.json()
            job_status = status_json.get("status")

            # Calcolo avanzamento
            current_tasks = status_json.get("tasks", [])
            convert_task = next((t for t in current_tasks if t.get("name") == "convert-1"), None)
            if convert_task:
                step_status = convert_task.get("status", "")
                if step_status == "processing":
                    pct = min(85, 60 + attempt)
                    if progress_callback:
                        progress_callback(pct, "Conversione cloud in corso...")

            if job_status == "completed":
                export_task = next((t for t in current_tasks if t.get("name") == "export-1"), None)
                if export_task and "result" in export_task and "url" in export_task["result"]:
                    export_url = export_task["result"]["url"]
                    break
            elif job_status == "failed":
                reason = "Conversione non riuscita su FreeConvert."
                for t in current_tasks:
                    if t.get("status") == "failed" and "message" in t:
                        reason = t["message"]
                raise RuntimeError(f"Errore conversione FreeConvert: {reason}")

        if not export_url:
            raise TimeoutError("Tempo massimo per la conversione superato o URL di download non generato.")

        # 4. Download del file convertito
        if progress_callback:
            progress_callback(90, f"Download del file convertito in corso...")

        dl_resp = requests.get(export_url, stream=True)
        if dl_resp.status_code >= 400:
            raise RuntimeError(f"Impossibile scaricare il file convertito (HTTP {dl_resp.status_code})")

        with open(output_path, "wb") as out_file:
            for chunk in dl_resp.iter_content(chunk_size=65536):
                if chunk:
                    out_file.write(chunk)

        if progress_callback:
            progress_callback(100, f"Conversione completata: {os.path.basename(output_path)}")

        return output_path
`;

export { PYTHON_PYQT6_GUI } from './pythonGuiCode';


export const PYTHON_PYINSTALLER_BAT = `@echo off
echo ===================================================
echo  LibrePDF Desktop Studio - Compilazione .EXE
echo ===================================================
echo.
echo 1. Installazione o verifica librerie richieste...
pip install -r requirements.txt

echo.
echo 2. Creazione eseguibile Windows con PyInstaller...
pyinstaller --noconfirm --onedir --windowed --collect-data pymupdf --name "LibrePdf" main.py

echo.
echo ===================================================
echo Compilazione completata con successo!
echo Troverai l'eseguibile pronto all'uso in:
echo   dist\\LibrePdf\\LibrePdf.exe
echo ===================================================
pause
`;

export const PYTHON_README = `# LibrePDF Desktop Engine (.exe) & PyMuPDF Modern Reader Studio

Questo pacchetto contiene il motore Python completo e la nuova applicazione grafica desktop **PyQt6** ridisegnata sul modello dei migliori lettori PDF (Adobe Acrobat / Foxit):
- **Esperienza di Lettura Confortevole**: Barra di navigazione pagine fluida (prima, precedente, salto pagina diretto, successiva, ultima), zoom personalizzato, **Adatta Larghezza** (Fit to Width), **Adatta Pagina** (Fit to Page), rotazione vista e **Modalità Lettura Scura / Notte**.
- **Pannello Laterale a Scomparsa (Navigatore)**: Miniature rapide di tutte le pagine per il salto immediato, Indice capitoli/Segnalibri (TOC) ed Info sul documento.
- **Cassetto Super Strumenti a Scomparsa**: Puoi richiuderlo durante la lettura per goderti il documento a tutto schermo, ed aprirlo con 1 click o scorciatoia per usare tutti i super-tools.
- **Cloud Converter Universale (FreeConvert REST API)**: Converti qualsiasi file (.pages Apple, Word, Excel, PowerPoint, immagini HEIC, ecc.) in PDF o viceversa, con barra di avanzamento e monitoraggio polling.
- **Modifica PDF Interattiva**: Caselle di testo con colore di sfondo personalizzabile (bianco, post-it, palette), bordo, testo in tempo reale, maniglia di ridimensionamento ↘, firme grafiche e icona rossa ✕ di eliminazione immediata.
- **Strumenti Completi**: OCR Tesseract, filigrana vettoriale, dividi/estrai, unisci PDF, esporta Word, Excel, immagini ad alta risoluzione, scala di grigi csGRAY, riparazione XRef e appiattimento moduli.

## 🚀 Guida Rapida per PyCharm o VSCode

### 1. Installazione Librerie
Apri il terminale del progetto ed esegui:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 2. Avvio dell'Applicazione Grafica
Puoi avviare indifferentemente con:
\`\`\`bash
python main.py
\`\`\`
*(oppure \`python app_gui.py\`)*

### 3. File Inclusi:
- \`main.py\` / \`app_gui.py\`: Applicazione completa in **PyQt6** con interfaccia stile Acrobat Reader, navigatore miniature laterale, canvas con ombra e pagina centrata, e cassetto laterale a schede con tutti i Super Strumenti.
- \`pdf_handler.py\`: Motore logico basato su **PyMuPDF (fitz)** con metodi per lettura, manipolazione avanzata, OCR, modifica, estrazione TOC e client REST FreeConvert integrato (\`convert_via_freeconvert\`).
- \`requirements.txt\`: Tutte le dipendenze Python con versioni compatibili (\`pymupdf\`, \`PyQt6\`, \`requests\`, \`pdf2docx\`, \`pandas\`, \`openpyxl\`, \`pillow\`).
- \`build_exe.bat\`: Script automatico a 1-click per compilare l'eseguibile autonomo **LibrePdf.exe** per Windows (con flag \`--collect-data pymupdf\`).

## 🔨 Come generare l'eseguibile .EXE
Esegui dal terminale:
\`\`\`bash
pyinstaller --noconfirm --onedir --windowed --collect-data pymupdf --name "LibrePdf" main.py
\`\`\`
oppure fai doppio clic su \`build_exe.bat\`.
Troverai il file \`LibrePdf.exe\` generato dentro la cartella \`dist/LibrePdf/\`.
`;

/** Generate tailored snippet based on current web tool */
export function getSnippetForTool(toolId: string): string {
  switch (toolId) {
    case 'edit-pdf':
      return `# Modifica PDF con PyMuPDF: Inserimento testo con contorno, immagini e firme
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento.pdf")

# 1. Inserisci testo con contorno rosso e sfondo bianco su pagina 0 (prima pagina)
handler.insert_custom_text(
    page_num=0,
    text="DOCUMENTO APPROVATO",
    x=100, y=150, width=250, height=45,
    fontsize=16,
    color=(0, 0, 0),        # Testo nero
    has_border=True,        # Attiva contorno
    border_color=(1, 0, 0), # Bordo rosso
    border_width=2.0,       # Spessore 2px
    has_bg=True,            # Sfondo pieno
    bg_color=(1, 1, 1)      # Bianco
)

# 2. Inserisci immagine o logo con cornice opzionale
# handler.insert_custom_image(0, "logo.png", x=100, y=250, width=150, height=80, has_border=True)

# 3. Salva le modifiche in un nuovo file
handler.save_edited_document("documento_modificato.pdf")
print("Modifiche salvate con successo!")`;

    case 'watermark':
      return `# Filigrana con PyMuPDF (compatibile Windows e senza crash 0xC0000409)
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("mio_documento.pdf")
# Utilizza morph=(point, Matrix(45)) internamente per rotazioni non ortogonali
handler.add_watermark("CONFIDENZIALE", "documento_watermark.pdf", rotate=45)
print("Filigrana applicata con successo!")`;

    case 'ocr-pdf':
      return `# OCR con PyMuPDF (riconoscimento ottico caratteri da PDF scansionati)
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento_scansionato.pdf")

# Esegui OCR sulla pagina 0 con lingua italiana (richiede Tesseract)
testo_ocr_p1 = handler.extract_text_ocr(0, language="ita")
print("Testo estratto con OCR (Pagina 1):\\n", testo_ocr_p1)

# Oppure OCR completo di tutte le pagine
testo_completo = handler.extract_all_text_ocr(language="ita")
with open("testo_riconosciuto.txt", "w", encoding="utf-8") as f:
    f.write(testo_completo)
print("File salvato con successo!")`;

    case 'pdf-to-markdown':
      return `# Conversione PDF in Markdown con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento.pdf")
md_content = []
for i in range(handler.get_page_count()):
    txt = handler.extract_text(i)
    md_content.append(f"## Pagina {i + 1}\\n\\n{txt}")
with open("documento.md", "w", encoding="utf-8") as f:
    f.write("\\n\\n".join(md_content))`;

    case 'extract-text':
      return `# Estrazione testo con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("mio_documento.pdf")
testo_p1 = handler.extract_text(0)
print("Testo Pagina 1:\\n", testo_p1)
testo_completo = handler.extract_all_text()`;

    case 'split':
      return `# Estrazione range di pagine con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("mio_documento.pdf")
handler.extract_pages(0, 2, "pagine_estratte.pdf")`;

    case 'merge':
      return `# Unisci PDF con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("file_base.pdf")
handler.merge_with(["allegato_1.pdf", "allegato_2.pdf"], "documento_unito.pdf")`;

    case 'rotate':
      return `# Ruota documento con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento.pdf")
handler.rotate_document(90, "documento_ruotato.pdf")`;

    case 'grayscale':
      return `# Conversione in Scala di Grigi con PyMuPDF (csGRAY)
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento_colori.pdf")
handler.convert_to_grayscale("documento_monocromatico.pdf")
print("Conversione in scala di grigi completata!")`;

    case 'flatten':
      return `# Appiattimento moduli AcroForm e annotazioni con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("modulo_compilato.pdf")
handler.flatten_pdf("documento_appiattito.pdf")
print("Campi modulo fissati in modo permanente!")`;

    case 'repair':
      return `# Ricostruzione XRef e riparazione con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("file_danneggiato.pdf")
handler.repair_pdf("file_riparato.pdf")
print("Tabella XRef ricostruita con successo!")`;

    case 'pdf-to-docx':
      return `# Conversione PDF in Word (.docx) con pdf2docx
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento.pdf")
handler.convert_to_docx("documento_convertito.docx")
print("Conversione in Word (.docx) completata!")`;

    case 'docx-to-pdf':
      return `# Conversione Word (.docx) o Apple Pages (.pages) in PDF con Python
import os
import zipfile

def convert_pages_to_pdf(pages_path: str, output_pdf: str = None) -> str:
    """Estrae l'anteprima PDF vettoriale nativa generata dal motore Quartz di Apple."""
    if not output_pdf:
        output_pdf = os.path.splitext(pages_path)[0] + ".pdf"
    with zipfile.ZipFile(pages_path, 'r') as z:
        for name in z.namelist():
            if 'quicklook' in name.lower() and name.lower().endswith('.pdf'):
                with open(output_pdf, 'wb') as f_out:
                    f_out.write(z.read(name))
                print(f"Estratto PDF nativo vettoriale: {output_pdf}")
                return output_pdf
    raise FileNotFoundError("Nessuna anteprima PDF trovata nel file .pages")

# Per Word (.docx):
# from docx2pdf import convert
# convert("documento.docx", "documento.pdf")

# Per Apple Pages (.pages):
# convert_pages_to_pdf("documento.pages", "documento.pdf")
print("Snippet pronto per Word e Apple Pages!")`;

    case 'pdf-to-xlsx':
      return `# Estrazione tabelle PDF in Excel (.xlsx) con PyMuPDF
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("bilancio.pdf")
handler.extract_tables_to_excel("tabelle_estratte.xlsx")
print("Tabelle estratte ed esportate in Excel (.xlsx) con successo!")`;

    case 'xlsx-to-pdf':
      return `# Conversione Excel (.xlsx) in PDF con Python
import pandas as pd
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors

df = pd.read_excel("dati.xlsx")
data = [df.columns.tolist()] + df.values.tolist()

doc = SimpleDocTemplate("foglio_excel.pdf", pagesize=landscape(A4))
t = Table(data)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
]))
doc.build([t])
print("Foglio Excel convertito in PDF con successo!")`;

    case 'pdf-to-images':
      return `# Esportazione pagine PDF in immagini JPG e PNG ad alta risoluzione
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento.pdf")
handler.save_pages_as_images("output_immagini", fmt="png", zoom=2.0)
print("Pagine esportate con successo!")`;

    case 'images-to-pdf':
      return `# Assembla immagini JPG, PNG in un unico PDF con PyMuPDF
import pymupdf
import glob

image_files = sorted(glob.glob("*.jpg") + glob.glob("*.png"))
doc = pymupdf.open()

for img_path in image_files:
    img = pymupdf.open(img_path)
    rect = img[0].rect
    pdfbytes = img.convert_to_pdf()
    img.close()
    img_pdf = pymupdf.open("pdf", pdfbytes)
    page = doc.new_page(width=rect.width, height=rect.height)
    page.show_pdf_page(rect, img_pdf, 0)

doc.save("immagini_unite.pdf")
doc.close()
print("Immagini legate in PDF con successo!")`;

    case 'cloud-converter':
      return `# Conversione Universale tramite FreeConvert REST API in Python
import requests
import time

API_KEY = "LA_TUA_API_KEY_FREECONVERT"
FILE_PATH = "documento.pages"
OUTPUT_FORMAT = "pdf"

headers = {"Authorization": f"Bearer {API_KEY}"}
job_payload = {
    "tasks": {
        "import-file": {"operation": "import/upload"},
        "convert-file": {"operation": "convert", "input": "import-file", "output_format": OUTPUT_FORMAT},
        "export-file": {"operation": "export/url", "input": "convert-file"}
    }
}

# 1. Creazione sessione
job = requests.post("https://api.freeconvert.com/v1/process/jobs", json=job_payload, headers=headers).json()
import_task = next(t for t in job["tasks"] if t["name"] == "import-file")
form_data = import_task["result"]["form"]

# 2. Caricamento file
with open(FILE_PATH, "rb") as f:
    requests.post(form_data["url"], data=form_data.get("parameters", {}), files={"file": f})

# 3. Monitoraggio e download
while True:
    time.sleep(2)
    status = requests.get(f"https://api.freeconvert.com/v1/process/jobs/{job['id']}", headers=headers).json()
    if status["status"] == "completed":
        export_task = next(t for t in status["tasks"] if t["name"] == "export-file")
        content = requests.get(export_task["result"]["url"]).content
        with open(f"risultato.{OUTPUT_FORMAT}", "wb") as out:
            out.write(content)
        print("Conversione completata con successo!")
        break
    elif status["status"] == "failed":
        print("Conversione fallita.")
        break`;

    default:
      return `# Utilizzo base del motore PyMuPDF PDFHandler
from pdf_handler import PDFHandler

handler = PDFHandler()
handler.load_document("documento.pdf")
print(f"Pagine totali: {handler.get_page_count()}")`;
  }
}
