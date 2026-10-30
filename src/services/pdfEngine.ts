import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import type { WatermarkOptions, PageNumberOptions, PdfEditElement } from '../types/pdf';

// Initialize PDF.js worker safely
if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch {
    // Worker initialization fallback
  }
}

/** Helper to convert hex color to RGB 0-1 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return { r: 1, g: 0, b: 0 }; // default red
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/** Get page count using pdf-lib (100% offline & fast) */
export async function getPdfPageCount(file: File | ArrayBuffer): Promise<number> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/** Merge multiple PDF files in given order */
export async function mergePdfs(
  files: (File | { file: File })[],
  onProgress?: (progress: number, message: string) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const actualFiles = files.map((f) => (f instanceof File ? f : f.file));

  for (let i = 0; i < actualFiles.length; i++) {
    const file = actualFiles[i];
    onProgress?.(
      Math.round(((i + 0.1) / actualFiles.length) * 100),
      `Caricamento ${file.name}...`
    );
    const buffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  onProgress?.(95, 'Generazione file PDF finale...');
  const mergedPdfBytes = await mergedPdf.save();
  onProgress?.(100, 'Unione completata!');
  return mergedPdfBytes;
}

/** Split PDF into ranges or individual pages */
export async function splitPdf(
  file: File,
  mode: 'all-pages' | 'ranges' | 'fixed-chunks',
  rangeString: string = '',
  chunkSize: number = 1,
  onProgress?: (progress: number) => void
): Promise<{ name: string; data: Uint8Array; pageCount: number }[]> {
  const buffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');
  const results: { name: string; data: Uint8Array; pageCount: number }[] = [];

  if (mode === 'all-pages') {
    for (let i = 0; i < totalPages; i++) {
      onProgress?.(Math.round(((i + 1) / totalPages) * 100));
      const subDoc = await PDFDocument.create();
      const [copiedPage] = await subDoc.copyPages(sourcePdf, [i]);
      subDoc.addPage(copiedPage);
      const data = await subDoc.save();
      results.push({
        name: `${baseName}_pagina_${i + 1}.pdf`,
        data,
        pageCount: 1,
      });
    }
  } else if (mode === 'ranges') {
    // Parse range string like "1-3, 5, 7-9"
    const ranges = rangeString
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    for (let idx = 0; idx < ranges.length; idx++) {
      const part = ranges[idx];
      let start = 1;
      let end = 1;

      if (part.includes('-')) {
        const [sStr, eStr] = part.split('-');
        start = parseInt(sStr, 10);
        end = parseInt(eStr, 10);
      } else {
        start = parseInt(part, 10);
        end = start;
      }

      if (isNaN(start) || start < 1) start = 1;
      if (isNaN(end) || end > totalPages) end = totalPages;
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }

      const indices: number[] = [];
      for (let p = start; p <= end; p++) {
        if (p <= totalPages) indices.push(p - 1);
      }

      if (indices.length > 0) {
        const subDoc = await PDFDocument.create();
        const copied = await subDoc.copyPages(sourcePdf, indices);
        copied.forEach((cp) => subDoc.addPage(cp));
        const data = await subDoc.save();
        results.push({
          name: `${baseName}_pagine_${start}-${end}.pdf`,
          data,
          pageCount: indices.length,
        });
      }
      onProgress?.(Math.round(((idx + 1) / ranges.length) * 100));
    }
  } else if (mode === 'fixed-chunks') {
    let chunkIndex = 1;
    for (let i = 0; i < totalPages; i += chunkSize) {
      const indices: number[] = [];
      for (let j = i; j < Math.min(i + chunkSize, totalPages); j++) {
        indices.push(j);
      }
      const subDoc = await PDFDocument.create();
      const copied = await subDoc.copyPages(sourcePdf, indices);
      copied.forEach((cp) => subDoc.addPage(cp));
      const data = await subDoc.save();
      results.push({
        name: `${baseName}_parte_${chunkIndex}.pdf`,
        data,
        pageCount: indices.length,
      });
      chunkIndex++;
      onProgress?.(Math.round(((i + chunkSize) / totalPages) * 100));
    }
  }

  return results;
}

