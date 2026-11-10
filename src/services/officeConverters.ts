import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';

export interface DocxConversionOptions {
  includeImages?: boolean;
}

export interface XlsxConversionOptions {
  minColumns?: number;
}

export interface SheetToPdfOptions {
  orientation?: 'portrait' | 'landscape';
  sheetIndices?: number[];
}

/**
 * Convert a PDF into a formatted Microsoft Word (.docx) document
 * 100% client-side via pdfjs-dist text extraction and docx document generator
 */
export async function convertPdfToDocx(
  pdfBuffer: ArrayBuffer,
  options: DocxConversionOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Caricamento PDF in memoria...');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const docChildren: (Paragraph | Table)[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(
      Math.round(15 + (pageNum / numPages) * 70),
      `Elaborazione pagina ${pageNum} di ${numPages}...`
    );

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName?: string;
    }>;

    // Page break or separator before subsequent pages
    if (pageNum > 1) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
          pageBreakBefore: true,
        })
      );
    }

    // Header indicator for the page
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Documento PDF — Pagina ${pageNum}`,
            size: 18,
            color: '64748B',
            italics: true,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    if (items.length === 0) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[Pagina senza testo selezionabile o immagine scansionata]',
              italics: true,
              color: '94A3B8',
            }),
          ],
        })
      );
      continue;
    }

    // Group text items by vertical line (Y coordinate, transform[5])
    // Note: PDF coordinates have 0 at the bottom, so higher Y is higher on page
    const lineBuckets = new Map<number, typeof items>();
    const tolerance = 4; // pixels tolerance for line grouping

    items.forEach((item) => {
      const text = item.str;
      if (!text || text.trim() === '') return;

      const y = Math.round(item.transform[5]);
      let matchedY: number | null = null;

      for (const existingY of lineBuckets.keys()) {
        if (Math.abs(existingY - y) <= tolerance) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY !== null) {
        lineBuckets.get(matchedY)!.push(item);
      } else {
        lineBuckets.set(y, [item]);
      }
    });

    // Sort lines from top of page to bottom (descending Y)
    const sortedYs = Array.from(lineBuckets.keys()).sort((a, b) => b - a);

    // Group lines into paragraphs or table rows
    let currentParagraphRuns: TextRun[] = [];

    for (let i = 0; i < sortedYs.length; i++) {
      const lineY = sortedYs[i];
      const lineItems = lineBuckets.get(lineY)!;
      // Sort items left-to-right (ascending X, transform[4])
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);

      // Detect if this line represents a table row (multiple items separated by large gaps > 30px)
      let isTableRow = false;
      if (lineItems.length >= 2) {
        let largeGaps = 0;
        for (let j = 0; j < lineItems.length - 1; j++) {
          const gap = lineItems[j + 1].transform[4] - (lineItems[j].transform[4] + lineItems[j].width);
          if (gap > 25) largeGaps++;
        }
        if (largeGaps >= 1 && lineItems.length >= 3) {
          isTableRow = true;
        }
      }

      if (isTableRow) {
        // Flush any active paragraph before starting table
        if (currentParagraphRuns.length > 0) {
          docChildren.push(
            new Paragraph({
              children: currentParagraphRuns,
              spacing: { after: 100 },
            })
          );
          currentParagraphRuns = [];
        }

        // Render as a table row
        const cells = lineItems.map((item) => {
          return new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.str.trim(),
                    size: 20,
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          });
        });

        docChildren.push(
          new Table({
            rows: [new TableRow({ children: cells })],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
        continue;
      }

      // Check font size and boldness for heading detection
      const avgFontSize =
        lineItems.reduce((acc, it) => acc + (it.transform[0] || 12), 0) /
        lineItems.length;

      const lineText = lineItems.map((it) => it.str).join(' ').trim();
      if (!lineText) continue;

      const isHeading = avgFontSize >= 15 && lineText.length < 80;

      if (isHeading) {
        // Flush previous paragraph
        if (currentParagraphRuns.length > 0) {
          docChildren.push(
            new Paragraph({
              children: currentParagraphRuns,
              spacing: { after: 100 },
            })
          );
          currentParagraphRuns = [];
        }

        docChildren.push(
          new Paragraph({
            heading: avgFontSize > 18 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: lineText,
                bold: true,
                size: Math.round(avgFontSize * 2),
                color: '0F172A',
              }),
            ],
            spacing: { before: 180, after: 100 },
          })
        );
      } else {
        // Normal paragraph text
        lineItems.forEach((it) => {
          currentParagraphRuns.push(
            new TextRun({
              text: it.str + ' ',
              size: 22, // 11pt
              color: '1E293B',
            })
          );
        });

        // If distance to next line is large, treat as paragraph break
        const nextY = sortedYs[i + 1];
        if (nextY === undefined || Math.abs(lineY - nextY) > tolerance * 4.5) {
          docChildren.push(
            new Paragraph({
              children: currentParagraphRuns,
              spacing: { after: 140 },
            })
          );
          currentParagraphRuns = [];
        }
      }
    }

    // Flush any remaining runs
    if (currentParagraphRuns.length > 0) {
      docChildren.push(
        new Paragraph({
          children: currentParagraphRuns,
          spacing: { after: 140 },
        })
      );
      currentParagraphRuns = [];
    }
  }

  onProgress?.(90, 'Assemblaggio file Word .docx...');
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren.length > 0 ? docChildren : [
          new Paragraph({
            children: [new TextRun('Documento vuoto o senza testo estraibile.')],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  onProgress?.(100, 'Conversione DOCX completata!');
  return blob;
}

/**
 * Helper to safely sanitize text for pdf-lib StandardFonts (WinAnsi encoding)
 * Prevents "WinAnsi cannot encode" crashes by decomposing accents and replacing unsupported glyphs
 */
function sanitizeForStandardFont(text: string, font: any): string {
  if (!text) return '';
  let cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/[\u2010-\u2012]/g, '-') // Hyphens
    .replace(/[\u2192\u21D2]/g, '->')
    .replace(/[\u2190\u21D0]/g, '<-')
    .replace(/[\u2194\u21D4]/g, '<->')
    .replace(/[\u2713\u2714]/g, '[x]')
    .replace(/[\u2717\u2718]/g, '[ ]')
    .replace(/[\u25CF\u25E6\u25AA\u25AB\u2023]/g, '•')
    .replace(/\t/g, '    ')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''); // Emojis / surrogate pairs

  let result = '';
  for (const char of cleaned) {
    try {
      font.widthOfTextAtSize(char, 11);
      result += char;
    } catch {
      // Try decomposing diacritics (e.g. ą -> a, ś -> s)
      const decomposed = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      try {
        font.widthOfTextAtSize(decomposed, 11);
        result += decomposed;
      } catch {
        result += ' ';
      }
    }
  }
  return result;
}

/**
 * Convert a Microsoft Word (.docx) file into a high-quality PDF document
 * 100% client-side using mammoth HTML parser and pdf-lib vector layout engine
 * Supports text, headings, bullet/numbered lists, tables with multi-line wrapping, and embedded images
 */
export async function convertDocxToPdf(
  docxBuffer: ArrayBuffer,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Analisi struttura documento Word (.docx)...');

  // Store for embedded images extracted from docx
  const imageStore = new Map<string, { buffer: Uint8Array; contentType: string }>();
  let imageCounter = 0;

  let html = '';
  try {
    const mammothOptions: any = {
      arrayBuffer: docxBuffer,
      convertImage: (mammoth as any).images?.imgElement
        ? (mammoth as any).images.imgElement(async (image: any) => {
            try {
              const imgBuffer = await image.read();
              const id = `img_${imageCounter++}`;
              imageStore.set(id, {
                buffer: new Uint8Array(imgBuffer),
                contentType: image.contentType || 'image/png',
              });
              return { src: `docx-embedded://${id}` };
            } catch {
              return { src: '' };
            }
          })
        : undefined,
    };

    if (typeof Buffer !== 'undefined' && Buffer.from) {
      mammothOptions.buffer = Buffer.from(docxBuffer);
    }

    const result = await mammoth.convertToHtml(mammothOptions, {
      convertImage: mammothOptions.convertImage,
    });
    html = result.value;
  } catch (mammothErr: any) {
    console.warn('Mammoth parser warning, attempting OpenXML fallback:', mammothErr);
    // Fallback: extract text directly from word/document.xml via JSZip
    try {
      const zip = await JSZip.loadAsync(docxBuffer);
      const docXml = await zip.file('word/document.xml')?.async('text');
      if (docXml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXml, 'application/xml');
        const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
        html = paragraphs
          .map((p) => `<p>${p.textContent || ''}</p>`)
          .filter((p) => p !== '<p></p>')
          .join('');
      }
    } catch (zipErr) {
      throw new Error(`Impossibile leggere il documento Word (.docx): ${mammothErr.message || mammothErr}`);
    }
  }

  if (!html || html.trim() === '') {
    html = '<p>[Documento Word vuoto o senza testo]</p>';
  }

  onProgress?.(35, 'Composizione layout vettoriale PDF...');
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // A4 standard: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 45;
  const availableWidth = pageWidth - margin * 2;
  const bottomMargin = 50;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;
  let pageNum = 1;

  const ensureSpace = (neededHeight: number) => {
    if (currentY - neededHeight < bottomMargin) {
      // Draw page number in footer
      currentPage.drawText(`Pagina ${pageNum}`, {
        x: pageWidth - margin - 50,
        y: 25,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });

      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pageNum++;
      currentY = pageHeight - margin;
    }
  };

  // Helper to wrap text into lines fitting within a specified maxWidth
  const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
    const sanitized = sanitizeForStandardFont(text, font);
    if (!sanitized) return [];
    const words = sanitized.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let width = 0;
      try {
        width = font.widthOfTextAtSize(testLine, fontSize);
      } catch {
        width = maxWidth + 1; // force split on issue
      }
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Process elements in body
  const bodyChildren = Array.from(doc.body.children);
  const totalElements = bodyChildren.length || 1;

  for (let idx = 0; idx < bodyChildren.length; idx++) {
    const el = bodyChildren[idx];
    const tagName = el.tagName.toLowerCase();
    const rawText = (el.textContent || '').trim();

    onProgress?.(
      Math.round(40 + (idx / totalElements) * 50),
      `Trascrizione contenuti: ${idx + 1}/${totalElements}`
    );

    // 1. Check for embedded images inside this element
    const imgEl = tagName === 'img' ? (el as HTMLImageElement) : el.querySelector('img');
    if (imgEl && imgEl.getAttribute('src')?.startsWith('docx-embedded://')) {
      const imgId = imgEl.getAttribute('src')!.replace('docx-embedded://', '');
      const imgData = imageStore.get(imgId);
      if (imgData) {
        try {
          const isPng = imgData.contentType.toLowerCase().includes('png');
          const embedded = isPng
            ? await pdfDoc.embedPng(imgData.buffer)
            : await pdfDoc.embedJpg(imgData.buffer);

          const maxW = Math.min(availableWidth, 480);
          const maxH = 320;
          const scaled = embedded.scaleToFit(maxW, maxH);

          ensureSpace(scaled.height + 15);
          currentPage.drawImage(embedded, {
            x: margin + (availableWidth - scaled.width) / 2,
            y: currentY - scaled.height,
            width: scaled.width,
            height: scaled.height,
          });
          currentY -= scaled.height + 15;
        } catch (imgErr) {
          console.warn('Errore embedding immagine DOCX:', imgErr);
        }
      }
    }

    // If it was solely an image tag, proceed to next
    if (tagName === 'img') {
      continue;
    }

    // 2. Headings (h1, h2, h3, h4)
    if (tagName === 'h1') {
      ensureSpace(35);
      const lines = wrapText(rawText, fontBold, 18, availableWidth);
      for (const line of lines) {
        ensureSpace(24);
        currentPage.drawText(line, {
          x: margin,
          y: currentY - 18,
          size: 18,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        });
        currentY -= 24;
      }
      currentY -= 8;
    } else if (tagName === 'h2') {
      ensureSpace(30);
      const lines = wrapText(rawText, fontBold, 15, availableWidth);
      for (const line of lines) {
        ensureSpace(20);
        currentPage.drawText(line, {
          x: margin,
          y: currentY - 15,
          size: 15,
          font: fontBold,
          color: rgb(0.12, 0.16, 0.24),
        });
        currentY -= 20;
      }
      currentY -= 6;
    } else if (tagName === 'h3' || tagName === 'h4') {
      ensureSpace(25);
      const lines = wrapText(rawText, fontBold, 13, availableWidth);
      for (const line of lines) {
        ensureSpace(17);
        currentPage.drawText(line, {
          x: margin,
          y: currentY - 13,
          size: 13,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.35),
        });
        currentY -= 17;
      }
      currentY -= 4;
    } else if (tagName === 'p') {
      if (!rawText) {
        currentY -= 8;
        continue;
      }

      // Check inner styling
      const isBold = el.querySelector('strong, b') !== null && el.textContent === el.querySelector('strong, b')?.textContent;
      const isItalic = el.querySelector('em, i') !== null;
      const font = isBold ? fontBold : isItalic ? fontItalic : fontRegular;
      const fontSize = 11;
      const lineHeight = 15;

      const lines = wrapText(rawText, font, fontSize, availableWidth);
      for (const line of lines) {
        ensureSpace(lineHeight);
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font,
          color: rgb(0.15, 0.18, 0.22),
        });
        currentY -= lineHeight;
      }
      currentY -= 6;
    } else if (tagName === 'ul' || tagName === 'ol') {
      const items = Array.from(el.querySelectorAll('li'));
      for (let i = 0; i < items.length; i++) {
        const itemText = (items[i].textContent || '').trim();
        if (!itemText) continue;
        const prefix = tagName === 'ol' ? `${i + 1}. ` : '• ';
        const fullText = prefix + itemText;
        const lines = wrapText(fullText, fontRegular, 10.5, availableWidth - 15);
        for (const line of lines) {
          ensureSpace(15);
          currentPage.drawText(line, {
            x: margin + 12,
            y: currentY - 11,
            size: 10.5,
            font: fontRegular,
            color: rgb(0.15, 0.18, 0.22),
          });
          currentY -= 15;
        }
      }
      currentY -= 6;
    } else if (tagName === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) continue;

      const colCount = Math.max(...rows.map((r) => r.querySelectorAll('th, td').length)) || 1;
      const colWidth = availableWidth / colCount;

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const cells = Array.from(rows[rIdx].querySelectorAll('th, td'));
        const isHeader = rIdx === 0 || rows[rIdx].querySelector('th') !== null;
        const cellFont = isHeader ? fontBold : fontRegular;
        const cellFontSize = 9.5;

        // Wrap lines for all cells in this row to determine required row height
        const cellWrappedLines: string[][] = [];
        let maxLinesInRow = 1;

        for (let cIdx = 0; cIdx < colCount; cIdx++) {
          const cell = cells[cIdx];
          const cellText = (cell?.textContent || '').trim();
          const lines = wrapText(cellText, cellFont, cellFontSize, colWidth - 12);
          cellWrappedLines.push(lines);
          if (lines.length > maxLinesInRow) {
            maxLinesInRow = lines.length;
          }
        }

        const rowHeight = Math.max(22, maxLinesInRow * 13 + 8);
        ensureSpace(rowHeight);

        // Background for header or alternating row
        if (isHeader) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: availableWidth,
            height: rowHeight,
            color: rgb(0.93, 0.95, 0.98),
          });
        } else if (rIdx % 2 === 1) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: availableWidth,
            height: rowHeight,
            color: rgb(0.98, 0.99, 1.0),
          });
        }

        // Draw cell contents and vertical borders
        for (let cIdx = 0; cIdx < colCount; cIdx++) {
          const lines = cellWrappedLines[cIdx] || [];
          const cellX = margin + cIdx * colWidth;

          // Draw vertical border
          currentPage.drawLine({
            start: { x: cellX, y: currentY },
            end: { x: cellX, y: currentY - rowHeight },
            thickness: 0.5,
            color: rgb(0.8, 0.85, 0.9),
          });

          // Draw all wrapped lines inside the cell
          let lineY = currentY - 12;
          for (const line of lines) {
            currentPage.drawText(line, {
              x: cellX + 5,
              y: lineY,
              size: cellFontSize,
              font: cellFont,
              color: isHeader ? rgb(0.08, 0.12, 0.2) : rgb(0.2, 0.22, 0.26),
            });
            lineY -= 13;
          }
        }

        // Right border
        currentPage.drawLine({
          start: { x: margin + availableWidth, y: currentY },
          end: { x: margin + availableWidth, y: currentY - rowHeight },
          thickness: 0.5,
          color: rgb(0.8, 0.85, 0.9),
        });

        // Bottom border
        currentPage.drawLine({
          start: { x: margin, y: currentY - rowHeight },
          end: { x: margin + availableWidth, y: currentY - rowHeight },
          thickness: isHeader ? 1 : 0.5,
          color: rgb(0.8, 0.85, 0.9),
        });

        currentY -= rowHeight;
      }
      currentY -= 8;
    }
  }

  // Footer for the final page
  currentPage.drawText(`Pagina ${pageNum}`, {
    x: pageWidth - margin - 50,
    y: 25,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  onProgress?.(95, 'Finalizzazione stream PDF...');
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, 'Conversione PDF completata!');
  return pdfBytes;
}

