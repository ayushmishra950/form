import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { SearchBar } from '../../components/admin/SearchBar';
import { FeedbackStatusPill } from '../../components/FeedbackStatusPill';
import { Badge, Button, Card, Spinner } from '../../components/ui/Primitives';
import { BugIcon, ChatIcon, TrashIcon } from '../../components/Icons';
import { admin } from '../../lib/api';
import type { FeedbackEntry, FeedbackStatus } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { cn, formatDate } from '../../lib/utils';

type Filter = 'all' | FeedbackStatus;

const FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'open' as const, label: 'Open' },
  { value: 'in_review' as const, label: 'In review' },
  { value: 'resolved' as const, label: 'Resolved' },
];

const NEXT_STATUS: Record<FeedbackStatus, { to: FeedbackStatus; label: string }[]> = {
  open: [
    { to: 'in_review', label: 'Start review' },
    { to: 'resolved', label: 'Mark resolved' },
  ],
  in_review: [
    { to: 'resolved', label: 'Mark resolved' },
    { to: 'open', label: 'Reopen' },
  ],
  resolved: [{ to: 'open', label: 'Reopen' }],
};

/** The admin-only queue of everything users have sent in. */
export function AdminFeedbackPage() {
  const { notify } = useToast();

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Which entry has its reply box open, and what is typed in it. */
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      admin
        .feedback({ search, status: filter })
        .then((result) => {
          if (cancelled) return;
          setEntries(result.feedback);
          setTotal(result.total);
          setOpenCount(result.openCount);
        })
        .catch(() => {
          if (!cancelled) notify('Could not load feedback.', 'error');
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

  const applyUpdate = useCallback(
    async (
      id: string,
      changes: { status?: FeedbackStatus; adminNote?: string },
      successMessage: string,
    ) => {
      setBusyId(id);
      try {
        const updated = await admin.updateFeedback(id, changes);
        setEntries((current) =>
          current.map((row) => (row._id === id ? updated : row)),
        );
        if (changes.status) {
          setOpenCount((count) =>
            changes.status === 'open' ? count + 1 : Math.max(0, count - 1),
          );
        }
        notify(successMessage, 'success');
      } catch (caught) {
        notify(caught instanceof Error ? caught.message : 'Action failed.', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify],
  );

  const removeEntry = useCallback(
    async (entry: FeedbackEntry) => {
      const confirmed = window.confirm(
        `Delete “${entry.subject}” from ${entry.userEmail}? This cannot be undone.`,
      );
      if (!confirmed) return;

      setBusyId(entry._id);
      try {
        await admin.deleteFeedback(entry._id);
        setEntries((current) => current.filter((row) => row._id !== entry._id));
        setTotal((count) => Math.max(0, count - 1));
        if (entry.status === 'open') setOpenCount((count) => Math.max(0, count - 1));
        notify('Deleted.', 'success');
      } catch (caught) {
        notify(caught instanceof Error ? caught.message : 'Action failed.', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [notify],
  );

  const sendReply = async (entry: FeedbackEntry) => {
    const text = replyText.trim();
    if (!text) return;

    await applyUpdate(entry._id, { adminNote: text }, 'Reply saved — the user sees it.');
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <>
      <AdminNav
        title="Feedback & reports"
        subtitle="Everything users have sent in — ideas, complaints and bug reports."
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search subject, message, name or email"
          filters={FILTERS}
          activeFilter={filter}
          onFilterChange={(value) => {
            setLoading(true);
            setFilter(value);
          }}
        />

        <p className="text-muted mt-4 flex items-center gap-2 text-xs">
          {loading ? 'Loading…' : `${total} ${total === 1 ? 'message' : 'messages'}`}
          {!loading && openCount > 0 ? (
            <Badge tone="warn">{openCount} awaiting a first look</Badge>
          ) : null}
        </p>

        <div className="mt-3">
          {loading ? (
            <Card className="text-muted flex items-center justify-center gap-3 p-16 text-sm">
              <Spinner className="text-brand-500" />
              Loading feedback…
            </Card>
          ) : entries.length === 0 ? (
            <Card className="flex flex-col items-center p-16 text-center">
              <span className="text-muted mb-3 grid size-11 place-items-center rounded-xl bg-[color:var(--surface-sunken)]">
                <ChatIcon width={20} height={20} />
              </span>
              <p className="text-sm font-semibold">Nothing here</p>
              <p className="text-muted mt-1 text-sm">
                No messages match this search or filter.
              </p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li key={entry._id}>
                  <Card className={cn('p-5', busyId === entry._id && 'opacity-50')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'grid size-7 shrink-0 place-items-center rounded-lg',
                              entry.type === 'problem'
                                ? 'bg-red-500/12 text-red-600 dark:text-red-400'
                                : 'bg-brand-500/12 text-brand-600 dark:text-brand-300',
                            )}
                          >
                            {entry.type === 'problem' ? (
                              <BugIcon width={15} height={15} />
                            ) : (
                              <ChatIcon width={15} height={15} />
                            )}
                          </span>
                          <h3 className="truncate text-sm font-semibold">
                            {entry.subject}
                          </h3>
                        </div>

                        <p className="text-muted mt-1.5 text-xs">
                          <span className="font-medium text-[color:var(--ink)]">
                            {entry.userName}
                          </span>{' '}
                          · {entry.userEmail} · {formatDate(entry.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={entry.type === 'problem' ? 'warn' : 'neutral'}>
                          {entry.type === 'problem' ? 'Problem' : 'Feedback'}
                        </Badge>
                        <FeedbackStatusPill status={entry.status} />
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed">
                      {entry.message}
                    </p>

                    {entry.adminNote ? (
                      <div className="mt-3 rounded-lg border-l-2 border-l-brand-500 bg-[color:var(--surface-sunken)] px-3 py-2.5">
                        <p className="text-brand-700 text-[11px] font-semibold dark:text-brand-300">
                          Your reply
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">
                          {entry.adminNote}
                        </p>
                      </div>
                    ) : null}

                    {replyingTo === entry._id ? (
                      <div className="mt-4 space-y-2">
                        <textarea
                          autoFocus
                          rows={3}
                          value={replyText}
                          maxLength={2000}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder="Write back to this user — they see it on their dashboard."
                          className="w-full resize-y rounded-lg border bg-[color:var(--surface-page)] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={!replyText.trim()}
                            onClick={() => void sendReply(entry)}
                          >
                            Save reply
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                        {NEXT_STATUS[entry.status].map((action) => (
                          <Button
                            key={action.to}
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              void applyUpdate(
                                entry._id,
                                { status: action.to },
                                `Marked ${action.to.replace('_', ' ')}.`,
                              )
                            }
                          >
                            {action.label}
                          </Button>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(entry._id);
                            setReplyText(entry.adminNote ?? '');
                          }}
                        >
                          {entry.adminNote ? 'Edit reply' : 'Reply'}
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          className="ml-auto"
                          onClick={() => void removeEntry(entry)}
                        >
                          <TrashIcon width={15} height={15} />
                          Delete
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
