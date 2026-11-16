import React from 'react';
import { Eye, HardDrive } from 'lucide-react';

interface PreviewToggleProps {
  previewOnly: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export const PreviewToggle: React.FC<PreviewToggleProps> = ({
  previewOnly,
  onChange,
  className = '',
}) => {
  return (
    <label
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer select-none text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 ${className}`}
    >
      <input
        type="checkbox"
        checked={previewOnly}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
      />
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        {previewOnly ? (
          <Eye className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
        )}
        <span className="font-medium">
          {previewOnly ? 'Solo anteprima (non salva nel Vault)' : 'Salva automaticamente nel Vault'}
        </span>
      </div>
    </label>
  );
};
