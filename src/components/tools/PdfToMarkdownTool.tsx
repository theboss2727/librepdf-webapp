import React, { useState } from 'react';
import { FileCode2, Copy, Check, Download, Loader2, ArrowRight } from 'lucide-react';
import { FileDropzone, type FileItem } from '../FileDropzone';
import { extractTextFromPdf } from '../../services/pdfEngine';
import { useToolRunner } from '../../hooks/useToolRunner';
import { PreviewToggle } from '../PreviewToggle';

interface PdfToMarkdownToolProps {
  onSuccess: () => void;
}

export const PdfToMarkdownTool: React.FC<PdfToMarkdownToolProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<'markdown' | 'html'>('markdown');
  const [copied, setCopied] = useState(false);

  const { run, persist, isProcessing, previewOnly, setPreviewOnly } = useToolRunner({
    toolId: 'pdf-to-markdown',
    onSuccess,
  });

  const fileItem = files[0];

  const handleConvert = async () => {
    if (!fileItem) return;

    await run(
      async () => {
        const data = await extractTextFromPdf(fileItem.file);
        const title = fileItem.file.name.replace(/\.[^/.]+$/, '');

        // Generate clean Markdown representation
        let mdString = `# ${title}\n\n`;
        data.pages.forEach((p) => {
          mdString += `## Pagina ${p.pageNumber}\n\n`;
          const lines = p.text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

          lines.forEach((l) => {
            if (l.length < 50 && (l.endsWith(':') || /^[A-Z0-9\s]{4,}$/.test(l))) {
              mdString += `### ${l}\n\n`;
            } else {
              mdString += `${l}\n\n`;
            }
          });
        });

        setMarkdownContent(mdString);

        // Generate HTML format
        const htmlBody = data.pages
          .map(
            (p) => `  <section class="pdf-page" data-page="${p.pageNumber}">
    <h2>Pagina ${p.pageNumber}</h2>
    <p>${p.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  </section>`
          )
          .join('\n\n');

        const fullHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { color: #dc2626; margin-top: 32px; }
    .pdf-page { margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
${htmlBody}
</body>
</html>`;

        setHtmlContent(fullHtml);

        // Auto save to local vault
        const blob = new Blob([mdString], { type: 'text/markdown;charset=utf-8' });
        await persist({
          name: `${title}.md`,
          originalSize: fileItem.file.size,
          data: blob,
        });
      },
      { successMessage: 'Conversione in Markdown completata', errorPrefix: 'Errore conversione in Markdown' }
    );
  };

  const handleCopy = async () => {
    const content = activeFormat === 'markdown' ? markdownContent : htmlContent;
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!fileItem) return;
    const isMd = activeFormat === 'markdown';
    const content = isMd ? markdownContent : htmlContent;
    if (!content) return;

    const ext = isMd ? '.md' : '.html';
    const type = isMd ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8';
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileItem.file.name.replace(/\.[^/.]+$/, '')}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setMarkdownContent(null);
    setHtmlContent(null);
    setFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold">
            <FileCode2 className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                PDF in Markdown & HTML Semantico
              </h2>
              <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                Semantic Transpiler
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Trasforma il contenuto del documento in Markdown per Notion/Obsidian o HTML pulito per la pubblicazione web.
            </p>
          </div>
        </div>
      </div>

      {markdownContent ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFormat('markdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFormat === 'markdown'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Formato Markdown (.md)
              </button>
              <button
                onClick={() => setActiveFormat('html')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFormat === 'html'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Codice HTML (.html)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copia</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Scarica {activeFormat === 'markdown' ? '.MD' : '.HTML'}</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                Altro File
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 max-h-96 overflow-auto whitespace-pre-wrap leading-relaxed select-text">
            {activeFormat === 'markdown' ? markdownContent : htmlContent}
          </div>
        </div>
      ) : (
        <>
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            accept=".pdf"
            multiple={false}
            title="Trascina qui il documento PDF da convertire in Markdown o HTML"
            subtitle="I titoli e i paragrafi vengono strutturati automaticamente in blocchi Markdown."
          />

          {fileItem && (
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <PreviewToggle previewOnly={previewOnly} onChange={setPreviewOnly} />

              <button
                disabled={isProcessing}
                onClick={handleConvert}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                  !isProcessing
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Transcodifica in corso...</span>
                  </>
                ) : (
                  <>
                    <span>Converti in Markdown / HTML</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
