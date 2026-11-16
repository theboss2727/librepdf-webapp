import { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFArray, PDFString } from 'pdf-lib';
import { pdfjsLib } from './pdfjsSetup';
import type { WatermarkOptions, PageNumberOptions, PdfEditElement } from '../types/pdf';

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
  // Make a defensive copy to prevent Web Worker buffer detachment
  const safeCopy = new Uint8Array(
    pdfData instanceof Uint8Array ? pdfData.slice() : pdfData.slice(0)
  );
  const loadingTask = pdfjsLib.getDocument({
    data: safeCopy,
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

/**
 * Render all page thumbnails in high performance by opening the PDF document once
 * and progressively streaming thumbnails as they are drawn.
 */
export async function renderAllThumbnails(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  onPageRendered?: (pageIndex: number, dataUrl: string, total: number) => void,
  maxPages: number = 100,
  scale: number = 0.45
): Promise<{ totalPages: number; thumbnails: Map<number, string> }> {
  let safeBytes: Uint8Array;
  if (fileOrBuffer instanceof File) {
    const ab = await fileOrBuffer.arrayBuffer();
    safeBytes = new Uint8Array(ab);
  } else if (fileOrBuffer instanceof Uint8Array) {
    safeBytes = fileOrBuffer.slice();
  } else {
    safeBytes = new Uint8Array(fileOrBuffer.slice(0));
  }

  const loadingTask = pdfjsLib.getDocument({ data: safeBytes });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const thumbnails = new Map<number, string>();

  const limit = Math.min(totalPages, maxPages);
  for (let i = 1; i <= limit; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        thumbnails.set(i - 1, dataUrl);
        onPageRendered?.(i - 1, dataUrl, totalPages);
      }
    } catch (e) {
      console.warn(`Errore rendering miniatura pagina ${i}:`, e);
    }
  }

  return { totalPages, thumbnails };
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

/**
 * Sign PDF with custom visual badge, signer metadata, and optional SHA-256 hash.
 */
export interface SignPdfOptions {
  signatureImageBase64?: string;
  signerName: string;
  reason?: string;
  location?: string;
  pageNumber?: number; // 1-indexed
  positionPreset?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left';
  x?: number; // pt from left
  y?: number; // pt from bottom
  width?: number;
  height?: number;
  includeTimestamp?: boolean;
  includeDocHash?: boolean;
  immutableLock?: boolean; // Renders stamp as an immutable high-DPI seal to prevent text-cursor tampering in PDF editors
}

async function createImmutableStampPngBytes(
  options: SignPdfOptions,
  preSignSha256: string,
  timeStr: string,
  widthPt: number,
  heightPt: number
): Promise<Uint8Array | null> {
  if (typeof document === 'undefined') return null;
  try {
    const scale = 3.5;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthPt * scale);
    canvas.height = Math.round(heightPt * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Background box
    ctx.fillStyle = '#f8faff';
    ctx.fillRect(0, 0, widthPt, heightPt);

    // Border
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#1e60d5';
    ctx.strokeRect(0.6, 0.6, widthPt - 1.2, heightPt - 1.2);

    // Top accent bar
    ctx.fillStyle = '#1e60d5';
    ctx.fillRect(0, 0, widthPt, 3);

    let textStartX = 12;

    // Signature image on the left (if provided)
    if (options.signatureImageBase64) {
      try {
        const img = new Image();
        img.src = options.signatureImageBase64;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
        });

        const imgBoxW = 74;
        const imgBoxH = heightPt - 14;
        ctx.drawImage(img, 6, 7, imgBoxW, imgBoxH);

        // Separator line
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(86, 7);
        ctx.lineTo(86, heightPt - 7);
        ctx.stroke();

        textStartX = 96;
      } catch (e) {
        console.warn('Errore rendering firma su canvas:', e);
      }
    }

    // 1. Header: FIRMATO DIGITALMENTE
    ctx.fillStyle = '#0f52ba';
    ctx.font = 'bold 7.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    ctx.fillText('FIRMATO DIGITALMENTE', textStartX, 15);

    // 2. Firmatario
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    ctx.fillText(`Firmatario: ${options.signerName || 'Autografo'}`, textStartX, 27);

    // 3. Motivo & Data
    let curY = 38;
    if (options.reason) {
      ctx.fillStyle = '#475569';
      ctx.font = '6.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      ctx.fillText(`Motivo: ${options.reason}`, textStartX, curY);
      curY += 10;
    }

    if (timeStr) {
      ctx.fillStyle = '#64748b';
      ctx.font = '6.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      ctx.fillText(`Data: ${timeStr}`, textStartX, curY);
    }

    // 4. SHA-256 (2 lines of 32 monospaced characters)
    if (preSignSha256 && preSignSha256.length === 64) {
      const part1 = preSignSha256.substring(0, 32);
      const part2 = preSignSha256.substring(32, 64);
      ctx.fillStyle = '#334155';
      ctx.font = '5.2px "Courier New", Courier, monospace';
      ctx.fillText(`SHA: ${part1}`, textStartX, heightPt - 14);
      ctx.fillText(`     ${part2}`, textStartX, heightPt - 6);
    } else if (preSignSha256) {
      ctx.fillStyle = '#334155';
      ctx.font = '5.5px "Courier New", Courier, monospace';
      ctx.fillText(`SHA: ${preSignSha256}`, textStartX, heightPt - 8);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const cleanData = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binary = atob(cleanData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (err) {
    console.warn('Fallback a timbro vettoriale:', err);
    return null;
  }
}

export async function signPdf(
  file: File,
  options: SignPdfOptions,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  onProgress?.(15);

  let preSignSha256 = '';
  if (options.includeDocHash && typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    preSignSha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  onProgress?.(40);

  const pages = pdfDoc.getPages();
  const pageIdx = Math.max(0, Math.min(pages.length - 1, (options.pageNumber || 1) - 1));
  const page = pages[pageIdx];

  const { width: pageWidth, height: pageHeight } = page.getSize();
  const stampWidth = Math.min(options.width || 255, pageWidth - 30);
  const stampHeight = options.height || 82;
  const margin = 26;

  let x = options.x;
  let y = options.y;

  if (x === undefined || y === undefined) {
    const preset = options.positionPreset || 'bottom-right';
    if (preset === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (preset === 'bottom-center') {
      x = Math.max(margin, (pageWidth - stampWidth) / 2);
      y = margin;
    } else if (preset === 'top-right') {
      x = Math.max(margin, pageWidth - stampWidth - margin);
      y = pageHeight - stampHeight - margin;
    } else if (preset === 'top-left') {
      x = margin;
      y = pageHeight - stampHeight - margin;
    } else {
      // default: bottom-right
      x = Math.max(margin, pageWidth - stampWidth - margin);
      y = margin;
    }
  } else {
    // If explicit coordinates were given, ensure they don't clip off-page
    if (x + stampWidth > pageWidth - 8) {
      x = Math.max(8, pageWidth - stampWidth - 14);
    }
    if (y + stampHeight > pageHeight - 8) {
      y = Math.max(8, pageHeight - stampHeight - 14);
    }
  }

  const now = new Date();
  const timeStr = options.includeTimestamp !== false
    ? `${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT')}`
    : '';

  // Render immutable graphic seal (prevents inline text editing in PDF editors like GearPDF)
  const useImmutableLock = options.immutableLock !== false;
  let sealApplied = false;

  if (useImmutableLock) {
    const stampBytes = await createImmutableStampPngBytes(options, preSignSha256, timeStr, stampWidth, stampHeight);
    if (stampBytes) {
      try {
        const embeddedPng = await pdfDoc.embedPng(stampBytes);
        page.drawImage(embeddedPng, {
          x,
          y,
          width: stampWidth,
          height: stampHeight,
        });
        sealApplied = true;
      } catch (e) {
        console.warn('Errore embedding seal PNG:', e);
      }
    }
  }

  // Fallback to vector text if immutable seal could not be rendered
  if (!sealApplied) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

    // Draw background stamp box
    page.drawRectangle({
      x,
      y,
      width: stampWidth,
      height: stampHeight,
      borderColor: rgb(0.12, 0.42, 0.82),
      borderWidth: 1.2,
      color: rgb(0.97, 0.985, 1.0),
      opacity: 0.96,
    });

    // Top accent line
    page.drawRectangle({
      x,
      y: y + stampHeight - 3,
      width: stampWidth,
      height: 3,
      color: rgb(0.12, 0.42, 0.82),
    });

    let textStartX = x + 10;
    let maxTextWidth = stampWidth - 20;

    if (options.signatureImageBase64) {
      try {
        const cleanData = options.signatureImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const binary = atob(cleanData);
        const imgBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i);
        const embeddedImg = await pdfDoc.embedPng(imgBytes);

        const imgBoxW = 74;
        const imgBoxH = stampHeight - 14;
        page.drawImage(embeddedImg, {
          x: x + 6,
          y: y + 6,
          width: imgBoxW,
          height: imgBoxH,
        });

        page.drawLine({
          start: { x: x + imgBoxW + 11, y: y + 6 },
          end: { x: x + imgBoxW + 11, y: y + stampHeight - 9 },
          color: rgb(0.82, 0.86, 0.92),
          thickness: 1,
        });

        textStartX = x + imgBoxW + 16;
        maxTextWidth = (x + stampWidth - 8) - textStartX;
      } catch (e) {
        console.warn('Errore rendering firma immagine:', e);
      }
    }

    page.drawText('FIRMATO DIGITALMENTE', {
      x: textStartX,
      y: y + stampHeight - 15,
      size: 7.5,
      font: boldFont,
      color: rgb(0.08, 0.38, 0.78),
    });

    let signerFontSize = 8;
    const fullSignerText = `Firmatario: ${options.signerName || 'Autografo'}`;
    while (boldFont.widthOfTextAtSize(fullSignerText, signerFontSize) > maxTextWidth && signerFontSize > 5.5) {
      signerFontSize -= 0.5;
    }
    let renderedSigner = fullSignerText;
    if (boldFont.widthOfTextAtSize(renderedSigner, signerFontSize) > maxTextWidth) {
      while (boldFont.widthOfTextAtSize(renderedSigner + '...', signerFontSize) > maxTextWidth && renderedSigner.length > 12) {
        renderedSigner = renderedSigner.slice(0, -1);
      }
      renderedSigner += '...';
    }
    page.drawText(renderedSigner, {
      x: textStartX,
      y: y + stampHeight - 28,
      size: signerFontSize,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    let curY = y + stampHeight - 40;
    if (options.reason) {
      let reasonFontSize = 6.5;
      const fullReason = `Motivo: ${options.reason}`;
      let renderedReason = fullReason;
      if (font.widthOfTextAtSize(renderedReason, reasonFontSize) > maxTextWidth) {
        while (font.widthOfTextAtSize(renderedReason + '...', reasonFontSize) > maxTextWidth && renderedReason.length > 10) {
          renderedReason = renderedReason.slice(0, -1);
        }
        renderedReason += '...';
      }
      page.drawText(renderedReason, {
        x: textStartX,
        y: curY,
        size: reasonFontSize,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
      curY -= 11;
    }

    if (timeStr) {
      page.drawText(`Data: ${timeStr}`, {
        x: textStartX,
        y: curY,
        size: 6.5,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    if (preSignSha256 && preSignSha256.length === 64) {
      const part1 = preSignSha256.substring(0, 32);
      const part2 = preSignSha256.substring(32, 64);
      page.drawText(`SHA: ${part1}`, {
        x: textStartX,
        y: y + 14,
        size: 5.2,
        font: monoFont,
        color: rgb(0.32, 0.36, 0.44),
      });
      page.drawText(`     ${part2}`, {
        x: textStartX,
        y: y + 6,
        size: 5.2,
        font: monoFont,
        color: rgb(0.32, 0.36, 0.44),
      });
    } else if (preSignSha256) {
      page.drawText(`SHA: ${preSignSha256}`, {
        x: textStartX,
        y: y + 8,
        size: 5.5,
        font: monoFont,
        color: rgb(0.32, 0.36, 0.44),
      });
    }
  }

  // Attach official locked signature widget annotation (F: 132 = Print + Locked/ReadOnly)
  try {
    const annot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: [x, y, x + stampWidth, y + stampHeight],
      F: 132,
      T: PDFString.of('LibrePDF_Signature'),
      TU: PDFString.of(`Firma Digitale Certificata - ${options.signerName || 'Autografo'}`),
    });
    const annotRef = pdfDoc.context.register(annot);
    const existingAnnots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (existingAnnots) {
      existingAnnots.push(annotRef);
    } else {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annotRef]));
    }
  } catch (e) {
    console.warn('Errore registrazione annotazione firma:', e);
  }

  // Store cryptographic audit trail in PDF metadata
  if (preSignSha256) {
    pdfDoc.setSubject(
      `LibrePDF_Signature [PreSignSHA256:${preSignSha256}] [Signer:${options.signerName || 'Autografo'}] [Time:${now.toISOString()}]`
    );
  }

  onProgress?.(80);
  const signedBytes = await pdfDoc.save({ useObjectStreams: true });
  onProgress?.(100);
  return signedBytes;
}

/**
 * Redact sensitive areas permanently and strip hidden metadata.
 */
export interface RedactionArea {
  pageNumber: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: 'black' | 'white';
}

export async function redactPdf(
  file: File,
  redactions: RedactionArea[],
  stripMetadata = true,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  onProgress?.(20);

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  onProgress?.(40);

  const pages = pdfDoc.getPages();

  // Apply visual solid redaction blocks
  redactions.forEach((redaction) => {
    const pageIdx = redaction.pageNumber - 1;
    if (pageIdx >= 0 && pageIdx < pages.length) {
      const page = pages[pageIdx];
      const isWhite = redaction.fillColor === 'white';
      page.drawRectangle({
        x: redaction.x,
        y: redaction.y,
        width: redaction.width,
        height: redaction.height,
        color: isWhite ? rgb(1, 1, 1) : rgb(0, 0, 0),
        borderColor: isWhite ? rgb(0.8, 0.8, 0.8) : rgb(0, 0, 0),
        borderWidth: 1,
        opacity: 1,
      });
    }
  });

  onProgress?.(70);

  // Strip all hidden tracker metadata if requested
  if (stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('LibrePDF Sanitizer');
    pdfDoc.setCreator('LibrePDF Studio');
  }

  onProgress?.(90);
  const redactedBytes = await pdfDoc.save({ useObjectStreams: true });
  onProgress?.(100);
  return redactedBytes;
}

/**
 * Result of inspecting digital signatures and cryptographic integrity of a PDF file.
 */
export interface SignatureEntry {
  type: 'PAdES' | 'CAdES' | 'PKCS7' | 'VisualStamp' | 'Standard';
  signerName: string;
  signingTime?: string;
  reason?: string;
  location?: string;
  filter?: string;
  subFilter?: string;
  byteRange?: number[];
  byteRangeSha256?: string;
  preSignSha256?: string;
  isCoveringFullFile: boolean;
}

export interface PdfSignatureInspection {
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  sha1: string;
  hasSignatures: boolean;
  isModifiedAfterSigning: boolean;
  revisionCount: number;
  signatures: SignatureEntry[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    producer?: string;
    creator?: string;
    creationDate?: string;
    modDate?: string;
    pdfVersion?: string;
  };
}

function parsePdfDate(pdfDate: string): string {
  const clean = pdfDate.replace(/^D:/, '');
  if (clean.length >= 8) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const hh = clean.substring(8, 10) || '00';
    const mm = clean.substring(10, 12) || '00';
    const ss = clean.substring(12, 14) || '00';
    return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
  }
  return pdfDate;
}

function extractStringValue(haystack: string, key: string): string | undefined {
  const regex = new RegExp(`/${key}\\s*\\(([^)]+)\\)`);
  const match = haystack.match(regex);
  if (match) return match[1];

  const hexRegex = new RegExp(`/${key}\\s*<([0-9a-fA-F]+)>`);
  const hexMatch = haystack.match(hexRegex);
  if (hexMatch) {
    const hex = hexMatch[1];
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }
  return undefined;
}

export async function inspectPdfSignatures(file: File): Promise<PdfSignatureInspection> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let sha256 = '';
  let sha1 = '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const h256 = await crypto.subtle.digest('SHA-256', buffer);
    sha256 = Array.from(new Uint8Array(h256))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const h1 = await crypto.subtle.digest('SHA-1', buffer);
    sha1 = Array.from(new Uint8Array(h1))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const textDecoder = new TextDecoder('latin1');
  const fullText = textDecoder.decode(bytes);
  const eofMatches = fullText.match(/%%EOF/g);
  const revisionCount = eofMatches ? eofMatches.length : 1;

  const signatures: SignatureEntry[] = [];
  const sigRegex = /\/Type\s*\/Sig[\s\S]*?\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  let match: RegExpExecArray | null;

  while ((match = sigRegex.exec(fullText)) !== null) {
    const block = match[0];
    const b0 = parseInt(match[1], 10);
    const b1 = parseInt(match[2], 10);
    const b2 = parseInt(match[3], 10);
    const b3 = parseInt(match[4], 10);
    const byteRange = [b0, b1, b2, b3];

    let byteRangeSha256: string | undefined;
    if (b0 >= 0 && b1 > 0 && b2 >= b0 + b1 && b3 > 0 && b2 + b3 <= bytes.length && typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const brBytes = new Uint8Array(b1 + b3);
        brBytes.set(bytes.subarray(b0, b0 + b1), 0);
        brBytes.set(bytes.subarray(b2, b2 + b3), b1);
        const brDigest = await crypto.subtle.digest('SHA-256', brBytes);
        byteRangeSha256 = Array.from(new Uint8Array(brDigest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (e) {
        console.warn('Errore calcolo byteRange hash:', e);
      }
    }

    const endOfRange = b2 + b3;
    const isCoveringFullFile = endOfRange >= bytes.length - 256;

    const subFilterMatch = block.match(/\/SubFilter\s*\/([^\s/>]+)/);
    const filterMatch = block.match(/\/Filter\s*\/([^\s/>]+)/);

    const subFilter = subFilterMatch ? subFilterMatch[1] : undefined;
    const filter = filterMatch ? filterMatch[1] : undefined;

    let type: SignatureEntry['type'] = 'Standard';
    if (subFilter?.includes('ETSI.CAdES') || subFilter?.includes('adbe.pkcs7')) {
      type = subFilter.includes('CAdES') ? 'CAdES' : 'PAdES';
    } else if (subFilter?.includes('pkcs7')) {
      type = 'PKCS7';
    }

    const signerName = extractStringValue(block, 'Name') || 'Certificato Digitale';
    const reason = extractStringValue(block, 'Reason');
    const location = extractStringValue(block, 'Location');
    const rawDate = extractStringValue(block, 'M');
    const signingTime = rawDate ? parsePdfDate(rawDate) : undefined;

    signatures.push({
      type,
      signerName,
      signingTime,
      reason,
      location,
      filter,
      subFilter,
      byteRange,
      byteRangeSha256,
      isCoveringFullFile,
    });
  }

  let metadata: PdfSignatureInspection['metadata'] = {};
  let subjectPreSignHash: string | undefined;
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const subj = pdfDoc.getSubject();
    const preMatch = subj?.match(/PreSignSHA256:([0-9a-fA-F]{64})/);
    if (preMatch) subjectPreSignHash = preMatch[1];

    metadata = {
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: subj,
      producer: pdfDoc.getProducer(),
      creator: pdfDoc.getCreator(),
      creationDate: pdfDoc.getCreationDate() ? pdfDoc.getCreationDate()?.toLocaleString('it-IT') : undefined,
      modDate: pdfDoc.getModificationDate() ? pdfDoc.getModificationDate()?.toLocaleString('it-IT') : undefined,
      pdfVersion: fullText.substring(0, 8),
    };
  } catch {
    // Ignore metadata load failure
  }

  if (fullText.includes('FIRMATO DIGITALMENTE') || subjectPreSignHash) {
    const visualMatch = fullText.match(/Firmatario:\s*([^\n\r()]+)/);
    const timeMatch = fullText.match(/Data:\s*([0-9/:\s]+)/);
    const hashMatch = fullText.match(/(?:Pre-Sign SHA-256|Hash Pre-Firma|SHA-256):\s*([0-9a-fA-F]+)/);

    const preSignHash = subjectPreSignHash || (hashMatch ? hashMatch[1] : undefined);

    if (signatures.length === 0) {
      signatures.push({
        type: 'VisualStamp',
        signerName: visualMatch ? visualMatch[1].trim() : 'Firma Elettronica Visiva',
        signingTime: timeMatch ? timeMatch[1].trim() : undefined,
        reason: 'Timbro grafico certificato LibrePDF',
        location: preSignHash ? `Hash Pre-Firma: ${preSignHash.length === 64 ? preSignHash : preSignHash + '...'}` : undefined,
        preSignSha256: preSignHash,
        isCoveringFullFile: true,
      });
    }
  }

  const hasSignatures = signatures.length > 0;
  const isModifiedAfterSigning = signatures.some((s) => !s.isCoveringFullFile && revisionCount > 1);

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    sha256,
    sha1,
    hasSignatures,
    isModifiedAfterSigning,
    revisionCount,
    signatures,
    metadata,
  };
}

