export type ToolId =
  | 'merge'
  | 'split'
  | 'organize'
  | 'rotate'
  | 'edit-pdf'
  | 'watermark'
  | 'page-numbers'
  | 'extract-text'
  | 'ocr-pdf'
  | 'pdf-to-docx'
  | 'docx-to-pdf'
  | 'pdf-to-xlsx'
  | 'xlsx-to-pdf'
  | 'pdf-to-markdown'
  | 'markdown-to-pdf'
  | 'pdf-to-images'
  | 'images-to-pdf'
  | 'grayscale'
  | 'flatten'
  | 'repair'
  | 'compress'
  | 'protect'
  | 'sign-pdf'
  | 'redact-pdf'
  | 'verify-signature'
  | 'compare-pdf'
  | 'unlock-pdf'
  | 'metadata-pdf'
  | 'cloud-converter'
  | 'python-studio'
  | 'reserved-python'
  | 'vault';

export interface PdfEditElement {
  id: string;
  type: 'text' | 'image' | 'signature';
  pageIndex: number; // 0-indexed
  x: number; // in preview coordinates
  y: number; // in preview coordinates
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
  color?: string; // hex
  isBold?: boolean;
  isItalic?: boolean;
  dataUrl?: string; // data:image/png;base64,...
  opacity?: number;
  // Bordi & Contorni
  hasBorder?: boolean;
  borderWidth?: number;
  borderColor?: string;
  // Sfondo / Riempimento box
  hasBackground?: boolean;
  backgroundColor?: string;
  padding?: number;
}

export interface OcrOptions {
  language: 'ita' | 'eng' | 'fra' | 'deu' | 'spa';
  pages?: 'all' | number[];
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  wordsCount: number;
  thumbnailUrl?: string;
}

export type ToolCategory =
  | 'all'
  | 'organize'
  | 'convert'
  | 'edit'
  | 'security'
  | 'developer';

export interface ToolDefinition {
  id: ToolId;
  title: string;
  subtitle: string;
  description: string;
  category: ToolCategory;
  iconName: string;
  badge?: string;
  shortcutKey?: string;
  technicalSpec?: string;
  accepts: string;
  multiple: boolean;
  color: string;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  rotation: number; // in degrees, default 45
  color: string; // hex or rgb
  opacity: number; // 0 to 1
  pages?: 'all' | 'odd' | 'even' | number[];
}

export interface PageNumberOptions {
  format: 'simple' | 'page_of_total' | 'custom';
  customTemplate?: string;
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
  fontSize: number;
  startFrom: number;
  margin: number;
}

export interface ProcessedItem {
  id: string;
  toolId: ToolId;
  name: string;
  originalSize: number;
  resultSize: number;
  date: string;
  dataBlob?: Blob;
  downloadUrl?: string;
}

export interface CloudSyncSettings {
  enabled: boolean;
  provider: 'local-vault' | 'custom-webdav' | 'google-drive-sync';
  remoteUrl?: string;
  autoSaveOutputs: boolean;
  lastSyncDate?: string;
}
