import type { ReactNode } from 'react';
import type { IFormField } from '../types/form.types';
import { FIELD_TYPE_META, isChoiceField } from '../types/form.types';
import type { FieldType } from '../types/form.types';
import { PlusIcon, TrashIcon } from './Icons';
import { Button } from './ui/Primitives';
import { cn } from '../lib/utils';

interface FieldInspectorProps {
  field: IFormField | null;
  onUpdateField: (id: string, updatedProps: Partial<IFormField>) => void;
  onRemoveField: (id: string) => void;
  /** Deselects the field; also dismisses the drawer on narrow screens. */
  onClose: () => void;
}

const CONTROL =
  'w-full rounded-lg border bg-[color:var(--surface-page)] px-3 py-2 text-sm outline-none ' +
  'transition-colors focus:border-brand-500';

/**
 * Right rail of the builder: edits every property of the selected field,
 * including the option list for dropdown / choice fields.
 */
export function FieldInspector({
  field,
  onUpdateField,
  onRemoveField,
  onClose,
}: FieldInspectorProps) {
  return (
    <>
      {/* Backdrop for the drawer presentation below the xl breakpoint. */}
      {field ? (
        <button
          type="button"
          aria-label="Close field settings"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'flex w-80 max-w-[85vw] shrink-0 flex-col border-l bg-[color:var(--surface-raised)]',
          // Narrow screens: slide-over drawer. xl and up: permanent right rail.
          'fixed inset-y-0 right-0 z-50 shadow-lift transition-transform duration-200',
          'xl:static xl:z-auto xl:h-full xl:max-w-none xl:translate-x-0 xl:shadow-none',
          field ? 'translate-x-0' : 'translate-x-full',
        )}
      >
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Field settings</h2>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            {field
              ? 'Changes apply to the selected question instantly.'
              : 'Select a question on the canvas to edit it.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close field settings"
          className="text-muted -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-lg leading-none transition-colors hover:bg-[color:var(--surface-sunken)] xl:hidden"
        >
          ×
        </button>
      </div>

      {!field ? (
        <div className="text-muted flex flex-1 items-center justify-center px-8 text-center text-xs leading-relaxed">
          Nothing selected yet.
        </div>
      ) : (
        <div className="scroll-slim flex-1 space-y-5 overflow-y-auto p-5">
          <Labelled label="Question label">
            <input
              type="text"
              value={field.label}
              onChange={(event) =>
                onUpdateField(field.id, { label: event.target.value })
              }
              className={CONTROL}
            />
          </Labelled>

          <Labelled label="Field type">
            <select
              value={field.type}
              onChange={(event) =>
                onUpdateField(field.id, {
                  type: event.target.value as FieldType,
                })
              }
              className={CONTROL}
            >
              {FIELD_TYPE_META.map((meta) => (
                <option key={meta.type} value={meta.type}>
                  {meta.label}
                </option>
              ))}
            </select>
          </Labelled>

          {!isChoiceField(field.type) || field.type === 'select' ? (
            <Labelled
              label="Placeholder"
              hint="Hint text shown inside the empty control."
            >
              <input
                type="text"
                value={field.placeholder ?? ''}
                onChange={(event) =>
                  onUpdateField(field.id, { placeholder: event.target.value })
                }
                className={CONTROL}
              />
            </Labelled>
          ) : null}

          {isChoiceField(field.type) ? (
            <Labelled label="Options">
              <div className="space-y-2">
                {(field.options ?? []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      aria-label={`Option ${index + 1}`}
                      onChange={(event) => {
                        const options = [...(field.options ?? [])];
                        options[index] = event.target.value;
                        onUpdateField(field.id, { options });
                      }}
                      className={CONTROL}
                    />
                    <button
                      type="button"
                      aria-label={`Remove option ${index + 1}`}
                      disabled={(field.options ?? []).length <= 1}
                      onClick={() =>
                        onUpdateField(field.id, {
                          options: (field.options ?? []).filter(
                            (_, position) => position !== index,
                          ),
                        })
                      }
                      className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 dark:hover:text-red-400"
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    onUpdateField(field.id, {
                      options: [
                        ...(field.options ?? []),
                        `Option ${(field.options ?? []).length + 1}`,
                      ],
                    })
                  }
                >
                  <PlusIcon width={14} height={14} />
                  Add option
                </Button>
              </div>
            </Labelled>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) =>
                onUpdateField(field.id, { required: event.target.checked })
              }
              className="mt-0.5 size-4 accent-[var(--color-brand-600)]"
            />
            <span>
              <span className="block text-[13px] font-medium">Required</span>
              <span className="text-muted block text-[11px] leading-relaxed">
                Respondents cannot submit without answering.
              </span>
            </span>
          </label>

          <div className="border-t pt-4">
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => onRemoveField(field.id)}
            >
              <TrashIcon width={15} height={15} />
              Delete field
            </Button>
          </div>
        </div>
      )}
      </aside>
    </>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <p className="text-muted mt-1.5 text-[11px] leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}
