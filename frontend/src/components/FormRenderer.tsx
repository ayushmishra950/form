import type { FormEvent } from 'react';
import type {
  FieldValue,
  FormResponses,
  IFormField,
  IFormStructure,
} from '../types/form.types';
import { Button, Spinner } from './ui/Primitives';
import { cn } from '../lib/utils';

interface FormRendererProps {
  schema: IFormStructure;
  values: FormResponses;
  errors?: Record<string, string>;
  onChange: (fieldId: string, value: FieldValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting?: boolean;
  /** Renders the form as a non-interactive preview inside the builder. */
  previewMode?: boolean;
}

const CONTROL =
  'w-full rounded-lg border bg-[color:var(--surface-page)] px-3.5 py-2.5 text-sm outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-70';

/** Reads a checkbox group's current selection as an array. */
const asArray = (value: FieldValue | undefined): string[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/**
 * Renders a saved form schema as a real, fillable form.
 * Shared by the public form page and the builder's preview mode.
 */
export function FormRenderer({
  schema,
  values,
  errors = {},
  onChange,
  onSubmit,
  submitting = false,
  previewMode = false,
}: FormRendererProps) {
  const renderControl = (field: IFormField) => {
    const value = values[field.id];
    const invalid = Boolean(errors[field.id]);
    const controlClass = cn(CONTROL, invalid && 'border-red-500 focus:border-red-500');
    const describedBy = invalid ? `${field.id}-error` : undefined;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.id}
            rows={4}
            required={field.required}
            disabled={previewMode}
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            aria-describedby={describedBy}
            onChange={(event) => onChange(field.id, event.target.value)}
            className={cn(controlClass, 'resize-y')}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            required={field.required}
            disabled={previewMode}
            value={typeof value === 'string' ? value : ''}
            aria-describedby={describedBy}
            onChange={(event) => onChange(field.id, event.target.value)}
            className={controlClass}
          >
            <option value="">{field.placeholder || 'Choose an option'}</option>
            {(field.options ?? []).map((option, index) => (
              <option key={`${option}-${index}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2" role="radiogroup" aria-describedby={describedBy}>
            {(field.options ?? []).map((option, index) => (
              <label
                key={`${option}-${index}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors hover:border-brand-500/60 has-checked:border-brand-500 has-checked:bg-brand-500/5"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  required={field.required}
                  disabled={previewMode}
                  checked={value === option}
                  onChange={() => onChange(field.id, option)}
                  className="size-4 accent-[var(--color-brand-600)]"
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'checkbox': {
        const selected = asArray(value);
        return (
          <div className="space-y-2" role="group" aria-describedby={describedBy}>
            {(field.options ?? []).map((option, index) => (
              <label
                key={`${option}-${index}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors hover:border-brand-500/60 has-checked:border-brand-500 has-checked:bg-brand-500/5"
              >
                <input
                  type="checkbox"
                  name={field.id}
                  value={option}
                  disabled={previewMode}
                  checked={selected.includes(option)}
                  onChange={(event) =>
                    onChange(
                      field.id,
                      event.target.checked
                        ? [...selected, option]
                        : selected.filter((entry) => entry !== option),
                    )
                  }
                  className="size-4 accent-[var(--color-brand-600)]"
                />
                {option}
              </label>
            ))}
          </div>
        );
      }

      default:
        return (
          <input
            id={field.id}
            type={field.type}
            required={field.required}
            disabled={previewMode}
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            aria-describedby={describedBy}
            onChange={(event) => onChange(field.id, event.target.value)}
            className={controlClass}
          />
        );
    }
  };

  return (
    // `noValidate` hands validation to validateResponses() so every field —
    // including required checkbox groups, which the browser cannot check —
    // reports errors in the same styled, accessible way.
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="surface rounded-2xl border-t-4 border-t-brand-500 p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[27px]">
          {schema.title || 'Untitled form'}
        </h1>
        {schema.description ? (
          <p className="text-muted mt-2 text-sm leading-relaxed">
            {schema.description}
          </p>
        ) : null}
      </div>

      {schema.fields.map((field) => (
        <div key={field.id} className="surface rounded-2xl p-6 shadow-card sm:p-7">
          <label
            htmlFor={field.id}
            className="mb-3 block text-sm font-medium leading-snug"
          >
            {field.label}
            {field.required ? (
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>

          {renderControl(field)}

          {errors[field.id] ? (
            <p
              id={`${field.id}-error`}
              className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
            >
              {errors[field.id]}
            </p>
          ) : null}
        </div>
      ))}

      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="text-muted text-xs">
          {previewMode
            ? 'Preview only — responses are not recorded.'
            : 'Never submit passwords through this form.'}
        </p>
        <Button type="submit" size="lg" disabled={previewMode || submitting}>
          {submitting ? <Spinner /> : null}
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
    </form>
  );
}
