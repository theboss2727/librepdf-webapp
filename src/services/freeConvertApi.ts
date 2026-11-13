/**
 * FreeConvert API Client & Intelligent Format Suggestion Matrix
 * Supports over 1,500 file formats including Apple Pages, Word, PDF, HEIC, Audio/Video, etc.
 */

export interface FormatOption {
  format: string; // e.g. 'pdf', 'docx', 'xlsx'
  label: string; // e.g. 'Documento PDF'
  category: 'document' | 'image' | 'spreadsheet' | 'presentation' | 'ebook' | 'archive' | 'audio' | 'video';
  isRecommended?: boolean;
  description?: string;
}

export interface FormatSuggestionResult {
  inputExt: string;
  categoryName: string;
  description: string;
  formats: FormatOption[];
  defaultFormat: string;
}

const STORAGE_KEY = 'librepdf_freeconvert_api_key';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  // Optional fallback to env variable if configured
  return (import.meta.env.VITE_FREECONVERT_API_KEY as string) || '';
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key || !key.trim()) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }
}

/**
 * Intelligent Format Suggestion Engine:
 * Analyzes the input filename/extension and suggests the most relevant, popular output formats.
 */
export function getSuggestedOutputFormats(filename: string): FormatSuggestionResult {
  const parts = filename.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop()! : '';

  switch (ext) {
    // Apple Pages
    case 'pages':
      return {
        inputExt: 'pages',
        categoryName: 'Documento Apple Pages (Mac/iOS)',
        description: 'Pacchetto documento proprietario Apple Pages.',
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Vettoriale A4 standard universale' },
          { format: 'docx', label: 'Word (.docx)', category: 'document', description: 'Modificabile in Microsoft Word e Google Docs' },
          { format: 'doc', label: 'Word (.doc)', category: 'document', description: 'Formato Word 97-2003 legacy' },
          { format: 'txt', label: 'Testo puro (.txt)', category: 'document', description: 'Solo testo senza formattazione' },
          { format: 'epub', label: 'ePub', category: 'ebook', description: 'Libro digitale per Apple Books e lettori' },
          { format: 'html', label: 'HTML', category: 'document', description: 'Pagina web visualizzabile nel browser' },
        ],
      };

    // Apple Numbers
    case 'numbers':
      return {
        inputExt: 'numbers',
        categoryName: 'Foglio di Calcolo Apple Numbers',
        description: 'Foglio di lavoro e tabelle Apple Numbers.',
        defaultFormat: 'xlsx',
        formats: [
          { format: 'xlsx', label: 'Excel (.xlsx)', category: 'spreadsheet', isRecommended: true, description: 'Cartella di lavoro Microsoft Excel' },
          { format: 'pdf', label: 'PDF', category: 'document', description: 'Riepilogo stampabile impaginato' },
          { format: 'csv', label: 'CSV', category: 'spreadsheet', description: 'Dati tabulari separati da virgole' },
          { format: 'ods', label: 'OpenDocument (.ods)', category: 'spreadsheet', description: 'Formato per LibreOffice Calc' },
        ],
      };

    // Apple Keynote
    case 'key':
    case 'keynote':
      return {
        inputExt: 'key',
        categoryName: 'Presentazione Apple Keynote',
        description: 'Slide e presentazioni Apple Keynote.',
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Diapositive impaginate in PDF' },
          { format: 'pptx', label: 'PowerPoint (.pptx)', category: 'presentation', description: 'Presentazione Microsoft PowerPoint' },
          { format: 'html', label: 'HTML', category: 'document', description: 'Visualizzazione interattiva web' },
        ],
      };

    // Microsoft Word / Testi generici
    case 'docx':
    case 'doc':
    case 'odt':
    case 'rtf':
    case 'wps':
      return {
        inputExt: ext,
        categoryName: 'Documento di Testo',
        description: `File di testo formato .${ext.toUpperCase()}`,
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Documento PDF fisso e non alterabile' },
          { format: 'docx', label: 'Word (.docx)', category: 'document', description: 'Microsoft Word OpenXML' },
          { format: 'odt', label: 'OpenDocument (.odt)', category: 'document', description: 'LibreOffice / OpenOffice Writer' },
          { format: 'rtf', label: 'Rich Text (.rtf)', category: 'document', description: 'Formato testo formattato universale' },
          { format: 'txt', label: 'Testo puro (.txt)', category: 'document', description: 'ASCII/UTF-8 senza formattazione' },
          { format: 'html', label: 'HTML', category: 'document', description: 'Codice pagina web' },
          { format: 'epub', label: 'ePub', category: 'ebook', description: 'Formato libro digitale' },
        ],
      };

    // PDF Document
    case 'pdf':
      return {
        inputExt: 'pdf',
        categoryName: 'Documento PDF Adobe',
        description: 'Documento vettoriale impaginato PDF.',
        defaultFormat: 'docx',
        formats: [
          { format: 'docx', label: 'Word (.docx)', category: 'document', isRecommended: true, description: 'Documento modificabile in Word' },
          { format: 'xlsx', label: 'Excel (.xlsx)', category: 'spreadsheet', description: 'Estrai tabelle in foglio di calcolo' },
          { format: 'pptx', label: 'PowerPoint (.pptx)', category: 'presentation', description: 'Converti pagine in diapositive' },
          { format: 'jpg', label: 'Immagini JPG', category: 'image', description: 'Pagine esportate come immagini JPG' },
          { format: 'png', label: 'Immagini PNG', category: 'image', description: 'Grafica PNG nitida' },
          { format: 'txt', label: 'Testo puro (.txt)', category: 'document', description: 'Stream di caratteri testo' },
          { format: 'epub', label: 'ePub', category: 'ebook', description: 'Libro elettronico ePub' },
          { format: 'html', label: 'HTML', category: 'document', description: 'Codice web HTML' },
        ],
      };

    // Fogli di calcolo
    case 'xlsx':
    case 'xls':
    case 'csv':
    case 'ods':
      return {
        inputExt: ext,
        categoryName: 'Foglio di Calcolo',
        description: `Dati tabulari e formule .${ext.toUpperCase()}`,
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Tabella stampata con griglia in PDF' },
          { format: 'xlsx', label: 'Excel (.xlsx)', category: 'spreadsheet', description: 'Formato moderno cartella Excel' },
          { format: 'csv', label: 'CSV', category: 'spreadsheet', description: 'Dati delimitati da virgola per database' },
          { format: 'ods', label: 'OpenDocument (.ods)', category: 'spreadsheet', description: 'Standard libero LibreOffice' },
          { format: 'html', label: 'HTML Table', category: 'document', description: 'Tabella web formattata' },
        ],
      };

    // Presentazioni
    case 'pptx':
    case 'ppt':
    case 'odp':
      return {
        inputExt: ext,
        categoryName: 'Presentazione Diapositive',
        description: `Slide e diapositive .${ext.toUpperCase()}`,
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Slide pronte per stampa o proiezioni' },
          { format: 'pptx', label: 'PowerPoint (.pptx)', category: 'presentation', description: 'Formato standard PowerPoint' },
          { format: 'odp', label: 'OpenDocument (.odp)', category: 'presentation', description: 'LibreOffice Impress' },
          { format: 'jpg', label: 'Immagini JPG', category: 'image', description: 'Slide salvate come singole immagini' },
        ],
      };

    // Foto Apple & Formati RAW
    case 'heic':
    case 'heif':
    case 'dng':
    case 'cr2':
    case 'nef':
    case 'arw':
      return {
        inputExt: ext,
        categoryName: 'Foto Apple / RAW Digitale',
        description: 'Immagine compressa HEIC o scatto fotografico RAW.',
        defaultFormat: 'jpg',
        formats: [
          { format: 'jpg', label: 'JPEG (.jpg)', category: 'image', isRecommended: true, description: 'Compatibile con qualsiasi PC, web e TV' },
          { format: 'png', label: 'PNG (.png)', category: 'image', description: 'Massima qualità senza compressione lossy' },
          { format: 'pdf', label: 'PDF', category: 'document', description: 'Documento PDF con foto a piena risoluzione' },
          { format: 'webp', label: 'WebP', category: 'image', description: 'Formato ultra-leggero per il web' },
        ],
      };

    // Vettoriali e Grafica Professionale
    case 'ai':
    case 'eps':
    case 'psd':
    case 'svg':
    case 'cdr':
      return {
        inputExt: ext,
        categoryName: 'Grafica Vettoriale / Progetto',
        description: `File grafico avanzato .${ext.toUpperCase()}`,
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF Vettoriale', category: 'document', isRecommended: true, description: 'Mantiene tracciati e curve vettoriali' },
          { format: 'png', label: 'PNG Trasparente', category: 'image', description: 'Immagine raster con trasparenza alpha' },
          { format: 'svg', label: 'SVG', category: 'image', description: 'Vettoriale web scalabile all\'infinito' },
          { format: 'jpg', label: 'JPG', category: 'image', description: 'Immagine standard ad alta definizione' },
        ],
      };

    // Immagini Standard
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'bmp':
    case 'tiff':
    case 'gif':
    case 'ico':
      return {
        inputExt: ext,
        categoryName: 'Immagine Raster',
        description: `File grafico .${ext.toUpperCase()}`,
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Impagina immagine in documento PDF' },
          { format: 'png', label: 'PNG', category: 'image', description: 'Qualità lossless nitida' },
          { format: 'jpg', label: 'JPG / JPEG', category: 'image', description: 'Immagine compressa universale' },
          { format: 'webp', label: 'WebP', category: 'image', description: 'Ottimizzata per siti e caricamenti' },
          { format: 'ico', label: 'Favicon (.ico)', category: 'image', description: 'Icona per applicazioni e siti' },
          { format: 'tiff', label: 'TIFF', category: 'image', description: 'Formato per stampa tipografica' },
        ],
      };

    // eBook
    case 'epub':
    case 'mobi':
    case 'azw3':
    case 'fb2':
      return {
        inputExt: ext,
        categoryName: 'Libro Digitale (eBook)',
        description: `eBook reader format .${ext.toUpperCase()}`,
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF A4', category: 'document', isRecommended: true, description: 'Pronto per la lettura e la stampa su PC' },
          { format: 'epub', label: 'ePub', category: 'ebook', description: 'Formato standard aperto per eReader' },
          { format: 'mobi', label: 'Kindle (.mobi)', category: 'ebook', description: 'Formato per Amazon Kindle' },
          { format: 'txt', label: 'Testo (.txt)', category: 'document', description: 'Testo puro senza formattazione' },
        ],
      };

    // Audio & Video
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
    case 'flv':
      return {
        inputExt: ext,
        categoryName: 'Video Multimediale',
        description: `Flusso video .${ext.toUpperCase()}`,
        defaultFormat: 'mp4',
        formats: [
          { format: 'mp4', label: 'MP4 (H.264)', category: 'video', isRecommended: true, description: 'Standard universale per web e smartphone' },
          { format: 'mp3', label: 'Audio MP3', category: 'audio', description: 'Estrai la traccia audio dal video' },
          { format: 'gif', label: 'GIF Animata', category: 'image', description: 'Animazione senza audio per chat e web' },
          { format: 'webm', label: 'WebM', category: 'video', description: 'Video ottimizzato per il web' },
          { format: 'wav', label: 'Audio WAV', category: 'audio', description: 'Audio non compresso' },
        ],
      };

    case 'mp3':
    case 'wav':
    case 'm4a':
    case 'flac':
    case 'aac':
    case 'ogg':
    case 'wma':
      return {
        inputExt: ext,
        categoryName: 'File Audio',
        description: `Traccia sonora .${ext.toUpperCase()}`,
        defaultFormat: 'mp3',
        formats: [
          { format: 'mp3', label: 'MP3', category: 'audio', isRecommended: true, description: 'Audio compresso compatibile con ogni dispositivo' },
          { format: 'wav', label: 'WAV', category: 'audio', description: 'Audio PCM di altissima fedeltà non compresso' },
          { format: 'm4a', label: 'M4A (AAC)', category: 'audio', description: 'Ottimizzato per dispositivi Apple' },
          { format: 'flac', label: 'FLAC', category: 'audio', description: 'Compressione audio senza alcuna perdita' },
        ],
      };

    // Formato generico / non catalogato
    default:
      return {
        inputExt: ext || 'sconosciuto',
        categoryName: 'File Generico',
        description: ext ? `File con estensione .${ext.toUpperCase()}` : 'File non identificato',
        defaultFormat: 'pdf',
        formats: [
          { format: 'pdf', label: 'PDF', category: 'document', isRecommended: true, description: 'Conversione in documento PDF universale' },
          { format: 'docx', label: 'Word (.docx)', category: 'document', description: 'Microsoft Word Document' },
          { format: 'jpg', label: 'JPG', category: 'image', description: 'Immagine fotografica' },
          { format: 'png', label: 'PNG', category: 'image', description: 'Grafica raster' },
          { format: 'txt', label: 'Testo (.txt)', category: 'document', description: 'Testo decodificato' },
        ],
      };
  }
}

