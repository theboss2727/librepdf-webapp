import React, { createContext, useContext, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Simple wrapper that injects the toast container once.
 * Any component can import `toast` from 'react-hot-toast' directly.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
  </>
);
