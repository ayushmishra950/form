import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MoreIcon } from '../Icons';
import { cn } from '../../lib/utils';

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Explains why the action is unavailable. */
  title?: string;
}

/** Row-level "…" menu used by the admin tables. */
export function ActionMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="text-muted grid size-8 place-items-center rounded-md transition-colors hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--ink)]"
      >
        <MoreIcon width={16} height={16} />
      </button>

      {open ? (
        <div
          role="menu"
          className="surface animate-rise absolute right-0 z-30 mt-1 w-56 rounded-xl p-1.5 shadow-lift"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              title={action.title}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                action.danger
                  ? 'text-red-600 hover:bg-red-500/10 dark:text-red-400'
                  : 'hover:bg-[color:var(--surface-sunken)]',
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
