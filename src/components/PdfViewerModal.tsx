import React, { useEffect, useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, Maximize2, FileText } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob?: Blob | null;
  pdfUrl?: string | null;
  fileName?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfBlob,
  pdfUrl,
  fileName = 'anteprima.pdf',
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (objectUrl && !pdfUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      return;
    }

    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (pdfUrl) {
      setObjectUrl(pdfUrl);
    }
  }, [isOpen, pdfBlob, pdfUrl]);

  if (!isOpen || !objectUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    window.open(objectUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {fileName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anteprima Documento PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              title="Apri in nuova scheda"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              title="Scarica documento"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Scarica</span>
            </button>
            <button
              onClick={onClose}
              title="Chiudi"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 relative">
          <object
            data={objectUrl}
            type="application/pdf"
            className="w-full h-full"
          >
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Il tuo browser non supporta la visualizzazione diretta del PDF.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
              >
                Scarica per visualizzarlo
              </button>
            </div>
          </object>
        </div>
      </div>
    </div>
  );
};
