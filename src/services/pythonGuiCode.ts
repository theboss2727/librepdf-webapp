/**
 * LibrePDF Desktop Studio - Complete PyQt6 Desktop Application Code
 * Features:
 * 1. Customizable background color for text boxes (presets + QColorDialog palette)
 * 2. Red circular delete icon (✕) directly on the canvas box (matching the web app)
 * 3. Live text preview inside the interactive box
 * 4. Multi-step undo/deletion history via native PyMuPDF byte buffers
 * 5. Drag-to-move and drag-to-resize (↘ handle)
 * 6. Strict 3-step workflow (1: Modifica -> 2: Controlla Anteprima -> 3: Salva se vuoi)
 * 7. Ultra-compact 36px header maximizing document workspace (>80%)
 */

export const PYTHON_PYQT6_GUI = `"""
LibrePDF Desktop Studio - Interfaccia Grafica Completa PyQt6
- Colore Sfondo a scelta: Bianco, Giallo Post-it, Azzurro, Verde, Arancio, Grigio o personalizzato con Tavolozza RGB.
- Icona Cancella (✕) rossa direttamente sulla casella (in alto a destra), identica all'app web.
- Canvas Interattivo: il testo digitato compare IN TEMPO REALE all'interno del riquadro con font e contorno.
- Posizionamento e ridimensionamento tramite comandi mouse (drag-to-move e maniglia ↘).
- Flusso di lavoro rigorosamente separato:
    1) Modifica ed inserimento elementi in memoria (con storico annulla/elimina e reset)
    2) Controllo e verifica dell'anteprima pulita della pagina
    3) Salvataggio finale del nuovo PDF solo se e quando l'utente lo desidera.
- Intestazione ultra-compatta da 36px per dedicare oltre l'80% dello spazio all'area di lavoro.
"""

import sys
import os
import pymupdf
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QMessageBox, QSpinBox,
    QLineEdit, QTabWidget, QTextEdit, QScrollArea, QStatusBar, QFrame,
    QSplitter, QComboBox, QListWidget, QColorDialog, QCheckBox
)
from PyQt6.QtGui import QImage, QPixmap, QFont, QColor, QPainter, QPen, QBrush
from PyQt6.QtCore import Qt, QRectF, QPointF

# Motore logico locale PyMuPDF
from pdf_handler import PDFHandler


STYLESHEET = """
QMainWindow {
    background-color: #0b0f19;
}
/* INTESTAZIONE ULTRA-COMPATTA (36px): Massimo spazio all'area di lavoro */
#topToolbar {
    background-color: #111827;
    border-bottom: 1px solid #1f2937;
    padding: 2px 10px;
    min-height: 34px;
    max-height: 38px;
}
#sidebarFrame {
    background-color: #111827;
    border-right: 1px solid #1f2937;
}
QTabWidget::pane {
    border: 1px solid #1f2937;
    background-color: #0b0f19;
    border-radius: 4px;
    padding: 6px;
}
QTabBar::tab {
    background: #1e293b;
    color: #94a3b8;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 600;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    margin-right: 2px;
}
QTabBar::tab:selected {
    background: #0b0f19;
    color: #f59e0b;
    border-bottom: 2px solid #f59e0b;
}
QLabel {
    color: #e2e8f0;
    font-size: 11px;
}
QLineEdit, QSpinBox, QComboBox, QTextEdit, QListWidget {
    background-color: #0f172a;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 4px;
    padding: 3px 6px;
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
    border-radius: 4px;
    padding: 4px 8px;
    font-weight: 600;
    font-size: 11px;
}
QPushButton:hover {
    background-color: #334155;
}
QPushButton#btnOpen {
    background-color: #f59e0b;
    color: #0f172a;
    border: none;
    font-weight: bold;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
}
QPushButton#btnOpen:hover {
    background-color: #d97706;
}
QStatusBar {
    background-color: #111827;
    color: #94a3b8;
    border-top: 1px solid #1f2937;
    font-size: 10px;
    max-height: 22px;
}
QScrollArea {
    border: none;
    background-color: #050811;
}
"""


class InteractivePdfCanvas(QWidget):
    """
    Canvas PDF Interattivo con:
    - Icona CANCELLA (✕) rossa circolare in alto a destra sulla casella (come nell'app web)
    - Colore di sfondo a scelta renderizzato in tempo reale
    - Rendering immediato del testo digitato dentro la casella
    - Drag-to-move (spostamento con il mouse)
    - Drag-to-resize (maniglia ↘)
    - Sincronizzazione continua con i controlli
    """
    def __init__(self, parent_app):
        super().__init__()
        self.app = parent_app
        self.pixmap = None
        self.box_rect_pt = QRectF(80.0, 120.0, 250.0, 55.0)
        self.scale_factor = 2.0
        self.drag_mode = None  # None, 'move', 'resize_br', 'create'
        self.drag_start_pos = None
        self.orig_box_pt = None
        self.show_guides = True
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

    def set_page_pixmap(self, pixmap, scale_factor):
        self.pixmap = pixmap
        self.scale_factor = max(0.1, scale_factor)
        if pixmap:
            self.setFixedSize(pixmap.size())
        self.update()

    def set_box_geometry(self, x, y, w, h):
        self.box_rect_pt = QRectF(float(x), float(y), float(w), float(h))
        self.update()

    def get_screen_rect(self):
        return QRectF(
            self.box_rect_pt.x() * self.scale_factor,
            self.box_rect_pt.y() * self.scale_factor,
            self.box_rect_pt.width() * self.scale_factor,
            self.box_rect_pt.height() * self.scale_factor
        )

    def get_handle_rect(self):
        s_rect = self.get_screen_rect()
        h_size = 14.0
        return QRectF(s_rect.right() - h_size / 2.0, s_rect.bottom() - h_size / 2.0, h_size, h_size)

    def get_delete_btn_rect(self):
        s_rect = self.get_screen_rect()
        btn_size = 20.0
        # Posizionato esattamente sull'angolo in alto a destra, come nell'app web
        return QRectF(s_rect.right() - btn_size / 2.0, s_rect.top() - btn_size / 2.0, btn_size, btn_size)

    def mousePressEvent(self, event):
        if not self.pixmap or event.button() != Qt.MouseButton.LeftButton:
            return

        self.show_guides = True
        pos = event.position()
        s_rect = self.get_screen_rect()
        h_rect = self.get_handle_rect()
        d_rect = self.get_delete_btn_rect()

        # 1. Clic sul pulsante Cancella (✕)
        if d_rect.contains(pos):
            self.app.delete_active_element()
            return

        # 2. Clic sulla maniglia di ridimensionamento ↘
        if h_rect.contains(pos):
            self.drag_mode = 'resize_br'
            self.drag_start_pos = pos
            self.orig_box_pt = QRectF(self.box_rect_pt)
        # 3. Clic all'interno della casella (spostamento)
        elif s_rect.contains(pos):
            self.drag_mode = 'move'
            self.drag_start_pos = pos
            self.orig_box_pt = QRectF(self.box_rect_pt)
        # 4. Clic e trascina su area vuota (crea nuova casella su misura)
        else:
            self.drag_mode = 'create'
            self.drag_start_pos = pos
            pt_x = max(0.0, pos.x() / self.scale_factor)
            pt_y = max(0.0, pos.y() / self.scale_factor)
            self.orig_box_pt = QRectF(pt_x, pt_y, 10.0, 10.0)
            self.box_rect_pt = QRectF(pt_x, pt_y, 10.0, 10.0)
            self.sync_to_controls()
            self.update()

    def mouseMoveEvent(self, event):
        if not self.pixmap:
            return

        pos = event.position()
        s_rect = self.get_screen_rect()
        h_rect = self.get_handle_rect()
        d_rect = self.get_delete_btn_rect()

        if not self.drag_mode:
            if d_rect.contains(pos):
                self.setCursor(Qt.CursorShape.PointingHandCursor)
            elif h_rect.contains(pos):
                self.setCursor(Qt.CursorShape.SizeFDiagCursor)
            elif s_rect.contains(pos):
                self.setCursor(Qt.CursorShape.SizeAllCursor)
            else:
                self.setCursor(Qt.CursorShape.CrossCursor)
            return

        dx_pt = (pos.x() - self.drag_start_pos.x()) / self.scale_factor
        dy_pt = (pos.y() - self.drag_start_pos.y()) / self.scale_factor

        if self.drag_mode == 'move':
            new_x = max(0.0, self.orig_box_pt.x() + dx_pt)
            new_y = max(0.0, self.orig_box_pt.y() + dy_pt)
            self.box_rect_pt.moveTo(new_x, new_y)
            self.sync_to_controls()
            self.update()

        elif self.drag_mode == 'resize_br':
            new_w = max(20.0, self.orig_box_pt.width() + dx_pt)
            new_h = max(15.0, self.orig_box_pt.height() + dy_pt)
            self.box_rect_pt.setWidth(new_w)
            self.box_rect_pt.setHeight(new_h)
            self.sync_to_controls()
            self.update()

        elif self.drag_mode == 'create':
            start_x = self.orig_box_pt.x()
            start_y = self.orig_box_pt.y()
            curr_x = max(0.0, pos.x() / self.scale_factor)
            curr_y = max(0.0, pos.y() / self.scale_factor)

            x = min(start_x, curr_x)
            y = min(start_y, curr_y)
            w = max(20.0, abs(curr_x - start_x))
            h = max(15.0, abs(curr_y - start_y))
            self.box_rect_pt = QRectF(x, y, w, h)
            self.sync_to_controls()
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton and self.drag_mode:
            self.drag_mode = None
            self.sync_to_controls()
            self.update()

    def sync_to_controls(self):
        if hasattr(self.app, 'update_spinboxes_from_canvas'):
            self.app.update_spinboxes_from_canvas(
                int(round(self.box_rect_pt.x())),
                int(round(self.box_rect_pt.y())),
                int(round(self.box_rect_pt.width())),
                int(round(self.box_rect_pt.height()))
            )

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # 1. Disegna pagina PDF renderizzata
        if self.pixmap:
            painter.drawPixmap(0, 0, self.pixmap)
        else:
            painter.fillRect(self.rect(), QColor("#050811"))
            painter.setPen(QColor("#64748b"))
            painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, "Nessun documento caricato.\\nApri un PDF per iniziare.")
            return

        if not self.show_guides:
            return

        # Riquadro interattivo su schermo
        s_rect = self.get_screen_rect()
        s_rect_i = s_rect.toRect()

        # Modalità attiva (0: Testo, 1: Immagine, 2: Firma)
        mode = self.app.edit_mode_combo.currentIndex() if hasattr(self.app, 'edit_mode_combo') else 0

        # Disegna Sfondo della casella (colore personalizzato a scelta)
        has_bg = self.app.chk_text_bg.isChecked() if hasattr(self.app, 'chk_text_bg') else True
        if has_bg:
            bg_qcol = self.app.get_current_bg_qcolor()
            painter.fillRect(s_rect_i, bg_qcol)
        else:
            painter.fillRect(s_rect_i, QColor(245, 158, 11, 35))

        # Disegna Contorno/Bordo scelto dall'utente
        has_border = True
        border_col = QColor(220, 38, 38)
        border_w = 2

        if mode == 0 or mode == 2:
            has_border = self.app.chk_text_border.isChecked() if hasattr(self.app, 'chk_text_border') else True
            border_w = self.app.spin_border_w.value() if hasattr(self.app, 'spin_border_w') else 2
            col_name = self.app.combo_border_col.currentText() if hasattr(self.app, 'combo_border_col') else "Rosso"
            border_col = self.app.get_qcolor_from_name(col_name)
        else:
            has_border = self.app.chk_img_border.isChecked() if hasattr(self.app, 'chk_img_border') else True
            border_col = QColor(15, 23, 42)

        if has_border:
            b_pen = QPen(border_col, max(1.0, float(border_w) * (self.scale_factor / 2.0)))
            painter.setPen(b_pen)
            painter.drawRect(s_rect_i)

        # Rendering del testo dentro la casella
        if mode == 0 or mode == 2:
            raw_text = self.app.edit_text_input.text() if hasattr(self.app, 'edit_text_input') else "DOCUMENTO APPROVATO"
            if not raw_text.strip():
                raw_text = "(Scrivi il testo nella barra laterale)"

            font_size_pt = self.app.edit_font_spin.value() if hasattr(self.app, 'edit_font_spin') else 18
            scaled_font_size = max(8, int(round(font_size_pt * (self.scale_factor / 2.0))))
            t_col_name = self.app.edit_text_color.currentText() if hasattr(self.app, 'edit_text_color') else "Nero"
            text_qcol = self.app.get_qcolor_from_name(t_col_name)

            font = QFont("Segoe UI", scaled_font_size)
            if mode == 2:
                font.setItalic(True)
                font.setFamily("Georgia")
            else:
                font.setBold(True)

            painter.setFont(font)
            painter.setPen(text_qcol)
            painter.drawText(
                s_rect_i,
                Qt.AlignmentFlag.AlignCenter | Qt.TextFlag.TextWordWrap,
                raw_text
            )
        else:
            painter.setPen(QColor(15, 23, 42))
            font = QFont("Segoe UI", 10, QFont.Weight.Bold)
            painter.setFont(font)
            img_name = os.path.basename(self.app.staged_image_path) if getattr(self.app, 'staged_image_path', '') else "Nessuna immagine"
            painter.drawText(s_rect_i, Qt.AlignmentFlag.AlignCenter, f"🖼️ {img_name}")

        # Tratteggio di selezione ambrato per guidare la casella attiva
        dash_pen = QPen(QColor(245, 158, 11), 1.5, Qt.PenStyle.DashLine)
        painter.setPen(dash_pen)
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(s_rect_i)

        # Maniglia di ridimensionamento ↘
        h_rect = self.get_handle_rect()
        painter.setPen(QPen(QColor(255, 255, 255), 1.5))
        painter.setBrush(QBrush(QColor(245, 158, 11)))
        painter.drawRect(h_rect.toRect())

        # -------------------------------------------------------------
        # ICONA CANCELLA (✕) ROSSA IN ALTO A DESTRA (COME NELL'APP WEB)
        # -------------------------------------------------------------
        d_rect = self.get_delete_btn_rect()
        painter.setPen(QPen(QColor(255, 255, 255), 1.5))
        painter.setBrush(QBrush(QColor(220, 38, 38)))
        painter.drawEllipse(d_rect)

        # Testo ✕ bianco al centro del pulsante
        painter.setPen(QColor(255, 255, 255))
        f_del = QFont("Segoe UI", 8, QFont.Weight.Bold)
        painter.setFont(f_del)
        painter.drawText(d_rect, Qt.AlignmentFlag.AlignCenter, "✕")

        # Badge superiore con coordinate
        x_pt = int(self.box_rect_pt.x())
        y_pt = int(self.box_rect_pt.y())
        w_pt = int(self.box_rect_pt.width())
        h_pt = int(self.box_rect_pt.height())
        badge_text = f"X:{x_pt} Y:{y_pt} | {w_pt}x{h_pt} pt  [Trascina mouse / ↘ Ridimensiona / ✕ Cancella]"

        painter.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        badge_y = s_rect.top() - 20
        if badge_y < 5:
            badge_y = s_rect.bottom() + 4
        badge_rect = QRectF(s_rect.left(), badge_y, min(380, max(280, s_rect.width())), 18)

        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(15, 23, 42, 235)))
        painter.drawRoundedRect(badge_rect.toRect(), 3, 3)

        painter.setPen(QColor(245, 158, 11))
        painter.drawText(badge_rect.toRect(), Qt.AlignmentFlag.AlignCenter, badge_text)


class LibrePDFApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.handler = PDFHandler()
        self.original_filepath = ""
        self.current_page = 0
        self.zoom_level = 1.0  # 1.0 = 100%
        self.rotation_offset = 0
        self.wm_color = (1.0, 0.0, 0.0)
        self.custom_bg_qcolor = QColor(255, 255, 255)  # Bianco di default
        self.staged_image_path = ""
        self.staged_edits_count = 0
        self.history = []  # Stack per ripristinare/cancellare elementi
        self._syncing_from_canvas = False

        self.init_ui()

    def get_qcolor_from_name(self, name: str) -> QColor:
        color_map = {
            "Rosso": QColor(220, 38, 38),
            "Nero": QColor(15, 23, 42),
            "Blu": QColor(29, 78, 216),
            "Verde": QColor(22, 163, 74),
            "Oro": QColor(217, 119, 6),
            "Grigio": QColor(100, 116, 139)
        }
        return color_map.get(name, QColor(220, 38, 38))

    def get_current_bg_qcolor(self) -> QColor:
        txt = self.combo_bg_col.currentText()
        if "Bianco" in txt:
            return QColor(255, 255, 255)
        elif "Giallo" in txt:
            return QColor(254, 240, 138)
        elif "Azzurro" in txt:
            return QColor(186, 230, 253)
        elif "Verde" in txt:
            return QColor(187, 247, 208)
        elif "Arancio" in txt:
            return QColor(254, 215, 170)
        elif "Grigio" in txt:
            return QColor(241, 245, 249)
        elif "Personalizzato" in txt:
            return self.custom_bg_qcolor
        return QColor(255, 255, 255)

    def get_current_bg_float_tuple(self):
        qc = self.get_current_bg_qcolor()
        return (qc.redF(), qc.greenF(), qc.blueF())

    def pick_custom_bg_color(self):
        col = QColorDialog.getColor(self.custom_bg_qcolor, self, "Seleziona Colore Sfondo Casella")
        if col.isValid():
            self.custom_bg_qcolor = col
            self.combo_bg_col.setCurrentText("Personalizzato...")
            self.canvas_widget.update()

    def init_ui(self):
        self.setWindowTitle("LibrePDF Desktop Studio (PyMuPDF Local Engine)")
        self.resize(1360, 880)
        self.setStyleSheet(STYLESHEET)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        root_layout = QVBoxLayout(central_widget)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # ----------------- 1. BARRA STRUMENTI SUPERIORE ULTRA-COMPATTA (36px) -----------------
        top_bar = QFrame()
        top_bar.setObjectName("topToolbar")
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(8, 2, 8, 2)
        top_layout.setSpacing(6)

        logo_lbl = QLabel("LibrePDF Studio")
        logo_lbl.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        logo_lbl.setStyleSheet("color: #f59e0b; margin-right: 6px;")
        top_layout.addWidget(logo_lbl)

        btn_open = QPushButton("📂 Apri PDF...")
        btn_open.setObjectName("btnOpen")
        btn_open.clicked.connect(self.open_pdf)
        top_layout.addWidget(btn_open)

        self.file_name_lbl = QLabel("Nessun documento caricato")
        self.file_name_lbl.setStyleSheet("color: #94a3b8; font-size: 11px; margin-left: 4px;")
        top_layout.addWidget(self.file_name_lbl)

        top_layout.addStretch()

        top_layout.addWidget(QLabel("Pagina:"))
        self.btn_prev = QPushButton("◀")
        self.btn_prev.setFixedWidth(28)
        self.btn_prev.clicked.connect(self.prev_page)
        top_layout.addWidget(self.btn_prev)

        self.page_spin = QSpinBox()
        self.page_spin.setMinimum(1)
        self.page_spin.setMaximum(1)
        self.page_spin.setFixedWidth(50)
        self.page_spin.valueChanged.connect(self.on_page_spin_changed)
        top_layout.addWidget(self.page_spin)

        self.total_pages_lbl = QLabel("/ 0")
        self.total_pages_lbl.setStyleSheet("color: #94a3b8; margin-right: 8px;")
        top_layout.addWidget(self.total_pages_lbl)

        self.btn_next = QPushButton("▶")
        self.btn_next.setFixedWidth(28)
        self.btn_next.clicked.connect(self.next_page)
        top_layout.addWidget(self.btn_next)

        top_layout.addWidget(QLabel("Zoom:"))
        btn_zoom_out = QPushButton("−")
        btn_zoom_out.setFixedWidth(26)
        btn_zoom_out.clicked.connect(self.zoom_out)
        top_layout.addWidget(btn_zoom_out)

        self.zoom_lbl = QLabel("100%")
        self.zoom_lbl.setStyleSheet("color: #38bdf8; font-weight: bold; min-width: 36px; text-align: center;")
        top_layout.addWidget(self.zoom_lbl)

        btn_zoom_in = QPushButton("+")
        btn_zoom_in.setFixedWidth(26)
        btn_zoom_in.clicked.connect(self.zoom_in)
        top_layout.addWidget(btn_zoom_in)

        btn_rotate_view = QPushButton("🔄 Ruota")
        btn_rotate_view.clicked.connect(self.rotate_view)
        top_layout.addWidget(btn_rotate_view)

        root_layout.addWidget(top_bar)

        # ----------------- 2. CORPO PRINCIPALE CON SPLITTER -----------------
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(4)

        sidebar_frame = QFrame()
        sidebar_frame.setObjectName("sidebarFrame")
        sidebar_frame.setMinimumWidth(310)
        sidebar_layout = QVBoxLayout(sidebar_frame)
        sidebar_layout.setContentsMargins(8, 8, 8, 8)
        sidebar_layout.setSpacing(6)

        sidebar_title = QLabel("🛠️ STRUMENTI PDF")
        sidebar_title.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        sidebar_title.setStyleSheet("color: #f1f5f9; margin-bottom: 2px;")
        sidebar_layout.addWidget(sidebar_title)

        self.tool_tabs = QTabWidget()

        # =========================================================================
        # TAB 1: ✏️ MODIFICA PDF (COLORE SFONDO A SCELTA & ICONA CANCELLA ✕)
        # =========================================================================
        tab_edit = QWidget()
        edit_layout = QVBoxLayout(tab_edit)
        edit_layout.setContentsMargins(6, 6, 6, 6)
        edit_layout.setSpacing(5)

        # FASE 1: MODIFICA & POSIZIONAMENTO
        box_fase1 = QFrame()
        box_fase1.setStyleSheet("background-color: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 4px;")
        fase1_layout = QVBoxLayout(box_fase1)
        fase1_layout.setSpacing(4)
        fase1_layout.setContentsMargins(4, 4, 4, 4)

        lbl_fase1 = QLabel("<b>FASE 1: Modifica & Posiziona col Mouse</b>")
        lbl_fase1.setStyleSheet("color: #f59e0b; font-size: 11px;")
        fase1_layout.addWidget(lbl_fase1)

        hint_lbl = QLabel("💡 <i>Testo dal vivo nel riquadro. Trascinalo, ridimensionalo ↘️ o premi ✕ per cancellarlo.</i>")
        hint_lbl.setStyleSheet("color: #94a3b8; font-size: 10px;")
        hint_lbl.setWordWrap(True)
        fase1_layout.addWidget(hint_lbl)

        self.edit_mode_combo = QComboBox()
        self.edit_mode_combo.addItems(["Testo con Contorno", "Immagine / Logo con Bordo", "Firma Digitale / Timbro"])
        self.edit_mode_combo.currentIndexChanged.connect(self.on_edit_mode_changed)
        fase1_layout.addWidget(self.edit_mode_combo)

        # Sezione Testo
        self.box_text = QFrame()
        box_text_layout = QVBoxLayout(self.box_text)
        box_text_layout.setContentsMargins(0, 2, 0, 2)
        box_text_layout.setSpacing(4)

        box_text_layout.addWidget(QLabel("Testo da scrivere:"))
        self.edit_text_input = QLineEdit("DOCUMENTO APPROVATO")
        self.edit_text_input.textChanged.connect(self.on_live_text_changed)
        box_text_layout.addWidget(self.edit_text_input)

        row_font = QHBoxLayout()
        row_font.addWidget(QLabel("Font:"))
        self.edit_font_spin = QSpinBox()
        self.edit_font_spin.setRange(8, 72)
        self.edit_font_spin.setValue(18)
        self.edit_font_spin.valueChanged.connect(self.on_live_text_changed)
        row_font.addWidget(self.edit_font_spin)

        row_font.addWidget(QLabel("Colore:"))
        self.edit_text_color = QComboBox()
        self.edit_text_color.addItems(["Nero", "Rosso", "Blu", "Verde", "Grigio"])
        self.edit_text_color.currentIndexChanged.connect(self.on_live_text_changed)
        row_font.addWidget(self.edit_text_color)
        box_text_layout.addLayout(row_font)

        # ---------------- COLORE SFONDO A SCELTA ----------------
        self.chk_text_bg = QCheckBox("☑️ Sfondo Rettangolare Colorato")
        self.chk_text_bg.setChecked(True)
        self.chk_text_bg.toggled.connect(self.on_live_text_changed)
        box_text_layout.addWidget(self.chk_text_bg)

        row_bg_color = QHBoxLayout()
        row_bg_color.addWidget(QLabel("Colore Sfondo:"))
        self.combo_bg_col = QComboBox()
        self.combo_bg_col.addItems([
            "Bianco (#FFFFFF)",
            "Giallo Post-it (#FEF08A)",
            "Azzurro Chiaro (#BAE6FD)",
            "Verde Chiaro (#BBF7D0)",
            "Arancio Chiaro (#FED7AA)",
            "Grigio Perla (#F1F5F9)",
            "Personalizzato..."
        ])
        self.combo_bg_col.currentIndexChanged.connect(self.on_live_text_changed)
        row_bg_color.addWidget(self.combo_bg_col)

        btn_custom_bg = QPushButton("🎨 Tavolozza...")
        btn_custom_bg.clicked.connect(self.pick_custom_bg_color)
        row_bg_color.addWidget(btn_custom_bg)
        box_text_layout.addLayout(row_bg_color)

        # Contorno / Bordo
        self.chk_text_border = QCheckBox("☑️ Disegna Contorno / Bordo")
        self.chk_text_border.setChecked(True)
        self.chk_text_border.toggled.connect(self.on_live_text_changed)
        box_text_layout.addWidget(self.chk_text_border)

        row_border = QHBoxLayout()
        row_border.addWidget(QLabel("Spessore:"))
        self.spin_border_w = QSpinBox()
        self.spin_border_w.setRange(1, 8)
        self.spin_border_w.setValue(2)
        self.spin_border_w.valueChanged.connect(self.on_live_text_changed)
        row_border.addWidget(self.spin_border_w)

        row_border.addWidget(QLabel("Colore:"))
        self.combo_border_col = QComboBox()
        self.combo_border_col.addItems(["Rosso", "Nero", "Blu", "Oro", "Grigio"])
        self.combo_border_col.currentIndexChanged.connect(self.on_live_text_changed)
        row_border.addWidget(self.combo_border_col)
        box_text_layout.addLayout(row_border)

        fase1_layout.addWidget(self.box_text)

        # Sezione Immagine
        self.box_img = QFrame()
        self.box_img.setVisible(False)
        box_img_layout = QVBoxLayout(self.box_img)
        box_img_layout.setContentsMargins(0, 2, 0, 2)
        box_img_layout.setSpacing(4)
        btn_choose_img = QPushButton("📁 Scegli File Immagine (PNG/JPG)...")
        btn_choose_img.clicked.connect(self.choose_edit_image)
        box_img_layout.addWidget(btn_choose_img)
        self.lbl_chosen_img = QLabel("Nessun file immagine caricato")
        self.lbl_chosen_img.setStyleSheet("color: #94a3b8; font-size: 10px;")
        box_img_layout.addWidget(self.lbl_chosen_img)

        self.chk_img_border = QCheckBox("☑️ Aggiungi Cornice / Bordo")
        self.chk_img_border.setChecked(True)
        self.chk_img_border.toggled.connect(self.on_live_text_changed)
        box_img_layout.addWidget(self.chk_img_border)
        fase1_layout.addWidget(self.box_img)

        # Coordinate sincronizzate
        row_coords = QHBoxLayout()
        row_coords.addWidget(QLabel("X:"))
        self.spin_x = QSpinBox()
        self.spin_x.setRange(0, 3000)
        self.spin_x.setValue(80)
        self.spin_x.valueChanged.connect(self.on_spinbox_changed)
        row_coords.addWidget(self.spin_x)

        row_coords.addWidget(QLabel("Y:"))
        self.spin_y = QSpinBox()
        self.spin_y.setRange(0, 3000)
        self.spin_y.setValue(120)
        self.spin_y.valueChanged.connect(self.on_spinbox_changed)
        row_coords.addWidget(self.spin_y)
        fase1_layout.addLayout(row_coords)

        row_dims = QHBoxLayout()
        row_dims.addWidget(QLabel("W:"))
        self.spin_w = QSpinBox()
        self.spin_w.setRange(20, 2000)
        self.spin_w.setValue(250)
        self.spin_w.valueChanged.connect(self.on_spinbox_changed)
        row_dims.addWidget(self.spin_w)

        row_dims.addWidget(QLabel("H:"))
        self.spin_h = QSpinBox()
        self.spin_h.setRange(15, 2000)
        self.spin_h.setValue(55)
        self.spin_h.valueChanged.connect(self.on_spinbox_changed)
        row_dims.addWidget(self.spin_h)
        fase1_layout.addLayout(row_dims)

        # Pulsanti inserimento & eliminazione
        btn_insert = QPushButton("➕ Inserisci Elemento sulla Pagina")
        btn_insert.setStyleSheet("background-color: #f59e0b; color: #0f172a; font-weight: bold; padding: 7px; border-radius: 4px;")
        btn_insert.clicked.connect(self.apply_insert_element)
        fase1_layout.addWidget(btn_insert)

        row_del_actions = QHBoxLayout()
        btn_del_last = QPushButton("✕ Cancella Ultimo Inserito")
        btn_del_last.setStyleSheet("background-color: #7f1d1d; color: #fecaca; font-size: 10px; font-weight: bold; padding: 4px;")
        btn_del_last.clicked.connect(self.delete_active_element)
        row_del_actions.addWidget(btn_del_last)

        btn_reset_doc = QPushButton("↩️ Ricarica Originale")
        btn_reset_doc.setStyleSheet("background-color: #1e293b; color: #94a3b8; font-size: 10px; padding: 4px;")
        btn_reset_doc.clicked.connect(self.reload_original_document)
        row_del_actions.addWidget(btn_reset_doc)
        fase1_layout.addLayout(row_del_actions)

        self.lbl_staged_status = QLabel("Nessuna modifica ancora inserita")
        self.lbl_staged_status.setStyleSheet("color: #64748b; font-size: 10px; font-style: italic;")
        fase1_layout.addWidget(self.lbl_staged_status)

        edit_layout.addWidget(box_fase1)

        # FASE 2: CONTROLLA ANTEPRIMA
        box_fase2 = QFrame()
        box_fase2.setStyleSheet("background-color: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 4px;")
        fase2_layout = QVBoxLayout(box_fase2)
        fase2_layout.setSpacing(4)
        fase2_layout.setContentsMargins(4, 4, 4, 4)

        lbl_fase2 = QLabel("<b>FASE 2: Controlla Anteprima</b>")
        lbl_fase2.setStyleSheet("color: #38bdf8; font-size: 11px;")
        fase2_layout.addWidget(lbl_fase2)

        btn_toggle_preview = QPushButton("👁️ Controlla Anteprima Pulita (Nascondi Guide)")
        btn_toggle_preview.setStyleSheet("background-color: #334155; color: #f8fafc; font-weight: bold; padding: 6px; border-radius: 4px;")
        btn_toggle_preview.clicked.connect(self.toggle_clean_preview)
        fase2_layout.addWidget(btn_toggle_preview)

        edit_layout.addWidget(box_fase2)

        # FASE 3: SALVATAGGIO DEFINITIVO
        box_fase3 = QFrame()
        box_fase3.setStyleSheet("background-color: #064e3b; border: 1px solid #059669; border-radius: 6px; padding: 4px;")
        fase3_layout = QVBoxLayout(box_fase3)
        fase3_layout.setSpacing(4)
        fase3_layout.setContentsMargins(4, 4, 4, 4)

        lbl_fase3 = QLabel("<b>FASE 3: Salva PDF (Solo se sei soddisfatto)</b>")
        lbl_fase3.setStyleSheet("color: #34d399; font-size: 11px;")
        fase3_layout.addWidget(lbl_fase3)

        btn_save_edits = QPushButton("💾 Salva PDF con le Modifiche...")
        btn_save_edits.setStyleSheet("background-color: #10b981; color: #ffffff; font-weight: bold; padding: 8px; border-radius: 4px;")
        btn_save_edits.clicked.connect(self.save_edited_pdf)
        fase3_layout.addWidget(btn_save_edits)

        edit_layout.addWidget(box_fase3)
        edit_layout.addStretch()

        self.tool_tabs.addTab(tab_edit, "✏️ Modifica PDF")

        # TAB 2: FILIGRANA
        tab_wm = QWidget()
        wm_layout = QVBoxLayout(tab_wm)
        wm_layout.setSpacing(6)
        wm_layout.addWidget(QLabel("Testo della Filigrana:"))
        self.wm_text_edit = QLineEdit("CONFIDENZIALE")
        wm_layout.addWidget(self.wm_text_edit)

        wm_layout.addWidget(QLabel("Colore:"))
        wm_color_row = QHBoxLayout()
        self.wm_color_combo = QComboBox()
        self.wm_color_combo.addItems(["Rosso Brillante", "Blu Aziendale", "Grigio Neutro", "Nero"])
        wm_color_row.addWidget(self.wm_color_combo)
        btn_custom_color = QPushButton("Scegli...")
        btn_custom_color.clicked.connect(self.pick_custom_color)
        wm_color_row.addWidget(btn_custom_color)
        wm_layout.addLayout(wm_color_row)

        wm_layout.addWidget(QLabel("Dimensione Font:"))
        self.wm_font_spin = QSpinBox()
        self.wm_font_spin.setRange(12, 120)
        self.wm_font_spin.setValue(48)
        wm_layout.addWidget(self.wm_font_spin)

        wm_layout.addWidget(QLabel("Inclinazione:"))
        self.wm_angle_combo = QComboBox()
        self.wm_angle_combo.addItems(["45° (Diagonale)", "0° (Orizzontale)", "90° (Verticale)", "-45° (Inversa)"])
        wm_layout.addWidget(self.wm_angle_combo)

        btn_apply_wm = QPushButton("🚀 Applica e Salva PDF")
        btn_apply_wm.setStyleSheet("background-color: #f59e0b; color: #0f172a; font-weight: bold; padding: 7px; border-radius: 4px;")
        btn_apply_wm.clicked.connect(self.apply_watermark)
        wm_layout.addWidget(btn_apply_wm)
        wm_layout.addStretch()
        self.tool_tabs.addTab(tab_wm, "🔴 Filigrana")

        # TAB 3: DIVIDI & ESTRAI
        tab_split = QWidget()
        split_layout = QVBoxLayout(tab_split)
        split_layout.setSpacing(6)
        split_layout.addWidget(QLabel("Range di Pagine:"))
        range_box = QHBoxLayout()
        range_box.addWidget(QLabel("Da:"))
        self.sp_start = QSpinBox()
        self.sp_start.setMinimum(1)
        range_box.addWidget(self.sp_start)
        range_box.addWidget(QLabel("A:"))
        self.sp_end = QSpinBox()
        self.sp_end.setMinimum(1)
        range_box.addWidget(self.sp_end)
        split_layout.addLayout(range_box)

        btn_extract_range = QPushButton("✂️ Estrai Range in Nuovo PDF")
        btn_extract_range.clicked.connect(self.apply_extract_range)
        split_layout.addWidget(btn_extract_range)

        btn_split_all = QPushButton("📂 Dividi in File Singoli (1 per pagina)")
        btn_split_all.clicked.connect(self.apply_split_all)
        split_layout.addWidget(btn_split_all)
        split_layout.addStretch()
        self.tool_tabs.addTab(tab_split, "✂️ Dividi")

        # TAB 4: UNISCI (MERGE)
        tab_merge = QWidget()
        merge_layout = QVBoxLayout(tab_merge)
        merge_layout.setSpacing(6)
        merge_layout.addWidget(QLabel("File PDF da unire:"))
        self.merge_list = QListWidget()
        merge_layout.addWidget(self.merge_list)

        btn_add_merge = QPushButton("➕ Aggiungi File PDF...")
        btn_add_merge.clicked.connect(self.add_merge_file)
        merge_layout.addWidget(btn_add_merge)

        btn_run_merge = QPushButton("🔗 Unisci Tutti i PDF")
        btn_run_merge.setStyleSheet("background-color: #f59e0b; color: #0f172a; font-weight: bold; padding: 7px; border-radius: 4px;")
        btn_run_merge.clicked.connect(self.apply_merge)
        merge_layout.addWidget(btn_run_merge)
        merge_layout.addStretch()
        self.tool_tabs.addTab(tab_merge, "🔗 Unisci")

        # TAB 5: OCR
        tab_ocr = QWidget()
        ocr_layout = QVBoxLayout(tab_ocr)
        ocr_layout.setSpacing(5)

        ocr_row = QHBoxLayout()
        ocr_row.addWidget(QLabel("Lingua OCR:"))
        self.ocr_lang_combo = QComboBox()
        self.ocr_lang_combo.addItems(["ita (Italiano)", "eng (Inglese)", "fra (Francese)", "deu (Tedesco)", "spa (Spagnolo)"])
        ocr_row.addWidget(self.ocr_lang_combo)
        ocr_layout.addLayout(ocr_row)

        btn_ocr_fast = QPushButton("⚡ Estrai Testo Vettoriale Istantaneo")
        btn_ocr_fast.clicked.connect(self.extract_fast_text)
        ocr_layout.addWidget(btn_ocr_fast)

        btn_ocr_page = QPushButton("🔍 Esegui OCR Pagina Corrente")
        btn_ocr_page.setStyleSheet("background-color: #3b82f6; color: white; font-weight: bold;")
        btn_ocr_page.clicked.connect(self.run_ocr_current_page)
        ocr_layout.addWidget(btn_ocr_page)

        btn_ocr_all = QPushButton("🌐 Esegui OCR Tutte le Pagine")
        btn_ocr_all.clicked.connect(self.run_ocr_all_pages)
        ocr_layout.addWidget(btn_ocr_all)

        ocr_layout.addWidget(QLabel("Testo Riconosciuto:"))
        self.ocr_output_edit = QTextEdit()
        self.ocr_output_edit.setPlaceholderText("Il testo riconosciuto apparirà qui...")
        ocr_layout.addWidget(self.ocr_output_edit)

        ocr_actions = QHBoxLayout()
        btn_copy_ocr = QPushButton("📋 Copia")
        btn_copy_ocr.clicked.connect(self.copy_ocr_text)
        ocr_actions.addWidget(btn_copy_ocr)

        btn_save_ocr = QPushButton("💾 Salva .TXT")
        btn_save_ocr.clicked.connect(self.save_ocr_txt)
        ocr_actions.addWidget(btn_save_ocr)
        ocr_layout.addLayout(ocr_actions)

        self.tool_tabs.addTab(tab_ocr, "🔍 OCR")

        # TAB 6: CONVERTI
        tab_conv = QWidget()
        conv_layout = QVBoxLayout(tab_conv)
        conv_layout.setSpacing(6)

        btn_to_word = QPushButton("📄 Converti in Word (.docx)")
        btn_to_word.clicked.connect(self.convert_to_word)
        conv_layout.addWidget(btn_to_word)

        btn_to_excel = QPushButton("📊 Estrai Tabelle in Excel (.xlsx)")
        btn_to_excel.clicked.connect(self.convert_to_excel)
        conv_layout.addWidget(btn_to_excel)

        conv_layout.addWidget(QLabel("Esporta Immagini:"))
        self.img_fmt_combo = QComboBox()
        self.img_fmt_combo.addItems(["PNG (Massima Qualità)", "JPG (Compresso)"])
        conv_layout.addWidget(self.img_fmt_combo)

        btn_export_imgs = QPushButton("🖼️ Esporta Pagine in Immagini")
        btn_export_imgs.clicked.connect(self.export_images)
        conv_layout.addWidget(btn_export_imgs)
        conv_layout.addStretch()
        self.tool_tabs.addTab(tab_conv, "🔄 Converti")

        # TAB 7: UTILITÀ
        tab_util = QWidget()
        util_layout = QVBoxLayout(tab_util)
        util_layout.setSpacing(6)

        btn_grayscale = QPushButton("⚫ Scala di Grigi (Monocromatico)")
        btn_grayscale.clicked.connect(self.apply_grayscale)
        util_layout.addWidget(btn_grayscale)

        btn_repair = QPushButton("🛠️ Ripara PDF & Ricostruisci XRef")
        btn_repair.clicked.connect(self.apply_repair)
        util_layout.addWidget(btn_repair)

        btn_flatten = QPushButton("🔒 Appiattisci Moduli e Annotazioni")
        btn_flatten.clicked.connect(self.apply_flatten)
        util_layout.addWidget(btn_flatten)

        btn_page_num = QPushButton("🔢 Aggiungi Numeri di Pagina")
        btn_page_num.clicked.connect(self.apply_page_numbers)
        util_layout.addWidget(btn_page_num)
        util_layout.addStretch()
        self.tool_tabs.addTab(tab_util, "🛠️ Utilità")

        sidebar_layout.addWidget(self.tool_tabs)
        splitter.addWidget(sidebar_frame)

        # PANNELLO DESTRO (CANVAS)
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)

        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.preview_container = QWidget()
        self.preview_container_layout = QVBoxLayout(self.preview_container)
        self.preview_container_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.canvas_widget = InteractivePdfCanvas(self)
        self.preview_container_layout.addWidget(self.canvas_widget)

        self.scroll_area.setWidget(self.preview_container)
        right_layout.addWidget(self.scroll_area)

        splitter.addWidget(right_panel)

        splitter.setSizes([310, 1030])
        splitter.setCollapsible(0, False)
        root_layout.addWidget(splitter)

        self.setStatusBar(QStatusBar())
        self.statusBar().showMessage("LibrePDF Studio pronto - Colore sfondo personalizzabile ed icona ✕ per cancellare.")

    # ----------------- AGGIORNAMENTO LIVE DEL TESTO SUL CANVAS -----------------

    def on_live_text_changed(self):
        if hasattr(self, 'canvas_widget'):
            self.canvas_widget.update()

    def update_spinboxes_from_canvas(self, x, y, w, h):
        self._syncing_from_canvas = True
        self.spin_x.setValue(x)
        self.spin_y.setValue(y)
        self.spin_w.setValue(w)
        self.spin_h.setValue(h)
        self._syncing_from_canvas = False

    def on_spinbox_changed(self):
        if not self._syncing_from_canvas and hasattr(self, 'canvas_widget'):
            self.canvas_widget.set_box_geometry(
                self.spin_x.value(),
                self.spin_y.value(),
                self.spin_w.value(),
                self.spin_h.value()
            )

    # ----------------- OPERAZIONI CORE E RENDERING -----------------

    def open_pdf(self):
        filepath, _ = QFileDialog.getOpenFileName(
            self,
            "Seleziona File (PDF o Apple Pages)",
            "",
            "File Supportati (*.pdf *.pages);;Documenti PDF (*.pdf);;Apple Pages (*.pages);;Tutti i File (*.*)"
        )
        if filepath:
            try:
                actual_pdf_path = filepath
                is_pages = filepath.lower().endswith(".pages")
                if is_pages:
                    import zipfile, tempfile
                    with zipfile.ZipFile(filepath, 'r') as z:
                        pdf_name = None
                        for name in z.namelist():
                            if 'quicklook' in name.lower() and name.lower().endswith('.pdf'):
                                pdf_name = name
                                break
                        if not pdf_name:
                            raise FileNotFoundError("Nessuna anteprima PDF QuickLook trovata nel file .pages.")
                        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                        tmp.write(z.read(pdf_name))
                        tmp.close()
                        actual_pdf_path = tmp.name

                self.original_filepath = actual_pdf_path
                self.staged_edits_count = 0
                self.history = []
                self.handler.load_document(actual_pdf_path)
                self.current_page = 0
                self.rotation_offset = 0
                count = self.handler.get_page_count()

                display_name = os.path.basename(filepath)
                if is_pages:
                    display_name += " (da Apple Pages)"
                self.file_name_lbl.setText(f"{display_name} ({count} pag.)")
                self.total_pages_lbl.setText(f"/ {count}")
                self.page_spin.setMaximum(count)
                self.page_spin.setValue(1)

                self.sp_start.setMaximum(count)
                self.sp_end.setMaximum(count)
                self.sp_start.setValue(1)
                self.sp_end.setValue(count)

                self.lbl_staged_status.setText("Nessuna modifica inserita")
                self.render_current_page()
                self.statusBar().showMessage(f"File caricato con successo: {filepath}")
            except Exception as e:
                QMessageBox.critical(self, "Errore Caricamento", f"Impossibile aprire il file:\\n{str(e)}")

    def reload_original_document(self):
        if not self.original_filepath or not os.path.exists(self.original_filepath):
            return
        reply = QMessageBox.question(
            self,
            "Conferma Reset",
            "Vuoi davvero annullare tutte le modifiche inserite e ricaricare il documento originale?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.handler.load_document(self.original_filepath)
            self.staged_edits_count = 0
            self.history = []
            self.lbl_staged_status.setText("Documento originale ripristinato")
            self.canvas_widget.show_guides = True
            self.render_current_page()
            self.statusBar().showMessage("Modifiche annullate: ricaricato PDF originale.")

    def delete_active_element(self):
        """Cancella l'elemento o annulla l'ultima modifica inserita (come nell'app web)."""
        if self.history:
            prev_doc_bytes = self.history.pop()
            self.handler.doc = pymupdf.open("pdf", prev_doc_bytes)
            self.staged_edits_count = max(0, self.staged_edits_count - 1)
            self.lbl_staged_status.setText(f"Modifiche applicate in sessione: {self.staged_edits_count}")
            self.render_current_page()
            self.statusBar().showMessage("Ultimo elemento eliminato con successo!")
        else:
            self.edit_text_input.clear()
            self.staged_image_path = ""
            self.lbl_chosen_img.setText("Nessun file immagine caricato")
            self.canvas_widget.set_box_geometry(80, 120, 250, 55)
            self.canvas_widget.update()
            self.statusBar().showMessage("Casella reimpostata e testo svuotato.")

    def render_current_page(self):
        if not self.handler.doc or self.handler.get_page_count() == 0:
            return

        try:
            scale_factor = 2.0 * self.zoom_level
            render_data = self.handler.render_page(
                self.current_page,
                zoom=scale_factor,
                rotation=self.rotation_offset
            )

            if render_data:
                samples, width, height, stride = render_data
                qimg = QImage(samples, width, height, stride, QImage.Format.Format_RGB888).copy()
                pixmap = QPixmap.fromImage(qimg)

                self.canvas_widget.set_page_pixmap(pixmap, scale_factor)
                self.canvas_widget.set_box_geometry(
                    self.spin_x.value(),
                    self.spin_y.value(),
                    self.spin_w.value(),
                    self.spin_h.value()
                )

                self.zoom_lbl.setText(f"{int(self.zoom_level * 100)}%")
                self.statusBar().showMessage(
                    f"Pagina {self.current_page + 1}/{self.handler.get_page_count()} | {width}x{height}px | Modifiche in memoria: {self.staged_edits_count}"
                )
        except Exception as e:
            print(f"Errore visualizzazione pagina: {e}")

    def on_page_spin_changed(self, value):
        if self.handler.doc and 1 <= value <= self.handler.get_page_count():
            self.current_page = value - 1
            self.render_current_page()

    def prev_page(self):
        if self.current_page > 0:
            self.current_page -= 1
            self.page_spin.setValue(self.current_page + 1)

    def next_page(self):
        if self.handler.doc and self.current_page < self.handler.get_page_count() - 1:
            self.current_page += 1
            self.page_spin.setValue(self.current_page + 1)

    def zoom_in(self):
        if self.zoom_level < 3.0:
            self.zoom_level += 0.25
            self.render_current_page()

    def zoom_out(self):
        if self.zoom_level > 0.4:
            self.zoom_level -= 0.25
            self.render_current_page()

    def rotate_view(self):
        self.rotation_offset = (self.rotation_offset + 90) % 360
        self.render_current_page()

    def toggle_clean_preview(self):
        if not self.handler.doc:
            return
        self.canvas_widget.show_guides = not self.canvas_widget.show_guides
        self.canvas_widget.update()
        if not self.canvas_widget.show_guides:
            self.statusBar().showMessage("Anteprima pulita attiva (Guide nascoste). Clicca sul PDF o ripremi il pulsante per riattivarle.")
        else:
            self.statusBar().showMessage("Modalità modifica attiva (Guide visibili).")

    # ----------------- MODIFICA PDF (FASE 1: APPLICA IN MEMORIA) -----------------

    def on_edit_mode_changed(self, index):
        if index == 0:  # Testo
            self.box_text.setVisible(True)
            self.box_img.setVisible(False)
            self.spin_w.setValue(250)
            self.spin_h.setValue(55)
        elif index == 1:  # Immagine
            self.box_text.setVisible(False)
            self.box_img.setVisible(True)
            self.spin_w.setValue(180)
            self.spin_h.setValue(120)
        else:  # Firma
            self.box_text.setVisible(True)
            self.box_img.setVisible(False)
            self.edit_text_input.setText("Firma: Vincenzo Costanzo")
            self.spin_w.setValue(220)
            self.spin_h.setValue(45)
        self.canvas_widget.update()

    def choose_edit_image(self):
        filepath, _ = QFileDialog.getOpenFileName(self, "Seleziona Immagine", "", "Images (*.png *.jpg *.jpeg *.bmp)")
        if filepath:
            self.staged_image_path = filepath
            self.lbl_chosen_img.setText(os.path.basename(filepath))
            self.canvas_widget.update()

    def apply_insert_element(self):
        if not self.handler.doc:
            QMessageBox.warning(self, "Attenzione", "Apri prima un file PDF dal pulsante in alto.")
            return

        mode = self.edit_mode_combo.currentIndex()
        x = float(self.spin_x.value())
        y = float(self.spin_y.value())
        w = float(self.spin_w.value())
        h = float(self.spin_h.value())

        border_col_map = {
            "Rosso": (1.0, 0.0, 0.0),
            "Nero": (0.0, 0.0, 0.0),
            "Blu": (0.1, 0.3, 0.8),
            "Oro": (0.85, 0.65, 0.1),
            "Grigio": (0.5, 0.5, 0.5)
        }
        b_color = border_col_map.get(self.combo_border_col.currentText(), (1.0, 0.0, 0.0))
        b_width = float(self.spin_border_w.value())

        try:
            # Salva snapshot nello stack history per consentire l'annulla/cancellazione con il tasto ✕
            self.history.append(self.handler.doc.tobytes())

            if mode == 0 or mode == 2:
                text = self.edit_text_input.text()
                if not text.strip():
                    QMessageBox.warning(self, "Attenzione", "Inserisci il testo da scrivere.")
                    return

                fontsize = float(self.edit_font_spin.value())
                has_border = self.chk_text_border.isChecked()
                has_bg = self.chk_text_bg.isChecked()
                bg_color_tuple = self.get_current_bg_float_tuple()

                txt_color_map = {
                    "Nero": (0.0, 0.0, 0.0),
                    "Rosso": (0.9, 0.1, 0.1),
                    "Blu": (0.1, 0.2, 0.8),
                    "Verde": (0.1, 0.6, 0.2),
                    "Grigio": (0.4, 0.4, 0.4)
                }
                t_color = txt_color_map.get(self.edit_text_color.currentText(), (0.0, 0.0, 0.0))

                self.handler.insert_custom_text(
                    page_num=self.current_page,
                    text=text,
                    x=x, y=y, width=w, height=h,
                    fontsize=fontsize,
                    color=t_color,
                    has_border=has_border,
                    border_color=b_color,
                    border_width=b_width,
                    has_bg=has_bg,
                    bg_color=bg_color_tuple
                )
            else:
                if not self.staged_image_path or not os.path.exists(self.staged_image_path):
                    QMessageBox.warning(self, "Attenzione", "Seleziona prima un file immagine.")
                    return

                has_border = self.chk_img_border.isChecked()
                self.handler.insert_custom_image(
                    page_num=self.current_page,
                    image_path=self.staged_image_path,
                    x=x, y=y, width=w, height=h,
                    has_border=has_border,
                    border_color=b_color,
                    border_width=b_width
                )

            self.staged_edits_count += 1
            self.lbl_staged_status.setText(f"Modifiche applicate in sessione: {self.staged_edits_count}")
            self.render_current_page()
            self.spin_y.setValue(min(3000, int(y + h + 18)))
            self.statusBar().showMessage(f"Elemento inserito su pagina {self.current_page + 1}. Totale modifiche: {self.staged_edits_count}")

        except Exception as e:
            QMessageBox.critical(self, "Errore Modifica", f"Impossibile inserire elemento:\\n{str(e)}")

    # ----------------- FASE 3: SALVATAGGIO DEFINITIVO -----------------

    def save_edited_pdf(self):
        if not self.handler.doc:
            QMessageBox.warning(self, "Attenzione", "Nessun documento aperto.")
            return

        if self.staged_edits_count == 0:
            reply = QMessageBox.question(
                self,
                "Nessuna nuova modifica",
                "Non hai ancora inserito nuove caselle in questa sessione. Vuoi comunque salvare una copia?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if reply != QMessageBox.StandardButton.Yes:
                return

        save_path, _ = QFileDialog.getSaveFileName(
            self,
            "Salva PDF Modificato",
            "documento_modificato.pdf",
            "PDF Files (*.pdf)"
        )
        if save_path:
            try:
                self.handler.save_edited_document(save_path)
                QMessageBox.information(
                    self,
                    "Salvataggio Completato",
                    f"Il PDF modificato è stato salvato con successo in:\\n{save_path}"
                )
                self.statusBar().showMessage(f"File salvato: {save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore Salvataggio", f"Errore durante il salvataggio:\\n{str(e)}")

    # ----------------- ALTRI STRUMENTI -----------------

    def pick_custom_color(self):
        col = QColorDialog.getColor(QColor(255, 0, 0), self, "Seleziona Colore Filigrana")
        if col.isValid():
            self.wm_color = (col.redF(), col.greenF(), col.blueF())
            self.statusBar().showMessage(f"Colore filigrana: RGB({col.red()}, {col.green()}, {col.blue()})")

    def apply_watermark(self):
        if not self.handler.doc:
            QMessageBox.warning(self, "Attenzione", "Carica prima un file PDF.")
            return

        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF con Filigrana", "documento_watermark.pdf", "PDF (*.pdf)")
        if not save_path:
            return

        text = self.wm_text_edit.text()
        fontsize = self.wm_font_spin.value()
        angle_map = {"45° (Diagonale)": 45, "0° (Orizzontale)": 0, "90° (Verticale)": 90, "-45° (Inversa)": -45}
        rotate = angle_map.get(self.wm_angle_combo.currentText(), 45)

        color_text = self.wm_color_combo.currentText()
        if color_text == "Rosso Brillante":
            color = (1.0, 0.0, 0.0)
        elif color_text == "Blu Aziendale":
            color = (0.1, 0.3, 0.8)
        elif color_text == "Grigio Neutro":
            color = (0.5, 0.5, 0.5)
        elif color_text == "Nero":
            color = (0.0, 0.0, 0.0)
        else:
            color = self.wm_color

        try:
            self.statusBar().showMessage("Applicazione filigrana in corso...")
            self.handler.add_watermark(text, save_path, color=color, fontsize=fontsize, rotate=rotate, opacity=0.35)
            self.statusBar().showMessage(f"Filigrana applicata: {os.path.basename(save_path)}")
            QMessageBox.information(self, "Completato", f"PDF salvato con filigrana:\\n{save_path}")
        except Exception as e:
            QMessageBox.critical(self, "Errore Filigrana", str(e))

    def apply_extract_range(self):
        if not self.handler.doc:
            return
        start = self.sp_start.value() - 1
        end = self.sp_end.value() - 1
        if start > end:
            QMessageBox.warning(self, "Attenzione", "La pagina iniziale deve essere minore o uguale a quella finale.")
            return

        save_path, _ = QFileDialog.getSaveFileName(self, "Salva Pagine Estratte", "estratto.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.extract_pages(start, end, save_path)
                QMessageBox.information(self, "Completato", f"Pagine estratte con successo in:\\n{save_path}")
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
        files, _ = QFileDialog.getOpenFileNames(self, "Seleziona File PDF da Unire", "", "PDF Files (*.pdf)")
        for f in files:
            self.merge_list.addItem(f)

    def apply_merge(self):
        if not self.handler.doc:
            QMessageBox.warning(self, "Attenzione", "Carica prima il documento PDF base.")
            return

        other_files = [self.merge_list.item(i).text() for i in range(self.merge_list.count())]
        if not other_files:
            QMessageBox.warning(self, "Attenzione", "Aggiungi almeno un secondo file PDF da unire.")
            return

        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Unificato", "unito.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.merge_with(other_files, save_path)
                QMessageBox.information(self, "Completato", f"PDF uniti con successo in:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def extract_fast_text(self):
        if not self.handler.doc:
            return
        try:
            txt = self.handler.extract_all_text()
            self.ocr_output_edit.setPlainText(txt)
            self.statusBar().showMessage(f"Testo estratto: {len(txt)} caratteri.")
        except Exception as e:
            QMessageBox.critical(self, "Errore", str(e))

    def run_ocr_current_page(self):
        if not self.handler.doc:
            return
        lang = self.ocr_lang_combo.currentText().split()[0]
        self.statusBar().showMessage("Esecuzione OCR in corso...")
        try:
            txt = self.handler.extract_text_ocr(self.current_page, language=lang)
            self.ocr_output_edit.setPlainText(txt)
            self.statusBar().showMessage("OCR completato.")
        except Exception as e:
            QMessageBox.critical(self, "Errore OCR", str(e))

    def run_ocr_all_pages(self):
        if not self.handler.doc:
            return
        lang = self.ocr_lang_combo.currentText().split()[0]
        self.statusBar().showMessage("OCR di tutte le pagine in corso...")
        try:
            txt = self.handler.extract_all_text_ocr(language=lang)
            self.ocr_output_edit.setPlainText(txt)
            self.statusBar().showMessage("OCR intero documento completato.")
        except Exception as e:
            QMessageBox.critical(self, "Errore OCR", str(e))

    def copy_ocr_text(self):
        clipboard = QApplication.clipboard()
        clipboard.setText(self.ocr_output_edit.toPlainText())
        QMessageBox.information(self, "Appunti", "Testo copiato negli appunti!")

    def save_ocr_txt(self):
        txt = self.ocr_output_edit.toPlainText()
        if not txt:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva Testo", "testo_estratto.txt", "Text Files (*.txt)")
        if save_path:
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(txt)
            QMessageBox.information(self, "Salvato", f"File di testo salvato:\\n{save_path}")

    def convert_to_word(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva come Word", "documento.docx", "Word Files (*.docx)")
        if save_path:
            try:
                self.handler.convert_to_docx(save_path)
                QMessageBox.information(self, "Completato", f"Convertito in Word:\\n{save_path}")
            except Exception as e:
                QMessageBox.warning(self, "Attenzione", str(e))

    def convert_to_excel(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva Tabelle in Excel", "tabelle.xlsx", "Excel Files (*.xlsx)")
        if save_path:
            try:
                self.handler.extract_tables_to_excel(save_path)
                QMessageBox.information(self, "Completato", f"Tabelle esportate in Excel:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore Excel", f"Errore durante l'esportazione: {e}")

    def export_images(self):
        if not self.handler.doc:
            return
        out_dir = QFileDialog.getExistingDirectory(self, "Seleziona Cartella di Destinazione")
        if out_dir:
            try:
                fmt = "png" if "PNG" in self.img_fmt_combo.currentText() else "jpg"
                saved = self.handler.save_pages_as_images(out_dir, fmt=fmt, zoom=2.0)
                QMessageBox.information(self, "Completato", f"Esportate {len(saved)} immagini in:\\n{out_dir}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_grayscale(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva in Scala di Grigi", "documento_bwn.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.convert_to_grayscale(save_path)
                QMessageBox.information(self, "Completato", f"Documento monocromatico salvato:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_repair(self):
        if not self.handler.filepath:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Riparato", "documento_riparato.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.repair_pdf(save_path)
                QMessageBox.information(self, "Completato", f"XRef ricostruita e PDF sanificato:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_flatten(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva PDF Appiattito", "documento_flatten.pdf", "PDF (*.pdf)")
        if save_path:
            try:
                self.handler.flatten_pdf(save_path)
                QMessageBox.information(self, "Completato", f"Campi modulo e annotazioni fissati:\\n{save_path}")
            except Exception as e:
                QMessageBox.critical(self, "Errore", str(e))

    def apply_page_numbers(self):
        if not self.handler.doc:
            return
        save_path, _ = QFileDialog.getSaveFileName(self, "Salva con Numeri Pagina", "documento_numerato.pdf", "PDF (*.pdf)")
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
`;
