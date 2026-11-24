/**
 * Common string and formatting utilities for LibrePDF Studio.
 * Centralizes shared regex operations while preserving zero-dependency tree-shaking.
 */

/**
 * Strips the extension from a file name safely, preserving dots in the name.
 * e.g. "documento.v1.2.pdf" -> "documento.v1.2"
 * e.g. "archivio.tar.gz" -> "archivio.tar"
 */
export function getBaseFileName(fileName: string): string {
  if (!fileName) return '';
  return fileName.replace(/\.[^/.]+$/, '');
}

/**
 * Strips Data URL MIME prefix from a base64 image string.
 * e.g. "data:image/png;base64,iVBORw..." -> "iVBORw..."
 */
export function stripBase64Header(dataUrl: string): string {
  if (!dataUrl) return '';
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
}

/**
 * Escapes special HTML characters to prevent rendering issues or injection.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses a page range string (e.g. "1-3, 5, 8-10") into a sorted array of 0-based page indices.
 * Clips indices to the valid [0, maxPages - 1] interval.
 */
export function parsePageRangeString(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim() || maxPages <= 0) return [];

  const pagesSet = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;

      const from = Math.max(1, Math.min(start, end));
      const to = Math.min(maxPages, Math.max(start, end));

      for (let p = from; p <= to; p++) {
        pagesSet.add(p - 1); // 0-based index
      }
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}
