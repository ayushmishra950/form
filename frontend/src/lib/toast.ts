import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

/**
 * Lives outside Toast.tsx so that file only exports components — which is
 * what React Fast Refresh needs to hot-swap the provider cleanly.
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}
