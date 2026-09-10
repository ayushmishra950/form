import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from '../Icons';
import { cn } from '../../lib/utils';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * Password input with a show/hide toggle.
 *
 * The toggle is `tabIndex={-1}` so tabbing runs label → field → next field
 * rather than stopping on a decoration, and it is labelled for screen readers
 * because the icon alone says nothing.
 */
export function PasswordField({
  label,
  error,
  hint,
  className,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'w-full rounded-lg border bg-[color:var(--surface-page)] py-2.5 pl-3.5 pr-11 text-sm outline-none',
            'transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/25',
            className,
          )}
          {...props}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          className="text-muted absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--ink)]"
        >
          {visible ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
        </button>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
        >
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
