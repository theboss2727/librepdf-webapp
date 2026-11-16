import { useCallback, useState, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import { useLoading } from '../context/LoadingContext';
import { saveToVault } from '../services/storageVault';

/* ------------------------------------------------------------------
 * Shared "preview only" preference (persisted, shared by all tools)
 * ------------------------------------------------------------------ */
const PREVIEW_KEY = 'librepdf_preview_only';
const listeners = new Set<() => void>();

function readPreviewOnly(): boolean {
  try {
    return localStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

function writePreviewOnly(value: boolean) {
  try {
    localStorage.setItem(PREVIEW_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function usePreviewOnly(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readPreviewOnly,
    () => false
  );
  return [value, writePreviewOnly];
}

/* ------------------------------------------------------------------
 * useToolRunner
 * ------------------------------------------------------------------ */
export interface PersistInput {
  name: string;
  originalSize: number;
  data: Blob | Uint8Array;
  resultSize?: number;
}

export interface RunOptions {
  /** Toast shown on success. Omit to show none. */
  successMessage?: string;
  /** Prefix for the error toast, e.g. "Errore compressione PDF". */
  errorPrefix?: string;
}

/**
 * Standard lifecycle for a tool action: global loading bar, toasts,
 * error handling and (optional) persistence to the local Vault that
 * respects the shared "preview only" flag.
 *
 * Usage:
 *   const { run, persist, isProcessing, previewOnly, setPreviewOnly } =
 *     useToolRunner({ toolId: 'compress', onSuccess });
 *   await run(async () => {
 *     const blob = ...;
 *     await persist({ name, originalSize, data: blob });
 *   }, { successMessage: 'Fatto!', errorPrefix: 'Errore compressione' });
 */
export function useToolRunner({ toolId, onSuccess }: { toolId: string; onSuccess?: () => void }) {
  const { showLoading, hideLoading } = useLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewOnly, setPreviewOnly] = usePreviewOnly();

  const persist = useCallback(
    async (input: PersistInput): Promise<boolean> => {
      if (readPreviewOnly()) return false;
      const size =
        input.resultSize ?? (input.data instanceof Blob ? input.data.size : input.data.byteLength);
      await saveToVault({
        toolId,
        name: input.name,
        originalSize: input.originalSize,
        resultSize: size,
        data: input.data,
      });
      onSuccess?.();
      return true;
    },
    [toolId, onSuccess]
  );

  const run = useCallback(
    async <T,>(task: () => Promise<T>, opts: RunOptions = {}): Promise<T | undefined> => {
      setIsProcessing(true);
      showLoading();
      try {
        const result = await task();
        if (opts.successMessage) {
          toast.success(
            readPreviewOnly() ? `${opts.successMessage} (solo anteprima, non salvato)` : opts.successMessage
          );
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || String(err);
        toast.error(opts.errorPrefix ? `${opts.errorPrefix}: ${msg}` : msg);
        return undefined;
      } finally {
        setIsProcessing(false);
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  return { run, persist, isProcessing, previewOnly, setPreviewOnly };
}
