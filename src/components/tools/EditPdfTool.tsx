import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Plus,
  ZoomIn,
  ZoomOut,
  Sliders,
  Square,
  Maximize2,
  Copy,
  Layers,
  Sparkles,
  Eye,
  X,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { renderPageToImage, applyPdfEdits } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';
import type { PdfEditElement } from '../../types/pdf';

interface EditPdfToolProps {
  onSuccess: () => void;
}

export const EditPdfTool: React.FC<EditPdfToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageDataUrl, setPageDataUrl] = useState<string | null>(null);
  const [pageDims, setPageDims] = useState<{ width: number; height: number }>({ width: 600, height: 800 });
  const [loadingPage, setLoadingPage] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Placed elements on all pages
  const [elements, setElements] = useState<PdfEditElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Preview Before Saving Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [previewPageUrl, setPreviewPageUrl] = useState<string | null>(null);
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Active Tool Mode in sidebar
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'signature' | 'inspector'>('text');

  // Text Tool Inputs
  const [textContent, setTextContent] = useState('Note di Approvazione');
  const [fontSize, setFontSize] = useState(18);
  const [fontColor, setFontColor] = useState('#0f172a');
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [textHasBorder, setTextHasBorder] = useState(false);
  const [textBorderWidth, setTextBorderWidth] = useState(2);
  const [textBorderColor, setTextBorderColor] = useState('#dc2626');
  const [textHasBg, setTextHasBg] = useState(false);
  const [textBgColor, setTextBgColor] = useState('#ffffff');

  // Image Tool Inputs
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(140);
  const [imageHeight, setImageHeight] = useState(140);
  const [imgHasBorder, setImgHasBorder] = useState(false);
  const [imgBorderWidth, setImgBorderWidth] = useState(2);
  const [imgBorderColor, setImgBorderColor] = useState('#1e293b');

  // Signature Tool Inputs
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSigName, setTypedSigName] = useState('Vincenzo Costanzo');
  const [sigInkColor, setSigInkColor] = useState('#0f172a');
  const [sigStrokeWidth, setSigStrokeWidth] = useState(2.5);
  const [sigHasBorder, setSigHasBorder] = useState(false);
  const [sigBorderWidth, setSigBorderWidth] = useState(1);
  const [sigBorderColor, setSigBorderColor] = useState('#1e3a8a');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  // Export / Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState<number | null>(null);

  const { run, persist, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'edit-pdf',
    onSuccess,
  });

  // Dragging & Resizing state on preview overlay
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [draggingElemId, setDraggingElemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingElemId, setResizingElemId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: 100,
    startH: 100,
  });

  const fileItem = files[0];

  // Selected element object
  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  // Load PDF page preview
  useEffect(() => {
    if (!fileItem) {
      setPageDataUrl(null);
      setTotalPages(1);
      setElements([]);
      return;
    }

    const loadPage = async () => {
      setLoadingPage(true);
      try {
        const buffer = await fileItem.file.arrayBuffer();
        const count = fileItem.pageCount || 1;
        setTotalPages(count);

        const safePage = Math.min(Math.max(currentPage, 1), count);
        const { dataUrl, width, height } = await renderPageToImage(buffer, safePage, 1.5);
        setPageDataUrl(dataUrl);
        setPageDims({ width, height });
      } catch (err) {
        console.error('Errore rendering pagina PDF:', err);
      } finally {
        setLoadingPage(false);
      }
    };

    loadPage();
  }, [fileItem, currentPage]);

  // Current page elements
  const currentElements = elements.filter((e) => e.pageIndex === currentPage - 1);

  // Add Text Element (Supports adding multiple independent text boxes)
  const handleAddText = (customText?: string) => {
    const rawText = customText !== undefined ? customText : textContent;
    const count = currentElements.filter((el) => el.type === 'text').length;
    const textToInsert = rawText.trim() || `Nuovo Testo ${count + 1}`;
    const calcW = Math.max(140, Math.round(textToInsert.length * (fontSize * 0.65) + 26));
    const calcH = Math.round(fontSize * 1.8 + 14);

    // Stagger position to avoid exact overlapping
    const staggerX = 40 + (count % 5) * 35;
    const staggerY = 70 + (count % 8) * 45;

    const newElem: PdfEditElement = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: 'text',
      pageIndex: currentPage - 1,
      x: Math.min(Math.max(20, pageDims.width - calcW - 20), staggerX),
      y: Math.min(Math.max(20, pageDims.height - calcH - 20), staggerY),
      width: calcW,
      height: calcH,
      text: textToInsert,
      fontSize,
      fontFamily,
      color: fontColor,
      isBold,
      isItalic,
      hasBorder: textHasBorder,
      borderWidth: textBorderWidth,
      borderColor: textBorderColor,
      hasBackground: textHasBg,
      backgroundColor: textBgColor,
      padding: 6,
    };

    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
  };

  // Duplicate an existing element
  const handleDuplicateElement = (elemToDup: PdfEditElement) => {
    const newElem: PdfEditElement = {
      ...elemToDup,
      id: `${elemToDup.type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      x: Math.min(pageDims.width - elemToDup.width, elemToDup.x + 25),
      y: Math.min(pageDims.height - elemToDup.height, elemToDup.y + 25),
    };
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
  };

  // Image Upload Handler
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setStagedImage(dataUrl);
      const img = new Image();
      img.onload = () => {
        const maxW = 200;
        const scale = img.width > maxW ? maxW / img.width : 1;
        setImageWidth(Math.round(img.width * scale));
        setImageHeight(Math.round(img.height * scale));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Add Image Element
  const handleAddImage = () => {
    if (!stagedImage) return;
    const newElem: PdfEditElement = {
      id: `img_${Date.now()}_${Math.random()}`,
      type: 'image',
      pageIndex: currentPage - 1,
      x: 80,
      y: 100,
      width: imageWidth,
      height: imageHeight,
      dataUrl: stagedImage,
      hasBorder: imgHasBorder,
      borderWidth: imgBorderWidth,
      borderColor: imgBorderColor,
    };
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
    setActiveTab('inspector');
  };

  // Drawing signature on canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sigInkColor;
    ctx.lineWidth = sigStrokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingSig(false);
  };

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Add Signature Element
  const handleAddSignature = () => {
    let sigDataUrl = '';

    if (sigMode === 'draw') {
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      sigDataUrl = canvas.toDataURL('image/png');
    } else if (sigMode === 'type') {
      const c = document.createElement('canvas');
      c.width = 400;
      c.height = 140;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = sigInkColor;
        ctx.font = 'italic 44px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.fillText(typedSigName, 30, 85);
        sigDataUrl = c.toDataURL('image/png');
      }
    } else if (sigMode === 'upload' && stagedImage) {
      sigDataUrl = stagedImage;
    }

    if (!sigDataUrl) return;

    const newElem: PdfEditElement = {
      id: `sig_${Date.now()}_${Math.random()}`,
      type: 'signature',
      pageIndex: currentPage - 1,
      x: 100,
      y: 200,
      width: 180,
      height: 80,
      dataUrl: sigDataUrl,
      hasBorder: sigHasBorder,
      borderWidth: sigBorderWidth,
      borderColor: sigBorderColor,
    };
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
    setActiveTab('inspector');
  };

  // Drag Element Handling
  const handleElementMouseDown = (e: React.MouseEvent, elem: PdfEditElement) => {
    e.stopPropagation();
    setSelectedElementId(elem.id);
    setDraggingElemId(elem.id);
    setDragOffset({
      x: e.clientX - elem.x * zoomScale,
      y: e.clientY - elem.y * zoomScale,
    });
  };

  // Resize Handle MouseDown
  const handleResizeMouseDown = (e: React.MouseEvent, elem: PdfEditElement) => {
    e.stopPropagation();
    setResizingElemId(elem.id);
    setResizeStart({
      startX: e.clientX,
      startY: e.clientY,
      startW: elem.width,
      startH: elem.height,
    });
  };

  // Container MouseMove (covers drag & resize)
  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (resizingElemId) {
      const deltaX = (e.clientX - resizeStart.startX) / zoomScale;
      const deltaY = (e.clientY - resizeStart.startY) / zoomScale;

      const newW = Math.max(40, Math.round(resizeStart.startW + deltaX));
      const newH = Math.max(20, Math.round(resizeStart.startH + deltaY));

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== resizingElemId) return el;
          // If text and resizing height significantly, adjust font size proportionally
          if (el.type === 'text') {
            const fontRatio = newH / Math.max(1, el.height);
            const newFontSize = Math.min(64, Math.max(10, Math.round((el.fontSize || 18) * Math.sqrt(fontRatio))));
            return { ...el, width: newW, height: newH, fontSize: newFontSize };
          }
          return { ...el, width: newW, height: newH };
        })
      );
      return;
    }

    if (draggingElemId) {
      const newX = Math.max(0, Math.round((e.clientX - dragOffset.x) / zoomScale));
      const newY = Math.max(0, Math.round((e.clientY - dragOffset.y) / zoomScale));

      setElements((prev) =>
        prev.map((el) => (el.id === draggingElemId ? { ...el, x: newX, y: newY } : el))
      );
    }
  };

  const handleContainerMouseUp = () => {
    setDraggingElemId(null);
    setResizingElemId(null);
  };

  const handleDeleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleUpdateSelected = (patch: Partial<PdfEditElement>) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...patch } : el))
    );
  };

  // Generate preview of the modified PDF before saving
  const handleOpenPreview = async (targetPageNum = currentPage) => {
    if (!fileItem || elements.length === 0) return;
    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      const dimsByPage: Record<number, { width: number; height: number }> = {};
      for (let i = 0; i < totalPages; i++) {
        dimsByPage[i] = pageDims;
      }

      const pdfBytes = await applyPdfEdits(
        fileItem.file,
        elements,
        dimsByPage
      );
      setPreviewPdfBytes(pdfBytes);
      setPreviewCurrentPage(targetPageNum);

      const rendered = await renderPageToImage(pdfBytes, targetPageNum, 1.8);
      setPreviewPageUrl(rendered.dataUrl);
      setIsPreviewOpen(true);
    } catch (err: any) {
      console.error('Errore generazione anteprima PDF:', err);
      setPreviewError(err.message || 'Errore nella generazione dell\'anteprima.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handlePreviewPageChange = async (newPage: number) => {
    if (!previewPdfBytes || newPage < 1 || newPage > totalPages) return;
    setPreviewCurrentPage(newPage);
    try {
      const rendered = await renderPageToImage(previewPdfBytes, newPage, 1.8);
      setPreviewPageUrl(rendered.dataUrl);
    } catch (err) {
      console.error('Errore cambio pagina anteprima:', err);
    }
  };

  const handleConfirmSaveFromPreview = async () => {
    if (!previewPdfBytes || !fileItem) return;
    setIsProcessing(true);
    try {
      const blob = new Blob([previewPdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(previewPdfBytes.byteLength);

      const outName = `${fileItem.file.name.replace(/\.pdf$/i, '')}_modificato.pdf`;
      await persist({
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: previewPdfBytes.byteLength,
        data: previewPdfBytes,
      });

      setIsPreviewOpen(false);
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
      onSuccess();
    } catch (err: any) {
      setPreviewError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export Modified PDF directly
  const handleApplyAndExport = async () => {
    if (!fileItem || elements.length === 0) return;
    setIsProcessing(true);
    setExportProgress(10);

    try {
      const dimsByPage: Record<number, { width: number; height: number }> = {};
      for (let i = 0; i < totalPages; i++) {
        dimsByPage[i] = pageDims;
      }

      const pdfBytes = await applyPdfEdits(
        fileItem.file,
        elements,
        dimsByPage,
        (prog) => setExportProgress(prog)
      );

      const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBytes(pdfBytes.byteLength);

      const outName = `${fileItem.file.name.replace(/\.pdf$/i, '')}_modificato.pdf`;
      await persist({
        name: outName,
        originalSize: fileItem.file.size,
        resultSize: pdfBytes.byteLength,
        data: pdfBytes,
      });

      confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
      onSuccess();
    } catch (err: any) {
      console.error('Errore esportazione PDF:', err);
      setPreviewError(err.message || 'Si è verificato un errore durante la modifica del PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Upload PDF */}
      {files.length === 0 ? (
        <FileDropzone
          files={files}
          onFilesChange={(newFiles) => setFiles(newFiles.slice(0, 1))}
          accept=".pdf"
          multiple={false}
          maxFiles={1}
          title="Carica il PDF da modificare"
          subtitle="Inserisci testi formattati, immagini con contorni e firme con dimensionamento interattivo."
        />
      ) : (
        <div className="space-y-5">
          {/* Top Control Bar: Page Navigation & Zoom & Preview & Save */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {fileItem.file.name}
              </span>
              <span className="text-[11px] text-slate-400">
                ({elements.length} elementi posizionati)
              </span>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Pagina precedente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2">
                Pagina {currentPage} di {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Pagina successiva"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />
              <button
                onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Riduci anteprima editor"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono w-12 text-center text-slate-500">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.15))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Ingrandisci anteprima editor"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {/* Fase 2: Anteprima PDF Modificato (Prima di salvare) */}
              <button
                onClick={() => handleOpenPreview(currentPage)}
                disabled={isGeneratingPreview || elements.length === 0}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-40"
                title="Fase 2: Controlla visivamente il PDF modificato a schermo intero prima di salvare"
              >
                {isGeneratingPreview ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-rose-500" />
                    <span>2. Controlla Anteprima</span>
                  </>
                )}
              </button>

              {/* Fase 3: Salvataggio Definitivo */}
              <button
                onClick={handleApplyAndExport}
                disabled={isProcessing || elements.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="Fase 3: Salva e scarica il PDF finale sul tuo computer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isProcessing ? `Salvataggio (${exportProgress}%)...` : '3. Salva PDF'}</span>
              </button>
            </div>
          </div>

          {/* Main Workspace Split: Left Toolbar + Right Interactive Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Editing Tools, Inspector & Element List */}
            <div className="lg:col-span-4 space-y-4">
              {/* Tool Category Selector */}
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'text'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-rose-500" />
                  <span>Testo</span>
                </button>
                <button
                  onClick={() => setActiveTab('signature')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'signature'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-blue-500" />
                  <span>Firma</span>
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'image'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Immagine</span>
                </button>
                {selectedElement && (
                  <button
                    onClick={() => setActiveTab('inspector')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'inspector'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Modifica</span>
                  </button>
                )}
              </div>

              {/* TOOL PANELS */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                {/* 1. TEXT TOOL */}
                {activeTab === 'text' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Contenuto Testuale:
                      </label>
                      <input
                        type="text"
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Digita testo da aggiungere..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Font:</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value as any)}
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        >
                          <option value="Helvetica">Helvetica (Lineare)</option>
                          <option value="TimesRoman">Times Roman (Serif)</option>
                          <option value="Courier">Courier (Monospazio)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dimensione: {fontSize}pt</label>
                        <input
                          type="range"
                          min="10"
                          max="48"
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full accent-rose-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Color Swatches */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Colore Testo:</label>
                      <div className="flex items-center gap-2">
                        {['#0f172a', '#1e3a8a', '#dc2626', '#16a34a', '#64748b'].map((col) => (
                          <button
                            key={col}
                            onClick={() => setFontColor(col)}
                            style={{ backgroundColor: col }}
                            className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                              fontColor === col ? 'border-amber-400 scale-110 shadow-xs' : 'border-transparent'
                            }`}
                          />
                        ))}
                        <input
                          type="color"
                          value={fontColor}
                          onChange={(e) => setFontColor(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-300 cursor-pointer bg-transparent"
                          title="Scegli colore personalizzato"
                        />
                      </div>
                    </div>

                    {/* Contorno / Bordo Box */}
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={textHasBorder}
                          onChange={(e) => setTextHasBorder(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Aggiungi Bordo / Contorno</span>
                      </label>

                      {textHasBorder && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-[11px] text-slate-500">Spessore: {textBorderWidth}px</span>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              value={textBorderWidth}
                              onChange={(e) => setTextBorderWidth(Number(e.target.value))}
                              className="w-full accent-rose-600"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500">Colore Bordo:</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {['#dc2626', '#1e3a8a', '#0f172a', '#d97706'].map((col) => (
                                <button
                                  key={col}
                                  onClick={() => setTextBorderColor(col)}
                                  style={{ backgroundColor: col }}
                                  className={`w-4 h-4 rounded-full border ${textBorderColor === col ? 'ring-2 ring-amber-400' : ''}`}
                                />
                              ))}
                              <input
                                type="color"
                                value={textBorderColor}
                                onChange={(e) => setTextBorderColor(e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={textHasBg}
                          onChange={(e) => setTextHasBg(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Sfondo Pieno (Riempimento)</span>
                      </label>

                      {textHasBg && (
                        <div className="flex items-center gap-2 text-xs pt-1">
                          <span className="text-[11px] text-slate-500">Colore Sfondo:</span>
                          {['#ffffff', '#fef08a', '#f1f5f9', '#fee2e2'].map((col) => (
                            <button
                              key={col}
                              onClick={() => setTextBgColor(col)}
                              style={{ backgroundColor: col }}
                              className={`w-5 h-5 rounded border ${textBgColor === col ? 'ring-2 ring-rose-500' : ''}`}
                            />
                          ))}
                          <input
                            type="color"
                            value={textBgColor}
                            onChange={(e) => setTextBgColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsBold((b) => !b)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          isBold
                            ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Grassetto (B)
                      </button>
                      <button
                        onClick={() => setIsItalic((i) => !i)}
                        className={`px-3 py-1.5 rounded-lg border text-xs italic transition cursor-pointer ${
                          isItalic
                            ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Corsivo (I)
                      </button>
                    </div>

                    <button
                      onClick={() => handleAddText()}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>➕ Aggiungi Casella di Testo su Pagina {currentPage}</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center">
                      💡 Puoi inserire quante caselle di testo desideri (premi il pulsante per aggiungerne un&apos;altra).
                    </p>
                  </div>
                )}

                {/* 2. SIGNATURE TOOL */}
                {activeTab === 'signature' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                      <button
                        onClick={() => setSigMode('draw')}
                        className={`flex-1 py-1 rounded text-center font-medium transition cursor-pointer ${
                          sigMode === 'draw' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        ✍️ Disegna
                      </button>
                      <button
                        onClick={() => setSigMode('type')}
                        className={`flex-1 py-1 rounded text-center font-medium transition cursor-pointer ${
                          sigMode === 'type' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        ⌨️ Digita
                      </button>
                    </div>

                    {sigMode === 'draw' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Disegna con mouse o touch:</span>
                          <button
                            onClick={clearSigCanvas}
                            className="flex items-center gap-1 text-[11px] text-rose-600 hover:underline cursor-pointer"
                          >
                            <Eraser className="w-3 h-3" /> Pulisci
                          </button>
                        </div>

                        <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white overflow-hidden shadow-inner">
                          <canvas
                            ref={sigCanvasRef}
                            width={320}
                            height={120}
                            onMouseDown={startDrawing}
                            onMouseMove={drawSignature}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={drawSignature}
                            onTouchEnd={stopDrawing}
                            className="w-full h-[120px] touch-none cursor-crosshair bg-white"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500">Inchiostro:</span>
                          <div className="flex items-center gap-2">
                            {['#0f172a', '#1d4ed8', '#dc2626'].map((col) => (
                              <button
                                key={col}
                                onClick={() => setSigInkColor(col)}
                                style={{ backgroundColor: col }}
                                className={`w-5 h-5 rounded-full border-2 ${
                                  sigInkColor === col ? 'border-amber-400 scale-110' : 'border-transparent'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {sigMode === 'type' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                          Nome e Cognome del Firmatario:
                        </label>
                        <input
                          type="text"
                          value={typedSigName}
                          onChange={(e) => setTypedSigName(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-center">
                          <span
                            style={{ color: sigInkColor }}
                            className="text-2xl font-serif italic tracking-wide"
                          >
                            {typedSigName || 'Firma'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Signature Border Box */}
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sigHasBorder}
                          onChange={(e) => setSigHasBorder(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Aggiungi Box / Contorno Firma</span>
                      </label>
                      {sigHasBorder && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-[11px] text-slate-500">Spessore: {sigBorderWidth}px</span>
                            <input
                              type="range"
                              min="1"
                              max="4"
                              value={sigBorderWidth}
                              onChange={(e) => setSigBorderWidth(Number(e.target.value))}
                              className="w-full accent-blue-600"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500">Colore Bordo:</span>
                            <input
                              type="color"
                              value={sigBorderColor}
                              onChange={(e) => setSigBorderColor(e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer mt-0.5"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddSignature}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Inserisci Firma su Pagina {currentPage}</span>
                    </button>
                  </div>
                )}

                {/* 3. IMAGE TOOL */}
                {activeTab === 'image' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Carica Immagine, Logo o Timbro (PNG/JPG):
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleImageFile}
                        className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 file:font-semibold cursor-pointer"
                      />
                    </div>

                    {stagedImage && (
                      <div className="space-y-2.5 pt-1">
                        <div className="w-full h-24 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950/60 overflow-hidden">
                          <img
                            src={stagedImage}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold">Larghezza: {imageWidth}px</span>
                            <input
                              type="range"
                              min="40"
                              max="400"
                              value={imageWidth}
                              onChange={(e) => setImageWidth(Number(e.target.value))}
                              className="w-full accent-emerald-600"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold">Altezza: {imageHeight}px</span>
                            <input
                              type="range"
                              min="30"
                              max="400"
                              value={imageHeight}
                              onChange={(e) => setImageHeight(Number(e.target.value))}
                              className="w-full accent-emerald-600"
                            />
                          </div>
                        </div>

                        {/* Image Border Frame */}
                        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={imgHasBorder}
                              onChange={(e) => setImgHasBorder(e.target.checked)}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Aggiungi Cornice / Bordo Immagine</span>
                          </label>

                          {imgHasBorder && (
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                              <div>
                                <span className="text-[11px] text-slate-500">Spessore: {imgBorderWidth}px</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="8"
                                  value={imgBorderWidth}
                                  onChange={(e) => setImgBorderWidth(Number(e.target.value))}
                                  className="w-full accent-emerald-600"
                                />
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500">Colore Cornice:</span>
                                <input
                                  type="color"
                                  value={imgBorderColor}
                                  onChange={(e) => setImgBorderColor(e.target.value)}
                                  className="w-6 h-6 rounded cursor-pointer mt-0.5"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleAddImage}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Inserisci Immagine su Pagina {currentPage}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. INSPECTOR / MODIFICA ELEMENTO SELEZIONATO */}
                {activeTab === 'inspector' && selectedElement && (
                  <div className="space-y-3.5 bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        <span>Modifica Elemento ({selectedElement.type.toUpperCase()})</span>
                      </span>
                      <button
                        onClick={() => handleDeleteElement(selectedElement.id)}
                        className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Elimina
                      </button>
                    </div>

                    {/* Quick actions: Duplica o Inserisci Nuova Casella */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => handleDuplicateElement(selectedElement)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-[11px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer shadow-2xs"
                        title="Crea una copia identica di questo elemento"
                      >
                        <Copy className="w-3 h-3 text-amber-600" />
                        <span>Duplica Casella</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('text');
                          handleAddText();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                        title="Aggiungi una nuova casella di testo indipendente"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Altro Testo</span>
                      </button>
                    </div>

                    {/* If text: Content and font */}
                    {selectedElement.type === 'text' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500">Modifica Testo:</label>
                          <input
                            type="text"
                            value={selectedElement.text || ''}
                            onChange={(e) => handleUpdateSelected({ text: e.target.value })}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-500">Dimensione Font: {selectedElement.fontSize}pt</span>
                            <input
                              type="range"
                              min="10"
                              max="60"
                              value={selectedElement.fontSize || 18}
                              onChange={(e) => handleUpdateSelected({ fontSize: Number(e.target.value) })}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500">Colore Testo:</span>
                            <input
                              type="color"
                              value={selectedElement.color || '#000000'}
                              onChange={(e) => handleUpdateSelected({ color: e.target.value })}
                              className="w-6 h-6 rounded cursor-pointer mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Direct Dimension Sliders */}
                    <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Larghezza: {selectedElement.width}px</span>
                        <span>Altezza: {selectedElement.height}px</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="range"
                            min="30"
                            max="500"
                            value={selectedElement.width}
                            onChange={(e) => handleUpdateSelected({ width: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <input
                            type="range"
                            min="20"
                            max="450"
                            value={selectedElement.height}
                            onChange={(e) => handleUpdateSelected({ height: Number(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contorno / Bordo per elemento selezionato */}
                    <div className="space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElement.hasBorder || false}
                          onChange={(e) => handleUpdateSelected({ hasBorder: e.target.checked, borderWidth: selectedElement.borderWidth || 2 })}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Attiva Bordo / Contorno</span>
                      </label>

                      {selectedElement.hasBorder && (
                        <div className="grid grid-cols-2 gap-2 text-xs pl-5">
                          <div>
                            <span className="text-[11px] text-slate-500">Spessore: {selectedElement.borderWidth || 2}px</span>
                            <input
                              type="range"
                              min="1"
                              max="8"
                              value={selectedElement.borderWidth || 2}
                              onChange={(e) => handleUpdateSelected({ borderWidth: Number(e.target.value) })}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500">Colore:</span>
                            <input
                              type="color"
                              value={selectedElement.borderColor || '#dc2626'}
                              onChange={(e) => handleUpdateSelected({ borderColor: e.target.value })}
                              className="w-6 h-6 rounded cursor-pointer mt-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* Sfondo per elemento selezionato */}
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={selectedElement.hasBackground || false}
                          onChange={(e) => handleUpdateSelected({ hasBackground: e.target.checked, backgroundColor: selectedElement.backgroundColor || '#ffffff' })}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Sfondo Pieno / Riempimento</span>
                      </label>

                      {selectedElement.hasBackground && (
                        <div className="flex items-center gap-2 text-xs pl-5">
                          <span className="text-[11px] text-slate-500">Colore Sfondo:</span>
                          <input
                            type="color"
                            value={selectedElement.backgroundColor || '#ffffff'}
                            onChange={(e) => handleUpdateSelected({ backgroundColor: e.target.value })}
                            className="w-6 h-6 rounded cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Placed Elements List for Current Page */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Elementi Pagina {currentPage} ({currentElements.length})</span>
                  {currentElements.length > 0 && (
                    <button
                      onClick={() => setElements((prev) => prev.filter((el) => el.pageIndex !== currentPage - 1))}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Cancella tutti
                    </button>
                  )}
                </div>

                {/* Quick Add Bar: Inserisci al volo nuove caselle */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('text');
                      handleAddText();
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Aggiungi una nuova casella di testo su questa pagina"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Testo</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('signature');
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Aggiungi firma su questa pagina"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Firma</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('image');
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Aggiungi immagine su questa pagina"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Immagine</span>
                  </button>
                </div>

                {currentElements.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    Nessun elemento inserito su questa pagina.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {currentElements.map((elem) => (
                      <div
                        key={elem.id}
                        onClick={() => {
                          setSelectedElementId(elem.id);
                          setActiveTab('inspector');
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                          selectedElementId === elem.id
                            ? 'bg-amber-50 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {elem.type === 'text' && <Type className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          {elem.type === 'signature' && <PenTool className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          {elem.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          <span className="truncate">
                            {elem.type === 'text' ? elem.text : `${elem.type.toUpperCase()}`}
                          </span>
                          <span className="text-[10px] text-slate-400">({elem.width}×{elem.height})</span>
                          {elem.hasBorder && <span className="text-[10px] text-rose-500 font-bold border border-rose-300 px-1 rounded">Bordo</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateElement(elem);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-600 transition cursor-pointer"
                            title="Duplica questo elemento"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(elem.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Elimina elemento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive PDF Canvas Viewport with Live Drag & Resize Handles */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/70 overflow-auto min-h-[500px]">
              {loadingPage ? (
                <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
                  <div className="w-7 h-7 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Rendering pagina {currentPage}...</span>
                </div>
              ) : pageDataUrl ? (
                <div
                  ref={previewRef}
                  onMouseMove={handleContainerMouseMove}
                  onMouseUp={handleContainerMouseUp}
                  style={{
                    width: pageDims.width * zoomScale,
                    height: pageDims.height * zoomScale,
                  }}
                  className="relative select-none shadow-xl border border-slate-300 dark:border-slate-700 bg-white transition-transform"
                >
                  {/* Background PDF page render */}
                  <img
                    src={pageDataUrl}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Interactive Overlaid Elements */}
                  {currentElements.map((elem) => {
                    const isSelected = selectedElementId === elem.id;
                    const borderStyle = elem.hasBorder
                      ? `${(elem.borderWidth || 1) * zoomScale}px solid ${elem.borderColor || '#dc2626'}`
                      : isSelected
                      ? '1px dashed #3b82f6'
                      : '1px solid transparent';

                    const bgStyle = elem.hasBackground
                      ? elem.backgroundColor || '#ffffff'
                      : 'transparent';

                    return (
                      <div
                        key={elem.id}
                        onMouseDown={(e) => handleElementMouseDown(e, elem)}
                        style={{
                          left: elem.x * zoomScale,
                          top: elem.y * zoomScale,
                          width: elem.width * zoomScale,
                          height: elem.height * zoomScale,
                          border: borderStyle,
                          backgroundColor: bgStyle,
                        }}
                        className={`absolute cursor-move transition-shadow flex items-center justify-center ${
                          isSelected
                            ? 'ring-2 ring-amber-500 ring-offset-1 shadow-lg'
                            : 'hover:ring-1 hover:ring-amber-400'
                        }`}
                      >
                        {elem.type === 'text' ? (
                          <div
                            style={{
                              fontSize: (elem.fontSize || 18) * zoomScale,
                              color: elem.color || '#000000',
                              fontFamily: elem.fontFamily === 'TimesRoman' ? 'Times New Roman, serif' : elem.fontFamily === 'Courier' ? 'Courier New, monospace' : 'sans-serif',
                              fontWeight: elem.isBold ? 'bold' : 'normal',
                              fontStyle: elem.isItalic ? 'italic' : 'normal',
                              padding: `${(elem.padding || 4) * zoomScale}px`,
                              lineHeight: 1.15,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {elem.text}
                          </div>
                        ) : (
                          <img
                            src={elem.dataUrl}
                            alt="Annotation"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        )}

                        {/* Top-Right Delete Badge when selected */}
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(elem.id);
                            }}
                            className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm hover:scale-110 cursor-pointer z-10"
                            title="Elimina"
                          >
                            ✕
                          </button>
                        )}

                        {/* Bottom-Right Interactive Resize Handle ↘️ */}
                        {isSelected && (
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, elem)}
                            className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-md cursor-se-resize flex items-center justify-center z-10 hover:scale-125 transition-transform"
                            title="Trascina per ridimensionare larghezza e altezza"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {/* Error Banner */}
          {previewError && (
            <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{previewError}</span>
              </div>
              <button
                onClick={() => setPreviewError(null)}
                className="text-xs font-bold hover:underline cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          )}

          {/* Success Download Banner */}
          {downloadUrl && (
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Modifiche applicate con successo al documento!
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Il file è pronto per il download ed è stato salvato nel tuo Archivio Sicuro locale.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPreview(currentPage)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-zinc-900 text-emerald-800 dark:text-emerald-200 font-semibold text-xs transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Riapri Anteprima</span>
                </button>
                <a
                  href={downloadUrl}
                  download={`${fileItem.file.name.replace(/\.pdf$/i, '')}_modificato.pdf`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica PDF Modificato ({resultBytes ? `${Math.round(resultBytes / 1024)} KB` : ''})</span>
                </a>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL: ANTEPRIMA PDF MODIFICATO (VERIFICA PRIMA DEL SALVATAGGIO) */}
          {/* ======================================================== */}
          {isPreviewOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 animate-in fade-in">
              <div className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/80 dark:bg-zinc-950/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Anteprima di Controllo - PDF Modificato</span>
                        <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Non ancora salvato
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {fileItem.file.name} · {elements.length} elementi impressi (testi, firme, contorni)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                    title="Chiudi anteprima e torna alle modifiche"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Navigation and Zoom Toolbar */}
                <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 text-xs">
                  {/* Page Switcher */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreviewPageChange(previewCurrentPage - 1)}
                      disabled={previewCurrentPage <= 1}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                      title="Pagina precedente"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold px-2">
                      Pagina {previewCurrentPage} di {totalPages}
                    </span>
                    <button
                      onClick={() => handlePreviewPageChange(previewCurrentPage + 1)}
                      disabled={previewCurrentPage >= totalPages}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                      title="Pagina successiva"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewZoom((z) => Math.max(0.6, z - 0.2))}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Riduci zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-zinc-500 w-12 text-center">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setPreviewZoom((z) => Math.min(1.6, z + 0.2))}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Aumenta zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewZoom(1.0)}
                      className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Reimposta 100%
                    </button>
                  </div>
                </div>

                {/* Modal Main Preview Viewport */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950/80 flex items-center justify-center">
                  {previewPageUrl ? (
                    <div
                      className="transition-transform duration-200 origin-center"
                      style={{ transform: `scale(${previewZoom})` }}
                    >
                      <img
                        src={previewPageUrl}
                        alt={`Anteprima pagina ${previewCurrentPage}`}
                        className="rounded-lg shadow-2xl border border-zinc-300 dark:border-zinc-800 max-h-[70vh] object-contain bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                      <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                      <p className="text-xs">Caricamento rendering ad alta definizione...</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                  >
                    <span>✏️ Torna alle Modifiche (Modifica ancora)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {previewPdfBytes && (
                      <button
                        onClick={() => {
                          const blob = new Blob([previewPdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${fileItem.file.name.replace(/\.pdf$/i, '')}_modificato.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Scarica Subito</span>
                      </button>
                    )}

                    <button
                      disabled={isProcessing}
                      onClick={handleConfirmSaveFromPreview}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvataggio nel Vault in corso...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Conferma & Salva nell'Archivio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
