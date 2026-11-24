import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

export interface MarkdownPdfOptions {
  theme?: 'github' | 'academic' | 'modern' | 'mono';
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: 'compact' | 'standard' | 'generous';
  showPageNumbers?: boolean;
  showRunningHeader?: boolean;
  documentTitle?: string;
  author?: string;
  date?: string;
}

export interface MarkdownConversionResult {
  pdfBytes: Uint8Array;
  pageCount: number;
  wordCount: number;
  title: string;
}

// Inline token representation
interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
  linkUrl?: string;
}

// Block token types
type BlockToken =
  | { type: 'header'; level: number; spans: InlineSpan[] }
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'code_block'; language?: string; code: string }
  | { type: 'blockquote'; alertType?: 'note' | 'tip' | 'warning' | 'important' | 'caution'; spans: InlineSpan[] }
  | { type: 'list_item'; listType: 'bullet' | 'number' | 'task'; level: number; marker: string; checked?: boolean; spans: InlineSpan[] }
  | { type: 'table'; headers: InlineSpan[][]; rows: InlineSpan[][][]; alignments: ('left' | 'center' | 'right')[] }
  | { type: 'hr' }
  | { type: 'pagebreak' };

function sanitizeForPdfFont(text: string, font: PDFFont): string {
  if (!text) return '';
  let cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2010-\u2012]/g, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2192\u21D2]/g, '->')
    .replace(/[\u2190\u21D0]/g, '<-')
    .replace(/[\u2194\u21D4]/g, '<->')
    .replace(/[\u2713\u2714]/g, '[x]')
    .replace(/[\u2717\u2718]/g, '[ ]')
    .replace(/[\u25CF\u25E6\u25AA\u25AB\u2023]/g, '-')
    .replace(/\t/g, '    ')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');

  let result = '';
  for (const char of cleaned) {
    try {
      font.widthOfTextAtSize(char, 11);
      result += char;
    } catch {
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
 * Parse inline Markdown formatting: **bold**, *italic*, `code`, ~~strike~~, [text](url)
 */
function parseInlineMarkdown(text: string): InlineSpan[] {
  if (!text) return [];

  const spans: InlineSpan[] = [];
  // Regex to match inline tokens
  // 1: `code`
  // 2: ***bold italic***
  // 3: **bold** or __bold__
  // 4: *italic* or _italic_
  // 5: ~~strike~~
  // 6: [link text](url)
  const regex = /(`([^`]+)`)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)|~~([^~]+)~~|\[([^\]]+)\]\(([^)]+)\)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      spans.push({ text: text.substring(lastIndex, matchIndex) });
    }

    if (match[2] !== undefined) {
      // inline code
      spans.push({ text: match[2], code: true });
    } else if (match[3] !== undefined) {
      // bold italic
      spans.push({ text: match[3], bold: true, italic: true });
    } else if (match[4] !== undefined || match[5] !== undefined) {
      // bold
      spans.push({ text: match[4] || match[5], bold: true });
    } else if (match[6] !== undefined || match[7] !== undefined) {
      // italic
      spans.push({ text: match[6] || match[7], italic: true });
    } else if (match[8] !== undefined) {
      // strikethrough
      spans.push({ text: match[8], strikethrough: true });
    } else if (match[9] !== undefined && match[10] !== undefined) {
      // link
      spans.push({ text: match[9], linkUrl: match[10] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.substring(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

/**
 * Parse Markdown string into structured BlockTokens
 */
function parseMarkdownToBlocks(markdown: string): { title: string; blocks: BlockToken[]; wordCount: number } {
  const lines = markdown.split(/\r?\n/);
  const blocks: BlockToken[] = [];
  let detectedTitle = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let totalWords = 0;

  let inTable = false;
  let tableHeaders: InlineSpan[][] = [];
  let tableAlignments: ('left' | 'center' | 'right')[] = [];
  let tableRows: InlineSpan[][][] = [];

  const flushTable = () => {
    if (inTable && tableHeaders.length > 0) {
      blocks.push({
        type: 'table',
        headers: tableHeaders,
        rows: tableRows,
        alignments: tableAlignments,
      });
      tableHeaders = [];
      tableAlignments = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Count words
    if (trimmed) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      totalWords += words.length;
    }

    // Code block toggle (```)
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      flushTable();
      if (inCodeBlock) {
        blocks.push({
          type: 'code_block',
          language: codeBlockLang,
          code: codeBlockLines.join('\n'),
        });
        codeBlockLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Pagebreak syntax
    if (trimmed === '<!-- pagebreak -->' || trimmed === '\\newpage' || trimmed === '[pagebreak]') {
      flushTable();
      blocks.push({ type: 'pagebreak' });
      continue;
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushTable();
      blocks.push({ type: 'hr' });
      continue;
    }

    // Headings: # H1, ## H2, etc.
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushTable();
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();
      if (!detectedTitle && level === 1) {
        detectedTitle = text;
      }
      blocks.push({
        type: 'header',
        level,
        spans: parseInlineMarkdown(text),
      });
      continue;
    }

    // Table detection: line with pipes
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const nextLine = (lines[i + 1] || '').trim();
      const isDivider = /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(nextLine);

      if (!inTable && isDivider) {
        // Start of table
        inTable = true;
        const headerCells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableHeaders = headerCells.map((c) => parseInlineMarkdown(c));

        // Parse alignments from divider
        const dividerParts = nextLine
          .slice(nextLine.startsWith('|') ? 1 : 0, nextLine.endsWith('|') ? -1 : undefined)
          .split('|')
          .map((c) => c.trim());

        tableAlignments = dividerParts.map((d) => {
          const starts = d.startsWith(':');
          const ends = d.endsWith(':');
          if (starts && ends) return 'center';
          if (ends) return 'right';
          return 'left';
        });

        i++; // skip divider line
        continue;
      } else if (inTable) {
        const rowCells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(rowCells.map((c) => parseInlineMarkdown(c)));
        continue;
      }
    } else {
      flushTable();
    }

    // Blockquote & GitHub Alerts
    if (trimmed.startsWith('>')) {
      let bqContent = trimmed.replace(/^>\s?/, '');
      let alertType: 'note' | 'tip' | 'warning' | 'important' | 'caution' | undefined = undefined;

      const alertMatch = bqContent.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)$/i);
      if (alertMatch) {
        alertType = alertMatch[1].toLowerCase() as any;
        bqContent = alertMatch[2] ? alertMatch[2] : '';
      }

      blocks.push({
        type: 'blockquote',
        alertType,
        spans: parseInlineMarkdown(bqContent || (alertType ? alertType.toUpperCase() : '')),
      });
      continue;
    }

    // Task list items: - [ ] or - [x]
    const taskMatch = rawLine.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const indent = Math.floor(taskMatch[1].length / 2);
      const isChecked = taskMatch[3].toLowerCase() === 'x';
      blocks.push({
        type: 'list_item',
        listType: 'task',
        level: indent,
        marker: isChecked ? '[x]' : '[ ]',
        checked: isChecked,
        spans: parseInlineMarkdown(taskMatch[4]),
      });
      continue;
    }

    // Ordered list: 1. Item
    const numListMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      const indent = Math.floor(numListMatch[1].length / 2);
      blocks.push({
        type: 'list_item',
        listType: 'number',
        level: indent,
        marker: `${numListMatch[2]}.`,
        spans: parseInlineMarkdown(numListMatch[3]),
      });
      continue;
    }

    // Bullet list: - Item or * Item or + Item
    const bulletMatch = rawLine.match(/^(\s*)([-*+])\s+(.*)$/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      blocks.push({
        type: 'list_item',
        listType: 'bullet',
        level: indent,
        marker: 'â€¢',
        spans: parseInlineMarkdown(bulletMatch[3]),
      });
      continue;
    }

    // Empty line
    if (!trimmed) {
      continue;
    }

    // Normal paragraph
    blocks.push({
      type: 'paragraph',
      spans: parseInlineMarkdown(rawLine),
    });
  }

  flushTable();

  return {
    title: detectedTitle || 'Documento Markdown',
    blocks,
    wordCount: totalWords,
  };
}