/** Extract specific page indices from PDF */
export async function extractPages(
  file: File,
  pages1Indexed: number[]
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const newDoc = await PDFDocument.create();

  const valid0Indices = pages1Indexed
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < totalPages);

  if (valid0Indices.length === 0) {
    throw new Error('Nessuna pagina valida selezionata per l\'estrazione.');
  }

  const copied = await newDoc.copyPages(sourcePdf, valid0Indices);
  copied.forEach((page) => newDoc.addPage(page));
  return await newDoc.save();
}

/** Reorganize & Rotate individual pages */
export interface PageConfig {
  originalIndex: number; // 0-indexed
  rotation: number; // 0, 90, 180, 270
}

export async function organizePdfPages(
  file: File,
  pagesConfig: PageConfig[]
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const cfg of pagesConfig) {
    const [copied] = await newDoc.copyPages(sourcePdf, [cfg.originalIndex]);
    const currentRot = copied.getRotation().angle;
    copied.setRotation(degrees((currentRot + cfg.rotation) % 360));
    newDoc.addPage(copied);
  }

  return await newDoc.save();
}

/** Rotate all or selected pages */
export async function rotatePdf(
  file: File,
  angle: number, // 90, 180, 270
  pagesTarget: 'all' | 'odd' | 'even' = 'all'
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    const pageNum = index + 1;
    let shouldRotate = false;
    if (pagesTarget === 'all') shouldRotate = true;
    else if (pagesTarget === 'odd' && pageNum % 2 !== 0) shouldRotate = true;
    else if (pagesTarget === 'even' && pageNum % 2 === 0) shouldRotate = true;

    if (shouldRotate) {
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + angle) % 360));
    }
  });

  return await pdfDoc.save();
}

/** Add Watermark (filigrana) with red default matching PyMuPDF specification */
export async function addWatermark(
  file: File,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const rgbColor = hexToRgb(options.color || '#ef4444');

  pages.forEach((page, index) => {
    const pageNum = index + 1;
    let apply = true;

    if (options.pages === 'odd') apply = pageNum % 2 !== 0;
    else if (options.pages === 'even') apply = pageNum % 2 === 0;
    else if (Array.isArray(options.pages)) apply = options.pages.includes(pageNum);

    if (apply) {
      const { width, height } = page.getSize();
      // Calculate centered diagonal positioning matching PyMuPDF:
      // (rect.width / 4, rect.height / 2), rotate=45, fill_opacity=0.3
      const text = options.text || 'CONFIDENZIALE';
      page.drawText(text, {
        x: width * 0.2,
        y: height * 0.45,
        size: options.fontSize || 48,
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        rotate: degrees(options.rotation !== undefined ? options.rotation : 45),
        opacity: options.opacity !== undefined ? options.opacity : 0.35,
      });
    }
  });

  return await pdfDoc.save();
}

/** Add Page Numbers to PDF */
export async function addPageNumbers(
  file: File,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const startFrom = options.startFrom || 1;
  const fontSize = options.fontSize || 10;
  const margin = options.margin || 25;

  pages.forEach((page, idx) => {
    const currentNumber = startFrom + idx;
    let text = `${currentNumber}`;
    if (options.format === 'page_of_total') {
      text = `Pagina ${currentNumber} di ${startFrom + total - 1}`;
    } else if (options.format === 'custom' && options.customTemplate) {
      text = options.customTemplate
        .replace(/{n}/g, String(currentNumber))
        .replace(/{total}/g, String(total));
    }

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = width / 2 - textWidth / 2;
    let y = margin;

    switch (options.position) {
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = margin;
        break;
      case 'bottom-right':
        x = width - margin - textWidth;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - margin - fontSize;
        break;
      case 'top-right':
        x = width - margin - textWidth;
        y = height - margin - fontSize;
        break;
      case 'top-left':
        x = margin;
        y = height - margin - fontSize;
        break;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  return await pdfDoc.save();
}

/** Convert Images to a single PDF */
export async function imagesToPdf(
  imageFiles: File[],
  options: { orientation: 'portrait' | 'landscape' | 'fit'; margin: number } = {
    orientation: 'fit',
    margin: 20,
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer();
    let image;
    if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else {
      // JPEG or default
      image = await pdfDoc.embedJpg(arrayBuffer);
    }

    const { width: imgW, height: imgH } = image;
    let pageW = 595.28; // A4 standard pt
    let pageH = 841.89;

    if (options.orientation === 'fit') {
      // Auto orientation based on image aspect ratio
      if (imgW > imgH) {
        pageW = 841.89;
        pageH = 595.28;
      }
    } else if (options.orientation === 'landscape') {
      pageW = 841.89;
      pageH = 595.28;
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    const margin = options.margin;
    const availableW = pageW - margin * 2;
    const availableH = pageH - margin * 2;

    const scale = Math.min(availableW / imgW, availableH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const x = margin + (availableW - drawW) / 2;
    const y = margin + (availableH - drawH) / 2;

    page.drawImage(image, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  return await pdfDoc.save();
}

/** Render a single PDF page to an Image Data URL via PDF.js */
export async function renderPageToImage(
  pdfData: ArrayBuffer | Uint8Array,
  pageNumber: number,
  scale: number = 2.0,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.92
): Promise<{ dataUrl: string; width: number; height: number; blob: Blob }> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfData),
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context non disponibile');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Render on white background (essential for transparent PNG converted to JPEG)
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: context, viewport } as any).promise;

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b || new Blob()), mimeType, quality)
  );

  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
    blob,
  };
}

