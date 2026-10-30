import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { getPdfPageCount } from '../services/pdfEngine';

export interface FileItem {
  id: string;
  file: File;
  pageCount?: number;
}

interface FileDropzoneProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
  accept: string;
  multiple: boolean;
  maxFiles?: number;
  title?: string;
  subtitle?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onFilesChange,
  accept,
  multiple,
  maxFiles = 50,
  title = 'Ingestione File Locale',
  subtitle = 'Trascina qui i tuoi documenti o sfoglia dal filesystem locale. I file non lasciano mai la memoria del dispositivo.',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessIncomingFiles = async (rawFiles: FileList | File[]) => {
    setErrorMsg(null);
    const newItems: FileItem[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      if (accept.includes('.pdf') && !file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setErrorMsg(`Il file ${file.name} non è un documento PDF valido.`);
        continue;
      }

      const item: FileItem = {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
      };

      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          item.pageCount = await getPdfPageCount(file);
        } catch {
          // encryption or error
        }
      }

      newItems.push(item);
      if (!multiple) break;
    }

    if (newItems.length > 0) {
      if (multiple) {
        onFilesChange([...files, ...newItems].slice(0, maxFiles));
      } else {
        onFilesChange(newItems.slice(0, 1));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    const reordered = [...files];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onFilesChange(reordered);
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-rose-500 bg-rose-500/10 scale-[0.99]'
            : 'border-zinc-300 dark:border-zinc-800 bg-zinc-50/60 dark:bg-[#111218] hover:border-zinc-400 dark:hover:border-zinc-700 shadow-2xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files) {
              handleProcessIncomingFiles(e.target.files);
              e.target.value = '';
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center border border-zinc-300 dark:border-zinc-700/50">
            <UploadCloud className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            Sfoglia Documenti
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Files List / Reorderable Cards */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
              {multiple ? `Pipeline Ingestione (${files.length} file)` : 'Documento Caricato'}
            </span>
            {files.length > 1 && (
              <button
                onClick={() => onFilesChange([])}
                className="text-xs font-medium text-rose-500 hover:text-rose-600 transition cursor-pointer"
              >
                Rimuovi tutti
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {files.map((item, index) => (
              <div
                key={item.id}
                className="relative flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#12131a] border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span>{formatBytes(item.file.size)}</span>
                      {item.pageCount !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                            {item.pageCount} pag.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {multiple && files.length > 1 && (
                    <div className="flex flex-col">
                      <button
                        disabled={index === 0}
                        onClick={(e) => handleMove(index, 'up', e)}
                        className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                          index === 0 ? 'opacity-20 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Sposta prima"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        disabled={index === files.length - 1}
                        onClick={(e) => handleMove(index, 'down', e)}
                        className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                          index === files.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Sposta dopo"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={(e) => handleRemove(item.id, e)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    title="Rimuovi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