/**
 * Execute Cloud Conversion via FreeConvert REST API
 */
export async function convertFileWithFreeConvert(
  file: File,
  targetFormat: string,
  apiKey: string,
  onProgress?: (progress: number, statusMsg: string) => void
): Promise<{ downloadUrl: string; resultBlob: Blob; outputFilename: string }> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chiave API di FreeConvert non configurata. Inserisci la tua API Key per procedere.');
  }

  const cleanKey = apiKey.trim();
  const useServerKey = cleanKey === '__SERVER_PROVIDED__';
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const outputFilename = `${baseName}.${targetFormat.toLowerCase()}`;

  onProgress?.(10, 'Inizializzazione sessione di conversione...');

  // Try local proxy first, fallback to direct API
  const endpoints = useServerKey
    ? ['/api/freeconvert/v1/process/jobs']
    : ['/api/freeconvert/v1/process/jobs', 'https://api.freeconvert.com/v1/process/jobs'];
  let jobData: any = null;
  let activeApiBase = '';

  for (const endpoint of endpoints) {
    try {
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!useServerKey) {
        reqHeaders.Authorization = `Bearer ${cleanKey}`;
      }
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          tasks: {
            'import-file': {
              operation: 'import/upload',
            },
            'convert-file': {
              operation: 'convert',
              input: 'import-file',
              output_format: targetFormat.toLowerCase(),
            },
            'export-file': {
              operation: 'export/url',
              input: 'convert-file',
            },
          },
        }),
      });

      if (resp.status === 401 || resp.status === 403) {
        throw new Error('Chiave API FreeConvert non valida o non autorizzata. Verifica la tua chiave su freeconvert.com.');
      }

      if (resp.status === 402 || resp.status === 429) {
        throw new Error('Limite minuti o crediti FreeConvert superato per oggi. La quota gratuita si ripristina ogni 24 ore.');
      }

      if (resp.ok) {
        jobData = await resp.json();
        activeApiBase = endpoint.replace('/v1/process/jobs', '');
        break;
      }
    } catch (e: any) {
      if (e.message?.includes('Chiave API') || e.message?.includes('Limite minuti')) {
        throw e;
      }
      // Try next endpoint if network or CORS failed
    }
  }

  if (!jobData || !jobData.id) {
    throw new Error(
      'Impossibile contattare i server di FreeConvert. Verifica la connessione internet e che la tua API key sia corretta.'
    );
  }

  // Step 2: Upload the file
  onProgress?.(25, 'Caricamento del file nei server di elaborazione...');
  const importTask = jobData.tasks?.find((t: any) => t.name === 'import-file');
  const form = importTask?.result?.form;

  if (form?.url) {
    const formData = new FormData();
    if (form.parameters) {
      for (const [k, v] of Object.entries(form.parameters)) {
        formData.append(k, String(v));
      }
    }
    formData.append('file', file);

    const uploadRes = await fetch(form.url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Errore durante il caricamento del file su FreeConvert (${uploadRes.status})`);
    }
  } else if (importTask?.result?.url) {
    // Direct PUT upload
    const uploadRes = await fetch(importTask.result.url, {
      method: 'PUT',
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error(`Errore durante il caricamento del file (${uploadRes.status})`);
    }
  } else {
    throw new Error('Parametri di caricamento non ricevuti dal server FreeConvert.');
  }

  onProgress?.(45, 'Elaborazione del documento in corso sui server cloud...');

  // Step 3: Polling for conversion completion
  let exportUrl = '';
  const pollUrl = `${activeApiBase}/v1/process/jobs/${jobData.id}`;
  const maxAttempts = 100; // ~ 150 seconds timeout

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));

    try {
      const pollHeaders: Record<string, string> = {};
      if (!useServerKey) {
        pollHeaders.Authorization = `Bearer ${cleanKey}`;
      }
      const pollRes = await fetch(pollUrl, {
        headers: pollHeaders,
      });

      if (!pollRes.ok) continue;

      const jobStatus = await pollRes.json();

      if (jobStatus.status === 'failed') {
        const failedTask = jobStatus.tasks?.find((t: any) => t.status === 'failed');
        throw new Error(
          failedTask?.message ||
            'La conversione è fallita sui server FreeConvert. Controlla che il file sorgente non sia danneggiato.'
        );
      }

      // Check conversion percentage
      const convTask = jobStatus.tasks?.find((t: any) => t.name === 'convert-file');
      if (convTask) {
        const pct = convTask.percent || 0;
        onProgress?.(
          Math.min(94, 45 + Math.round(pct * 0.45)),
          `Conversione in formato ${targetFormat.toUpperCase()} in corso (${pct}%)...`
        );
      }

      // Check export task
      const expTask = jobStatus.tasks?.find((t: any) => t.name === 'export-file');
      if (expTask?.status === 'completed' && expTask.result?.url) {
        exportUrl = expTask.result.url;
        break;
      }
    } catch (err: any) {
      if (err.message?.includes('conversione è fallita')) throw err;
    }
  }

  if (!exportUrl) {
    throw new Error('Timeout durante la conversione su FreeConvert. Riprova con un file più leggero.');
  }

  onProgress?.(96, 'Download del file convertito in memoria...');
  const downloadRes = await fetch(exportUrl);
  if (!downloadRes.ok) {
    throw new Error('Impossibile scaricare il file convertito dal server di FreeConvert.');
  }

  const resultBlob = await downloadRes.blob();
  const downloadUrl = URL.createObjectURL(resultBlob);

  onProgress?.(100, 'Conversione completata con successo!');
  return {
    downloadUrl,
    resultBlob,
    outputFilename,
  };
}
