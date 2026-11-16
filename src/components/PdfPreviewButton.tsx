import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { PdfViewerModal } from './PdfViewerModal';

interface PdfPreviewButtonProps {
  /** The PDF to preview (Blob or raw bytes). Button renders nothing if missing. */
  data?: Blob | Uint8Array | null;
  /** Alternatively an existing object URL. */
  url?: string | null;
  fileName?: string;
  label?: string;
  className?: string;
}

/**
 * Self-contained "Anteprima PDF" button that opens the PdfViewerModal.
 * Drop it next to any download button of a tool that produces a PDF.
 */
export const PdfPreviewButton: React.FC<PdfPreviewButtonProps> = ({
  data,
  url,
  fileName = 'anteprima.pdf',
  label = 'Anteprima PDF',
  className,
}) => {
  const [open, setOpen] = useState(false);
  if (!data && !url) return null;

  const blob =
    data instanceof Blob ? data : data ? new Blob([data as any], { type: 'application/pdf' }) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-300 font-bold text-xs shadow-xs transition hover:bg-rose-50 dark:hover:bg-zinc-800 cursor-pointer'
        }
      >
        <Eye className="w-4 h-4" />
        <span>{label}</span>
      </button>
      <PdfViewerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        pdfBlob={blob}
        pdfUrl={blob ? null : url}
        fileName={fileName}
      />
    </>
  );
};