/**
 * Snappy block decompression for Apple iWork .iwa archive streams
 */
function decompressSnappyChunk(input: Uint8Array): Uint8Array {
  let pos = 0;
  let uncompressedLen = 0;
  let shift = 0;
  while (pos < input.length) {
    const b = input[pos++];
    uncompressedLen |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
    if (shift > 35) break;
  }

  if (uncompressedLen <= 0 || uncompressedLen > 30 * 1024 * 1024) {
    return input;
  }

  const out = new Uint8Array(uncompressedLen);
  let outPos = 0;

  while (pos < input.length && outPos < uncompressedLen) {
    const tag = input[pos++];
    const tagType = tag & 0x03;

    if (tagType === 0) {
      // Literal
      let len = tag >> 2;
      if (len < 60) {
        len += 1;
      } else if (len === 60) {
        len = (input[pos++] || 0) + 1;
      } else if (len === 61) {
        len = (input[pos++] || 0) | ((input[pos++] || 0) << 8);
        len += 1;
      } else if (len === 62) {
        len = (input[pos++] || 0) | ((input[pos++] || 0) << 8) | ((input[pos++] || 0) << 16);
        len += 1;
      } else if (len === 63) {
        len = (input[pos++] || 0) | ((input[pos++] || 0) << 8) | ((input[pos++] || 0) << 16) | ((input[pos++] || 0) << 24);
        len += 1;
      }
      for (let i = 0; i < len && pos < input.length && outPos < uncompressedLen; i++) {
        out[outPos++] = input[pos++];
      }
    } else if (tagType === 1) {
      // Copy with 1-byte offset
      const len = ((tag >> 2) & 0x07) + 4;
      const offset = ((tag & 0xe0) << 3) | (input[pos++] || 0);
      let copyFrom = outPos - offset;
      for (let i = 0; i < len && outPos < uncompressedLen; i++) {
        out[outPos++] = out[copyFrom++];
      }
    } else if (tagType === 2) {
      // Copy with 2-byte offset
      const len = (tag >> 2) + 1;
      const offset = (input[pos++] || 0) | ((input[pos++] || 0) << 8);
      let copyFrom = outPos - offset;
      for (let i = 0; i < len && outPos < uncompressedLen; i++) {
        out[outPos++] = out[copyFrom++];
      }
    } else if (tagType === 3) {
      // Copy with 4-byte offset
      const len = (tag >> 2) + 1;
      const offset = (input[pos++] || 0) | ((input[pos++] || 0) << 8) | ((input[pos++] || 0) << 16) | ((input[pos++] || 0) << 24);
      let copyFrom = outPos - offset;
      for (let i = 0; i < len && outPos < uncompressedLen; i++) {
        out[outPos++] = out[copyFrom++];
      }
    }
  }

  return out.slice(0, outPos);
}

