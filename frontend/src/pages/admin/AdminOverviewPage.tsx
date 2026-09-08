import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { StatusPill } from '../../components/admin/StatusPill';
import { accountStatus } from '../../lib/accountStatus';
import { Badge, Card, Spinner } from '../../components/ui/Primitives';
import {
  CrownIcon,
  DocumentIcon,
  LayersIcon,
  UsersIcon,
} from '../../components/Icons';
import { admin } from '../../lib/api';
import type { AdminStats } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../lib/toast';

/** Platform-wide numbers: accounts, forms and responses. */
export function AdminOverviewPage() {
  const { notify } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    admin
      .stats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) notify('Could not load platform stats.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [notify]);

  const tiles = stats
    ? [
        {
          label: 'Registered users',
          value: stats.users.total,
          hint: `${stats.users.newThisWeek} joined this week`,
          icon: <UsersIcon width={18} height={18} />,
        },
        {
          label: 'Forms created',
          value: stats.forms.total,
          hint: `${stats.forms.live} live right now`,
          icon: <DocumentIcon width={18} height={18} />,
        },
        {
          label: 'Responses collected',
          value: stats.responses.total,
          hint: `${stats.responses.thisWeek} this week`,
          icon: <LayersIcon width={18} height={18} />,
        },
        {
          label: 'Admins',
          value: stats.users.admins,
          hint: `${stats.users.inactive} deactivated · ${stats.users.deleted} deleted`,
          icon: <CrownIcon width={18} height={18} />,
        },
      ]
    : [];

  return (
    <>
      <AdminNav
        title="Platform overview"
        subtitle="Everything happening across every account on this deployment."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading ? (
          <Card className="text-muted flex items-center justify-center gap-3 p-16 text-sm">
            <Spinner className="text-brand-500" />
            Loading platform stats…
          </Card>
        ) : !stats ? (
          <Card className="text-muted p-16 text-center text-sm">
            Stats are unavailable right now.
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {tiles.map((tile) => (
                <Card key={tile.label} className="p-5">
                  <span className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
                    {tile.icon}
                  </span>
                  <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
                  <p className="mt-0.5 text-[13px] font-medium">{tile.label}</p>
                  <p className="text-muted mt-1.5 text-xs">{tile.hint}</p>
                </Card>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {/* Busiest forms */}
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Busiest forms</h2>
                  <Link
                    to="/admin/forms"
                    className="text-brand-600 text-xs font-medium dark:text-brand-300"
                  >
                    View all
                  </Link>
                </div>

                {stats.topForms.length === 0 ? (
                  <p className="text-muted py-8 text-center text-sm">
                    No forms have been created yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {stats.topForms.map((form) => (
                      <li
                        key={form._id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[color:var(--surface-sunken)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{form.title}</p>
                          <p className="text-muted truncate text-xs">
                            {form.ownerName ?? 'Unknown owner'} · {form.ownerEmail}
                          </p>
                        </div>
                        {!form.isActive ? <Badge tone="warn">Offline</Badge> : null}
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {form.submissionCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Newest accounts */}
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Newest accounts</h2>
                  <Link
                    to="/admin/users"
                    className="text-brand-600 text-xs font-medium dark:text-brand-300"
                  >
                    Manage users
                  </Link>
                </div>

                {stats.recentUsers.length === 0 ? (
                  <p className="text-muted py-8 text-center text-sm">No users yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {stats.recentUsers.map((entry) => (
                      <li
                        key={entry._id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[color:var(--surface-sunken)]"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700 dark:text-brand-200">
                          {entry.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{entry.name}</p>
                          <p className="text-muted truncate text-xs">{entry.email}</p>
                        </div>
                        {entry.role === 'admin' ? <Badge tone="brand">Admin</Badge> : null}
                        <StatusPill
                          status={accountStatus({
                            isActive: entry.isActive,
                            deletedAt: null,
                          })}
                        />
                        <span className="text-muted hidden shrink-0 text-xs sm:block">
                          {formatDate(entry.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
