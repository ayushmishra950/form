import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentIcon,
  LayersIcon,
  PencilIcon,
  SparkIcon,
  TrashIcon,
} from '../components/Icons';
import { ChangePasswordSection } from '../components/ChangePasswordSection';
import { FeedbackSection } from '../components/FeedbackSection';
import { ShareLinkCard } from '../components/ShareLinkCard';
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui/Primitives';
import { useToast } from '../lib/toast';
import { forms as formsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useAuth } from '../lib/authContext';
import type { ISavedForm } from '../types/form.types';

/** Signed-in home: stats plus every form this user owns. */
export function DashboardPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [forms, setForms] = useState<ISavedForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    formsApi
      .list()
      .then((result) => {
        if (!cancelled) setForms(result);
      })
      .catch(() => {
        if (!cancelled) notify('Could not load your forms.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [notify]);

  const handleDelete = useCallback(
    async (form: ISavedForm) => {
      const confirmed = window.confirm(
        `Delete “${form.title}”? Its responses are deleted too, and this cannot be undone.`,
      );
      if (!confirmed) return;

      try {
        await formsApi.remove(form._id);
        setForms((current) => current.filter((entry) => entry._id !== form._id));
        notify('Form deleted.', 'success');
      } catch {
        notify('Could not delete the form.', 'error');
      }
    },
    [notify],
  );

  const totalResponses = forms.reduce(
    (sum, form) => sum + (form.submissionCount ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-muted mt-1.5 text-sm">
            Build a form, share its link, and collect responses in one place.
          </p>
        </div>
        <Link to="/builder">
          <Button size="lg">
            <SparkIcon width={16} height={16} />
            Create new form
          </Button>
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Forms', value: loading ? '—' : String(forms.length), icon: <DocumentIcon width={17} height={17} /> },
          { label: 'Responses', value: loading ? '—' : String(totalResponses), icon: <LayersIcon width={17} height={17} /> },
          { label: 'Live forms', value: loading ? '—' : String(forms.filter((f) => f.isActive !== false).length), icon: <SparkIcon width={17} height={17} /> },
        ].map((stat) => (
          <Card key={stat.label} className="flex items-center gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
              {stat.icon}
            </span>
            <span>
              <span className="block text-xl font-semibold tabular-nums">{stat.value}</span>
              <span className="text-muted block text-xs">{stat.label}</span>
            </span>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 mb-5 text-lg font-semibold tracking-tight">Your forms</h2>

      {loading ? (
        <Card className="text-muted flex items-center justify-center gap-3 p-16 text-sm">
          <Spinner className="text-brand-500" />
          Fetching forms…
        </Card>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon width={22} height={22} />}
          title="No forms yet"
          description="Create your first form and its public share link will appear right here."
          action={
            <Link to="/builder">
              <Button>Create a form</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {forms.map((form) => (
            <li key={form._id}>
              <Card className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{form.title}</h3>
                    <p className="text-muted mt-1 line-clamp-1 text-xs">
                      {form.description || 'No description'}
                    </p>
                  </div>
                  <Badge className="shrink-0">
                    {formatDate(form.updatedAt ?? form.createdAt)}
                  </Badge>
                </div>

                <div className="text-muted mb-4 flex items-center gap-4 text-[11px] uppercase tracking-wider">
                  <span>
                    {form.fields?.length ?? 0}{' '}
                    {(form.fields?.length ?? 0) === 1 ? 'field' : 'fields'}
                  </span>
                  <span>
                    {form.submissionCount ?? 0}{' '}
                    {(form.submissionCount ?? 0) === 1 ? 'response' : 'responses'}
                  </span>
                </div>

                {form.shareUrl ? (
                  <ShareLinkCard url={form.shareUrl} className="mb-4" />
                ) : null}

                <div className="mt-auto flex items-center gap-1 border-t pt-4">
                  <Link to={`/forms/${form._id}/responses`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View responses
                    </Button>
                  </Link>
                  <Link to={`/builder/${form._id}`}>
                    <Button variant="ghost" size="sm" className="size-8 px-0" aria-label="Edit form">
                      <PencilIcon width={15} height={15} />
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    className="size-8 px-0"
                    aria-label="Delete form"
                    onClick={() => void handleDelete(form)}
                  >
                    <TrashIcon width={15} height={15} />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FeedbackSection />
      <ChangePasswordSection />
    </div>
  );
}
