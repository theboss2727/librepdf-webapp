import type { ProcessedItem, CloudSyncSettings } from '../types/pdf';

const DB_NAME = 'libre_pdf_vault_db';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

/** Open or initialize IndexedDB for local document vault */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supportato'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save processed document to local vault */
export async function saveToVault(item: {
  toolId: string;
  name: string;
  originalSize: number;
  resultSize: number;
  data: Uint8Array | Blob;
}): Promise<ProcessedItem> {
  const db = await openDB();
  const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const blob = item.data instanceof Blob ? item.data : new Blob([item.data as any], { type: 'application/pdf' });

  const record: ProcessedItem = {
    id,
    toolId: item.toolId as any,
    name: item.name,
    originalSize: item.originalSize,
    resultSize: item.resultSize || blob.size,
    date: new Date().toISOString(),
    dataBlob: blob,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/** Retrieve all items from vault */
export async function getAllVaultItems(): Promise<ProcessedItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as ProcessedItem[];
        // Sort newest first
        items.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Errore lettura vault:', e);
    return [];
  }
}

/** Delete an item from vault */
export async function deleteVaultItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Clear all vault items */
export async function clearVault(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Settings for Cloud Sync stored in localStorage */
const CLOUD_SETTINGS_KEY = 'libre_pdf_cloud_sync_cfg';

export function getCloudSyncSettings(): CloudSyncSettings {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      provider: 'local-vault',
      autoSaveOutputs: true,
    };
  }
  try {
    const saved = localStorage.getItem(CLOUD_SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // default
  }
  return {
    enabled: false,
    provider: 'local-vault',
    autoSaveOutputs: true,
  };
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLOUD_SETTINGS_KEY, JSON.stringify(settings));
  }
}

/** Export entire vault as a portable encrypted/JSON archive bundle */
export async function exportVaultArchive(): Promise<Blob> {
  const items = await getAllVaultItems();
  const exportData = [];

  for (const item of items) {
    let base64 = '';
    if (item.dataBlob) {
      const buffer = await item.dataBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }
    exportData.push({
      id: item.id,
      name: item.name,
      toolId: item.toolId,
      originalSize: item.originalSize,
      resultSize: item.resultSize,
      date: item.date,
      fileBase64: base64,
    });
  }

  const packageJson = JSON.stringify(
    {
      app: 'LibrePDF Studio Backup',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      itemCount: exportData.length,
      items: exportData,
    },
    null,
    2
  );

  return new Blob([packageJson], { type: 'application/json' });
}

/** Import vault archive back into IndexedDB */
export async function importVaultArchive(file: File): Promise<number> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('File di backup non valido o danneggiato.');
  }

  let count = 0;
  for (const item of data.items) {
    if (item.fileBase64) {
      const binary = atob(item.fileBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      await saveToVault({
        toolId: item.toolId,
        name: item.name,
        originalSize: item.originalSize,
        resultSize: item.resultSize,
        data: bytes,
      });
      count++;
    }
  }
  return count;
}
