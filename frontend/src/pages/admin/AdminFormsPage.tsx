import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { ActionMenu } from '../../components/admin/ActionMenu';
import type { MenuAction } from '../../components/admin/ActionMenu';
import { SearchBar } from '../../components/admin/SearchBar';
import { Badge, Card, Spinner } from '../../components/ui/Primitives';
import { BanIcon, CheckIcon, DocumentIcon, EyeIcon, TrashIcon } from '../../components/Icons';
import { admin } from '../../lib/api';
import type { AdminFormRow } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatDate } from '../../lib/utils';

type FormFilter = 'all' | 'active' | 'inactive';

const FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Live' },
  { value: 'inactive' as const, label: 'Offline' },
];

/** Every form on the platform, regardless of who owns it. */
export function AdminFormsPage() {
  const { notify } = useToast();

  const [forms, setForms] = useState<AdminFormRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FormFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      admin
        .forms({ search, status: filter })
        .then((result) => {
          if (cancelled) return;
          setForms(result.forms);
          setTotal(result.total);
        })
        .catch(() => {
          if (!cancelled) notify('Could not load forms.', 'error');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, filter, notify]);

  const toggleStatus = useCallback(
    async (row: AdminFormRow) => {
      setBusyId(row._id);
      try {
        await admin.setFormStatus(row._id, !row.isActive);
        setForms((current) =>
          current.map((entry) =>
            entry._id === row._id ? { ...entry, isActive: !row.isActive } : entry,
          ),
        );
        notify(row.isActive ? 'Form taken offline.' : 'Form is live again.', 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Action failed.', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify],
  );

  const removeForm = useCallback(
    async (row: AdminFormRow) => {
      const confirmed = window.confirm(
        `Delete “${row.title}”?\n\nIts ${row.submissionCount} response(s) are deleted too. This cannot be undone.`,
      );
      if (!confirmed) return;

      setBusyId(row._id);
      try {
        await admin.deleteForm(row._id);
        setForms((current) => current.filter((entry) => entry._id !== row._id));
        setTotal((count) => Math.max(0, count - 1));
        notify('Form deleted.', 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Action failed.', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify],
  );

  const buildActions = (row: AdminFormRow): MenuAction[] => [
    {
      label: 'Open public link',
      icon: <EyeIcon width={15} height={15} />,
      onSelect: () => window.open(`/form/${row._id}`, '_blank', 'noopener'),
    },
    row.isActive
      ? {
          label: 'Take offline',
          icon: <BanIcon width={15} height={15} />,
          onSelect: () => void toggleStatus(row),
        }
      : {
          label: 'Put back online',
          icon: <CheckIcon width={15} height={15} />,
          onSelect: () => void toggleStatus(row),
        },
    {
      label: 'Delete form',
      icon: <TrashIcon width={15} height={15} />,
      danger: true,
      onSelect: () => void removeForm(row),
    },
  ];

  return (
    <>
      <AdminNav
        title="Forms"
        subtitle="Every form built on this deployment, its owner and how many responses it has."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by form title"
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={(value) => {
            setLoading(true);
            setFilter(value);
          }}
        />

        <p className="text-muted mt-4 text-xs">
          {loading ? 'Loading…' : `${total} ${total === 1 ? 'form' : 'forms'}`}
        </p>

        <Card className="mt-3 overflow-hidden p-0">
          {loading ? (
            <div className="text-muted flex items-center justify-center gap-3 p-16 text-sm">
              <Spinner className="text-brand-500" />
              Loading forms…
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center p-16 text-center">
              <span className="text-muted mb-3 grid size-11 place-items-center rounded-xl bg-[color:var(--surface-sunken)]">
                <DocumentIcon width={20} height={20} />
              </span>
              <p className="text-sm font-semibold">No forms match</p>
              <p className="text-muted mt-1 text-sm">
                Try a different search term or filter.
              </p>
            </div>
          ) : (
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[color:var(--surface-sunken)] text-left">
                    {['Form', 'Owner', 'Status', 'Fields', 'Responses', 'Created', ''].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="text-muted whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {forms.map((row) => (
                    <tr
                      key={row._id}
                      className={`border-b last:border-b-0 ${busyId === row._id ? 'opacity-50' : ''}`}
                    >
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-[13px] font-medium">{row.title}</p>
                        <p className="text-muted truncate text-xs">
                          {row.description || 'No description'}
                        </p>
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        <p className="truncate text-[13px]">{row.ownerName ?? '—'}</p>
                        <p className="text-muted truncate text-xs">{row.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-current" />
                            Live
                          </span>
                        ) : (
                          <Badge tone="warn">Offline</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.fieldCount}</td>
                      <td className="px-4 py-3 tabular-nums">{row.submissionCount}</td>
                      <td className="text-muted whitespace-nowrap px-4 py-3 text-xs">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <ActionMenu actions={buildActions(row)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