function decompressIwaStream(bytes: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let pos = 0;
  while (pos + 4 < bytes.length) {
    const chunkLen = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16);
    pos += 4;
    if (chunkLen <= 0 || pos + chunkLen > bytes.length) {
      try {
        return decompressSnappyChunk(bytes);
      } catch {
        return bytes;
      }
    }
    const chunkBytes = bytes.slice(pos, pos + chunkLen);
    pos += chunkLen;
    try {
      chunks.push(decompressSnappyChunk(chunkBytes));
    } catch {
      chunks.push(chunkBytes);
    }
  }

  if (chunks.length === 0) {
    try {
      return decompressSnappyChunk(bytes);
    } catch {
      return bytes;
    }
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

function extractPrintableTextFromIwa(buf: Uint8Array): string[] {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(buf);
  const lines: string[] = [];
  // Scan for sequences of 4+ readable characters (Latin, accented letters, punctuation)
  const regex = /[\w\s.,;:!?'"()/\-–—€$@%&*+=#\u00C0-\u017F]{4,}/g;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const s = match[0].trim();
    if (
      s.length >= 3 &&
      !s.startsWith('TSWP.') &&
      !s.startsWith('TSD.') &&
      !s.startsWith('TSP.') &&
      !s.startsWith('KN.') &&
      !s.startsWith('TN.') &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s) &&
      !/^(uuid|version|schema|hash|checksum|table|document)/i.test(s)
    ) {
      lines.push(s);
    }
  }
  return lines;
}