/**
 * High-Fidelity Markdown to PDF Converter
 * Renders publication-grade vector PDFs directly in the browser via pdf-lib
 */
export async function convertMarkdownToPdf(
  markdownText: string,
  options: MarkdownPdfOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<MarkdownConversionResult> {
  onProgress?.(10, 'Analisi e tokenizzazione del documento Markdown...');

  const {
    theme = 'github',
    pageSize = 'a4',
    orientation = 'portrait',
    margins = 'standard',
    showPageNumbers = true,
    showRunningHeader = true,
    documentTitle,
  } = options;

  const parsed = parseMarkdownToBlocks(markdownText);
  const finalTitle = documentTitle || parsed.title;

  onProgress?.(25, 'Inizializzazione motore tipografico vettoriale...');
  const pdfDoc = await PDFDocument.create();

  // Load theme fonts
  let fontRegular: PDFFont;
  let fontBold: PDFFont;
  let fontItalic: PDFFont;
  let fontBoldItalic: PDFFont;
  let fontMono: PDFFont;
  let fontMonoBold: PDFFont;

  if (theme === 'academic') {
    fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    fontBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
    fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  } else if (theme === 'mono') {
    fontRegular = await pdfDoc.embedFont(StandardFonts.Courier);
    fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
    fontItalic = await pdfDoc.embedFont(StandardFonts.CourierOblique);
    fontBoldItalic = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
    fontMono = fontRegular;
    fontMonoBold = fontBold;
  } else {
    // github or modern
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
    fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  }

  // Dimensions
  let width = pageSize === 'letter' ? 612 : 595.28;
  let height = pageSize === 'letter' ? 792 : 841.89;

  if (orientation === 'landscape') {
    const temp = width;
    width = height;
    height = temp;
  }

  // Margin sizes
  let margin = 45;
  if (margins === 'compact') margin = 32;
  if (margins === 'generous') margin = 58;

  const availableWidth = width - margin * 2;
  const bottomLimit = margin + 25;

  // Theme-specific colors
  const textColor = rgb(0.12, 0.16, 0.22);
  const headerColor = theme === 'modern' ? rgb(0.15, 0.23, 0.55) : rgb(0.06, 0.09, 0.16);
  const subtleBorderColor = rgb(0.86, 0.89, 0.93);
  const codeBgColor = rgb(0.96, 0.97, 0.98);
  const codeBorderColor = rgb(0.88, 0.9, 0.93);
  const tableHeaderBg = rgb(0.94, 0.96, 0.98);
  const mutedTextColor = rgb(0.48, 0.54, 0.62);

  // Layout state
  const pages: PDFPage[] = [];
  let currentPage = pdfDoc.addPage([width, height]);
  pages.push(currentPage);
  let currentY = height - margin;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([width, height]);
    pages.push(currentPage);
    currentY = height - margin;
  };

  const ensureSpace = (needed: number) => {
    if (currentY - needed < bottomLimit) {
      addNewPage();
    }
  };

  /**
   * Helper to measure a span
   */
  const getSpanFont = (span: InlineSpan): PDFFont => {
    if (span.code) return span.bold ? fontMonoBold : fontMono;
    if (span.bold && span.italic) return fontBoldItalic;
    if (span.bold) return fontBold;
    if (span.italic) return fontItalic;
    return fontRegular;
  };

  /**
   * Word wrap inline spans into lines of styled fragments
   */
  interface TextFragment {
    text: string;
    font: PDFFont;
    size: number;
    color: any;
    isCode?: boolean;
    isStrike?: boolean;
    isLink?: boolean;
    width: number;
  }

  interface RenderLine {
    fragments: TextFragment[];
    width: number;
    height: number;
  }

  const wrapSpansToLines = (spans: InlineSpan[], fontSize: number, maxWidth: number, defaultColor = textColor): RenderLine[] => {
    const wordsWithStyle: { word: string; span: InlineSpan; font: PDFFont; width: number }[] = [];

    spans.forEach((span) => {
      const font = getSpanFont(span);
      const sanitized = sanitizeForPdfFont(span.text, font);
      if (!sanitized) return;

      const words = sanitized.split(/(\s+)/);
      words.forEach((w) => {
        if (!w) return;
        let wWidth = 0;
        try {
          wWidth = font.widthOfTextAtSize(w, fontSize);
        } catch {
          wWidth = 0;
        }
        wordsWithStyle.push({ word: w, span, font, width: wWidth });
      });
    });

    const lines: RenderLine[] = [];
    let currentLineFrags: TextFragment[] = [];
    let currentLineWidth = 0;
    const lineHeight = fontSize * 1.45;

    for (const item of wordsWithStyle) {
      const isWhitespace = /^\s+$/.test(item.word);
      if (currentLineWidth + item.width > maxWidth && currentLineFrags.length > 0 && !isWhitespace) {
        lines.push({
          fragments: currentLineFrags,
          width: currentLineWidth,
          height: lineHeight,
        });
        currentLineFrags = [];
        currentLineWidth = 0;
      }

      if (currentLineFrags.length === 0 && isWhitespace) {
        continue; // skip leading space
      }

      currentLineFrags.push({
        text: item.word,
        font: item.font,
        size: fontSize,
        color: item.span.linkUrl ? rgb(0.12, 0.44, 0.88) : defaultColor,
        isCode: item.span.code,
        isStrike: item.span.strikethrough,
        isLink: Boolean(item.span.linkUrl),
        width: item.width,
      });
      currentLineWidth += item.width;
    }

    if (currentLineFrags.length > 0) {
      lines.push({
        fragments: currentLineFrags,
        width: currentLineWidth,
        height: lineHeight,
      });
    }

    return lines;
  };

  /**
   * Draw lines of styled fragments onto current page
   */
  const drawLines = (lines: RenderLine[], startX: number) => {
    lines.forEach((line) => {
      ensureSpace(line.height);
      let curX = startX;

      line.fragments.forEach((frag) => {
        if (frag.isCode) {
          // Draw code pill background
          currentPage.drawRectangle({
            x: curX - 2,
            y: currentY - 2,
            width: frag.width + 4,
            height: frag.size + 4,
            color: codeBgColor,
            borderColor: codeBorderColor,
            borderWidth: 0.5,
          });
        }

        currentPage.drawText(frag.text, {
          x: curX,
          y: currentY,
          size: frag.size,
          font: frag.font,
          color: frag.color,
        });

        if (frag.isStrike) {
          // Strikethrough line
          currentPage.drawLine({
            start: { x: curX, y: currentY + frag.size * 0.35 },
            end: { x: curX + frag.width, y: currentY + frag.size * 0.35 },
            thickness: 0.75,
            color: frag.color,
          });
        }

        if (frag.isLink) {
          // Underline for link
          currentPage.drawLine({
            start: { x: curX, y: currentY - 1 },
            end: { x: curX + frag.width, y: currentY - 1 },
            thickness: 0.5,
            color: frag.color,
          });
        }

        curX += frag.width;
      });

      currentY -= line.height;
    });
  };

  onProgress?.(40, 'Composizione layout vettoriale delle sezioni...');
  const totalBlocks = parsed.blocks.length;

  for (let bIdx = 0; bIdx < totalBlocks; bIdx++) {
    const block = parsed.blocks[bIdx];
    const pct = Math.round(40 + (bIdx / totalBlocks) * 45);
    onProgress?.(pct, `Impaginazione elemento ${bIdx + 1} di ${totalBlocks}...`);

    switch (block.type) {
      case 'header': {
        const sizes = [22, 17, 14, 12, 11, 10];
        const hSize = sizes[block.level - 1] || 12;
        const topSpacing = block.level <= 2 ? 18 : 12;
        const bottomSpacing = block.level <= 2 ? 8 : 4;

        ensureSpace(hSize + topSpacing + bottomSpacing + 15);
        currentY -= topSpacing;

        const lines = wrapSpansToLines(block.spans, hSize, availableWidth, headerColor);
        drawLines(lines, margin);

        // Underline for H1 and H2
        if (block.level <= 2) {
          currentY -= 4;
          currentPage.drawLine({
            start: { x: margin, y: currentY },
            end: { x: margin + availableWidth, y: currentY },
            thickness: block.level === 1 ? 1.25 : 0.75,
            color: block.level === 1 ? (theme === 'modern' ? rgb(0.2, 0.35, 0.8) : subtleBorderColor) : subtleBorderColor,
          });
          currentY -= bottomSpacing;
        } else {
          currentY -= bottomSpacing;
        }
        break;
      }

      case 'paragraph': {
        const lines = wrapSpansToLines(block.spans, 10.5, availableWidth, textColor);
        drawLines(lines, margin);
        currentY -= 6; // paragraph spacing
        break;
      }

      case 'code_block': {
        const codeLines = block.code.split('\n');
        const codeFontSize = 8.5;
        const codeLineHeight = codeFontSize * 1.4;
        const padding = 10;
        const totalCodeHeight = codeLines.length * codeLineHeight + padding * 2;

        ensureSpace(Math.min(totalCodeHeight, 140));

        // Draw code box container
        const boxHeight = totalCodeHeight;
        const startBoxY = currentY;

        // If fits on page
        if (currentY - boxHeight >= bottomLimit) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - boxHeight,
            width: availableWidth,
            height: boxHeight,
            color: codeBgColor,
            borderColor: codeBorderColor,
            borderWidth: 0.75,
          });

          // Language tag badge
          if (block.language) {
            const badgeFont = fontMonoBold;
            const badgeText = block.language.toUpperCase();
            const badgeW = badgeFont.widthOfTextAtSize(badgeText, 7) + 8;
            currentPage.drawRectangle({
              x: margin + availableWidth - badgeW - 6,
              y: currentY - 14,
              width: badgeW,
              height: 10,
              color: rgb(0.88, 0.91, 0.95),
            });
            currentPage.drawText(badgeText, {
              x: margin + availableWidth - badgeW - 2,
              y: currentY - 12,
              size: 6.5,
              font: badgeFont,
              color: rgb(0.3, 0.38, 0.5),
            });
          }

          currentY -= padding + codeFontSize;

          codeLines.forEach((cLine) => {
            const sanitized = sanitizeForPdfFont(cLine, fontMono);
            currentPage.drawText(sanitized, {
              x: margin + padding,
              y: currentY,
              size: codeFontSize,
              font: fontMono,
              color: rgb(0.18, 0.22, 0.3),
            });
            currentY -= codeLineHeight;
          });

          currentY -= padding - codeLineHeight + 8;
        } else {
          // Multipage code block
          currentY -= 6;
          codeLines.forEach((cLine) => {
            ensureSpace(codeLineHeight + 4);
            const sanitized = sanitizeForPdfFont(cLine, fontMono);
            currentPage.drawText(sanitized, {
              x: margin + 12,
              y: currentY,
              size: codeFontSize,
              font: fontMono,
              color: rgb(0.18, 0.22, 0.3),
            });
            currentY -= codeLineHeight;
          });
          currentY -= 8;
        }
        break;
      }

      case 'blockquote': {
        let barColor = rgb(0.25, 0.45, 0.85); // default blue
        let bgTint = rgb(0.96, 0.97, 0.99);

        if (block.alertType === 'tip') {
          barColor = rgb(0.12, 0.65, 0.38);
          bgTint = rgb(0.95, 0.99, 0.96);
        } else if (block.alertType === 'warning') {
          barColor = rgb(0.85, 0.55, 0.1);
          bgTint = rgb(0.99, 0.98, 0.94);
        } else if (block.alertType === 'caution') {
          barColor = rgb(0.85, 0.2, 0.2);
          bgTint = rgb(0.99, 0.95, 0.95);
        } else if (block.alertType === 'important') {
          barColor = rgb(0.55, 0.25, 0.85);
          bgTint = rgb(0.97, 0.95, 0.99);
        }

        const indentX = margin + 14;
        const bqWidth = availableWidth - 14;
        const lines = wrapSpansToLines(block.spans, 10, bqWidth, rgb(0.2, 0.25, 0.32));
        const bqHeight = lines.length * 10 * 1.45 + 10;

        ensureSpace(bqHeight + 6);

        // Background box
        currentPage.drawRectangle({
          x: margin,
          y: currentY - bqHeight,
          width: availableWidth,
          height: bqHeight,
          color: bgTint,
        });

        // Left accent bar
        currentPage.drawRectangle({
          x: margin,
          y: currentY - bqHeight,
          width: 3.5,
          height: bqHeight,
          color: barColor,
        });

        currentY -= 6;
        drawLines(lines, indentX);
        currentY -= 6;
        break;
      }

      case 'list_item': {
        const indentX = margin + block.level * 16;
        const contentX = indentX + 14;
        const contentWidth = availableWidth - (block.level * 16 + 14);

        ensureSpace(16);

        // Marker (Bullet, Number, or Checkbox)
        if (block.listType === 'task') {
          const boxSize = 8;
          currentPage.drawRectangle({
            x: indentX,
            y: currentY + 1,
            width: boxSize,
            height: boxSize,
            color: block.checked ? rgb(0.15, 0.5, 0.9) : rgb(1, 1, 1),
            borderColor: rgb(0.5, 0.55, 0.65),
            borderWidth: 0.75,
          });
          if (block.checked) {
            currentPage.drawText('x', {
              x: indentX + 1.5,
              y: currentY + 1.5,
              size: 7,
              font: fontBold,
              color: rgb(1, 1, 1),
            });
          }
        } else if (block.listType === 'number') {
          currentPage.drawText(block.marker, {
            x: indentX,
            y: currentY,
            size: 10,
            font: fontBold,
            color: headerColor,
          });
        } else {
          // Bullet dot
          currentPage.drawCircle({
            x: indentX + 4,
            y: currentY + 3.5,
            size: 2,
            color: headerColor,
          });
        }

        const lines = wrapSpansToLines(block.spans, 10, contentWidth, textColor);
        drawLines(lines, contentX);
        currentY -= 3;
        break;
      }

      case 'table': {
        const colCount = Math.max(block.headers.length, ...block.rows.map((r) => r.length));
        if (colCount === 0) break;

        const colWidth = availableWidth / colCount;
        const cellPadding = 6;
        const cellFontSize = 9;

        // Render header row
        ensureSpace(35);
        currentPage.drawRectangle({
          x: margin,
          y: currentY - 22,
          width: availableWidth,
          height: 22,
          color: tableHeaderBg,
          borderColor: subtleBorderColor,
          borderWidth: 0.75,
        });

        block.headers.forEach((hCell, cIdx) => {
          const cX = margin + cIdx * colWidth + cellPadding;
          const lines = wrapSpansToLines(hCell, cellFontSize, colWidth - cellPadding * 2, headerColor);
          if (lines[0] && lines[0].fragments[0]) {
            currentPage.drawText(lines[0].fragments.map((f) => f.text).join(''), {
              x: cX,
              y: currentY - 14,
              size: cellFontSize,
              font: fontBold,
              color: headerColor,
            });
          }
        });
        currentY -= 22;

        // Render table rows
        block.rows.forEach((row, rIdx) => {
          const rowLinesPerCol = row.map((cell) => wrapSpansToLines(cell, cellFontSize, colWidth - cellPadding * 2, textColor));
          const maxLines = Math.max(1, ...rowLinesPerCol.map((l) => l.length));
          const rowHeight = maxLines * cellFontSize * 1.35 + cellPadding * 2;

          ensureSpace(rowHeight + 4);

          // Alternating row background
          if (rIdx % 2 === 1) {
            currentPage.drawRectangle({
              x: margin,
              y: currentY - rowHeight,
              width: availableWidth,
              height: rowHeight,
              color: rgb(0.985, 0.99, 1),
            });
          }

          // Row borders
          currentPage.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: availableWidth,
            height: rowHeight,
            borderColor: subtleBorderColor,
            borderWidth: 0.5,
          });

          // Draw cells
          row.forEach((_, cIdx) => {
            const colLines = rowLinesPerCol[cIdx] || [];
            const cX = margin + cIdx * colWidth + cellPadding;
            let cellY = currentY - cellPadding - cellFontSize;

            colLines.forEach((l) => {
              const fullText = l.fragments.map((f) => f.text).join('');
              currentPage.drawText(fullText, {
                x: cX,
                y: cellY,
                size: cellFontSize,
                font: fontRegular,
                color: textColor,
              });
              cellY -= cellFontSize * 1.35;
            });
          });

          currentY -= rowHeight;
        });

        currentY -= 8;
        break;
      }

      case 'hr': {
        ensureSpace(16);
        currentY -= 8;
        currentPage.drawLine({
          start: { x: margin, y: currentY },
          end: { x: margin + availableWidth, y: currentY },
          thickness: 0.75,
          color: subtleBorderColor,
        });
        currentY -= 8;
        break;
      }

      case 'pagebreak': {
        addNewPage();
        break;
      }
    }
  }

  // Pass 2: Running Header and Footers (Pagina X di Y)
  onProgress?.(90, 'Applicazione numerazione pagine vettoriale...');
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNum = i + 1;

    // Running Header (only on page 2 onwards)
    if (showRunningHeader && pageNum > 1 && finalTitle) {
      const headerText = sanitizeForPdfFont(finalTitle, fontRegular);
      page.drawText(headerText, {
        x: margin,
        y: height - margin + 12,
        size: 8,
        font: fontRegular,
        color: mutedTextColor,
      });

      page.drawLine({
        start: { x: margin, y: height - margin + 8 },
        end: { x: width - margin, y: height - margin + 8 },
        thickness: 0.4,
        color: subtleBorderColor,
      });
    }

    // Running Footer
    if (showPageNumbers) {
      const footerText = `Pagina ${pageNum} di ${totalPages}`;
      const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8.5);

      page.drawText(footerText, {
        x: width - margin - footerWidth,
        y: margin - 15,
        size: 8.5,
        font: fontRegular,
        color: mutedTextColor,
      });

      // LibrePDF subtle watermark mark
      page.drawText('Generato con LibrePDF Studio', {
        x: margin,
        y: margin - 15,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.68, 0.72, 0.78),
      });

      page.drawLine({
        start: { x: margin, y: margin - 6 },
        end: { x: width - margin, y: margin - 6 },
        thickness: 0.4,
        color: subtleBorderColor,
      });
    }
  }

  onProgress?.(98, 'Salvataggio stream binario PDF...');
  const pdfBytes = await pdfDoc.save();

  onProgress?.(100, 'Conversione completata con successo!');

  return {
    pdfBytes,
    pageCount: totalPages,
    wordCount: parsed.wordCount,
    title: finalTitle,
  };
}
