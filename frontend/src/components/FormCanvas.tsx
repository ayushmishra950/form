import type { ReactNode } from 'react';
import type { IFormField, IFormStructure } from '../types/form.types';
import { FIELD_TYPE_META } from '../types/form.types';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  DocumentIcon,
  TrashIcon,
} from './Icons';
import { cn } from '../lib/utils';

interface FormCanvasProps {
  form: IFormStructure;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onUpdateHeader: (key: 'title' | 'description', value: string) => void;
  onUpdateField: (id: string, updatedProps: Partial<IFormField>) => void;
  onRemoveField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onMoveField: (id: string, direction: -1 | 1) => void;
}

const typeLabel = (field: IFormField): string =>
  FIELD_TYPE_META.find((meta) => meta.type === field.type)?.label ?? field.type;

/** Read-only preview of a single field, as it will appear to a respondent. */
function FieldPreview({ field }: { field: IFormField }) {
  const inputClasses =
    'w-full rounded-lg border bg-[color:var(--surface-page)] px-3 py-2 text-sm text-muted';

  if (field.type === 'textarea') {
    return (
      <textarea
        disabled
        rows={3}
        placeholder={field.placeholder || 'Long answer text'}
        className={cn(inputClasses, 'resize-none')}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <div className={cn(inputClasses, 'flex items-center justify-between')}>
        <span>{field.placeholder || 'Choose an option'}</span>
        <span aria-hidden="true">▾</span>
      </div>
    );
  }

  if (field.type === 'radio' || field.type === 'checkbox') {
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5">
        {(field.options ?? []).map((option, index) => (
          <span
            key={`${option}-${index}`}
            className="text-muted flex items-center gap-2 text-sm"
          >
            <span
              className={cn(
                'size-4 shrink-0 border',
                field.type === 'radio' ? 'rounded-full' : 'rounded-[5px]',
              )}
            />
            {option}
          </span>
        ))}
      </div>
    );
  }

  return (
    <input
      type="text"
      disabled
      placeholder={field.placeholder || `Enter ${field.type}`}
      className={inputClasses}
    />
  );
}

/**
 * Centre column of the builder: the live, editable preview of the form.
 * Clicking a card selects it so the inspector can edit its properties.
 */
export function FormCanvas({
  form,
  selectedFieldId,
  onSelectField,
  onUpdateHeader,
  onUpdateField,
  onRemoveField,
  onDuplicateField,
  onMoveField,
}: FormCanvasProps) {
  return (
    <div className="scroll-slim h-full flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Title and description */}
        <div className="surface mb-5 rounded-2xl border-t-4 border-t-brand-500 p-6 shadow-card">
          <input
            type="text"
            value={form.title}
            onChange={(event) => onUpdateHeader('title', event.target.value)}
            placeholder="Untitled form"
            aria-label="Form title"
            className="w-full border-b border-transparent bg-transparent pb-1.5 text-2xl font-semibold tracking-tight outline-none transition-colors placeholder:text-muted hover:border-[color:var(--hairline)] focus:border-brand-500"
          />
          <input
            type="text"
            value={form.description ?? ''}
            onChange={(event) => onUpdateHeader('description', event.target.value)}
            placeholder="Add a short description so people know what this is for"
            aria-label="Form description"
            className="text-muted mt-3 w-full border-b border-transparent bg-transparent pb-1.5 text-sm outline-none transition-colors hover:border-[color:var(--hairline)] focus:border-brand-500"
          />
        </div>

        {form.fields.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-20 text-center">
            <span className="mb-4 grid size-12 place-items-center rounded-xl bg-[color:var(--surface-sunken)] text-muted">
              <DocumentIcon width={22} height={22} />
            </span>
            <h3 className="text-sm font-semibold">This form is empty</h3>
            <p className="text-muted mt-1.5 max-w-xs text-sm leading-relaxed">
              Pick a field type from the palette to add your first question.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {form.fields.map((field, index) => {
              const isSelected = field.id === selectedFieldId;
              return (
                <li key={field.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectField(field.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectField(field.id);
                      }
                    }}
                    className={cn(
                      'surface group rounded-2xl p-5 text-left shadow-card transition-[border-color,box-shadow]',
                      isSelected
                        ? 'border-brand-500 ring-1 ring-brand-500/40'
                        : 'hover:border-[color:var(--ink-muted)]/40',
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(event) =>
                            onUpdateField(field.id, { label: event.target.value })
                          }
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Label for question ${index + 1}`}
                          className="w-full truncate border-b border-transparent bg-transparent pb-1 text-sm font-medium outline-none transition-colors hover:border-[color:var(--hairline)] focus:border-brand-500"
                        />
                        <span className="text-muted mt-1.5 block text-[11px] uppercase tracking-wider">
                          {typeLabel(field)}
                          {field.required ? ' · Required' : ''}
                        </span>
                      </div>

                      <div
                        className="flex shrink-0 items-center gap-0.5 transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconAction
                          label="Move up"
                          disabled={index === 0}
                          onClick={() => onMoveField(field.id, -1)}
                        >
                          <ArrowUpIcon width={15} height={15} />
                        </IconAction>
                        <IconAction
                          label="Move down"
                          disabled={index === form.fields.length - 1}
                          onClick={() => onMoveField(field.id, 1)}
                        >
                          <ArrowDownIcon width={15} height={15} />
                        </IconAction>
                        <IconAction
                          label="Duplicate"
                          onClick={() => onDuplicateField(field.id)}
                        >
                          <CopyIcon width={15} height={15} />
                        </IconAction>
                        <IconAction
                          label="Delete"
                          danger
                          onClick={() => onRemoveField(field.id)}
                        >
                          <TrashIcon width={15} height={15} />
                        </IconAction>
                      </div>
                    </div>

                    <FieldPreview field={field} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-7 place-items-center rounded-md text-muted transition-colors disabled:opacity-30',
        danger
          ? 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
          : 'hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--ink)]',
      )}
    >
      {children}
    </button>
  );
}
