import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon } from '../Icons';
import { ToastContext } from '../../lib/toast';
import type { ToastTone } from '../../lib/toast';
import { cn } from '../../lib/utils';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

/** Toast notifications, rendered in a fixed bottom-right stack. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-rise surface pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lift',
              toast.tone === 'success' && 'border-emerald-500/40',
              toast.tone === 'error' && 'border-red-500/40',
            )}
          >
            <span
              className={cn(
                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                toast.tone === 'success' &&
                  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                toast.tone === 'error' && 'bg-red-500/15 text-red-600 dark:text-red-400',
                toast.tone === 'info' && 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
              )}
            >
              {toast.tone === 'error' ? (
                <AlertIcon width={13} height={13} />
              ) : (
                <CheckIcon width={13} height={13} />
              )}
            </span>
            <p className="leading-snug">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
