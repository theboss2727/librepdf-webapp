import { createWorker } from 'tesseract.js';
import { pdfjsLib } from './pdfjsSetup';
import { renderPageToImage, getPdfPageCount } from './pdfEngine';
import type { OcrOptions, OcrPageResult } from '../types/pdf';

/**
 * Execute client-side WebAssembly Optical Character Recognition (OCR)
 * on a PDF document or scanned image with live page callbacks and robust progress tracking.
 */
export async function performOcrOnPdf(
  file: File,
  options: OcrOptions = { language: 'ita' },
  onProgress?: (
    currentPage: number,
    totalPages: number,
    pagePercent: number,
    statusText: string
  ) => void,
  onPageComplete?: (pageResult: OcrPageResult) => void
): Promise<{
  fullText: string;
  pages: OcrPageResult[];
  averageConfidence: number;
  totalWords: number;
}> {
  const language = options.language || 'ita';
  let activePageNum = 0;
  let totalPagesCount = 1;

  onProgress?.(0, 1, 5, 'Avvio motore OCR WebAssembly SIMD...');

  // Initialize Tesseract Worker with detailed logger
  let worker;
  try {
    worker = await createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') {
          onProgress?.(activePageNum, totalPagesCount, 10, 'Caricamento motore Tesseract SIMD...');
        } else if (m.status === 'loading language traineddata') {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress?.(
            activePageNum,
            totalPagesCount,
            15 + Math.round(pct * 0.25),
            `Download modello OCR ${language.toUpperCase()} (${pct}%)...`
          );
        } else if (
          m.status === 'initializing tesseract' ||
          m.status === 'initialized tesseract' ||
          m.status === 'initializing api'
        ) {
          onProgress?.(activePageNum, totalPagesCount, 40, 'Inizializzazione modello linguistico...');
        } else if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          const basePct = 40;
          const spanPct = 55;
          const overallPagePct = basePct + Math.round((pct * spanPct) / 100);
          onProgress?.(
            activePageNum,
            totalPagesCount,
            overallPagePct,
            `Riconoscimento caratteri pagina ${activePageNum || 1} (${pct}%)...`
          );
        }
      },
    });
  } catch (workerErr: any) {
    console.warn(`Errore caricamento worker OCR lingua ${language}, fallback eng:`, workerErr);
    // Graceful fallback to English if the specific language model failed to download
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress?.(activePageNum, totalPagesCount, pct, `Riconoscimento caratteri (eng) ${pct}%...`);
        }
      },
    });
  }

  const pages: OcrPageResult[] = [];
  let fullText = '';
  let sumConfidence = 0;
  let totalWords = 0;

  try {
    // Case 1: Direct image file (PNG/JPG/WebP/BMP)
    if (file.type.startsWith('image/')) {
      activePageNum = 1;
      totalPagesCount = 1;
      onProgress?.(1, 1, 30, 'Analisi immagine con OCR...');
      const imageUrl = URL.createObjectURL(file);

      try {
        // Recognize from Blob directly
        const res = await worker.recognize(file);
        const text = (res.data.text || '').trim();
        const conf = Math.round(res.data.confidence || 0);
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

        const pageResult: OcrPageResult = {
          pageNumber: 1,
          text,
          confidence: conf,
          wordsCount: words,
          thumbnailUrl: imageUrl,
        };

        pages.push(pageResult);
        fullText = text;
        sumConfidence = conf;
        totalWords = words;
        onPageComplete?.(pageResult);
      } finally {
        // Keep imageUrl alive for UI display
      }
    } else {
      // Case 2: PDF Document
      const buffer = await file.arrayBuffer();
      const totalDocPages = await getPdfPageCount(buffer);
      totalPagesCount = totalDocPages;

      const targetPages: number[] = [];
      if (Array.isArray(options.pages)) {
        targetPages.push(...options.pages.filter((p) => p >= 1 && p <= totalDocPages));
      } else {
        for (let p = 1; p <= totalDocPages; p++) targetPages.push(p);
      }
      totalPagesCount = targetPages.length;

      for (let idx = 0; idx < targetPages.length; idx++) {
        const pageNum = targetPages[idx];
        activePageNum = pageNum;

        onProgress?.(
          idx + 1,
          targetPages.length,
          15,
          `Rendering alta definizione pagina ${pageNum} di ${totalDocPages}...`
        );

        // Render page to canvas / blob at 2.0 scale for high OCR accuracy
        const rendered = await renderPageToImage(buffer, pageNum, 2.0, 'png');

        onProgress?.(
          idx + 1,
          targetPages.length,
          40,
          `Riconoscimento ottico neurale pagina ${pageNum}...`
        );

        // Pass Blob directly to worker.recognize to avoid heavy base64 string re-encoding
        const res = await worker.recognize(rendered.blob);
        let text = (res.data.text || '').trim();
        let conf = Math.round(res.data.confidence || 0);

        // If OCR found very little text, check if PDF has native digital text
        if (!text || text.length < 15) {
          try {
            const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            const pdfPage = await pdfDoc.getPage(pageNum);
            const textContent = await pdfPage.getTextContent();
            const nativeText = textContent.items
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((item: any) => item.str || '')
              .join(' ')
              .trim();
            if (nativeText && nativeText.length > text.length) {
              text = nativeText;
              conf = 99; // Native vector text has near 100% fidelity
            }
          } catch {
            // Ignore native fallback errors
          }
        }

        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

        const pageResult: OcrPageResult = {
          pageNumber: pageNum,
          text,
          confidence: conf,
          wordsCount: words,
          thumbnailUrl: rendered.dataUrl,
        };

        pages.push(pageResult);
        fullText += `=== Pagina ${pageNum} (OCR Confidenza: ${conf}%) ===\n${text}\n\n`;
        sumConfidence += conf;
        totalWords += words;

        // Fire live callback for immediate preview!
        onPageComplete?.(pageResult);

        onProgress?.(
          idx + 1,
          targetPages.length,
          100,
          `Pagina ${pageNum} completata.`
        );
      }
    }
  } finally {
    try {
      await worker.terminate();
    } catch {
      // Ignore terminate error
    }
  }

  const averageConfidence =
    pages.length > 0 ? Math.round(sumConfidence / pages.length) : 0;

  return {
    fullText: fullText.trim(),
    pages,
    averageConfidence,
    totalWords,
  };
}

export async function runOcrOnDocument(
  file: File,
  options: OcrOptions = { language: 'ita' },
  onProgress?: (progress: {
    page: number;
    totalPages: number;
    percent: number;
    status: string;
  }) => void,
  onPageComplete?: (pageResult: OcrPageResult) => void
) {
  return performOcrOnPdf(
    file,
    options,
    (currentPage, totalPages, pagePercent, statusText) => {
      onProgress?.({
        page: currentPage,
        totalPages,
        percent: pagePercent,
        status: statusText,
      });
    },
    onPageComplete
  );
}

