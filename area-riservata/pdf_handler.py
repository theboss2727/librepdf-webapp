"""
LibrePDF Python Engine - PDFHandler
Motore di elaborazione PDF locale compatibile con PyMuPDF (fitz), pdf2docx, docx2pdf, pdfplumber e openpyxl.
Pronto per l'integrazione in applicazioni desktop PyQt6 e compilazione .exe
Supporta manipolazione avanzata, conversione Office 1:1, OCR, Modifica PDF e Firme.
"""

import os
import sys
import zipfile
import pymupdf


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
        Genera i dati immagine della pagina per l'interfaccia grafica PyQt6.
        Restituisce (samples_bytes, width, height, stride).
        """
        if not self.doc or page_num < 0 or page_num >= len(self.doc):
            return None
        try:
            page = self.doc.load_page(page_num)
            mat = pymupdf.Matrix(zoom, zoom)
            if rotation:
                mat.prerotate(rotation)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            return bytes(pix.samples), pix.width, pix.height, pix.stride
        except Exception as e:
            print(f"Errore render_page: {e}")
            return None

    # ------------------- CONVERSIONI OFFICE 1:1 LOCALI -------------------

    def convert_to_docx(self, output_path: str):
        """Converte il PDF in documento Word (.docx) 1:1 con pdf2docx."""
        from pdf2docx import Converter
        cv = Converter(self.filepath)
        cv.convert(output_path, start=0, end=None)
        cv.close()
        return output_path

    @staticmethod
    def convert_docx_to_pdf(docx_path: str, output_path: str):
        """Converte un documento Word (.docx) in PDF tramite docx2pdf."""
        from docx2pdf import convert
        convert(docx_path, output_path)
        return output_path

    def extract_tables_to_excel(self, output_path: str):
        """
        Estrae tabelle e testo strutturato in fogli Excel (.xlsx)
        utilizzando pdfplumber e openpyxl ad alta fedelta'.
        """
        try:
            import pdfplumber
            from openpyxl import Workbook

            wb = Workbook()
            if wb.active:
                wb.remove(wb.active)

            with pdfplumber.open(self.filepath) as pdf:
                for i, page in enumerate(pdf.pages, 1):
                    tables = page.extract_tables() or []
                    if tables:
                        for t_i, tbl in enumerate(tables, 1):
                            ws = wb.create_sheet(title=f"Pag_{i}_Tab_{t_i}"[:31])
                            for row in tbl:
                                ws.append([c if c is not None else "" for c in row])
                    else:
                        text = page.extract_text()
                        if text and text.strip():
                            ws = wb.create_sheet(title=f"Pagina_{i}"[:31])
                            for line in text.splitlines():
                                ws.append([line])

            if not wb.sheetnames:
                ws = wb.create_sheet(title="Foglio1")
                ws.append(["Nessun contenuto estraibile rilevato"])

            wb.save(output_path)
            return output_path
        except ImportError:
            # Fallback PyMuPDF nativo
            import pandas as pd
            with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
                found = False
                for i, page in enumerate(self.doc):
                    tabs = page.find_tables()
                    for t_idx, tab in enumerate(tabs):
                        df = tab.to_pandas()
                        df.to_excel(writer, sheet_name=f"Pag_{i+1}_Tab_{t_idx+1}"[:31], index=False)
                        found = True
                if not found:
                    df_empty = pd.DataFrame({"Nota": ["Nessuna tabella vettoriale identificata nel documento."]})
                    df_empty.to_excel(writer, sheet_name="Info", index=False)
            return output_path

    @staticmethod
    def convert_excel_to_pdf(excel_path: str, output_path: str):
        """
        Converte un file Excel (.xlsx, .xls, .csv) in PDF.
        Strategia 1: Excel COM nativo (se installato Microsoft Office)
        Strategia 2: Motore grafico PyMuPDF Story ad alta fedelta' (100% offline, nessun Office richiesto)
        """
        import html
        lower = excel_path.lower()
        converted = False
        try:
            import win32com.client
            xl = win32com.client.Dispatch("Excel.Application")
            xl.Visible = False
            xl.DisplayAlerts = False
            try:
                wb = xl.Workbooks.Open(os.path.abspath(excel_path))
                wb.ExportAsFixedFormat(0, os.path.abspath(output_path))
                wb.Close(False)
                converted = True
            finally:
                xl.Quit()
        except Exception:
            converted = False

        if not converted or not os.path.exists(output_path):
            html_parts = ["""<style>
            body { font-family: sans-serif; margin: 20px; color: #1e293b; }
            h2 { color: #0f172a; margin-top: 15px; margin-bottom: 8px; font-size: 13pt; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 25px; table-layout: auto; }
            th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 9pt; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 8.5pt; text-align: left; vertical-align: top; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .empty { color: #94a3b8; font-style: italic; }
            </style>"""]

            if lower.endswith(('.xlsx', '.xlsm')):
                import openpyxl
                wb = openpyxl.load_workbook(excel_path, data_only=True)
                has_content = False
                for sname in wb.sheetnames:
                    ws = wb[sname]
                    rows = list(ws.iter_rows(values_only=True))
                    non_empty = [r for r in rows if any(c is not None and str(c).strip() != "" for c in r)]
                    if not non_empty:
                        continue
                    has_content = True
                    html_parts.append(f"<h2>Foglio: {html.escape(sname)}</h2><table>")
                    for r_idx, row in enumerate(non_empty):
                        html_parts.append("<tr>")
                        for val in row:
                            tag = "th" if r_idx == 0 else "td"
                            val_str = "" if val is None else str(val)
                            html_parts.append(f"<{tag}>{html.escape(val_str)}</{tag}>")
                        html_parts.append("</tr>")
                    html_parts.append("</table>")
                if not has_content:
                    html_parts.append("<p class='empty'>Nessun dato trovato nel foglio Excel.</p>")
            elif lower.endswith('.csv'):
                import csv
                html_parts.append("<h2>Tabella CSV</h2><table>")
                with open(excel_path, 'r', encoding='utf-8', errors='ignore') as f:
                    reader = csv.reader(f)
                    for r_idx, row in enumerate(reader):
                        if not any(row): continue
                        html_parts.append("<tr>")
                        for val in row:
                            tag = "th" if r_idx == 0 else "td"
                            val_str = "" if val is None else str(val)
                            html_parts.append(f"<{tag}>{html.escape(val_str)}</{tag}>")
                        html_parts.append("</tr>")
                html_parts.append("</table>")

            full_html = "".join(html_parts)
            story = pymupdf.Story(html=full_html)
            writer = pymupdf.DocumentWriter(output_path)
            more = 1
            while more:
                device = writer.begin_page(pymupdf.Rect(0, 0, 842, 595)) # A4 Landscape
                more, _ = story.place(pymupdf.Rect(35, 35, 807, 560))
                story.draw(device)
                writer.end_page()
            writer.close()

        return output_path

    # ------------------- MODIFICA PDF (TESTI, IMMAGINI, TIMBRI) -------------------

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
        """Inserisce un blocco di testo formattato su una specifica pagina del PDF."""
        if not self.doc or page_num < 0 or page_num >= len(self.doc):
            return False

        page = self.doc[page_num]
        rect = pymupdf.Rect(x, y, x + width, y + height)

        if has_border or has_bg:
            shape = page.new_shape()
            shape.draw_rect(rect)
            shape.finish(
                color=border_color if has_border else None,
                fill=bg_color if has_bg else None,
                width=border_width if has_border else 0
            )
            shape.commit()

        rc = page.insert_textbox(rect, text, fontsize=fontsize, color=color, align=pymupdf.TEXT_ALIGN_CENTER)
        if rc < 0:
            scaled_font = max(7.0, min(fontsize, height * 0.6))
            page.insert_textbox(rect, text, fontsize=scaled_font, color=color, align=pymupdf.TEXT_ALIGN_CENTER)
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
        """Inserisce un'immagine o firma grafica con coordinate e cornice opzionale."""
        if not self.doc or page_num < 0 or page_num >= len(self.doc) or not os.path.exists(image_path):
            return False

        page = self.doc[page_num]
        rect = pymupdf.Rect(x, y, x + width, y + height)
        page.insert_image(rect, filename=image_path)

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
        """Estrae il testo puro da una pagina specifica."""
        if self.doc and 0 <= page_num < len(self.doc):
            return self.doc.load_page(page_num).get_text("text")
        return ""

    def extract_text_ocr(self, page_num: int, language: str = "ita") -> str:
        """Estrae il testo da una pagina PDF scansionata usando OCR PyMuPDF/Tesseract."""
        if self.doc and 0 <= page_num < len(self.doc):
            page = self.doc.load_page(page_num)
            try:
                tp = page.get_textpage_ocr(language=language, dpi=300, full=True)
                return page.get_text("text", textpage=tp)
            except Exception as e:
                return f"[Errore OCR: Tesseract non installato nel sistema: {e}]"
        return ""

    def extract_all_text(self) -> str:
        """Estrae tutto il testo del documento."""
        if not self.doc:
            return ""
        return "\n\n".join(f"--- Pagina {i + 1} ---\n{p.get_text('text')}" for i, p in enumerate(self.doc))

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
        """Aggiunge una filigrana diagonale personalizzata a tutte le pagine."""
        if not self.filepath:
            return
        same_file = os.path.abspath(output_path).lower() == os.path.abspath(self.filepath).lower()
        target_path = output_path + ".tmp.pdf" if same_file else output_path

        out_doc = pymupdf.open(self.filepath)
        for page in out_doc:
            p = pymupdf.Point(page.rect.width * 0.15, page.rect.height * 0.55)
            mat = pymupdf.Matrix(rotate)
            page.insert_text(p, text, fontsize=fontsize, color=color, fill_opacity=opacity, morph=(p, mat), overlay=True)

        out_doc.save(target_path, deflate=True)
        out_doc.close()
        if same_file:
            self.doc.close()
            os.replace(target_path, output_path)
            self.doc = pymupdf.open(self.filepath)

    def merge_with(self, other_filepaths: list[str], output_path: str):
        """Unisce uno o piu file PDF con il documento corrente."""
        if not self.doc:
            return
        merged_doc = pymupdf.open(self.filepath)
        for p in other_filepaths:
            if os.path.exists(p):
                doc_to_add = pymupdf.open(p)
                merged_doc.insert_pdf(doc_to_add)
                doc_to_add.close()
        merged_doc.save(output_path, deflate=True)
        merged_doc.close()

    def rotate_document(self, angle: int, output_path: str):
        """Ruota tutte le pagine dell'angolo specificato (es. 90, 180, 270)."""
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
            self.doc.close()
            os.replace(target_path, output_path)
            self.doc = pymupdf.open(self.filepath)

    def convert_to_grayscale(self, output_path: str, dpi: int = 150):
        """Converte il documento in scala di grigi nativa (csGRAY)."""
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

    @staticmethod
    def convert_pages_to_pdf(pages_path: str, output_path: str) -> str:
        """Estrae l'anteprima PDF vettoriale nativa da un file Apple Pages (.pages)."""
        with zipfile.ZipFile(pages_path, 'r') as z:
            for name in z.namelist():
                if 'quicklook' in name.lower() and name.lower().endswith('.pdf'):
                    with open(output_path, 'wb') as f_out:
                        f_out.write(z.read(name))
                    return output_path
        raise FileNotFoundError("Nessun PDF QuickLook incorporato nel file .pages")

    @staticmethod
    def convert_via_freeconvert(input_path: str, target_format: str, api_key: str, output_path: str = None) -> str:
        """Converte file tramite FreeConvert REST API."""
        import requests
        import time

        if not api_key:
            raise ValueError("API Key FreeConvert non fornita.")
        headers = {"Authorization": f"Bearer {api_key.strip()}", "Content-Type": "application/json"}
        target_fmt = target_format.lower().lstrip(".")
        filename = os.path.basename(input_path)
        base_name, _ = os.path.splitext(filename)
        if not output_path:
            output_path = os.path.join(os.path.dirname(input_path) or ".", f"{base_name}.{target_fmt}")

        payload = {
            "tasks": {
                "import-1": {"operation": "import/upload"},
                "convert-1": {"operation": "convert", "input": "import-1", "output_format": target_fmt},
                "export-1": {"operation": "export/url", "input": "convert-1"}
            }
        }
        resp = requests.post("https://api.freeconvert.com/v1/process/jobs", json=payload, headers=headers)
        if resp.status_code >= 400:
            raise RuntimeError(f"Errore FreeConvert (HTTP {resp.status_code}): {resp.text}")

        job_data = resp.json()
        job_id = job_data.get("id")
        import_task = next((t for t in job_data.get("tasks", []) if t.get("name") == "import-1"), None)
        form_info = import_task["result"]["form"]

        with open(input_path, "rb") as f:
            up_resp = requests.post(form_info["url"], data=form_info.get("parameters", {}), files={"file": f})
            if up_resp.status_code >= 400:
                raise RuntimeError(f"Errore upload (HTTP {up_resp.status_code})")

        for _ in range(120):
            time.sleep(2)
            check_resp = requests.get(f"https://api.freeconvert.com/v1/process/jobs/{job_id}", headers=headers)
            status_json = check_resp.json()
            if status_json.get("status") == "completed":
                export_task = next((t for t in status_json.get("tasks", []) if t.get("name") == "export-1"), None)
                dl_resp = requests.get(export_task["result"]["url"], stream=True)
                with open(output_path, "wb") as out:
                    for chunk in dl_resp.iter_content(chunk_size=65536):
                        if chunk:
                            out.write(chunk)
                return output_path
            elif status_json.get("status") == "failed":
                raise RuntimeError("Conversione FreeConvert fallita.")
        raise TimeoutError("Tempo massimo superato.")
