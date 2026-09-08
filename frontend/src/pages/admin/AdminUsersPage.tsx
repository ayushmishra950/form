import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { ActionMenu } from '../../components/admin/ActionMenu';
import type { MenuAction } from '../../components/admin/ActionMenu';
import { SearchBar } from '../../components/admin/SearchBar';
import { StatusPill } from '../../components/admin/StatusPill';
import { accountStatus } from '../../lib/accountStatus';
import { Badge, Card, Spinner } from '../../components/ui/Primitives';
import {
  BanIcon,
  CheckIcon,
  CrownIcon,
  RestoreIcon,
  TrashIcon,
  UsersIcon,
} from '../../components/Icons';
import { admin } from '../../lib/api';
import type { AdminUserRow, UserListFilter } from '../../lib/api';
import { useAuth } from '../../lib/authContext';
import { useToast } from '../../lib/toast';
import { formatDate } from '../../lib/utils';

const FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Deactivated' },
  { value: 'deleted' as const, label: 'Deleted' },
];

/** Every registered account, with full control over each one. */
export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { notify } = useToast();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserListFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      admin
        .users({ search, status: filter })
        .then((result) => {
          if (cancelled) return;
          setUsers(result.users);
          setTotal(result.total);
        })
        .catch(() => {
          if (!cancelled) notify('Could not load users.', 'error');
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

  /** Runs an admin action and folds the updated row back into the table. */
  const run = useCallback(
    async (
      id: string,
      action: () => Promise<{ user: AdminUserRow } | unknown>,
      successMessage: string,
      removeRow = false,
    ) => {
      setBusyId(id);
      try {
        const result = (await action()) as { user?: AdminUserRow };
        setUsers((current) => {
          if (removeRow) return current.filter((row) => row._id !== id);
          if (!result?.user) return current;
          return current.map((row) =>
            row._id === id ? { ...row, ...result.user } : row,
          );
        });
        if (removeRow) setTotal((count) => Math.max(0, count - 1));
        notify(successMessage, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Action failed.', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify],
  );

  const buildActions = (row: AdminUserRow): MenuAction[] => {
    const isSelf = row._id === currentUser?.id;
    const status = accountStatus(row);
    const selfNote = isSelf ? 'You cannot do this to your own account' : undefined;

    if (status === 'deleted') {
      return [
        {
          label: 'Restore account',
          icon: <RestoreIcon width={15} height={15} />,
          onSelect: () =>
            void run(row._id, () => admin.restoreUser(row._id), 'Account restored.'),
        },
        {
          label: 'Delete permanently',
          icon: <TrashIcon width={15} height={15} />,
          danger: true,
          disabled: isSelf,
          title: selfNote,
          onSelect: () => {
            const confirmed = window.confirm(
              `Permanently delete ${row.email}?\n\nThis removes the account, its ${row.formCount} form(s) and all ${row.responseCount} response(s). It cannot be undone.`,
            );
            if (confirmed) {
              void run(
                row._id,
                () => admin.purgeUser(row._id),
                'Account permanently deleted.',
                true,
              );
            }
          },
        },
      ];
    }

    return [
      row.isActive
        ? {
            label: 'Deactivate account',
            icon: <BanIcon width={15} height={15} />,
            disabled: isSelf,
            title: selfNote,
            onSelect: () =>
              void run(
                row._id,
                () => admin.setUserStatus(row._id, false),
                `${row.name} can no longer sign in.`,
              ),
          }
        : {
            label: 'Reactivate account',
            icon: <CheckIcon width={15} height={15} />,
            onSelect: () =>
              void run(
                row._id,
                () => admin.setUserStatus(row._id, true),
                `${row.name} can sign in again.`,
              ),
          },
      {
        label: row.role === 'admin' ? 'Remove admin rights' : 'Make admin',
        icon: <CrownIcon width={15} height={15} />,
        disabled: isSelf,
        title: selfNote,
        onSelect: () =>
          void run(
            row._id,
            () => admin.setUserRole(row._id, row.role === 'admin' ? 'user' : 'admin'),
            'Role updated.',
          ),
      },
      {
        label: 'Delete account',
        icon: <TrashIcon width={15} height={15} />,
        danger: true,
        disabled: isSelf,
        title: selfNote,
        onSelect: () => {
          const confirmed = window.confirm(
            `Delete ${row.email}?\n\nThey will be signed out, their forms stop accepting responses, and they see "your account has been deleted" at sign-in. You can restore it later.`,
          );
          if (confirmed) {
            void run(row._id, () => admin.deleteUser(row._id), 'Account deleted.');
          }
        },
      },
    ];
  };

  return (
    <>
      <AdminNav
        title="Users"
        subtitle="Every registered account, what they have built, and full control over access."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={(value) => {
            setLoading(true);
            setFilter(value);
          }}
        />

        <p className="text-muted mt-4 text-xs">
          {loading ? 'Loading…' : `${total} ${total === 1 ? 'account' : 'accounts'}`}
        </p>

        <Card className="mt-3 overflow-hidden p-0">
          {loading ? (
            <div className="text-muted flex items-center justify-center gap-3 p-16 text-sm">
              <Spinner className="text-brand-500" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center p-16 text-center">
              <span className="text-muted mb-3 grid size-11 place-items-center rounded-xl bg-[color:var(--surface-sunken)]">
                <UsersIcon width={20} height={20} />
              </span>
              <p className="text-sm font-semibold">No accounts match</p>
              <p className="text-muted mt-1 text-sm">
                Try a different search term or filter.
              </p>
            </div>
          ) : (
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[color:var(--surface-sunken)] text-left">
                    {['User', 'Status', 'Role', 'Forms', 'Responses', 'Joined', ''].map(
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
                  {users.map((row) => (
                    <tr
                      key={row._id}
                      className={`border-b last:border-b-0 ${busyId === row._id ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700 dark:text-brand-200">
                            {row.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">
                              {row.name}
                              {row._id === currentUser?.id ? (
                                <span className="text-muted ml-1.5 text-[11px]">(you)</span>
                              ) : null}
                            </p>
                            <p className="text-muted truncate text-xs">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={accountStatus(row)} />
                      </td>
                      <td className="px-4 py-3">
                        {row.role === 'admin' ? (
                          <Badge tone="brand">Admin</Badge>
                        ) : (
                          <span className="text-muted text-xs">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.formCount}</td>
                      <td className="px-4 py-3 tabular-nums">{row.responseCount}</td>
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
