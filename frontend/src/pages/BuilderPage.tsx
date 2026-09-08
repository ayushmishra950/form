import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SidebarFields } from '../components/SidebarFields';
import { FormCanvas } from '../components/FormCanvas';
import { FieldInspector } from '../components/FieldInspector';
import { FormRenderer } from '../components/FormRenderer';
import { Badge, Button, Spinner } from '../components/ui/Primitives';
import { useToast } from '../lib/toast';
import { EyeIcon, PencilIcon } from '../components/Icons';
import { forms as formsApi } from '../lib/api';
import { uid } from '../lib/utils';
import { isChoiceField } from '../types/form.types';
import type {
  FieldType,
  FormResponses,
  IFormField,
  IFormStructure,
} from '../types/form.types';

const EMPTY_FORM: IFormStructure = {
  title: 'Untitled form',
  description: '',
  fields: [],
};

const DEFAULT_LABELS: Record<FieldType, string> = {
  text: 'Short answer',
  number: 'Number',
  email: 'Email address',
  textarea: 'Your message',
  select: 'Choose an option',
  radio: 'Pick one',
  checkbox: 'Select all that apply',
};

/** Builds a brand new field of the given type with sensible defaults. */
function createField(type: FieldType): IFormField {
  return {
    id: uid(),
    type,
    label: DEFAULT_LABELS[type],
    required: false,
    ...(isChoiceField(type)
      ? { options: ['Option 1', 'Option 2'] }
      : { placeholder: '' }),
  };
}

/**
 * The form builder. Handles both creating a new form (`/builder`) and
 * editing an existing one (`/builder/:formId`).
 */
