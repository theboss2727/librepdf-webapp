import { convertFileWithFreeConvert, getStoredApiKey } from './freeConvertApi';

export interface EngineCapabilities {
  pythonInstalled: boolean;
  pythonCmd?: string | null;
  pythonVersion?: string;
  libreOfficeInstalled: boolean;
  pdfToDocx: boolean;
  pdfToXlsx: boolean;
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
    if (res.ok) {
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

  // 2. High-Fidelity Cloud Engine (FreeConvert 1:1)
  const clientKey = (apiKeyInput ?? getStoredApiKey()).trim();
  const effectiveKey = clientKey || (caps.hasServerFreeConvertKey ? '__SERVER_PROVIDED__' : '');

  if (!effectiveKey) {
    if (caps.pythonInstalled && caps.missingPackages.length > 0) {
      throw new Error(`Le librerie Python per questo formato (${caps.missingPackages.join(', ')}) non risultano ancora caricate nel motore. Clicca su 'Ricarica Diagnostica' o 'Installa Risorse Interne' sopra.`);
    }
    throw new Error('NEED_API_KEY');
  }

  const cloudResult = await convertFileWithFreeConvert(file, targetFormat, effectiveKey, onProgress);
  return {
    ...cloudResult,
    usedLocalBackend: false,
  };
}
