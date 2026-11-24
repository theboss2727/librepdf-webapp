import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFPage,
  PDFFont,
  PDFName,
  PDFArray,
  PDFString,
} from 'pdf-lib';

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
 * Attach a clickable URI Link annotation to the PDF page at specified bounding box
 */
function addLinkAnnotationToPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  rect: [number, number, number, number],
  uri: string
) {
  try {
    let cleanUri = uri.trim();
    if (
      !cleanUri.startsWith('http://') &&
      !cleanUri.startsWith('https://') &&
      !cleanUri.startsWith('mailto:') &&
      !cleanUri.startsWith('tel:') &&
      !cleanUri.startsWith('#')
    ) {
      cleanUri = `https://${cleanUri}`;
    }

    const annot = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect,
      Border: [0, 0, 0], // completely borderless
      F: 4, // Print flag
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(cleanUri),
      },
    });

    const annotRef = pdfDoc.context.register(annot);
    const existingAnnots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (existingAnnots) {
      existingAnnots.push(annotRef);
    } else {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annotRef]));
    }
  } catch (err) {
    console.warn('Errore aggiunta link annotation nel PDF:', err);
  }
}

/**
 * Parse inline Markdown formatting: **bold**, *italic*, `code`, ~~strike~~, [text](url), <url>, <a href="...">
 */
