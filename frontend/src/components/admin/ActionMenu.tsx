import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

/** Gap between trigger and menu, and the minimum margin to the viewport edge. */
const GAP = 4;
const EDGE = 8;

/**
 * Row-level "…" menu used by the admin tables.
 *
 * The menu is rendered into `document.body` rather than beside its trigger.
 * The tables sit inside a card with `overflow-hidden` and a horizontally
 * scrollable wrapper, and an absolutely positioned child is *clipped* by both
 * — something no z-index can fix. A portal plus fixed positioning takes the
 * menu out of those clipping contexts entirely.
 */
export function ActionMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Places the menu under its trigger, flipping above when there is not enough
   * room below. Writes straight to the DOM so repositioning during a scroll
   * costs no re-render.
   */
  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const anchor = trigger.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();

    let top = anchor.bottom + GAP;
    if (top + height > window.innerHeight - EDGE) {
      top = anchor.top - height - GAP; // not enough room below — flip above
    }
    // Whichever side it landed on, never let the menu leave the viewport.
    top = Math.min(
      Math.max(EDGE, top),
      Math.max(EDGE, window.innerHeight - height - EDGE),
    );

    // Right-aligned with the trigger, kept inside the viewport.
    const left = Math.min(
      Math.max(EDGE, anchor.right - width),
      window.innerWidth - width - EDGE,
    );

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, []);

  // Runs before paint, so the menu never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (open) position();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // `true` catches scrolling inside the table wrapper, not just the page.
    const onReflow = () => position();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, position]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="text-muted grid size-8 place-items-center rounded-md transition-colors hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--ink)]"
      >
        <MoreIcon width={16} height={16} />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="surface animate-rise fixed z-50 w-56 rounded-xl p-1.5 shadow-lift"
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
