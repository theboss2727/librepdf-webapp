import { convertFileWithFreeConvert, getStoredApiKey } from './freeConvertApi';

export interface EngineCapabilities {
  pdfToDocx: boolean;
  pdfToXlsx: boolean;
  officeToPdf: boolean;
  hasServerFreeConvertKey: boolean;
}

let cachedCaps: EngineCapabilities | null = null;

export async function getEngineCapabilities(): Promise<EngineCapabilities> {
  if (cachedCaps) return cachedCaps;
  try {
    const res = await fetch('/api/local-engine/capabilities');
    if (res.ok) {
      cachedCaps = await res.json();
      return cachedCaps!;
    }
  } catch {
    // Fallback if static hosting without backend
  }
  return {
    pdfToDocx: false,
    pdfToXlsx: false,
    officeToPdf: false,
    hasServerFreeConvertKey: false,
  };
}

export function isLocalEngineCapable(
  caps: EngineCapabilities,
  filename: string,
  targetFormat: string
): boolean {
  const lower = filename.toLowerCase();
  const fmt = targetFormat.toLowerCase();
  if (lower.endsWith('.pdf') && fmt === 'docx') return caps.pdfToDocx;
  if (lower.endsWith('.pdf') && fmt === 'xlsx') return caps.pdfToXlsx;
  if (fmt === 'pdf' && /\.(docx?|xlsx?|csv|odt|ods|pptx?|rtf)$/.test(lower)) return caps.officeToPdf;
  return false;
}

/**
 * High-Fidelity Conversion Dispatcher:
 * - Automatically runs Python/LibreOffice under the hood when available on the server.
 * - Seamlessly falls back to FreeConvert 1:1 Cloud Engine without exposing scripts or code to end users.
 */
export async function convertHighFidelity(
  file: File,
  targetFormat: 'docx' | 'xlsx' | 'pdf',
  apiKeyInput?: string,
  onProgress?: (progress: number, statusMsg: string) => void
): Promise<{ downloadUrl: string; resultBlob: Blob; outputFilename: string; usedLocalBackend: boolean }> {
  const caps = await getEngineCapabilities();
  const baseName = file.name.replace(/\.[^.]+$/, '') || file.name;
  const outputFilename = `${baseName}.${targetFormat}`;

  // 1. Try under-the-hood Python/LibreOffice backend if installed on host
  if (isLocalEngineCapable(caps, file.name, targetFormat)) {
    onProgress?.(20, 'Elaborazione documento ad alta fedeltà...');
    const res = await fetch('/api/local-engine/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-filename': file.name,
        'x-target-format': targetFormat,
      },
      body: await file.arrayBuffer(),
    });

    if (res.ok) {
      onProgress?.(90, 'Finalizzazione file convertito...');
      const resultBlob = await res.blob();
      const downloadUrl = URL.createObjectURL(resultBlob);
      onProgress?.(100, 'Conversione completata con successo!');
      return {
        downloadUrl,
        resultBlob,
        outputFilename,
        usedLocalBackend: true,
      };
    }
  }

  // 2. High-Fidelity Cloud Engine (FreeConvert 1:1)
  const clientKey = (apiKeyInput ?? getStoredApiKey()).trim();
  const effectiveKey = clientKey || (caps.hasServerFreeConvertKey ? '__SERVER_PROVIDED__' : '');

  if (!effectiveKey) {
    throw new Error('NEED_API_KEY');
  }

  const cloudResult = await convertFileWithFreeConvert(file, targetFormat, effectiveKey, onProgress);
  return {
    ...cloudResult,
    usedLocalBackend: false,
  };
}