export function BuilderPage({ formId }: { formId?: string }) {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [form, setForm] = useState<IFormStructure>(EMPTY_FORM);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [previewValues, setPreviewValues] = useState<FormResponses>({});
  const [loading, setLoading] = useState(Boolean(formId));
  const [saving, setSaving] = useState(false);

  /* Load an existing form when editing. */
  useEffect(() => {
    if (!formId) return;

    let cancelled = false;

    formsApi
      .get(formId)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setForm({
            title: saved.title,
            description: saved.description ?? '',
            fields: saved.fields ?? [],
          });
        } else {
          notify('That form could not be found.', 'error');
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) notify('Could not load the form.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formId, navigate, notify]);

  const selectedField = useMemo(
    () => form.fields.find((field) => field.id === selectedFieldId) ?? null,
    [form.fields, selectedFieldId],
  );

  const handleAddField = useCallback((type: FieldType) => {
    const field = createField(type);
    setForm((previous) => ({ ...previous, fields: [...previous.fields, field] }));
    setSelectedFieldId(field.id);
  }, []);

  const handleUpdateField = useCallback(
    (id: string, updatedProps: Partial<IFormField>) => {
      setForm((previous) => ({
        ...previous,
        fields: previous.fields.map((field) => {
          if (field.id !== id) return field;

          const next: IFormField = { ...field, ...updatedProps };

          // Switching type has to keep the field coherent: choice fields
          // always need options, plain inputs never do.
          if (updatedProps.type && updatedProps.type !== field.type) {
            if (isChoiceField(next.type)) {
              next.options = field.options?.length
                ? field.options
                : ['Option 1', 'Option 2'];
            } else {
              delete next.options;
            }
          }

          return next;
        }),
      }));
    },
    [],
  );

  const handleRemoveField = useCallback((id: string) => {
    setForm((previous) => ({
      ...previous,
      fields: previous.fields.filter((field) => field.id !== id),
    }));
    setSelectedFieldId((current) => (current === id ? null : current));
  }, []);

  const handleDuplicateField = useCallback((id: string) => {
    setForm((previous) => {
      const index = previous.fields.findIndex((field) => field.id === id);
      const source = previous.fields[index];
      if (!source) return previous;

      const copy: IFormField = { ...source, id: uid() };
      const fields = [...previous.fields];
      fields.splice(index + 1, 0, copy);
      return { ...previous, fields };
    });
  }, []);

  const handleMoveField = useCallback((id: string, direction: -1 | 1) => {
    setForm((previous) => {
      const index = previous.fields.findIndex((field) => field.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= previous.fields.length) {
        return previous;
      }

      const fields = [...previous.fields];
      const [moved] = fields.splice(index, 1);
      fields.splice(target, 0, moved as IFormField);
      return { ...previous, fields };
    });
  }, []);

  const handleUpdateHeader = useCallback(
    (key: 'title' | 'description', value: string) => {
      setForm((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      notify('Give the form a title before publishing.', 'error');
      return;
    }
    if (form.fields.length === 0) {
      notify('Add at least one field before publishing.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: IFormStructure = {
        title: form.title.trim(),
        ...(form.description?.trim() ? { description: form.description.trim() } : {}),
        fields: form.fields,
      };

      const saved = formId
        ? await formsApi.update(formId, payload)
        : await formsApi.create(payload);

      notify(
        formId ? 'Changes saved.' : 'Form published — share link is ready.',
        'success',
      );
      // Land on the responses page: it shows the public link and, from now
      // on, every answer that comes in.
      navigate(`/forms/${saved._id}/responses`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Could not save the form.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }, [form, formId, navigate, notify]);

  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100svh-4rem)] items-center justify-center">
        <Spinner className="size-6 text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col">
      {/* Builder toolbar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-[color:var(--surface-raised)] px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {form.title || 'Untitled form'}
          </p>
          <p className="text-muted truncate text-xs">
            {form.fields.length} {form.fields.length === 1 ? 'field' : 'fields'}
            {formId ? ' · editing published form' : ' · draft'}
          </p>
        </div>

        <div className="flex items-center rounded-lg border p-0.5">
          <ModeButton
            active={mode === 'edit'}
            onClick={() => setMode('edit')}
            icon={<PencilIcon width={14} height={14} />}
            label="Edit"
          />
          <ModeButton
            active={mode === 'preview'}
            onClick={() => setMode('preview')}
            icon={<EyeIcon width={14} height={14} />}
            label="Preview"
          />
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="size-3.5" /> : null}
          {formId ? 'Save changes' : 'Publish form'}
        </Button>
      </div>

      {mode === 'preview' ? (
        <div className="scroll-slim flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto w-full max-w-2xl">
            <Badge tone="brand" className="mb-4">
              Preview mode
            </Badge>
            <FormRenderer
              schema={form}
              values={previewValues}
              onChange={(fieldId, value) =>
                setPreviewValues((previous) => ({ ...previous, [fieldId]: value }))
              }
              onSubmit={handlePreviewSubmit}
              previewMode
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="hidden shrink-0 lg:block">
            <SidebarFields onAddField={handleAddField} />
          </div>

          <FormCanvas
            form={form}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onUpdateHeader={handleUpdateHeader}
            onUpdateField={handleUpdateField}
            onRemoveField={handleRemoveField}
            onDuplicateField={handleDuplicateField}
            onMoveField={handleMoveField}
          />

          <FieldInspector
            field={selectedField}
            onUpdateField={handleUpdateField}
            onRemoveField={handleRemoveField}
            onClose={() => setSelectedFieldId(null)}
          />
        </div>
      )}

      {/* Compact palette for narrow screens, where the left rail is hidden. */}
      <div className="scroll-slim flex shrink-0 gap-2 overflow-x-auto border-t bg-[color:var(--surface-raised)] px-4 py-2.5 lg:hidden">
        {(
          ['text', 'textarea', 'email', 'number', 'select', 'radio', 'checkbox'] as FieldType[]
        ).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleAddField(type)}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors hover:bg-[color:var(--surface-sunken)]"
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
        (active
          ? 'bg-[color:var(--surface-sunken)] text-[color:var(--ink)]'
          : 'text-muted hover:text-[color:var(--ink)]')
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Route entry point. The `key` forces a fresh builder whenever the target
 * form changes, so no draft state leaks between `/builder` and
 * `/builder/:formId`.
 */
export function BuilderRoute() {
  const { formId } = useParams<{ formId: string }>();
  return <BuilderPage key={formId ?? 'new'} formId={formId} />;
}
