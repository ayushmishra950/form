import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRightIcon, DocumentIcon, PencilIcon } from '../components/Icons';
import { ShareLinkCard } from '../components/ShareLinkCard';
import { Button, Card, EmptyState, Spinner } from '../components/ui/Primitives';
import { forms as formsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { FieldValue, IFormField, ISubmission } from '../types/form.types';

interface LoadedResponses {
  form: { _id: string; title: string; fields: IFormField[] };
  submissions: ISubmission[];
}

/** Renders one answer, joining checkbox selections into a readable list. */
const displayValue = (value: FieldValue | undefined): string => {
  if (value === undefined || value === '') return '—';
  return Array.isArray(value) ? value.join(', ') : value;
};

/** Owner-only table of everything submitted through one form. */
export function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();

  const [data, setData] = useState<LoadedResponses | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId) return;
    let cancelled = false;

    formsApi
      .submissions(formId)
      .then((result) => {
        if (!cancelled) setData(result as LoadedResponses);
      })
      .catch(() => {
        if (!cancelled) setError('This form could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  const shareUrl = useMemo(
    () => (formId ? `${window.location.origin}/form/${formId}` : ''),
    [formId],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <Spinner className="size-6 text-brand-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Form not found</h1>
        <p className="text-muted mt-2 text-sm">
          {error || 'It may have been deleted, or it belongs to another account.'}
        </p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  const { form, submissions } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        to="/dashboard"
        className="text-muted mb-6 inline-flex items-center gap-1.5 text-sm hover:text-[color:var(--ink)]"
      >
        <ArrowRightIcon width={14} height={14} className="rotate-180" />
        Dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{form.title}</h1>
          <p className="text-muted mt-1.5 text-sm">
            {submissions.length} {submissions.length === 1 ? 'response' : 'responses'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/builder/${form._id}`}>
            <Button variant="secondary" size="sm">
              <PencilIcon width={15} height={15} />
              Edit form
            </Button>
          </Link>
          <a href={shareUrl} target="_blank" rel="noreferrer">
            <Button size="sm">Open live form</Button>
          </a>
        </div>
      </div>

      <Card className="mt-6 p-4">
        <p className="text-muted mb-2 text-[11px] font-semibold uppercase tracking-wider">
          Public link
        </p>
        <ShareLinkCard url={shareUrl} />
      </Card>

      <div className="mt-8">
        {submissions.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon width={22} height={22} />}
            title="No responses yet"
            description="Share the link above — every answer will show up here as soon as it is submitted."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            {/* Wide tables scroll inside their own box rather than the page. */}
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[color:var(--surface-sunken)] text-left">
                    <th className="text-muted whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
                      Submitted
                    </th>
                    {form.fields.map((field) => (
                      <th
                        key={field.id}
                        className="text-muted whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      >
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="border-b last:border-b-0">
                      <td className="text-muted whitespace-nowrap px-4 py-3 text-xs">
                        {formatDate(submission.createdAt)}
                      </td>
                      {form.fields.map((field) => (
                        <td key={field.id} className="max-w-xs px-4 py-3 align-top">
                          <span className="line-clamp-3">
                            {displayValue(submission.responses[field.id])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
