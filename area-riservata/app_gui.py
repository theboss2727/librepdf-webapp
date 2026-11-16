"""
LibrePDF Desktop Studio - Premier PDF Reader & Super Tools Suite (PyQt6)
Ispirato ai migliori visualizzatori PDF (Adobe Acrobat / Foxit / Apple Preview)
Include:
- Modalità Lettura Confortevole (Adatta Larghezza, Adatta Pagina, Zoom fluido, Navigazione immediata)
- Navigatore Laterale a scomparsa: Miniature di pagina e Indice Segnalibri (TOC)
- Cassetto Super Strumenti a scomparsa per lettura a schermo intero senza distrazioni
- Cloud Converter Universale integrato con FreeConvert REST API (conversione .pages, .docx, .xlsx, ecc.)
- Modifica PDF Interattiva con sfondi personalizzabili e icona ✕ per eliminare
- OCR, Filigrana, Unisci, Dividi, Esportazione Excel e Word, Scala di grigi, Riparazione XRef
"""

import sys
import os
import json
import time
import zipfile
import pymupdf  # pip install pymupdf

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QMessageBox, QSpinBox,
    QLineEdit, QTabWidget, QTextEdit, QScrollArea, QStatusBar, QFrame,
    QSplitter, QComboBox, QListWidget, QListWidgetItem, QColorDialog,
    QCheckBox, QProgressBar, QTreeWidget, QTreeWidgetItem
)
from PyQt6.QtGui import QImage, QPixmap, QFont, QColor, QPainter, QPen, QBrush, QKeySequence, QIcon
from PyQt6.QtCore import Qt, QRectF, QPointF, QThread, pyqtSignal, QSize

# Motore logico PDFHandler
from pdf_handler import PDFHandler


CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".librepdf_config.json")


def load_user_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_user_config(data: dict):
    try:
        current = load_user_config()
        current.update(data)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print("Errore salvataggio config:", e)


# ============================================================================
# THREAD WORKER PER CONVERSIONE ASINCRONA FREECONVERT (NON BLOCCA LA GUI)
# ============================================================================

class CloudConvertWorker(QThread):
    progress_signal = pyqtSignal(int, str)
    finished_signal = pyqtSignal(bool, str, str)  # success, result_path_or_err, display_msg

    def __init__(self, input_path: str, target_fmt: str, api_key: str, output_path: str = None):
        super().__init__()
        self.input_path = input_path
        self.target_fmt = target_fmt
        self.api_key = api_key
        self.output_path = output_path

    def run(self):
        def callback(pct: int, msg: str):
            self.progress_signal.emit(pct, msg)

        try:
            out_file = PDFHandler.convert_via_freeconvert(
                input_path=self.input_path,
                target_format=self.target_fmt,
                api_key=self.api_key,
                output_path=self.output_path,
                progress_callback=callback
            )
            self.finished_signal.emit(True, out_file, "Conversione completata con successo!")
        except Exception as e:
            self.finished_signal.emit(False, str(e), "Errore durante la conversione cloud")


# ============================================================================
# STILE DELL'INTERFACCIA ISPIRATO AD ACROBAT READER / FOXIT
# ============================================================================

READER_STYLESHEET = """
QMainWindow {
    background-color: #0b0f19;
}
/* BARRA SUPERIORE DEI COMANDI LETTURA & AZIONI */
#readerToolbar {
    background-color: #111827;
    border-bottom: 1px solid #1f2937;
    padding: 3px 10px;
    min-height: 42px;
}
#leftSidebar, #rightSidebar {
    background-color: #111827;
}
#leftSidebar {
    border-right: 1px solid #1f2937;
}
#rightSidebar {
    border-left: 1px solid #1f2937;
}
QTabWidget::pane {
    border: 1px solid #1f2937;
    background-color: #0d1322;
    border-radius: 6px;
    padding: 8px;
}
QTabBar::tab {
    background: #1e293b;
    color: #94a3b8;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    margin-right: 2px;
}
QTabBar::tab:selected {
    background: #0d1322;
    color: #f59e0b;
    border-bottom: 2px solid #f59e0b;
}
QLabel {
    color: #e2e8f0;
    font-size: 11px;
}
QLineEdit, QSpinBox, QComboBox, QTextEdit, QListWidget, QTreeWidget {
    background-color: #0f172a;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 5px;
    padding: 4px 6px;
    font-size: 11px;
}
QLineEdit:focus, QSpinBox:focus, QComboBox:focus, QTextEdit:focus {
    border: 1px solid #f59e0b;
}
QCheckBox {
    color: #f1f5f9;
    font-size: 11px;
    spacing: 5px;
}
QPushButton {
    background-color: #1e293b;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 5px;
    padding: 5px 10px;
    font-weight: 600;
    font-size: 11px;
}
QPushButton:hover {
    background-color: #334155;
}
QPushButton#btnPrimary {
    background-color: #f59e0b;
    color: #0f172a;
    border: none;
    font-weight: bold;
}
QPushButton#btnPrimary:hover {
    background-color: #d97706;
}
QPushButton#btnAccent {
    background-color: #3b82f6;
    color: white;
    border: none;
    font-weight: bold;
}
QPushButton#btnAccent:hover {
    background-color: #2563eb;
}
QPushButton#btnToggleActive {
    background-color: #f59e0b;
    color: #0f172a;
    border: 1px solid #f59e0b;
    font-weight: bold;
}
QProgressBar {
    border: 1px solid #334155;
    border-radius: 4px;
    text-align: center;
    background-color: #0f172a;
    color: #f8fafc;
    font-size: 10px;
    font-weight: bold;
}
QProgressBar::chunk {
    background-color: #f59e0b;
    border-radius: 3px;
}
QStatusBar {
    background-color: #111827;
    color: #94a3b8;
    border-top: 1px solid #1f2937;
    font-size: 11px;
    max-height: 24px;
}
QScrollArea {
    border: none;
    background-color: #050811;
}
"""


# ============================================================================
# CANVAS INTERATTIVO: RENDERING DOCUMENTO + BOX MODIFICA CON ICONA (✕)
# ============================================================================