/** Extract text from PDF document */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  fullText: string;
  pages: { pageNumber: number; text: string }[];
  wordCount: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const pages: { pageNumber: number; text: string }[] = [];
  let fullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageString = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str)
      .join(' ');

    pages.push({ pageNumber: i, text: pageString });
    fullText += `--- Pagina ${i} ---\n${pageString}\n\n`;
    onProgress?.(Math.round((i / totalPages) * 100));
  }

  const wordCount = fullText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return { fullText, pages, wordCount };
}

/** Compress / Optimize PDF bytes (re-encodes objects and strips metadata) */
export async function compressPdf(
  file: File,
  level: 'standard' | 'aggressive' = 'standard'
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  if (level === 'aggressive') {
    // Strip metadata info to save bytes
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('LibrePDF Studio');
    pdfDoc.setCreator('LibrePDF Studio');
  }

  // Save with object stream compression
  return await pdfDoc.save({ useObjectStreams: true });
}

/** Flatten interactive form fields and annotations into static vectors */
export async function flattenPdf(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch {
    // If no AcroForm fields exist, document is already flat
  }
  return await pdfDoc.save({ useObjectStreams: true });
}

/** Rebuild XRef table and reconstruct document tree to repair damaged PDF files */
export async function repairPdf(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  return await pdfDoc.save({ useObjectStreams: true });
}

/** Convert PDF to grayscale / monochrome for printing and archiving */
export async function convertPdfToGrayscale(
  file: File,
  scale: number = 2.0,
  onProgress?: (progress: number, page: number, total: number) => void
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(Math.round(((i - 0.5) / totalPages) * 100), i, totalPages);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context non disponibile');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx, viewport } as any).promise;

    // Convert pixel data to grayscale (ITU-R BT.601 luma)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let j = 0; j < data.length; j += 4) {
      const gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
      data[j] = gray;
      data[j + 1] = gray;
      data[j + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);

    const jpegBlob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.90)
    );
    const jpegBytes = await jpegBlob.arrayBuffer();
    const embeddedImage = await newDoc.embedJpg(jpegBytes);

    const originalViewport = page.getViewport({ scale: 1.0 });
    const newPage = newDoc.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });

    onProgress?.(Math.round((i / totalPages) * 100), i, totalPages);
  }

  return await newDoc.save({ useObjectStreams: true });
}

/** Detailed PDF metadata and technical inspection */
export async function inspectPdfDetails(file: File): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageWidthPt: number;
  pageHeightPt: number;
  pageWidthMm: number;
  pageHeightMm: number;
  hasAcroForm: boolean;
}> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const firstPage = pageCount > 0 ? pdfDoc.getPage(0) : null;
  const widthPt = firstPage ? firstPage.getWidth() : 0;
  const heightPt = firstPage ? firstPage.getHeight() : 0;

  let hasAcroForm = false;
  try {
    const form = pdfDoc.getForm();
    hasAcroForm = form.getFields().length > 0;
  } catch {
    hasAcroForm = false;
  }

  return {
    pageCount,
    title: pdfDoc.getTitle(),
    author: pdfDoc.getAuthor(),
    creator: pdfDoc.getCreator(),
    producer: pdfDoc.getProducer(),
    creationDate: pdfDoc.getCreationDate(),
    modificationDate: pdfDoc.getModificationDate(),
    pageWidthPt: Math.round(widthPt),
    pageHeightPt: Math.round(heightPt),
    pageWidthMm: Math.round(widthPt * 0.352778),
    pageHeightMm: Math.round(heightPt * 0.352778),
    hasAcroForm,
  };
}

