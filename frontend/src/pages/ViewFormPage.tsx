import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormRenderer } from '../components/FormRenderer';
import { Button, Card, Spinner } from '../components/ui/Primitives';
import { CheckIcon, LogoMark } from '../components/Icons';
import { publicForms } from '../lib/api';
import { validateResponses } from '../lib/validate';
import type {
  FieldValue,
  FormResponses,
  ISavedForm,
} from '../types/form.types';

type Status = 'loading' | 'ready' | 'missing' | 'submitted';

/** The public page a respondent opens to fill in a published form. */
export function ViewFormPage() {
  const { formId } = useParams<{ formId: string }>();

  const [schema, setSchema] = useState<ISavedForm | null>(null);
  const [values, setValues] = useState<FormResponses>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(formId ? 'loading' : 'missing');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!formId) return;

    let cancelled = false;

    publicForms
      .get(formId)
      .then((form) => {
        if (cancelled) return;
        setSchema(form);
        setStatus(form ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  const handleChange = (fieldId: string, value: FieldValue) => {
    setValues((previous) => ({ ...previous, [fieldId]: value }));
    setErrors((previous) => {
      if (!previous[fieldId]) return previous;
      const next = { ...previous };
      delete next[fieldId];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!schema || !formId) return;

    const validationErrors = validateResponses(schema, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstInvalid = schema.fields.find(
        (field) => validationErrors[field.id],
      );
      if (firstInvalid) {
        document
          .getElementById(firstInvalid.id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      await publicForms.submit(formId, values);
      setStatus('submitted');
    } catch (caught) {
      setErrors({
        __form:
          caught instanceof Error
            ? caught.message
            : 'Submission failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh bg-[color:var(--surface-page)]">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium"
        >
          <LogoMark width={22} height={22} />
          <span className="tracking-tight">FormCraft</span>
        </Link>

        {status === 'loading' ? (
          <Card className="flex items-center justify-center gap-3 p-16 text-sm text-muted">
            <Spinner className="text-brand-500" />
            Loading form…
          </Card>
        ) : null}

        {status === 'missing' ? (
          <Card className="p-10 text-center">
            <h1 className="text-lg font-semibold">Form not available</h1>
            <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              This form does not exist, or it is no longer accepting responses.
            </p>
            <Link to="/" className="mt-6 inline-block">
              <Button variant="secondary" size="sm">
                Back to dashboard
              </Button>
            </Link>
          </Card>
        ) : null}

        {status === 'submitted' ? (
          <Card className="p-10 text-center">
            <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckIcon width={22} height={22} />
            </span>
            <h1 className="text-lg font-semibold">Response recorded</h1>
            <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              Thanks for filling in “{schema?.title}”. You can close this page now.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-6"
              onClick={() => {
                setValues({});
                setStatus('ready');
              }}
            >
              Submit another response
            </Button>
          </Card>
        ) : null}

        {status === 'ready' && schema ? (
          <>
            {errors.__form ? (
              <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {errors.__form}
              </p>
            ) : null}

            <FormRenderer
              schema={schema}
              values={values}
              errors={errors}
              onChange={handleChange}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
