import React from 'react';
import { useLoading } from '../context/LoadingContext';
import { Loader2 } from 'lucide-react';

/**
 * Simple full‑screen overlay that shows a spinner when `isLoading` is true.
 */
export const LoadingOverlay = () => {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
      <Loader2 className="w-12 h-12 animate-spin text-white" />
    </div>
  );
};