/**
 * Convert an Apple Pages (.pages) document into native high-fidelity PDF
 * 1. Checks for native QuickLook/Preview.pdf generated by Apple's Quartz vector engine.
 * 2. If absent, performs deep recovery on .iwa / .xml and media assets, composing an A4 PDF.
 */
export async function convertPagesToPdf(
  pagesBuffer: ArrayBuffer,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Analisi archivio documento Apple Pages...');
  const zip = await JSZip.loadAsync(pagesBuffer);

  // Common locations where Apple Pages embeds the rendered QuickLook PDF
  const candidatePaths = [
    'QuickLook/Preview.pdf',
    'QuickLook/preview.pdf',
    'preview.pdf',
    'Preview.pdf',
    'quicklook/preview.pdf',
  ];

  let pdfFile: JSZip.JSZipObject | null = null;
  for (const path of candidatePaths) {
    if (zip.file(path)) {
      pdfFile = zip.file(path);
      break;
    }
  }

  // Fallback: search any .pdf inside the archive
  if (!pdfFile) {
    for (const relativePath in zip.files) {
      if (relativePath.toLowerCase().endsWith('.pdf')) {
        pdfFile = zip.file(relativePath);
        break;
      }
    }
  }

  if (pdfFile) {
    onProgress?.(65, 'Estrazione PDF vettoriale nativo Apple...');
    const pdfData = await pdfFile.async('uint8array');
    onProgress?.(100, 'Conversione documento Apple Pages completata!');
    return pdfData;
  }

  // 2. FALLBACK RECOVERY: Extract internal text & graphics from Pages package
  onProgress?.(35, 'Anteprima diretta non presente: scansione flussi interni (.iwa / .xml)...');

  const recoveredTexts: string[] = [];
  let thumbnailBytes: Uint8Array | null = null;

  // Search for preview images or thumbnails
  const thumbCandidates = [
    'QuickLook/Thumbnail.jpg',
    'QuickLook/thumbnail.jpg',
    'preview.jpg',
    'Preview.jpg',
    'QuickLook/Thumbnail.png',
  ];
  for (const tPath of thumbCandidates) {
    const f = zip.file(tPath);
    if (f) {
      thumbnailBytes = await f.async('uint8array');
      break;
    }
  }

  // Search for index.xml (iWork '09)
  const indexXmlFile = zip.file('index.xml') || zip.file('index.xml.gz');
  if (indexXmlFile) {
    try {
      const xmlStr = await indexXmlFile.async('text');
      const cleaned = xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 20) {
        recoveredTexts.push(cleaned);
      }
    } catch {
      // ignore
    }
  }

  // Search for Index/*.iwa (iWork '13 - '24)
  for (const path in zip.files) {
    if (path.startsWith('Index/') && path.endsWith('.iwa')) {
      const iwaFile = zip.file(path);
      if (iwaFile) {
        try {
          const rawBytes = await iwaFile.async('uint8array');
          const decompressed = decompressIwaStream(rawBytes);
          const strings = extractPrintableTextFromIwa(decompressed);
          if (strings.length > 0) {
            recoveredTexts.push(...strings);
          }
        } catch {
          // try fallback on raw bytes
          const rawBytes = await iwaFile.async('uint8array');
          const strings = extractPrintableTextFromIwa(rawBytes);
          if (strings.length > 0) {
            recoveredTexts.push(...strings);
          }
        }
      }
    }
  }

  // Filter and deduplicate
  const filteredTexts: string[] = [];
  const seen = new Set<string>();
  for (const t of recoveredTexts) {
    const trimmed = t.trim();
    if (trimmed.length >= 3 && !seen.has(trimmed)) {
      seen.add(trimmed);
      filteredTexts.push(trimmed);
    }
  }

  if (filteredTexts.length === 0 && !thumbnailBytes) {
    const err: any = new Error(
      "Il file .pages non contiene un'anteprima PDF interna (QuickLook/Preview.pdf)."
    );
    err.isPagesNoPreview = true;
    throw err;
  }

  // 3. Compose rescued document into A4 PDF with pdf-lib
  onProgress?.(70, 'Composizione documento PDF con i contenuti recuperati dal file Pages...');
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Notice header banner
  currentPage.drawRectangle({
    x: margin,
    y: currentY - 30,
    width: contentWidth,
    height: 30,
    color: rgb(0.94, 0.96, 0.99),
  });
  currentPage.drawText('Documento Apple Pages (Contenuti Recuperati da Pacchetto)', {
    x: margin + 10,
    y: currentY - 19,
    size: 10,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.42),
  });
  currentY -= 45;

  // Thumbnail if available
  if (thumbnailBytes) {
    try {
      let img;
      if (thumbnailBytes[0] === 0x89 && thumbnailBytes[1] === 0x50) {
        img = await pdfDoc.embedPng(thumbnailBytes);
      } else {
        img = await pdfDoc.embedJpg(thumbnailBytes);
      }
      const imgScale = Math.min(240 / img.height, contentWidth / img.width);
      const imgW = img.width * imgScale;
      const imgH = img.height * imgScale;

      currentPage.drawImage(img, {
        x: margin + (contentWidth - imgW) / 2,
        y: currentY - imgH,
        width: imgW,
        height: imgH,
      });
      currentY -= imgH + 20;
    } catch {
      // ignore
    }
  }

  // Recovered paragraphs
  const fontSize = 10;
  const lineHeight = 14;

  for (const paragraph of filteredTexts) {
    const words = paragraph.split(' ');
    let line = '';

    for (const w of words) {
      const testLine = line ? `${line} ${w}` : w;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > contentWidth) {
        if (currentY < margin + 35) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.15, 0.18, 0.22),
        });
        currentY -= lineHeight;
        line = w;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (currentY < margin + 35) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
      currentPage.drawText(line, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.15, 0.18, 0.22),
      });
      currentY -= lineHeight + 5;
    }
  }

  onProgress?.(95, 'Finalizzazione file PDF...');
  const rescuedPdf = await pdfDoc.save();
  onProgress?.(100, 'Conversione file Apple Pages completata!');
  return rescuedPdf;
}

