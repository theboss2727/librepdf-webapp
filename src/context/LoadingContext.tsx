import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Global loading context used to show/hide a loading overlay across the app.
 *
 * Usage:
 *   const { showLoading, hideLoading, isLoading } = useLoading();
 *   showLoading();
 *   // ... async work ...
 *   hideLoading();
 */

type LoadingContextValue = {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
};

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setLoading] = useState(false);

  const showLoading = () => setLoading(true);
  const hideLoading = () => setLoading(false);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

/** Hook to access loading state and control functions. */
export const useLoading = (): LoadingContextValue => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return ctx;
};