function parseInlineMarkdown(text: string): InlineSpan[] {
  if (!text) return [];

  // 1. Replace escaped underscores (\_) and escaped asterisks (\*) with temporary private-use unicode characters
  const ESCAPED_UNDERSCORE = '\uE000';
  const ESCAPED_ASTERISK = '\uE001';
  const processed = text
    .replace(/\\_/g, ESCAPED_UNDERSCORE)
    .replace(/\\\*/g, ESCAPED_ASTERISK);

  const spans: InlineSpan[] = [];
  // GFM emphasis rules:
  // - Asterisks can format intra-word emphasis: *italic*, **bold**
  // - Underscores can ONLY trigger emphasis at word boundaries (not within words / snake_case):
  //   Opening _ or __ must not be preceded by an alphanumeric character (a-zA-Z0-9)
  //   Closing _ or __ must not be followed by an alphanumeric character (a-zA-Z0-9)
  // 1: `code`
  // 3: ***bold italic***
  // 4, 5: **bold** or __bold__
  // 6, 7: *italic* or _italic_
  // 8: ~~strike~~
  // 9, 10: [link text](url)
  // 11, 12: <a href="url">text</a>
  // 13: <autolink>
  // 14: bare url
  const regex = /(`([^`]+)`)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|(?<![a-zA-Z0-9])__([^_]+)__(?![a-zA-Z0-9])|(?<!\*)\*([^*]+)\*(?!\*)|(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])|~~([^~]+)~~|\[([^\]]+)\]\(([^)]+)\)|<a\s+[^>]*?href=["']([^"']+)["'][^>]*>(.*?)<\/a>|<((?:https?:\/\/|mailto:)[^>]+)>|(?<!\(|\/)(https?:\/\/[^\s<>)"]+)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const restoreEscapes = (str: string) =>
    str.replace(/\uE000/g, '_').replace(/\uE001/g, '*');

  while ((match = regex.exec(processed)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      spans.push({ text: restoreEscapes(processed.substring(lastIndex, matchIndex)) });
    }

    if (match[2] !== undefined) {
      // inline code
      spans.push({ text: restoreEscapes(match[2]), code: true });
    } else if (match[3] !== undefined) {
      // bold italic
      spans.push({ text: restoreEscapes(match[3]), bold: true, italic: true });
    } else if (match[4] !== undefined || match[5] !== undefined) {
      // bold
      spans.push({ text: restoreEscapes(match[4] || match[5]), bold: true });
    } else if (match[6] !== undefined || match[7] !== undefined) {
      // italic
      spans.push({ text: restoreEscapes(match[6] || match[7]), italic: true });
    } else if (match[8] !== undefined) {
      // strikethrough
      spans.push({ text: restoreEscapes(match[8]), strikethrough: true });
    } else if (match[9] !== undefined && match[10] !== undefined) {
      // markdown link [text](url)
      spans.push({ text: restoreEscapes(match[9]), linkUrl: restoreEscapes(match[10].trim()) });
    } else if (match[11] !== undefined && match[12] !== undefined) {
      // html link <a href="url">text</a>
      spans.push({ text: restoreEscapes(match[12]), linkUrl: restoreEscapes(match[11].trim()) });
    } else if (match[13] !== undefined) {
      // autolink <https://...>
      spans.push({ text: restoreEscapes(match[13]), linkUrl: restoreEscapes(match[13].trim()) });
    } else if (match[14] !== undefined) {
      // bare url https://...
      spans.push({ text: restoreEscapes(match[14]), linkUrl: restoreEscapes(match[14].trim()) });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < processed.length) {
    spans.push({ text: restoreEscapes(processed.substring(lastIndex)) });
  }

  return spans.length > 0 ? spans : [{ text: restoreEscapes(text) }];
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

  const getPageTopY = (pageIndex: number) => {
    // If running header is shown (page 2+), keep generous breathing room below header divider line (y: height - margin + 8)
    if (showRunningHeader && pageIndex > 0) {
      return height - margin - 22;
    }
    return height - margin - 12;
  };

  let currentPage = pdfDoc.addPage([width, height]);
  pages.push(currentPage);
  let currentY = getPageTopY(0);
  let isAtPageTop = true;

  const addNewPage = () => {
    currentPage = pdfDoc.addPage([width, height]);
    pages.push(currentPage);
    currentY = getPageTopY(pages.length - 1);
    isAtPageTop = true;
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
   * Break a word into sub-pieces along punctuation break points
   * (/, -, _, ., @, :, ?, &, =) or character-by-character if still exceeding maxWidth.
   * This guarantees no piece or word is ever wider than maxWidth.
   */
  const splitWordToFitWidth = (
    word: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): { text: string; width: number }[] => {
    if (!word) return [];

    let totalW = 0;
    try {
      totalW = font.widthOfTextAtSize(word, fontSize);
    } catch {
      totalW = maxWidth + 1;
    }

    // If word fits within maxWidth or slightly within cell padding tolerance (<= maxWidth + 3.5),
    // keep it intact to prevent orphaned dangling letters like "anonim" / "o"
    if (totalW <= maxWidth + 3.5) {
      return [{ text: word, width: totalW }];
    }

    // Split on breakable characters (/ - _ . @ : ? & = # \)
    const subWords: string[] = [];
    let buffer = '';

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      buffer += char;
      if ('/-_.:@?&=#\\'.includes(char) && i < word.length - 1) {
        subWords.push(buffer);
        buffer = '';
      }
    }
    if (buffer) {
      subWords.push(buffer);
    }

    const result: { text: string; width: number }[] = [];

    for (const part of subWords) {
      let pWidth = 0;
      try {
        pWidth = font.widthOfTextAtSize(part, fontSize);
      } catch {
        pWidth = maxWidth + 1;
      }

      if (pWidth <= maxWidth + 3.5) {
        result.push({ text: part, width: pWidth });
      } else {
        // Force character-by-character break
        let cur = '';
        let curW = 0;

        for (let j = 0; j < part.length; j++) {
          const c = part[j];
          let cW = 0;
          try {
            cW = font.widthOfTextAtSize(c, fontSize);
          } catch {
            cW = fontSize * 0.6;
          }

          if (curW + cW > maxWidth && cur.length > 0) {
            // Guard against single-character orphan at the end (e.g. "o" in "anonimo")
            const remainingChars = part.length - j;
            if (remainingChars <= 1 && curW + cW <= maxWidth + 6) {
              cur += c;
              curW += cW;
              continue;
            }
            result.push({ text: cur, width: curW });
            cur = c;
            curW = cW;
          } else {
            cur += c;
            curW += cW;
          }
        }

        if (cur) {
          result.push({ text: cur, width: curW });
        }
      }
    }

    return result;
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
    linkUrl?: string;
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
        if (/^\s+$/.test(w)) {
          let wWidth = 0;
          try {
            wWidth = font.widthOfTextAtSize(w, fontSize);
          } catch {
            wWidth = fontSize * 0.3;
          }
          wordsWithStyle.push({ word: w, span, font, width: wWidth });
        } else {
          // Break word if it exceeds maxWidth or has soft-break points
          const pieces = splitWordToFitWidth(w, font, fontSize, maxWidth);
          pieces.forEach((piece) => {
            wordsWithStyle.push({ word: piece.text, span, font, width: piece.width });
          });
        }
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
        linkUrl: item.span.linkUrl,
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
      isAtPageTop = false;
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

        if (frag.isLink && frag.linkUrl) {
          // Underline for link
          currentPage.drawLine({
            start: { x: curX, y: currentY - 1 },
            end: { x: curX + frag.width, y: currentY - 1 },
            thickness: 0.6,
            color: frag.color,
          });

          // Official clickable PDF Link Annotation (/Annot /Link /URI)
          addLinkAnnotationToPage(
            pdfDoc,
            currentPage,
            [curX, currentY - 2, curX + frag.width, currentY + frag.size * 1.05],
            frag.linkUrl
          );
        }

        curX += frag.width;
      });

      currentY -= line.height;
    });
  };

  /**
   * Calculate proportional column widths based on cell content length
   * Guarantees each column is wide enough to avoid breaking words like "anonimo"
   */
  const calculateTableColumnWidths = (
    headers: InlineSpan[][],
    rows: InlineSpan[][][],
    availWidth: number
  ): number[] => {
    const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
    if (colCount <= 0) return [];
    if (colCount === 1) return [availWidth];

    const colMaxChars = new Array(colCount).fill(0);
    const colTotalChars = new Array(colCount).fill(0);
    const colLongestWordChars = new Array(colCount).fill(0);

    const scanCell = (spans: InlineSpan[] | undefined, c: number) => {
      if (!spans || spans.length === 0) return;
      const fullText = spans.map((s) => s.text).join(' ');
      const len = fullText.length;
      colMaxChars[c] = Math.max(colMaxChars[c], len);
      colTotalChars[c] += len;

      const words = fullText.split(/\s+/).filter(Boolean);
      for (const w of words) {
        const pieces = w.split(/[\/\-_.:@?&=#\\]/).filter(Boolean);
        if (pieces.length === 0) {
          colLongestWordChars[c] = Math.max(colLongestWordChars[c], w.length);
        } else {
          for (const p of pieces) {
            colLongestWordChars[c] = Math.max(colLongestWordChars[c], p.length);
          }
        }
      }
    };

    headers.forEach((h, c) => scanCell(h, c));
    rows.forEach((row) => {
      row.forEach((cell, c) => {
        if (c < colCount) {
          scanCell(cell, c);
        }
      });
    });

    // Minimum width needed per column so that unbroken words (like "anonimo", "COD-04") fit without wrapping
    // 5.8pt per char + 10pt cell padding + 4pt buffer
    const colMinNeeded = colLongestWordChars.map((wLen) =>
      Math.max(34, Math.ceil(wLen * 5.8 + 14))
    );
    const sumMin = colMinNeeded.reduce((a, b) => a + b, 0);

    if (sumMin >= availWidth) {
      // Extremely tight table: scale down proportionally
      let widths = colMinNeeded.map((m) => Math.max(28, Math.floor((m / sumMin) * availWidth)));
      let sum = widths.reduce((a, b) => a + b, 0);
      while (sum > availWidth) {
        let maxIdx = 0;
        for (let i = 1; i < colCount; i++) {
          if (widths[i] > widths[maxIdx]) maxIdx = i;
        }
        widths[maxIdx]--;
        sum--;
      }
      return widths;
    }

    // Allocate guaranteed minimum widths to protect each column's words
    let widths = [...colMinNeeded];
    const remaining = availWidth - sumMin;

    // Distribute remaining width proportionally to columns with more content
    const weights = colTotalChars.map((tc, c) =>
      Math.max(1, Math.sqrt(tc) * 2.2 + colMaxChars[c] * 0.3)
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const extra = weights.map((w) => Math.floor((w / totalWeight) * remaining));
    widths = widths.map((w, c) => w + extra[c]);

    let currentSum = widths.reduce((a, b) => a + b, 0);
    const rem = Math.round(availWidth - currentSum);
    if (rem !== 0) {
      let maxIdx = 0;
      for (let i = 1; i < colCount; i++) {
        if (widths[i] > widths[maxIdx]) maxIdx = i;
      }
      widths[maxIdx] += rem;
    }

    return widths;
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
        const topSpacing = isAtPageTop ? 6 : (block.level === 1 ? 26 : block.level === 2 ? 22 : 16);
        const bottomSpacing = block.level <= 2 ? 20 : 10;

        ensureSpace(hSize + topSpacing + bottomSpacing + 25);
        currentY -= topSpacing;
        isAtPageTop = false;

        const lines = wrapSpansToLines(block.spans, hSize, availableWidth, headerColor);
        drawLines(lines, margin);

        // Underline for H1 and H2 with comfortable padding
        if (block.level <= 2) {
          currentY -= 5;
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
        isAtPageTop = false;
        const lines = wrapSpansToLines(block.spans, 10.5, availableWidth, textColor);
        drawLines(lines, margin);
        currentY -= 10; // paragraph spacing
        break;
      }

      case 'code_block': {
        isAtPageTop = false;
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
        isAtPageTop = false;
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
        isAtPageTop = false;
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

        const tableTopSpacing = isAtPageTop ? 6 : 14;
        ensureSpace(50);
        currentY -= tableTopSpacing; // Breathing room before table
        isAtPageTop = false;

        const colWidths = calculateTableColumnWidths(block.headers, block.rows, availableWidth);
        const cellPadding = 5;
        const cellFontSize = 9;

        // Calculate multi-line header height
        const headerLinesPerCol = block.headers.map((hCell, cIdx) => {
          const colW = colWidths[cIdx] || (availableWidth / colCount);
          return wrapSpansToLines(hCell, cellFontSize, colW - cellPadding * 2, headerColor);
        });
        const maxHeaderLines = Math.max(1, ...headerLinesPerCol.map((l) => l.length));
        const headerHeight = maxHeaderLines * cellFontSize * 1.35 + cellPadding * 2;

        ensureSpace(headerHeight + 30);

        // Render header row background and outer border
        currentPage.drawRectangle({
          x: margin,
          y: currentY - headerHeight,
          width: availableWidth,
          height: headerHeight,
          color: tableHeaderBg,
          borderColor: subtleBorderColor,
          borderWidth: 0.75,
        });

        // Inner vertical lines in header
        let hLineX = margin;
        for (let c = 0; c < colCount - 1; c++) {
          hLineX += colWidths[c];
          currentPage.drawLine({
            start: { x: hLineX, y: currentY },
            end: { x: hLineX, y: currentY - headerHeight },
            thickness: 0.5,
            color: subtleBorderColor,
          });
        }

        // Draw header text fragments
        let colHeadX = margin;
        block.headers.forEach((_, cIdx) => {
          const colW = colWidths[cIdx] || (availableWidth / colCount);
          const lines = headerLinesPerCol[cIdx] || [];
          let cellY = currentY - cellPadding - cellFontSize;

          lines.forEach((l) => {
            let curFragX = colHeadX + cellPadding;
            l.fragments.forEach((frag) => {
              currentPage.drawText(frag.text, {
                x: curFragX,
                y: cellY,
                size: cellFontSize,
                font: fontBold,
                color: headerColor,
              });

              if (frag.isLink && frag.linkUrl) {
                currentPage.drawLine({
                  start: { x: curFragX, y: cellY - 1 },
                  end: { x: curFragX + frag.width, y: cellY - 1 },
                  thickness: 0.5,
                  color: frag.color,
                });
                addLinkAnnotationToPage(
                  pdfDoc,
                  currentPage,
                  [curFragX, cellY - 2, curFragX + frag.width, cellY + cellFontSize * 1.05],
                  frag.linkUrl
                );
              }

              curFragX += frag.width;
            });
            cellY -= cellFontSize * 1.35;
          });

          colHeadX += colW;
        });

        currentY -= headerHeight;

        // Render table rows
        block.rows.forEach((row, rIdx) => {
          const rowLinesPerCol = row.map((cell, cIdx) => {
            const colW = colWidths[cIdx] || (availableWidth / colCount);
            return wrapSpansToLines(cell, cellFontSize, colW - cellPadding * 2, textColor);
          });
          const maxLines = Math.max(1, ...rowLinesPerCol.map((l) => l.length));
          const rowHeight = maxLines * cellFontSize * 1.35 + cellPadding * 2;

          ensureSpace(rowHeight + 6);
          isAtPageTop = false;

          // Alternating row background and outer border
          currentPage.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: availableWidth,
            height: rowHeight,
            color: rIdx % 2 === 1 ? rgb(0.985, 0.99, 1) : rgb(1, 1, 1),
            borderColor: subtleBorderColor,
            borderWidth: 0.5,
          });

          // Inner vertical divider lines for this row
          let vLineX = margin;
          for (let c = 0; c < colCount - 1; c++) {
            vLineX += colWidths[c];
            currentPage.drawLine({
              start: { x: vLineX, y: currentY },
              end: { x: vLineX, y: currentY - rowHeight },
              thickness: 0.5,
              color: subtleBorderColor,
            });
          }

          // Draw cells with exact fragment fonts & colors
          let rowCellX = margin;
          row.forEach((_, cIdx) => {
            const colW = colWidths[cIdx] || (availableWidth / colCount);
            const colLines = rowLinesPerCol[cIdx] || [];
            let cellY = currentY - cellPadding - cellFontSize;

            colLines.forEach((l) => {
              let curFragX = rowCellX + cellPadding;
              l.fragments.forEach((frag) => {
                currentPage.drawText(frag.text, {
                  x: curFragX,
                  y: cellY,
                  size: cellFontSize,
                  font: frag.font,
                  color: frag.color,
                });

                if (frag.isLink && frag.linkUrl) {
                  currentPage.drawLine({
                    start: { x: curFragX, y: cellY - 1 },
                    end: { x: curFragX + frag.width, y: cellY - 1 },
                    thickness: 0.5,
                    color: frag.color,
                  });
                  addLinkAnnotationToPage(
                    pdfDoc,
                    currentPage,
                    [curFragX, cellY - 2, curFragX + frag.width, cellY + cellFontSize * 1.05],
                    frag.linkUrl
                  );
                }

                curFragX += frag.width;
              });
              cellY -= cellFontSize * 1.35;
            });

            rowCellX += colW;
          });

          currentY -= rowHeight;
        });

        // Generous spacing after table before next element (clear interlinea)
        currentY -= 30;
        break;
      }

      case 'hr': {
        ensureSpace(32);
        isAtPageTop = false;
        currentY -= 14;
        currentPage.drawLine({
          start: { x: margin, y: currentY },
          end: { x: margin + availableWidth, y: currentY },
          thickness: 0.75,
          color: subtleBorderColor,
        });
        currentY -= 16;
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