/**
 * Convert PDF tables and data records into a Microsoft Excel (.xlsx) workbook
 * 100% client-side via coordinate-based table clustering and SheetJS
 */
export async function convertPdfToXlsx(
  pdfBuffer: ArrayBuffer,
  onProgress?: (progress: number, status: string) => void
): Promise<{ workbookBytes: Uint8Array; previewRows: string[][]; totalSheets: number }> {
  onProgress?.(10, 'Apertura stream PDF...');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const workbook = XLSX.utils.book_new();
  const allConsolidatedRows: string[][] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(
      Math.round(15 + (pageNum / numPages) * 70),
      `Analisi matriciale pagina ${pageNum} di ${numPages}...`
    );

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    if (items.length === 0) continue;

    // Group items by line (Y coordinate, tolerance 4px)
    const lineBuckets = new Map<number, typeof items>();
    const tolerance = 4;

    items.forEach((item) => {
      const text = item.str.trim();
      if (!text) return;
      const y = Math.round(item.transform[5]);
      let matchedY: number | null = null;

      for (const existingY of lineBuckets.keys()) {
        if (Math.abs(existingY - y) <= tolerance) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY !== null) {
        lineBuckets.get(matchedY)!.push(item);
      } else {
        lineBuckets.set(y, [item]);
      }
    });

    // Sort lines top to bottom (descending Y)
    const sortedYs = Array.from(lineBuckets.keys()).sort((a, b) => b - a);
    const pageRows: string[][] = [];

    sortedYs.forEach((y) => {
      const line = lineBuckets.get(y)!;
      // Sort left to right
      line.sort((a, b) => a.transform[4] - b.transform[4]);

      // Split into cell columns based on whitespace or gap between items
      const rowCells: string[] = [];
      let currentCellText = '';

      for (let i = 0; i < line.length; i++) {
        const item = line[i];
        if (i === 0) {
          currentCellText = item.str.trim();
        } else {
          const prev = line[i - 1];
          const gap = item.transform[4] - (prev.transform[4] + prev.width);
          // If gap between words is significant (> 18px), create new cell column
          if (gap > 18) {
            if (currentCellText) rowCells.push(currentCellText);
            currentCellText = item.str.trim();
          } else {
            currentCellText += ' ' + item.str.trim();
          }
        }
      }
      if (currentCellText) rowCells.push(currentCellText);
      if (rowCells.length > 0) {
        pageRows.push(rowCells);
        allConsolidatedRows.push(rowCells);
      }
    });

    if (pageRows.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet(pageRows);
      XLSX.utils.book_append_sheet(workbook, ws, `Pagina ${pageNum}`);
    }
  }

  // Also append consolidated master sheet if multiple pages
  if (numPages > 1 && allConsolidatedRows.length > 0) {
    const masterWs = XLSX.utils.aoa_to_sheet(allConsolidatedRows);
    XLSX.utils.book_append_sheet(workbook, masterWs, 'Tutti i Dati');
  }

  // Fallback sheet if document was completely empty
  if (workbook.SheetNames.length === 0) {
    const emptyWs = XLSX.utils.aoa_to_sheet([['Nessuna tabella o dato testuale rilevato']]);
    XLSX.utils.book_append_sheet(workbook, emptyWs, 'Dati');
  }

  onProgress?.(90, 'Scrittura file Excel .xlsx...');
  const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  onProgress?.(100, 'Conversione XLSX completata!');

  return {
    workbookBytes: new Uint8Array(outBuffer),
    previewRows: allConsolidatedRows.slice(0, 30),
    totalSheets: workbook.SheetNames.length,
  };
}