/** Helper to convert base64 dataUrl to Uint8Array */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Apply texts, images and signatures to PDF pages and export */
export async function applyPdfEdits(
  file: File,
  elements: PdfEditElement[],
  previewDimensionsByPage: Record<number, { width: number; height: number }>,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  // Group elements by pageIndex
  const elementsByPage: Record<number, PdfEditElement[]> = {};
  for (const elem of elements) {
    if (!elementsByPage[elem.pageIndex]) {
      elementsByPage[elem.pageIndex] = [];
    }
    elementsByPage[elem.pageIndex].push(elem);
  }

  // Pre-load common standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const getFont = (family?: string, isBold?: boolean, isItalic?: boolean) => {
    if (family === 'TimesRoman') {
      return isBold ? fontTimesBold : fontTimes;
    }
    if (family === 'Courier') {
      return isBold ? fontCourierBold : fontCourier;
    }
    if (isBold) return fontHelveticaBold;
    if (isItalic) return fontHelveticaOblique;
    return fontHelvetica;
  };

  const pageIndices = Object.keys(elementsByPage).map(Number);
  let processed = 0;

  for (const pageIdx of pageIndices) {
    if (pageIdx < 0 || pageIdx >= totalPages) continue;
    const page = pdfDoc.getPage(pageIdx);
    const pdfW = page.getWidth();
    const pdfH = page.getHeight();
    const previewDim = previewDimensionsByPage[pageIdx] || { width: pdfW, height: pdfH };
    const scaleX = pdfW / previewDim.width;
    const scaleY = pdfH / previewDim.height;

    const pageElements = elementsByPage[pageIdx];
    for (const elem of pageElements) {
      const elemW = elem.width * scaleX;
      const elemH = elem.height * scaleY;
      const x = elem.x * scaleX;
      const y = pdfH - (elem.y * scaleY) - elemH;

      // Draw background and/or border frame if enabled
      if (elem.hasBorder || elem.hasBackground) {
        const bColor = elem.hasBorder ? hexToRgb(elem.borderColor || '#000000') : undefined;
        const bgColor = elem.hasBackground ? hexToRgb(elem.backgroundColor || '#ffffff') : undefined;
        const bWidth = elem.hasBorder ? Math.max(1, (elem.borderWidth || 1) * scaleX) : 0;

        page.drawRectangle({
          x,
          y,
          width: elemW,
          height: elemH,
          borderWidth: bWidth,
          borderColor: bColor ? rgb(bColor.r, bColor.g, bColor.b) : undefined,
          color: bgColor ? rgb(bgColor.r, bgColor.g, bgColor.b) : undefined,
        });
      }

      if (elem.type === 'text' && elem.text) {
        const font = getFont(elem.fontFamily, elem.isBold, elem.isItalic);
        const fontSize = (elem.fontSize || 16) * scaleX;
        const color = hexToRgb(elem.color || '#000000');
        const pad = (elem.padding || 4) * scaleX;
        const textX = x + pad;
        const textY = y + Math.max(0, (elemH - fontSize) / 2);
        page.drawText(elem.text, {
          x: textX,
          y: Math.max(y, textY),
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
        });
      } else if ((elem.type === 'image' || elem.type === 'signature') && elem.dataUrl) {
        try {
          const imageBytes = dataUrlToUint8Array(elem.dataUrl);
          const isJpg = elem.dataUrl.startsWith('data:image/jpeg') || elem.dataUrl.startsWith('data:image/jpg');
          const embeddedImage = isJpg
            ? await pdfDoc.embedJpg(imageBytes)
            : await pdfDoc.embedPng(imageBytes);

          page.drawImage(embeddedImage, {
            x,
            y,
            width: elemW,
            height: elemH,
            opacity: elem.opacity ?? 1,
          });
        } catch (err) {
          console.warn('Errore embedding immagine/firma:', err);
        }
      }
    }

    processed++;
    onProgress?.(Math.round((processed / Math.max(1, pageIndices.length)) * 90));
  }

  onProgress?.(95);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  onProgress?.(100);
  return pdfBytes;
}

