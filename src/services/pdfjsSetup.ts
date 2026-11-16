/**
 * Single place where PDF.js is configured.
 * The worker is bundled locally by Vite (`?url`) instead of being fetched from
 * a CDN, so rendering works offline (PWA) and no request leaves the device.
 */
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export { pdfjsLib };