/**
 * Convert an Excel spreadsheet (.xlsx, .xls, .csv) into a styled, professional PDF
 * 100% client-side via SheetJS and pdf-lib vector drawing
 */
export async function convertXlsxToPdf(
  xlsxBuffer: ArrayBuffer,
  options: SheetToPdfOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Lettura cartella di lavoro Excel...');
  const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('Nessun foglio di lavoro trovato nel file Excel.');
  }

  onProgress?.(30, 'Inizializzazione motore PDF vettoriale...');
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const orientation = options.orientation || 'landscape';
  // A4 Landscape: 841.89 x 595.28 pt, Portrait: 595.28 x 841.89 pt
  const pageWidth = orientation === 'landscape' ? 841.89 : 595.28;
  const pageHeight = orientation === 'landscape' ? 595.28 : 841.89;
  const margin = 35;
  const availableWidth = pageWidth - margin * 2;
  const bottomMargin = 40;

  for (let sIdx = 0; sIdx < sheetNames.length; sIdx++) {
    const sheetName = sheetNames[sIdx];
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!data || data.length === 0) continue;

    onProgress?.(
      Math.round(35 + (sIdx / sheetNames.length) * 55),
      `Impaginazione foglio "${sheetName}"...`
    );

    // Calculate maximum columns in this sheet
    const maxCols = Math.min(Math.max(...data.map((r) => r.length)), 12) || 1;
    const colWidth = availableWidth / maxCols;
    const rowHeight = 20;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;
    let pageNum = 1;

    // Sheet Title Header
    currentPage.drawText(`Foglio: ${sheetName}`, {
      x: margin,
      y: currentY - 14,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.2),
    });
    currentY -= 30;

    const ensureSpace = (needed: number) => {
      if (currentY - needed < bottomMargin) {
        // Footer
        currentPage.drawText(`${sheetName} — Pagina ${pageNum}`, {
          x: pageWidth - margin - 120,
          y: 20,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.5, 0.5, 0.5),
        });

        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pageNum++;
        currentY = pageHeight - margin;

        // Header on new page
        currentPage.drawText(`Foglio: ${sheetName} (continua)`, {
          x: margin,
          y: currentY - 12,
          size: 11,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.35),
        });
        currentY -= 25;
      }
    };

    for (let rIdx = 0; rIdx < data.length; rIdx++) {
      ensureSpace(rowHeight);
      const row = data[rIdx];
      const isHeader = rIdx === 0;

      // Header row background
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: availableWidth,
          height: rowHeight,
          color: rgb(0.08, 0.12, 0.2), // Dark Navy Slate Header
        });
      } else if (rIdx % 2 === 1) {
        // Alternating zebra stripe
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: availableWidth,
          height: rowHeight,
          color: rgb(0.96, 0.97, 0.99),
        });
      }

      // Draw Cells
      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const rawVal = row[cIdx];
        const cellText = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        const cellX = margin + cIdx * colWidth;

        // Vertical divider
        currentPage.drawLine({
          start: { x: cellX, y: currentY },
          end: { x: cellX, y: currentY - rowHeight },
          thickness: 0.5,
          color: isHeader ? rgb(0.2, 0.25, 0.35) : rgb(0.85, 0.88, 0.92),
        });

        // Cell Text
        if (cellText) {
          const font = isHeader ? fontBold : fontRegular;
          const fontSize = 8.5;
          const maxChars = Math.max(Math.floor(colWidth / 5.5), 6);
          const truncated = cellText.length > maxChars ? cellText.slice(0, maxChars - 2) + '..' : cellText;

          currentPage.drawText(truncated, {
            x: cellX + 4,
            y: currentY - 13,
            size: fontSize,
            font,
            color: isHeader ? rgb(1, 1, 1) : rgb(0.12, 0.15, 0.2),
          });
        }
      }

      // Right border
      currentPage.drawLine({
        start: { x: margin + availableWidth, y: currentY },
        end: { x: margin + availableWidth, y: currentY - rowHeight },
        thickness: 0.5,
        color: isHeader ? rgb(0.2, 0.25, 0.35) : rgb(0.85, 0.88, 0.92),
      });

      // Bottom border
      currentPage.drawLine({
        start: { x: margin, y: currentY - rowHeight },
        end: { x: margin + availableWidth, y: currentY - rowHeight },
        thickness: isHeader ? 1 : 0.5,
        color: rgb(0.85, 0.88, 0.92),
      });

      currentY -= rowHeight;
    }

    // Final page footer
    currentPage.drawText(`${sheetName} — Pagina ${pageNum}`, {
      x: pageWidth - margin - 120,
      y: 20,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  onProgress?.(95, 'Generazione file PDF finale...');
  const pdfBytes = await pdfDoc.save();
  onProgress?.(100, 'Conversione completata!');
  return pdfBytes;
}

