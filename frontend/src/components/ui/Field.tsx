import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled text input with inline error message — used by the auth forms. */
export function Field({ label, error, hint, className, ...props }: FieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          'w-full rounded-lg border bg-[color:var(--surface-page)] px-3.5 py-2.5 text-sm outline-none',
          'transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