class InteractivePdfCanvas(QWidget):
    """
    Area di rendering del foglio PDF in stile lettore:
    - Pagina centrata con bordo e ombreggiatura foglio
    - Supporto per zoom fluido e rotazione
    - Modalità Notte (inversione contrasto per lettura serale)
    - Box di modifica interattiva (testi, forme, sfondi post-it e icona ✕ per eliminare)
    """
    def __init__(self, parent_app):
        super().__init__()
        self.app = parent_app
        self.pixmap = None

        # Posizione e stato dell'elemento di modifica attivo
        self.active_elem = None
        self.drag_mode = None  # None, 'move', 'resize'
        self.drag_start = QPointF()
        self.orig_rect = QRectF()
        self.delete_btn_rect = QRectF()

        self.setMouseTracking(True)

    def set_page_pixmap(self, pixmap: QPixmap):
        self.pixmap = pixmap
        if pixmap:
            self.setFixedSize(pixmap.width() + 40, pixmap.height() + 40)
        else:
            self.setFixedSize(600, 800)
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Sfondo del viewer
        bg_color = QColor("#090d16")
        painter.fillRect(self.rect(), bg_color)

        if not self.pixmap:
            painter.setPen(QColor("#64748b"))
            painter.setFont(QFont("Segoe UI", 13))
            painter.drawText(
                self.rect(),
                Qt.AlignmentFlag.AlignCenter,
                "Nessun documento PDF aperto.\\nFai clic su '📂 Apri PDF' per iniziare la lettura."
            )
            return

        # Coordinate centrate con margine
        x = 20
        y = 20
        w = self.pixmap.width()
        h = self.pixmap.height()
        doc_rect = QRectF(x, y, w, h)

        # Ombreggiatura foglio (stile Acrobat / Reader)
        painter.setPen(Qt.PenStyle.NoPen)
        for i in range(1, 6):
            shadow_rect = doc_rect.adjusted(-i, -i, i * 2, i * 2)
            painter.setBrush(QColor(0, 0, 0, 25 - i * 4))
            painter.drawRoundedRect(shadow_rect, 4, 4)

        # Disegna la pagina PDF
        if getattr(self.app, 'is_night_mode', False):
            # Inversione colori per modalità lettura notturna confortevole
            img = self.pixmap.toImage()
            img.invertPixels(QImage.InvertMode.InvertRgb)
            night_pix = QPixmap.fromImage(img)
            painter.drawPixmap(x, y, night_pix)
        else:
            painter.drawPixmap(x, y, self.pixmap)

        # Bordo perimetrale elegante del foglio
        painter.setPen(QPen(QColor("#334155"), 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(doc_rect)

        # Se la modalità Modifica è attiva, renderizza la casella interattiva
        if self.app.is_edit_mode_active() and self.active_elem:
            self.draw_interactive_box(painter, x, y)

    def draw_interactive_box(self, painter: QPainter, page_x: int, page_y: int):
        elem = self.active_elem
        scale = self.app.current_zoom

        rx = page_x + (elem["x"] * scale)
        ry = page_y + (elem["y"] * scale)
        rw = max(30.0, elem["w"] * scale)
        rh = max(20.0, elem["h"] * scale)
        box_rect = QRectF(rx, ry, rw, rh)

        # 1. Sfondo del rettangolo
        if elem.get("has_bg", True):
            bg = elem.get("bg_color", QColor("#ffffff"))
            painter.setBrush(QBrush(bg))
        else:
            painter.setBrush(Qt.BrushStyle.NoBrush)

        # 2. Contorno
        if elem.get("has_border", True):
            bc = elem.get("border_color", QColor("#f59e0b"))
            bw = max(1.0, elem.get("border_width", 2.0))
            painter.setPen(QPen(bc, bw, Qt.PenStyle.SolidLine))
        else:
            painter.setPen(QPen(QColor("#94a3b8"), 1, Qt.PenStyle.DashLine))

        painter.drawRoundedRect(box_rect, 3, 3)

        # 3. Testo live dentro il box
        text = elem.get("text", "")
        if text:
            tc = elem.get("text_color", QColor("#000000"))
            painter.setPen(tc)
            fontsize = max(8, int(elem.get("fontsize", 16) * scale * 0.75))
            painter.setFont(QFont("Segoe UI", fontsize, QFont.Weight.Medium))
            inner_rect = box_rect.adjusted(4, 4, -4, -4)
            painter.drawText(inner_rect, Qt.AlignmentFlag.AlignCenter | Qt.TextFlag.TextWordWrap, text)

        # 4. Icona CANCELLA (✕) rossa in alto a destra
        btn_size = 18.0
        bx = box_rect.right() - (btn_size / 2.0)
        by = box_rect.top() - (btn_size / 2.0)
        self.delete_btn_rect = QRectF(bx, by, btn_size, btn_size)

        painter.setPen(QPen(QColor("#ffffff"), 1.5))
        painter.setBrush(QBrush(QColor("#ef4444")))
        painter.drawEllipse(self.delete_btn_rect)

        painter.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        painter.drawText(self.delete_btn_rect, Qt.AlignmentFlag.AlignCenter, "✕")

        # 5. Maniglia di ridimensionamento ↘ in basso a destra
        handle_size = 8.0
        handle_rect = QRectF(box_rect.right() - handle_size, box_rect.bottom() - handle_size, handle_size, handle_size)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor("#f59e0b")))
        painter.drawRect(handle_rect)

    def mousePressEvent(self, event):
        if not self.app.is_edit_mode_active() or not self.active_elem:
            return

        pos = event.position()
        # Controllo click sul pulsante ✕ CANCELLA
        if hasattr(self, 'delete_btn_rect') and self.delete_btn_rect.contains(pos):
            self.app.on_delete_active_element()
            return

        scale = self.app.current_zoom
        rx = 20 + (self.active_elem["x"] * scale)
        ry = 20 + (self.active_elem["y"] * scale)
        rw = max(30.0, self.active_elem["w"] * scale)
        rh = max(20.0, self.active_elem["h"] * scale)
        box_rect = QRectF(rx, ry, rw, rh)
        handle_rect = QRectF(box_rect.right() - 12, box_rect.bottom() - 12, 16, 16)

        if handle_rect.contains(pos):
            self.drag_mode = 'resize'
            self.drag_start = pos
            self.orig_rect = QRectF(self.active_elem["x"], self.active_elem["y"], self.active_elem["w"], self.active_elem["h"])
        elif box_rect.contains(pos):
            self.drag_mode = 'move'
            self.drag_start = pos
            self.orig_rect = QRectF(self.active_elem["x"], self.active_elem["y"], self.active_elem["w"], self.active_elem["h"])

    def mouseMoveEvent(self, event):
        if not self.app.is_edit_mode_active() or not self.active_elem:
            return

        pos = event.position()
        scale = self.app.current_zoom

        if self.drag_mode == 'move':
            dx = (pos.x() - self.drag_start.x()) / scale
            dy = (pos.y() - self.drag_start.y()) / scale
            self.active_elem["x"] = max(0.0, self.orig_rect.x() + dx)
            self.active_elem["y"] = max(0.0, self.orig_rect.y() + dy)
            self.app.sync_coords_to_ui(self.active_elem)
            self.update()
        elif self.drag_mode == 'resize':
            dw = (pos.x() - self.drag_start.x()) / scale
            dh = (pos.y() - self.drag_start.y()) / scale
            self.active_elem["w"] = max(40.0, self.orig_rect.width() + dw)
            self.active_elem["h"] = max(25.0, self.orig_rect.height() + dh)
            self.app.sync_coords_to_ui(self.active_elem)
            self.update()
        else:
            # Aggiorna il cursore del mouse
            rx = 20 + (self.active_elem["x"] * scale)
            ry = 20 + (self.active_elem["y"] * scale)
            rw = max(30.0, self.active_elem["w"] * scale)
            rh = max(20.0, self.active_elem["h"] * scale)
            box_rect = QRectF(rx, ry, rw, rh)
            handle_rect = QRectF(box_rect.right() - 12, box_rect.bottom() - 12, 16, 16)

            if handle_rect.contains(pos):
                self.setCursor(Qt.CursorShape.SizeFDiagCursor)
            elif box_rect.contains(pos):
                self.setCursor(Qt.CursorShape.SizeAllCursor)
            else:
                self.setCursor(Qt.CursorShape.ArrowCursor)

    def mouseReleaseEvent(self, event):
        self.drag_mode = None
        self.setCursor(Qt.CursorShape.ArrowCursor)


# ============================================================================
# FINESTRA PRINCIPALE: READER PROFESIONALE + SUPER TOOLS
# ============================================================================

class LibrePDFApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("LibrePDF Studio - Lettore Avanzato & Super Tools Suite")
        self.resize(1360, 880)
        self.setStyleSheet(READER_STYLESHEET)

        # Motore logico
        self.handler = PDFHandler()
        self.current_page = 0
        self.current_zoom = 1.25
        self.is_night_mode = False
        self.cloud_worker = None

        # Elemento di modifica testo corrente
        self.current_elem = {
            "text": "TESTO INSERITO",
            "x": 60.0,
            "y": 80.0,
            "w": 220.0,
            "h": 45.0,
            "fontsize": 16,
            "text_color": QColor("#000000"),
            "has_border": True,
            "border_color": QColor("#f59e0b"),
            "border_width": 2.0,
            "has_bg": True,
            "bg_color": QColor("#ffffff")
        }

        self.setup_ui()
        self.load_settings()

    def setup_ui(self):
        root = QWidget()
        self.setCentralWidget(root)
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # 1. TOP BAR RIBBON ISPIRATA AD ACROBAT
        self.setup_top_ribbon(root_layout)

        # 2. SPLITTER CENTRALE A 3 PANNELLI (Navigatore sinistro, Viewer centrale, Strumenti destro)
        self.main_splitter = QSplitter(Qt.Orientation.Horizontal)
        self.main_splitter.setHandleWidth(2)

        # PANNELLO SINISTRO: NAVIGATORE A SCOMPARSA (Miniature + Indice TOC + Info)
        self.left_sidebar = self.create_left_sidebar()
        self.main_splitter.addWidget(self.left_sidebar)

        # PANNELLO CENTRALE: AREA LETTURA CON SCROLL & CANVAS
        center_panel = QWidget()
        center_layout = QVBoxLayout(center_panel)
        center_layout.setContentsMargins(0, 0, 0, 0)
        center_layout.setSpacing(0)

        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.canvas_container = QWidget()
        self.canvas_layout = QVBoxLayout(self.canvas_container)
        self.canvas_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.canvas_layout.setContentsMargins(15, 15, 15, 15)

        self.canvas = InteractivePdfCanvas(self)
        self.canvas.active_elem = self.current_elem
        self.canvas_layout.addWidget(self.canvas)

        self.scroll_area.setWidget(self.canvas_container)
        center_layout.addWidget(self.scroll_area)
        self.main_splitter.addWidget(center_panel)

        # PANNELLO DESTRO: CASSETTO SUPER STRUMENTI A SCOMPARSA
        self.right_sidebar = self.create_right_sidebar()
        self.main_splitter.addWidget(self.right_sidebar)

        # Impostazione dimensioni iniziali: [Miniature: 220px, Lettura: 780px, Tools: 360px]
        self.main_splitter.setSizes([220, 780, 360])
        self.main_splitter.setCollapsible(0, True)
        self.main_splitter.setCollapsible(2, True)
        root_layout.addWidget(self.main_splitter)

        # Status Bar
        self.setStatusBar(QStatusBar())
        self.statusBar().showMessage("LibrePDF pronto - Apri un file o converti con i Super Strumenti.")

    # ------------------------------------------------------------------------
    # 1. TOP BAR RIBBON ISPIRATA AD ACROBAT / FOXIT
    # ------------------------------------------------------------------------

    def setup_top_ribbon(self, parent_layout):
        bar = QFrame()
        bar.setObjectName("readerToolbar")
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(8, 4, 8, 4)
        layout.setSpacing(8)

        # Tasto Navigatore (Miniature / TOC)
        self.btn_toggle_nav = QPushButton("📑 Miniature")
        self.btn_toggle_nav.setToolTip("Mostra/Nascondi pannello miniature e indice capitoli (Ctrl+B)")
        self.btn_toggle_nav.clicked.connect(self.toggle_left_sidebar)
        layout.addWidget(self.btn_toggle_nav)

        sep1 = QFrame()
        sep1.setFrameShape(QFrame.Shape.VLine)
        sep1.setStyleSheet("color: #334155;")
        layout.addWidget(sep1)

        # Azioni File
        btn_open = QPushButton("📂 Apri PDF")
        btn_open.setObjectName("btnPrimary")
        btn_open.clicked.connect(self.action_open_pdf)
        layout.addWidget(btn_open)

        btn_save = QPushButton("💾 Salva con nome")
        btn_save.clicked.connect(self.action_save_as)
        layout.addWidget(btn_save)

        sep2 = QFrame()
        sep2.setFrameShape(QFrame.Shape.VLine)
        sep2.setStyleSheet("color: #334155;")
        layout.addWidget(sep2)

        # Navigazione Pagine
        btn_first = QPushButton("⏮")
        btn_first.setToolTip("Prima Pagina")
        btn_first.setFixedWidth(30)
        btn_first.clicked.connect(self.go_first_page)
        layout.addWidget(btn_first)

        btn_prev = QPushButton("◀")
        btn_prev.setToolTip("Pagina Precedente (PgUp)")
        btn_prev.setFixedWidth(30)
        btn_prev.clicked.connect(self.go_prev_page)
        layout.addWidget(btn_prev)

        self.spin_page = QSpinBox()
        self.spin_page.setMinimum(1)
        self.spin_page.setMaximum(1)
        self.spin_page.setFixedWidth(55)
        self.spin_page.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.spin_page.valueChanged.connect(self.on_page_spin_changed)
        layout.addWidget(self.spin_page)

        self.lbl_page_total = QLabel("/ 0")
        self.lbl_page_total.setStyleSheet("color: #94a3b8; font-weight: bold;")
        layout.addWidget(self.lbl_page_total)

        btn_next = QPushButton("▶")
        btn_next.setToolTip("Pagina Successiva (PgDn)")
        btn_next.setFixedWidth(30)
        btn_next.clicked.connect(self.go_next_page)
        layout.addWidget(btn_next)

        btn_last = QPushButton("⏭")
        btn_last.setToolTip("Ultima Pagina")
        btn_last.setFixedWidth(30)
        btn_last.clicked.connect(self.go_last_page)
        layout.addWidget(btn_last)

        sep3 = QFrame()
        sep3.setFrameShape(QFrame.Shape.VLine)
        sep3.setStyleSheet("color: #334155;")
        layout.addWidget(sep3)

        # Controlli Zoom & Lettura
        btn_zoom_out = QPushButton("🔍➖")
        btn_zoom_out.setToolTip("Rimpicciolisci (Ctrl -)")
        btn_zoom_out.setFixedWidth(34)
        btn_zoom_out.clicked.connect(self.zoom_out)
        layout.addWidget(btn_zoom_out)

        self.combo_zoom = QComboBox()
        self.combo_zoom.addItems(["50%", "75%", "100%", "125%", "150%", "200%", "300%"])
        self.combo_zoom.setCurrentText("125%")
        self.combo_zoom.setFixedWidth(70)
        self.combo_zoom.currentTextChanged.connect(self.on_zoom_combo_changed)
        layout.addWidget(self.combo_zoom)

        btn_zoom_in = QPushButton("🔍➕")
        btn_zoom_in.setToolTip("Ingrandisci (Ctrl +)")
        btn_zoom_in.setFixedWidth(34)
        btn_zoom_in.clicked.connect(self.zoom_in)
        layout.addWidget(btn_zoom_in)

        btn_fit_w = QPushButton("↔ Adatta Largh.")
        btn_fit_w.setToolTip("Adatta alla larghezza della finestra")
        btn_fit_w.clicked.connect(self.zoom_fit_width)
        layout.addWidget(btn_fit_w)

        btn_fit_p = QPushButton("📄 Adatta Pag.")
        btn_fit_p.setToolTip("Adatta l'intera pagina all'altezza dello schermo")
        btn_fit_p.clicked.connect(self.zoom_fit_page)
        layout.addWidget(btn_fit_p)

        btn_rotate = QPushButton("⟳")
        btn_rotate.setToolTip("Ruota Vista di 90° orario")
        btn_rotate.setFixedWidth(32)
        btn_rotate.clicked.connect(self.rotate_current_view)
        layout.addWidget(btn_rotate)

        # Modalità Notte (Inversione contrasto per lettura serale)
        self.btn_night = QPushButton("🌙 Notte")
        self.btn_night.setToolTip("Attiva modalità lettura notturna a contrasto invertito")
        self.btn_night.clicked.connect(self.toggle_night_mode)
        layout.addWidget(self.btn_night)

        layout.addStretch()

        # Tasto Super Strumenti (Apre/Chiude il cassetto laterale)
        self.btn_toggle_tools = QPushButton("⚡ Super Strumenti")
        self.btn_toggle_tools.setObjectName("btnToggleActive")
        self.btn_toggle_tools.setToolTip("Mostra/Nascondi il cassetto degli strumenti avanzati (Ctrl+T)")
        self.btn_toggle_tools.clicked.connect(self.toggle_right_sidebar)
        layout.addWidget(self.btn_toggle_tools)

        parent_layout.addWidget(bar)

    # ------------------------------------------------------------------------
    # 2. PANNELLO SINISTRO (NAVIGATORE: MINIATURE + TOC + INFO)
    # ------------------------------------------------------------------------

    def create_left_sidebar(self) -> QWidget:
        widget = QWidget()
        widget.setObjectName("leftSidebar")
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        header = QLabel("NAVIGATORE LETTORE")
        header.setStyleSheet("font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px;")
        layout.addWidget(header)

        self.left_tabs = QTabWidget()

        # Tab Miniature
        tab_thumbs = QWidget()
        t_layout = QVBoxLayout(tab_thumbs)
        t_layout.setContentsMargins(2, 2, 2, 2)
        self.list_thumbnails = QListWidget()
        self.list_thumbnails.setIconSize(QSize(90, 120))
        self.list_thumbnails.itemClicked.connect(self.on_thumbnail_clicked)
        t_layout.addWidget(self.list_thumbnails)
        self.left_tabs.addTab(tab_thumbs, "🖼️ Miniature")

        # Tab Indice / TOC
        tab_toc = QWidget()
        toc_layout = QVBoxLayout(tab_toc)
        toc_layout.setContentsMargins(2, 2, 2, 2)
        self.tree_toc = QTreeWidget()
        self.tree_toc.setHeaderLabel("Capitoli & Segnalibri")
        self.tree_toc.itemClicked.connect(self.on_toc_item_clicked)
        toc_layout.addWidget(self.tree_toc)
        self.left_tabs.addTab(tab_toc, "📑 Indice")

        # Tab Info Documento
        tab_info = QWidget()
        info_layout = QVBoxLayout(tab_info)
        info_layout.setContentsMargins(4, 4, 4, 4)
        self.txt_doc_info = QTextEdit()
        self.txt_doc_info.setReadOnly(True)
        info_layout.addWidget(self.txt_doc_info)
        self.left_tabs.addTab(tab_info, "ℹ️ Info")

        layout.addWidget(self.left_tabs)
        return widget

    # ------------------------------------------------------------------------
    # 3. PANNELLO DESTRO (CASSETTO SUPER STRUMENTI A SCOMPARSA)
    # ------------------------------------------------------------------------

    def create_right_sidebar(self) -> QWidget:
        widget = QWidget()
        widget.setObjectName("rightSidebar")
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        header_layout = QHBoxLayout()
        header = QLabel("⚡ SUPER STRUMENTI LIBREPDF")
        header.setStyleSheet("font-size: 10px; font-weight: bold; color: #f59e0b; letter-spacing: 1px;")
        header_layout.addWidget(header)

        btn_close_tools = QPushButton("✕")
        btn_close_tools.setFixedSize(22, 22)
        btn_close_tools.setToolTip("Chiudi pannello per lettura a schermo intero")
        btn_close_tools.clicked.connect(self.toggle_right_sidebar)
        header_layout.addWidget(btn_close_tools)
        layout.addLayout(header_layout)

        self.tool_tabs = QTabWidget()

        # TAB 1: ☁️ CLOUD CONVERTER UNIVERSALE (FREECONVERT API)
        self.tab_cloud = self.create_cloud_converter_tab()
        self.tool_tabs.addTab(self.tab_cloud, "☁️ Cloud Conv")

        # TAB 2: ✏️ MODIFICA PDF
        self.tab_edit = self.create_edit_tab()
        self.tool_tabs.addTab(self.tab_edit, "✏️ Modifica")

        # TAB 3: 🔴 FILIGRANA
        self.tab_watermark = self.create_watermark_tab()
        self.tool_tabs.addTab(self.tab_watermark, "🔴 Filigrana")

        # TAB 4: ✂️ DIVIDI & ESTRAI
        self.tab_split = self.create_split_tab()
        self.tool_tabs.addTab(self.tab_split, "✂️ Dividi")

        # TAB 5: 🔗 UNISCI
        self.tab_merge = self.create_merge_tab()
        self.tool_tabs.addTab(self.tab_merge, "🔗 Unisci")

        # TAB 6: 🔍 OCR TESSERACT
        self.tab_ocr = self.create_ocr_tab()
        self.tool_tabs.addTab(self.tab_ocr, "🔍 OCR")

        # TAB 7: 🔄 CONVERTI LOCALE (Word, Excel, Img, Pages)
        self.tab_local_conv = self.create_local_converter_tab()
        self.tool_tabs.addTab(self.tab_local_conv, "🔄 Locale")

        # TAB 8: 🛠️ UTILITÀ (Grayscale, Ripara, Flatten, Numerazione)
        self.tab_util = self.create_utilities_tab()
        self.tool_tabs.addTab(self.tab_util, "🛠️ Utilità")

        layout.addWidget(self.tool_tabs)
        return widget

    # ------------------------------------------------------------------------
    # TAB: ☁️ CLOUD CONVERTER UNIVERSALE (FREECONVERT REST API)
    # ------------------------------------------------------------------------

    def create_cloud_converter_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        desc = QLabel("Converti file Mac (.pages), Word, Excel, HEIC, EPUB in PDF o viceversa tramite cloud server FreeConvert.")
        desc.setWordWrap(True)
        desc.setStyleSheet("color: #94a3b8; font-size: 10px; margin-bottom: 4px;")
        layout.addWidget(desc)

        # API Key Field
        layout.addWidget(QLabel("Chiave API FreeConvert:"))
        key_row = QHBoxLayout()
        self.cloud_api_key_edit = QLineEdit()
        self.cloud_api_key_edit.setEchoMode(QLineEdit.EchoMode.Password)
        self.cloud_api_key_edit.setPlaceholderText("Incolla API Key FreeConvert...")
        key_row.addWidget(self.cloud_api_key_edit)

        btn_save_key = QPushButton("💾 Salva")
        btn_save_key.setToolTip("Memorizza localmente la chiave API in modo sicuro")
        btn_save_key.clicked.connect(self.save_api_key)
        key_row.addWidget(btn_save_key)
        layout.addLayout(key_row)

        # File di Input
        layout.addWidget(QLabel("File sorgente da convertire:"))
        file_row = QHBoxLayout()
        self.cloud_input_path_edit = QLineEdit()
        self.cloud_input_path_edit.setReadOnly(True)
        self.cloud_input_path_edit.setPlaceholderText("Nessun file selezionato (.pages, .docx, ecc.)")
        file_row.addWidget(self.cloud_input_path_edit)

        btn_browse_cloud = QPushButton("Sfoglia...")
        btn_browse_cloud.clicked.connect(self.browse_cloud_input_file)
        file_row.addWidget(btn_browse_cloud)
        layout.addLayout(file_row)

        # Formato di destinazione
        layout.addWidget(QLabel("Formato di Destinazione:"))
        self.cloud_target_combo = QComboBox()
        self.cloud_target_combo.setEditable(True)
        self.cloud_target_combo.addItems(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "txt", "epub"])
        layout.addWidget(self.cloud_target_combo)

        # Barra di avanzamento e stato
        self.cloud_progress = QProgressBar()
        self.cloud_progress.setValue(0)
        layout.addWidget(self.cloud_progress)

        self.cloud_status_lbl = QLabel("Pronto")
        self.cloud_status_lbl.setStyleSheet("color: #94a3b8; font-size: 10px; font-style: italic;")
        layout.addWidget(self.cloud_status_lbl)

        # Pulsante Avvia Conversione Cloud
        self.btn_run_cloud_convert = QPushButton("🚀 Converti con FreeConvert API")
        self.btn_run_cloud_convert.setObjectName("btnPrimary")
        self.btn_run_cloud_convert.clicked.connect(self.start_cloud_conversion)
        layout.addWidget(self.btn_run_cloud_convert)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # TAB: ✏️ MODIFICA PDF
    # ------------------------------------------------------------------------

    def create_edit_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        layout.addWidget(QLabel("Testo da Inserire:"))
        self.edit_text_input = QLineEdit("TESTO INSERITO")
        self.edit_text_input.textChanged.connect(self.on_edit_text_changed)
        layout.addWidget(self.edit_text_input)

        # Colore Sfondo Casella
        layout.addWidget(QLabel("Colore Sfondo Casella:"))
        bg_row = QHBoxLayout()
        self.combo_bg_preset = QComboBox()
        self.combo_bg_preset.addItems(["Bianco (#FFFFFF)", "Giallo Post-it (#FEF08A)", "Azzurro (#BAE6FD)", "Verde (#BBF7D0)", "Arancio (#FED7AA)", "Grigio Chiaro (#E2E8F0)", "Nessuno (Trasparente)"])
        self.combo_bg_preset.currentIndexChanged.connect(self.on_bg_preset_changed)
        bg_row.addWidget(self.combo_bg_preset)

        btn_pick_bg = QPushButton("🎨 Scegli...")
        btn_pick_bg.clicked.connect(self.pick_custom_bg_color)
        bg_row.addWidget(btn_pick_bg)
        layout.addLayout(bg_row)

        # Colore Contorno e Testo
        colors_row = QHBoxLayout()
        btn_pick_border = QPushButton("Bordo 🎨")
        btn_pick_border.clicked.connect(self.pick_border_color)
        colors_row.addWidget(btn_pick_border)

        btn_pick_text_color = QPushButton("Testo 🎨")
        btn_pick_text_color.clicked.connect(self.pick_text_color)
        colors_row.addWidget(btn_pick_text_color)
        layout.addLayout(colors_row)

        # Dimensione Font
        layout.addWidget(QLabel("Dimensione Font:"))
        self.spin_edit_font = QSpinBox()
        self.spin_edit_font.setRange(8, 72)
        self.spin_edit_font.setValue(16)
        self.spin_edit_font.valueChanged.connect(self.on_edit_font_changed)
        layout.addWidget(self.spin_edit_font)

        # Coordinate e dimensioni sincronizzate
        coord_layout = QHBoxLayout()
        self.lbl_coords = QLabel("X: 60 | Y: 80 | L: 220 | A: 45")
        self.lbl_coords.setStyleSheet("color: #94a3b8; font-size: 10px;")
        coord_layout.addWidget(self.lbl_coords)
        layout.addLayout(coord_layout)

        # Inserisci Immagine / Firma
        btn_insert_img = QPushButton("🖼️ Inserisci Immagine / Firma...")
        btn_insert_img.clicked.connect(self.insert_image_signature)
        layout.addWidget(btn_insert_img)

        # Applica e Salva Modifiche
        btn_save_edits = QPushButton("💾 Applica e Salva Modifiche")
        btn_save_edits.setObjectName("btnPrimary")
        btn_save_edits.clicked.connect(self.apply_and_save_edits)
        layout.addWidget(btn_save_edits)

        btn_del_elem = QPushButton("🗑️ Elimina Elemento Selezionato")
        btn_del_elem.setStyleSheet("color: #ef4444;")
        btn_del_elem.clicked.connect(self.on_delete_active_element)
        layout.addWidget(btn_del_elem)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # TAB: 🔴 FILIGRANA
    # ------------------------------------------------------------------------

    def create_watermark_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        layout.addWidget(QLabel("Testo Filigrana:"))
        self.wm_text_edit = QLineEdit("CONFIDENZIALE")
        layout.addWidget(self.wm_text_edit)

        layout.addWidget(QLabel("Inclinazione:"))
        self.wm_angle_combo = QComboBox()
        self.wm_angle_combo.addItems(["45° (Diagonale)", "0° (Orizzontale)", "90° (Verticale)", "-45° (Inversa)"])
        layout.addWidget(self.wm_angle_combo)

        layout.addWidget(QLabel("Dimensione Font:"))
        self.wm_font_spin = QSpinBox()
        self.wm_font_spin.setRange(16, 120)
        self.wm_font_spin.setValue(48)
        layout.addWidget(self.wm_font_spin)

        btn_apply_wm = QPushButton("🚀 Applica Filigrana e Salva")
        btn_apply_wm.setObjectName("btnPrimary")
        btn_apply_wm.clicked.connect(self.apply_watermark)
        layout.addWidget(btn_apply_wm)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # TAB: ✂️ DIVIDI & ESTRAI
    # ------------------------------------------------------------------------

    def create_split_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        layout.addWidget(QLabel("Intervallo di Pagine da Estrarre:"))
        range_box = QHBoxLayout()
        range_box.addWidget(QLabel("Da:"))
        self.sp_split_start = QSpinBox()
        self.sp_split_start.setMinimum(1)
        range_box.addWidget(self.sp_split_start)

        range_box.addWidget(QLabel("A:"))
        self.sp_split_end = QSpinBox()
        self.sp_split_end.setMinimum(1)
        range_box.addWidget(self.sp_split_end)
        layout.addLayout(range_box)

        btn_extract = QPushButton("✂️ Estrai Intervallo in Nuovo PDF")
        btn_extract.clicked.connect(self.apply_extract_range)
        layout.addWidget(btn_extract)

        btn_split_all = QPushButton("📂 Dividi Tutto (1 PDF per ciascuna pagina)")
        btn_split_all.clicked.connect(self.apply_split_all)
        layout.addWidget(btn_split_all)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # TAB: 🔗 UNISCI PDF
    # ------------------------------------------------------------------------

    def create_merge_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        layout.addWidget(QLabel("Documenti PDF da Aggregare:"))
        self.merge_list = QListWidget()
        layout.addWidget(self.merge_list)

        btn_row = QHBoxLayout()
        btn_add = QPushButton("➕ Aggiungi...")
        btn_add.clicked.connect(self.add_merge_file)
        btn_row.addWidget(btn_add)

        btn_clear = QPushButton("🗑️ Svuota")
        btn_clear.clicked.connect(self.merge_list.clear)
        btn_row.addWidget(btn_clear)
        layout.addLayout(btn_row)

        btn_run_merge = QPushButton("🔗 Unisci Tutti i PDF")
        btn_run_merge.setObjectName("btnPrimary")
        btn_run_merge.clicked.connect(self.apply_merge)
        layout.addWidget(btn_run_merge)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # TAB: 🔍 OCR TESSERACT
    # ------------------------------------------------------------------------

    def create_ocr_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        ocr_row = QHBoxLayout()
        ocr_row.addWidget(QLabel("Lingua OCR:"))
        self.ocr_lang_combo = QComboBox()
        self.ocr_lang_combo.addItems(["ita (Italiano)", "eng (Inglese)", "fra (Francese)", "deu (Tedesco)", "spa (Spagnolo)"])
        ocr_row.addWidget(self.ocr_lang_combo)
        layout.addLayout(ocr_row)

        btn_ocr_fast = QPushButton("⚡ Estrai Testo Vettoriale Istantaneo")
        btn_ocr_fast.clicked.connect(self.extract_fast_text)
        layout.addWidget(btn_ocr_fast)

        btn_ocr_page = QPushButton("🔍 Esegui OCR Pagina Corrente")
        btn_ocr_page.setObjectName("btnAccent")
        btn_ocr_page.clicked.connect(self.run_ocr_current_page)
        layout.addWidget(btn_ocr_page)

        btn_ocr_all = QPushButton("🌐 Esegui OCR Intero Documento")
        btn_ocr_all.clicked.connect(self.run_ocr_all_pages)
        layout.addWidget(btn_ocr_all)

        layout.addWidget(QLabel("Testo Riconosciuto:"))
        self.ocr_output_edit = QTextEdit()
        self.ocr_output_edit.setPlaceholderText("Il testo riconosciuto apparirà qui...")
        layout.addWidget(self.ocr_output_edit)

        ocr_actions = QHBoxLayout()
        btn_copy = QPushButton("📋 Copia")
        btn_copy.clicked.connect(self.copy_ocr_text)
        ocr_actions.addWidget(btn_copy)

        btn_save = QPushButton("💾 Salva .TXT")
        btn_save.clicked.connect(self.save_ocr_txt)
        ocr_actions.addWidget(btn_save)
        layout.addLayout(ocr_actions)

        return tab

    # ------------------------------------------------------------------------
    # TAB: 🔄 CONVERTI LOCALE (Word, Excel, Immagini, Pages Nativo)
    # ------------------------------------------------------------------------

    def create_local_converter_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        btn_to_word = QPushButton("📄 Converti PDF in Word (.docx)")
        btn_to_word.clicked.connect(self.convert_to_word)
        layout.addWidget(btn_to_word)

        btn_to_excel = QPushButton("📊 Estrai Tabelle in Excel (.xlsx)")
        btn_to_excel.clicked.connect(self.convert_to_excel)
        layout.addWidget(btn_to_excel)

        layout.addWidget(QLabel("Esporta Pagine come Immagini:"))
        self.img_fmt_combo = QComboBox()
        self.img_fmt_combo.addItems(["PNG (Massima Risoluzione)", "JPG (Compresso)"])
        layout.addWidget(self.img_fmt_combo)

        btn_export_imgs = QPushButton("🖼️ Esporta Tutte le Pagine")
        btn_export_imgs.clicked.connect(self.export_images)
        layout.addWidget(btn_export_imgs)

        btn_pages_native = QPushButton("🍏 Estrai Anteprima Nativa .pages (Mac)")
        btn_pages_native.clicked.connect(self.extract_pages_native)
        layout.addWidget(btn_pages_native)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # TAB: 🛠️ UTILITÀ
    # ------------------------------------------------------------------------

    def create_utilities_tab(self) -> QWidget:
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setSpacing(6)

        btn_grayscale = QPushButton("⚫ Scala di Grigi (csGRAY)")
        btn_grayscale.clicked.connect(self.apply_grayscale)
        layout.addWidget(btn_grayscale)

        btn_repair = QPushButton("🛠️ Ripara PDF & Ricostruisci XRef")
        btn_repair.clicked.connect(self.apply_repair)
        layout.addWidget(btn_repair)

        btn_flatten = QPushButton("🔒 Appiattisci Moduli e Annotazioni")
        btn_flatten.clicked.connect(self.apply_flatten)
        layout.addWidget(btn_flatten)

        btn_page_num = QPushButton("🔢 Aggiungi Numeri di Pagina")
        btn_page_num.clicked.connect(self.apply_page_numbers)
        layout.addWidget(btn_page_num)

        layout.addStretch()
        return tab

    # ------------------------------------------------------------------------
    # LOGICA DI NAVIGAZIONE E GESTIONE DEL DOCUMENTO (READER WORKFLOW)
    # ------------------------------------------------------------------------

    def action_open_pdf(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Apri Documento PDF", "", "File PDF (*.pdf)")
        if not file_path:
            return

        try:
            self.handler.load_document(file_path)
            total = self.handler.get_page_count()
            self.current_page = 0
            self.spin_page.setMaximum(max(1, total))
            self.spin_page.setValue(1)
            self.lbl_page_total.setText(f"/ {total}")
            self.sp_split_start.setMaximum(max(1, total))
            self.sp_split_end.setMaximum(max(1, total))
            self.sp_split_end.setValue(total)

            self.load_thumbnails()
            self.load_toc()
            self.update_doc_info()
            self.render_current_page()

            self.setWindowTitle(f"LibrePDF Studio - {os.path.basename(file_path)}")
            self.statusBar().showMessage(f"Documento caricato: {os.path.basename(file_path)} ({total} pagine)")
        except Exception as e:
            QMessageBox.critical(self, "Errore di Apertura", f"Impossibile aprire il file:\\n{e}")

    def render_current_page(self):
        if not self.handler.doc or self.current_page < 0 or self.current_page >= self.handler.get_page_count():
            self.canvas.set_page_pixmap(None)
            return

        data = self.handler.render_page(self.current_page, zoom=self.current_zoom)
        if not data:
            return

        samples_bytes, width, height, stride = data
        img = QImage(samples_bytes, width, height, stride, QImage.Format.Format_RGB888)
        pix = QPixmap.fromImage(img)
        self.canvas.set_page_pixmap(pix)

    def load_thumbnails(self):
        self.list_thumbnails.clear()
        total = self.handler.get_page_count()
        # Caricamento miniature veloci con zoom 0.25
        for i in range(min(total, 60)):  # Fino a 60 pagine per fluidità immediata
            thumb_data = self.handler.render_page(i, zoom=0.25)
            if thumb_data:
                sb, w, h, st = thumb_data
                img = QImage(sb, w, h, st, QImage.Format.Format_RGB888)
                item = QListWidgetItem(QIcon(QPixmap.fromImage(img)), f"Pagina {i + 1}")
                item.setData(Qt.ItemDataRole.UserRole, i)
                self.list_thumbnails.addItem(item)

    def load_toc(self):
        self.tree_toc.clear()
        toc = self.handler.get_toc()
        if not toc:
            root_item = QTreeWidgetItem(["Nessun indice presente nel PDF"])
            self.tree_toc.addTopLevelItem(root_item)
            return

        for entry in toc:
            # entry: [level, title, page_number]
            lvl, title, pno = entry[0], entry[1], entry[2]
            item = QTreeWidgetItem([f"Pag. {pno} - {title}"])
            item.setData(0, Qt.ItemDataRole.UserRole, max(0, pno - 1))
            self.tree_toc.addTopLevelItem(item)

    def update_doc_info(self):
        info = self.handler.get_document_info()
        txt = (
            f"Nome File: {info.get('filename')}\\n"
            f"Pagine Totali: {info.get('pages')}\\n"
            f"Dimensione Prima Pagina: {info.get('first_page_width')} x {info.get('first_page_height')} pt\\n"
            f"Crittografato: {'Sì' if info.get('is_encrypted') else 'No'}\\n\\n"
            f"Percorso Completo:\\n{info.get('filepath')}"
        )
        self.txt_doc_info.setPlainText(txt)

    def on_thumbnail_clicked(self, item: QListWidgetItem):
        p = item.data(Qt.ItemDataRole.UserRole)
        if p is not None:
            self.go_to_page(p)

    def on_toc_item_clicked(self, item: QTreeWidgetItem):
        p = item.data(0, Qt.ItemDataRole.UserRole)
        if p is not None:
            self.go_to_page(p)

    def go_to_page(self, page_index: int):
        total = self.handler.get_page_count()
        if total > 0 and 0 <= page_index < total:
            self.current_page = page_index
            self.spin_page.blockSignals(True)
            self.spin_page.setValue(page_index + 1)
            self.spin_page.blockSignals(False)
            self.render_current_page()
            self.statusBar().showMessage(f"Pagina {page_index + 1} di {total}")

    def on_page_spin_changed(self, val: int):
        self.go_to_page(val - 1)

    def go_first_page(self):
        self.go_to_page(0)

    def go_prev_page(self):
        self.go_to_page(self.current_page - 1)

    def go_next_page(self):
        self.go_to_page(self.current_page + 1)

    def go_last_page(self):
        self.go_to_page(self.handler.get_page_count() - 1)

    # ------------------------------------------------------------------------
    # CONTROLLI ZOOM & MODALITÀ LETTURA
    # ------------------------------------------------------------------------

    def zoom_in(self):
        self.set_zoom(self.current_zoom * 1.2)

    def zoom_out(self):
        self.set_zoom(self.current_zoom / 1.2)

    def set_zoom(self, zoom: float):
        self.current_zoom = max(0.3, min(4.0, zoom))
        pct_text = f"{int(self.current_zoom * 100)}%"
        self.combo_zoom.blockSignals(True)
        self.combo_zoom.setCurrentText(pct_text)
        self.combo_zoom.blockSignals(False)
        self.render_current_page()

    def on_zoom_combo_changed(self, txt: str):
        val = txt.replace("%", "").strip()
        try:
            self.set_zoom(float(val) / 100.0)
        except Exception:
            pass

    def zoom_fit_width(self):
        if not self.handler.doc or self.current_page >= self.handler.get_page_count():
            return
        p = self.handler.doc[self.current_page]
        vp_width = self.scroll_area.viewport().width() - 60
        if p.rect.width > 0 and vp_width > 100:
            fit_zoom = vp_width / p.rect.width
            self.set_zoom(fit_zoom)

    def zoom_fit_page(self):
        if not self.handler.doc or self.current_page >= self.handler.get_page_count():
            return
        p = self.handler.doc[self.current_page]
        vp_height = self.scroll_area.viewport().height() - 60
        if p.rect.height > 0 and vp_height > 100:
            fit_zoom = vp_height / p.rect.height
            self.set_zoom(fit_zoom)

    def rotate_current_view(self):
        if not self.handler.doc:
            return
        p = self.handler.doc[self.current_page]
        p.set_rotation((p.rotation + 90) % 360)
        self.render_current_page()

    def toggle_night_mode(self):
        self.is_night_mode = not self.is_night_mode
        if self.is_night_mode:
            self.btn_night.setText("☀️ Giorno")
            self.btn_night.setStyleSheet("background-color: #3b82f6; color: white; font-weight: bold;")
        else:
            self.btn_night.setText("🌙 Notte")
            self.btn_night.setStyleSheet("")
        self.canvas.update()

    def toggle_left_sidebar(self):
        cur_sizes = self.main_splitter.sizes()
        if cur_sizes[0] > 10:
            # Chiudi
            self.main_splitter.setSizes([0, cur_sizes[1] + cur_sizes[0], cur_sizes[2]])
            self.btn_toggle_nav.setStyleSheet("")
        else:
            # Apri
            self.main_splitter.setSizes([220, max(200, cur_sizes[1] - 220), cur_sizes[2]])
            self.btn_toggle_nav.setStyleSheet("background-color: #f59e0b; color: #0f172a; font-weight: bold;")

    def toggle_right_sidebar(self):
        cur_sizes = self.main_splitter.sizes()
        if cur_sizes[2] > 10:
            # Chiudi cassetto strumenti (lettura a pieno schermo)
            self.main_splitter.setSizes([cur_sizes[0], cur_sizes[1] + cur_sizes[2], 0])
            self.btn_toggle_tools.setStyleSheet("")
        else:
            # Apri cassetto strumenti
            self.main_splitter.setSizes([cur_sizes[0], max(200, cur_sizes[1] - 360), 360])
            self.btn_toggle_tools.setStyleSheet("background-color: #f59e0b; color: #0f172a; font-weight: bold;")

    def action_save_as(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF con Nome", "documento_salvato.pdf", "File PDF (*.pdf)")
        if save_path:
            try:
                self.handler.save_edited_document(save_path)
                QMessageBox.information(self, "Salvato", f"Documento salvato con successo:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore di Salvataggio", str(e))

    # ------------------------------------------------------------------------
    # CLOUD CONVERTER UNIVERSALE (FREECONVERT API)
    # ------------------------------------------------------------------------

    def browse_cloud_input_file(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Seleziona File da Convertire",
            "",
            "Tutti i File (*.*);;Apple Pages (*.pages);;Documenti Word (*.docx *.doc);;Excel (*.xlsx *.xls);;PowerPoint (*.pptx);;PDF (*.pdf);;Immagini (*.png *.jpg *.jpeg *.heic)"
        )
        if not file_path:
            return

        self.cloud_input_path_edit.setText(file_path)
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")

        # Suggerimento intelligente del formato di destinazione in base all'estensione
        pages_or_docs = ["pages", "docx", "doc", "odt", "rtf", "txt", "xlsx", "pptx", "heic", "epub"]
        if ext in pages_or_docs:
            self.cloud_target_combo.setCurrentText("pdf")
        elif ext == "pdf":
            self.cloud_target_combo.setCurrentText("docx")
        elif ext in ["png", "jpg", "jpeg", "webp"]:
            self.cloud_target_combo.setCurrentText("pdf")

    def save_api_key(self):
        key = self.cloud_api_key_edit.text().strip()
        save_user_config({"freeconvert_api_key": key})
        QMessageBox.information(self, "Configurazione Salvata", "Chiave API FreeConvert memorizzata con successo.")

    def load_settings(self):
        cfg = load_user_config()
        key = cfg.get("freeconvert_api_key", "")
        if key:
            self.cloud_api_key_edit.setText(key)

    def start_cloud_conversion(self):
        api_key = self.cloud_api_key_edit.text().strip()
        input_path = self.cloud_input_path_edit.text().strip()
        target_fmt = self.cloud_target_combo.currentText().strip().lower()

        if not api_key:
            QMessageBox.warning(self, "Chiave Mancante", "Inserisci la tua API Key di FreeConvert.com prima di procedere.")
            return
        if not input_path or not os.path.exists(input_path):
            QMessageBox.warning(self, "File non trovato", "Seleziona un file valido da convertire.")
            return

        out_path, _ = QFileDialog.getSaveFileName(
            self,
            "Salva Risultato Conversione",
            f"convertito.{target_fmt}",
            f"File (*.{target_fmt})"
        )
        if not out_path:
            return

        self.btn_run_cloud_convert.setEnabled(False)
        self.cloud_progress.setValue(5)
        self.cloud_status_lbl.setText("Avvio connessione con server FreeConvert...")

        self.cloud_worker = CloudConvertWorker(input_path, target_fmt, api_key, out_path)
        self.cloud_worker.progress_signal.connect(self.on_cloud_progress)
        self.cloud_worker.finished_signal.connect(self.on_cloud_finished)
        self.cloud_worker.start()

    def on_cloud_progress(self, pct: int, msg: str):
        self.cloud_progress.setValue(pct)
        self.cloud_status_lbl.setText(msg)

    def on_cloud_finished(self, success: bool, result_path_or_err: str, msg: str):
        self.btn_run_cloud_convert.setEnabled(True)
        if success:
            self.cloud_progress.setValue(100)
            self.cloud_status_lbl.setText("Conversione completata!")
            reply = QMessageBox.question(
                self,
                "Conversione Riuscita",
                f"{msg}\\n\\nFile salvato in:\\n{result_path_or_err}\\n\\nVuoi aprirlo subito in LibrePDF?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if reply == QMessageBox.StandardButton.Yes and result_path_or_err.lower().endswith(".pdf"):
                self.handler.load_document(result_path_or_err)
                self.current_page = 0
                self.spin_page.setMaximum(max(1, self.handler.get_page_count()))
                self.spin_page.setValue(1)
                self.lbl_page_total.setText(f"/ {self.handler.get_page_count()}")
                self.load_thumbnails()
                self.render_current_page()
        else:
            self.cloud_progress.setValue(0)
            self.cloud_status_lbl.setText("Errore")
            QMessageBox.critical(self, "Errore Conversione Cloud", f"{msg}:\\n{result_path_or_err}")

    # ------------------------------------------------------------------------
    # MODIFICA PDF: GESTIONE TESTO, COLORI, BORDI ED ELIMINAZIONE ✕
    # ------------------------------------------------------------------------

    def is_edit_mode_active(self) -> bool:
        return self.tool_tabs.currentWidget() == self.tab_edit

    def on_edit_text_changed(self, text: str):
        self.current_elem["text"] = text
        self.canvas.update()

    def on_edit_font_changed(self, size: int):
        self.current_elem["fontsize"] = size
        self.canvas.update()

    def on_bg_preset_changed(self, idx: int):
        colors = [
            QColor("#ffffff"),
            QColor("#fef08a"),  # Post-it
            QColor("#bae6fd"),  # Azzurro
            QColor("#bbf7d0"),  # Verde
            QColor("#fed7aa"),  # Arancio
            QColor("#e2e8f0"),  # Grigio
            None                # Trasparente
        ]
        chosen = colors[idx]
        if chosen is None:
            self.current_elem["has_bg"] = False
        else:
            self.current_elem["has_bg"] = True
            self.current_elem["bg_color"] = chosen
        self.canvas.update()

    def pick_custom_bg_color(self):
        c = QColorDialog.getColor(self.current_elem.get("bg_color", QColor("#ffffff")), self, "Scegli Colore Sfondo")
        if c.isValid():
            self.current_elem["has_bg"] = True
            self.current_elem["bg_color"] = c
            self.canvas.update()

    def pick_border_color(self):
        c = QColorDialog.getColor(self.current_elem.get("border_color", QColor("#f59e0b")), self, "Scegli Colore Contorno")
        if c.isValid():
            self.current_elem["has_border"] = True
            self.current_elem["border_color"] = c
            self.canvas.update()

    def pick_text_color(self):
        c = QColorDialog.getColor(self.current_elem.get("text_color", QColor("#000000")), self, "Scegli Colore Testo")
        if c.isValid():
            self.current_elem["text_color"] = c
            self.canvas.update()

    def on_delete_active_element(self):
        self.current_elem["text"] = ""
        self.edit_text_input.setText("")
        self.canvas.update()
        self.statusBar().showMessage("Casella eliminata. Digita un nuovo testo per crearne un'altra.")

    def sync_coords_to_ui(self, elem: dict):
        x, y = int(elem["x"]), int(elem["y"])
        w, h = int(elem["w"]), int(elem["h"])
        self.lbl_coords.setText(f"X: {x} | Y: {y} | L: {w} | A: {h}")

    def insert_image_signature(self):
        if not self.handler.doc:
            return
        img_path, _ = QFileDialog.getOpenFileName(self, "Seleziona Firma o Immagine", "", "Immagini (*.png *.jpg *.jpeg)")
        if not img_path:
            return

        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF con Firma", "firmato.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.insert_custom_image(
                    self.current_page,
                    img_path,
                    x=100, y=200, width=160, height=70,
                    has_border=False
                )
                self.handler.save_edited_document(save_path)
                QMessageBox.information(self, "Firma Applicata", f"PDF salvato:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore Inserimento Immagine", str(e))

    def apply_and_save_edits(self):
        if not self.handler.doc:
            return

        txt = self.current_elem.get("text", "").strip()
        if not txt:
            QMessageBox.warning(self, "Testo Vuoto", "Inserisci del testo prima di applicare le modifiche.")
            return

        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Modificato", "documento_modificato.pdf", "PDF (*.pdf)")
        if not save_path:
            return

        tc = self.current_elem.get("text_color", QColor("#000000"))
        bc = self.current_elem.get("border_color", QColor("#f59e0b"))
        bg = self.current_elem.get("bg_color", QColor("#ffffff"))

        col_t = (tc.redF(), tc.greenF(), tc.blueF())
        col_b = (bc.redF(), bc.greenF(), bc.blueF())
        col_bg = (bg.redF(), bg.greenF(), bg.blueF())

        try:
            self.handler.insert_custom_text(
                page_num=self.current_page,
                text=txt,
                x=self.current_elem["x"],
                y=self.current_elem["y"],
                width=self.current_elem["w"],
                height=self.current_elem["h"],
                fontsize=self.current_elem["fontsize"],
                color=col_t,
                has_border=self.current_elem.get("has_border", True),
                border_color=col_b,
                border_width=self.current_elem.get("border_width", 2.0),
                has_bg=self.current_elem.get("has_bg", True),
                bg_color=col_bg
            )
            self.handler.save_edited_document(save_path)
            self.render_current_page()
            QMessageBox.information(self, "Modifiche Salvate", f"Documento salvato con successo:\\n{save_path}")
        except Exception as e:
            QMessageBox.critical(self, "Errore Salvataggio", str(e))

    # ------------------------------------------------------------------------
    # ALTRI STRUMENTI STANDARD
    # ------------------------------------------------------------------------

    def apply_watermark(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva con Filigrana", "watermark.pdf", "PDF (*.pdf)")
        if not save_path:
            return
        txt = self.wm_text_edit.text()
        angle_map = {"45° (Diagonale)": 45, "0° (Orizzontale)": 0, "90° (Verticale)": 90, "-45° (Inversa)": -45}
        ang = angle_map.get(self.wm_angle_combo.currentText(), 45)
        try:
            self.handler.add_watermark(txt, save_path, rotate=ang, fontsize=self.wm_font_spin.value())
            QMessageBox.information(self, "Completato", f"Filigrana applicata in:\\n{save_path}")
        except Exception as e:
            QMessageBox.critical(self, "Errore", str(e))

    def apply_extract_range(self):
        if not self.handler.doc:
            return
        start = self.sp_split_start.value() - 1
        end = self.sp_split_end.value() - 1
        if start > end:
            QMessageBox.warning(self, "Attenzione", "La pagina iniziale deve essere minore o uguale a quella finale.")
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva Range Estratto", "estratto.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.extract_pages(start, end, save_path)
                QMessageBox.information(self, "Completato", f"Pagine estratte in:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_split_all(self):
        if not self.handler.doc:
            return
        out_dir = QFileDialog.getExistingDirectory(self, "Seleziona Cartella di Destinazione")
        if out_dir:
            try:
                created = self.handler.split_all_pages(out_dir)
                QMessageBox.information(self, "Completato", f"Create {len(created)} pagine singole in:\\n{out_dir}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def add_merge_file(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Seleziona File PDF da Unire", "", "PDF (*.pdf)")
        for f in files:
            self.merge_list.addItem(f)

    def apply_merge(self):
        if not self.handler.doc:
            QMessageBox.warning(self, "Documento Base Mancante", "Apri prima il PDF di partenza.")
            return
        other_files = [self.merge_list.item(i).text() for i in range(self.merge_list.count())]
        if not other_files:
            QMessageBox.warning(self, "Nessun File", "Aggiungi almeno un file alla lista da unire.")
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Unificato", "unito.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.merge_with(other_files, save_path)
                QMessageBox.information(self, "Completato", f"PDF uniti in:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def extract_fast_text(self):
        if not self.handler.doc:
            return
        txt = self.handler.extract_all_text()
        self.ocr_output_edit.setPlainText(txt)
        self.statusBar().showMessage(f"Estratti {len(txt)} caratteri vettoriali.")

    def run_ocr_current_page(self):
        if not self.handler.doc:
            return
        lang = self.ocr_lang_combo.currentText().split()[0]
        self.statusBar().showMessage("OCR in corso...")
        txt = self.handler.extract_text_ocr(self.current_page, language=lang)
        self.ocr_output_edit.setPlainText(txt)
        self.statusBar().showMessage("OCR pagina completato.")

    def run_ocr_all_pages(self):
        if not self.handler.doc:
            return
        lang = self.ocr_lang_combo.currentText().split()[0]
        self.statusBar().showMessage("OCR intero documento in corso...")
        txt = self.handler.extract_all_text_ocr(language=lang)
        self.ocr_output_edit.setPlainText(txt)
        self.statusBar().showMessage("OCR documento completato.")

    def copy_ocr_text(self):
        QApplication.clipboard().setText(self.ocr_output_edit.toPlainText())
        QMessageBox.information(self, "Appunti", "Testo copiato negli appunti!")

    def save_ocr_txt(self):
        txt = self.ocr_output_edit.toPlainText()
        if not txt:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva Testo", "testo.txt", "File di testo (*.txt)")
        if save_path:
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(txt)
            QMessageBox.information(self, "Salvato", f"File di testo salvato:\\n{save_path}")

    def convert_to_word(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva come Word", "documento.docx", "Word (*.docx)")
        if save_path:
            try:
                self.handler.convert_to_docx(save_path)
                QMessageBox.information(self, "Completato", f"Convertito in Word:\\n{save_path}")
            except Exception as e:
                QMessageBox.warning(self, "Attenzione", str(e))

    def convert_to_excel(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva Tabelle in Excel", "tabelle.xlsx", "Excel (*.xlsx)")
        if save_path:
            try:
                self.handler.extract_tables_to_excel(save_path)
                QMessageBox.information(self, "Completato", f"Tabelle estratte in:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore Excel", str(e))

    def export_images(self):
        if not self.handler.doc:
            return
        out_dir = QFileDialog.getExistingDirectory(self, "Seleziona Cartella di Esportazione")
        if out_dir:
            fmt = "png" if "PNG" in self.img_fmt_combo.currentText() else "jpg"
            saved = self.handler.save_pages_as_images(out_dir, fmt=fmt, zoom=2.0)
            QMessageBox.information(self, "Completato", f"Esportate {len(saved)} immagini in:\\n{out_dir}")

    def extract_pages_native(self):
        pages_file, _ = QFileDialog.getOpenFileName(self, "Seleziona file .pages", "", "Apple Pages (*.pages)")
        if not pages_file:
            return
        out_pdf, _ = QFileDialog.getSaveFileName(self, "Salva PDF Nativo", "anteprima_pages.pdf", "PDF (*.pdf)")
        if out_pdf:
            try:
                PDFHandler.convert_pages_to_pdf(pages_file, out_pdf)
                QMessageBox.information(self, "Completato", f"PDF vettoriale estratto:\\n{out_pdf}")
            except Exception as e:
                QMessageBox.critical(self, "Errore .pages", str(e))

    def apply_grayscale(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva in Scala di Grigi", "documento_bn.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.convert_to_grayscale(save_path)
                QMessageBox.information(self, "Completato", f"PDF in scala di grigi salvato:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_repair(self):
        if not self.handler.filepath:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Riparato", "documento_riparato.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.repair_pdf(save_path)
                QMessageBox.information(self, "Completato", f"XRef ricostruita con successo:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_flatten(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Appiattito", "documento_appiattito.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.flatten_pdf(save_path)
                QMessageBox.information(self, "Completato", f"Campi modulo e annotazioni fissati:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_page_numbers(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva con Numerazione", "documento_numerato.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.add_page_numbers(save_path)
                QMessageBox.information(self, "Completato", f"Numerazione applicata:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))


def main():
    app = QApplication(sys.argv)
    window = LibrePDFApp()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
