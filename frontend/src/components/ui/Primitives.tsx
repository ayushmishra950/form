import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-50 active:translate-y-px';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 dark:text-white',
  secondary:
    'surface text-[color:var(--ink)] hover:bg-[color:var(--surface-sunken)] shadow-sm',
  ghost:
    'text-muted hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--ink)]',
  danger:
    'text-red-600 hover:bg-red-500/10 dark:text-red-400',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('surface rounded-2xl shadow-card', className)}>{children}</div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'warn';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide',
        tone === 'neutral' && 'bg-[color:var(--surface-sunken)] text-muted',
        tone === 'brand' && 'bg-brand-500/12 text-brand-700 dark:text-brand-300',
        tone === 'warn' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-xl bg-[color:var(--surface-sunken)] text-muted">
        {icon}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-muted mt-1.5 max-w-sm text-sm leading-relaxed">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
