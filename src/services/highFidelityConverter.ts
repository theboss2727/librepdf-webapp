import { convertFileWithFreeConvert, getStoredApiKey } from './freeConvertApi';
import {
  convertDocxToPdf,
  convertPagesToPdf,
  convertXlsxToPdf,
  convertPdfToDocx,
  convertPdfToXlsx,
} from './officeConverters';

export interface EngineCapabilities {
  pythonInstalled: boolean;
  pythonCmd?: string | null;
  pythonVersion?: string;
  libreOfficeInstalled: boolean;
  pdfToDocx: boolean;
  pdfToXlsx: boolean;
  docxToPdf?: boolean;
  xlsxToPdf?: boolean;
  officeToPdf: boolean;
  hasDocx2Pdf?: boolean;
  hasServerFreeConvertKey: boolean;
  missingPackages: string[];
}

let cachedCaps: EngineCapabilities | null = null;

export function refreshEngineCapabilities(): void {
  cachedCaps = null;
}

export async function getEngineCapabilities(forceRefresh = false): Promise<EngineCapabilities> {
  if (!forceRefresh && cachedCaps) return cachedCaps;
  try {
    const res = await fetch(`/api/local-engine/capabilities?refresh=1&_t=${Date.now()}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      cachedCaps = await res.json();
      return cachedCaps!;
    }
  } catch {
    // Fallback if static hosting without backend
  }
  return {
    pythonInstalled: false,
    libreOfficeInstalled: false,
    pdfToDocx: false,
    pdfToXlsx: false,
    officeToPdf: false,
    hasServerFreeConvertKey: false,
    missingPackages: [],
  };
}

export async function installLocalPackages(): Promise<{ success: boolean; capabilities: EngineCapabilities }> {
  cachedCaps = null;
  const res = await fetch('/api/local-engine/install-packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Errore installazione risorse locali');
  }
  const data = await res.json();
  cachedCaps = data.capabilities;
  return data;
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
  if (fmt === 'pdf') {
    if (/\.(docx?|doc)$/.test(lower)) return caps.docxToPdf ?? caps.officeToPdf;
    if (/\.(xlsx?|xls|csv|ods|xlsm)$/.test(lower)) return caps.xlsxToPdf ?? caps.officeToPdf;
    return caps.officeToPdf;
  }
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
  // Always query live capabilities to ensure newly installed packages are immediately used
  const caps = await getEngineCapabilities(true);
  const baseName = file.name.replace(/\.[^.]+$/, '') || file.name;
  const outputFilename = `${baseName}.${targetFormat}`;

  // 1. Try under-the-hood Python/LibreOffice backend if installed on host
  if (isLocalEngineCapable(caps, file.name, targetFormat)) {
    onProgress?.(20, 'Elaborazione con motore locale nativo ad alta fedeltà...');
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
    } else {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || `Errore motore locale (${res.status}): conversione non riuscita.`);
    }
  }

  // 2. High-Fidelity Cloud Engine (FreeConvert 1:1) - only if user provides an API key
  const clientKey = (apiKeyInput ?? getStoredApiKey()).trim();
  const effectiveKey = clientKey || (caps.hasServerFreeConvertKey ? '__SERVER_PROVIDED__' : '');

  if (effectiveKey) {
    const cloudResult = await convertFileWithFreeConvert(file, targetFormat, effectiveKey, onProgress);
    return {
      ...cloudResult,
      usedLocalBackend: false,
    };
  }

  // 3. 100% In-Browser Client-Side Engine (WebAssembly & JS)
  // Zero Install, Zero External Network, Zero API Key required.
  // Note: Word documents (.docx, .doc, .odt, .rtf) require a real layout engine (Word/LibreOffice or Cloud API)
  // to prevent degraded or stripped documents. We deliberately do not perform low-fidelity fallback for Word.
  const lowerName = file.name.toLowerCase();
  const isWordDoc = targetFormat === 'pdf' && /\.(docx?|doc|odt|rtf)$/i.test(lowerName);

  if (isWordDoc) {
    throw new Error(
      'La conversione Word (.docx/.doc) con fedeltà 1:1 richiede un motore di rendering completo (Microsoft Word o LibreOffice). È disponibile gratuitamente tramite LibrePDF Desktop sul tuo computer o inserendo una chiave API Cloud (FreeConvert).'
    );
  }

  onProgress?.(25, 'Conversione locale nel browser in corso (Zero Server)...');
  const buffer = await file.arrayBuffer();
  let resultData: Uint8Array | Blob;

  if (targetFormat === 'pdf') {
    if (lowerName.endsWith('.pages')) {
      resultData = await convertPagesToPdf(buffer, onProgress);
    } else if (/\.(xlsx?|xls|csv|numbers|ods)$/.test(lowerName)) {
      resultData = await convertXlsxToPdf(buffer, { orientation: 'landscape' }, onProgress);
    } else {
      throw new Error('Formato non supportato per la conversione client-side nel browser.');
    }
  } else if (targetFormat === 'docx') {
    resultData = await convertPdfToDocx(buffer, {}, onProgress);
  } else if (targetFormat === 'xlsx') {
    const xlsxRes = await convertPdfToXlsx(buffer, onProgress);
    resultData = xlsxRes.workbookBytes;
  } else {
    throw new Error('Formato non supportato dal motore locale del browser.');
  }

  const resultBlob =
    resultData instanceof Blob
      ? resultData
      : new Blob([resultData as BlobPart], {
          type:
            targetFormat === 'pdf'
              ? 'application/pdf'
              : targetFormat === 'docx'
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

  const downloadUrl = URL.createObjectURL(resultBlob);
  onProgress?.(100, 'Conversione 100% locale completata con successo!');

  return {
    downloadUrl,
    resultBlob,
    outputFilename,
    usedLocalBackend: true,
  };
}
