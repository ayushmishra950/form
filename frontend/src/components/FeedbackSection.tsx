import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BugIcon, ChatIcon, TrashIcon } from './Icons';
import { FeedbackStatusPill } from './FeedbackStatusPill';
import { Button, Card, Spinner } from './ui/Primitives';
import { ApiError, feedback as feedbackApi } from '../lib/api';
import type { FeedbackEntry, FeedbackType } from '../lib/api';
import { useToast } from '../lib/toast';
import { cn, formatDate } from '../lib/utils';

const TYPES: Array<{
  value: FeedbackType;
  label: string;
  hint: string;
  icon: typeof ChatIcon;
}> = [
  {
    value: 'feedback',
    label: 'Share feedback',
    hint: 'An idea, a suggestion, something you liked.',
    icon: ChatIcon,
  },
  {
    value: 'problem',
    label: 'Report a problem',
    hint: 'Something is broken or not behaving as expected.',
    icon: BugIcon,
  },
];

const CONTROL =
  'w-full rounded-lg border bg-[color:var(--surface-page)] px-3.5 py-2.5 text-sm outline-none ' +
  'transition-colors placeholder:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25';

/**
 * Dashboard panel where a user raises feedback or reports a problem, and
 * follows what the admin team did with it.
 *
 * Only the caller's own submissions are ever loaded here — the full queue is
 * admin-only, on the server as well as in the UI.
 */
export function FeedbackSection() {
  const { notify } = useToast();

  const [type, setType] = useState<FeedbackType>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    feedbackApi
      .mine()
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch(() => {
        if (!cancelled) notify('Could not load your past messages.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [notify]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setSubmitting(true);

    try {
      const created = await feedbackApi.create({
        type,
        subject: subject.trim(),
        message: message.trim(),
      });

      setEntries((current) => [created, ...current]);
      setSubject('');
      setMessage('');
      notify(
        type === 'problem'
          ? 'Problem reported — the admin team will look into it.'
          : 'Thanks for the feedback!',
        'success',
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        caught.fieldErrors.forEach((issue) => {
          mapped[issue.field] = issue.message;
        });
        setFieldErrors(mapped);
      } else {
        notify(
          caught instanceof Error ? caught.message : 'Could not send that.',
          'error',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = useCallback(
    async (entry: FeedbackEntry) => {
      if (!window.confirm(`Withdraw “${entry.subject}”?`)) return;

      try {
        await feedbackApi.withdraw(entry._id);
        setEntries((current) => current.filter((row) => row._id !== entry._id));
        notify('Withdrawn.', 'success');
      } catch (caught) {
        notify(
          caught instanceof Error ? caught.message : 'Could not withdraw that.',
          'error',
        );
      }
    },
    [notify],
  );

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">Feedback & support</h2>
      <p className="text-muted mt-1.5 text-sm">
        Tell us what would make this better, or flag something that is broken.
        Only the admin team sees what you send.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {/* Compose */}
        <Card className="p-5 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((option) => {
                const OptionIcon = option.icon;
                const selected = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition-colors',
                      selected
                        ? 'border-brand-500 bg-brand-500/5'
                        : 'hover:border-[color:var(--ink-muted)]/40',
                    )}
                  >
                    <OptionIcon
                      width={17}
                      height={17}
                      className={
                        selected ? 'text-brand-600 dark:text-brand-300' : 'text-muted'
                      }
                    />
                    <span className="mt-2 block text-[13px] font-medium">
                      {option.label}
                    </span>
                    <span className="text-muted mt-0.5 block text-[11px] leading-relaxed">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label
                htmlFor="feedback-subject"
                className="mb-1.5 block text-[13px] font-medium"
              >
                Subject
              </label>
              <input
                id="feedback-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                placeholder={
                  type === 'problem'
                    ? 'Share link shows an error on mobile'
                    : 'Drag and drop for reordering fields'
                }
                className={cn(CONTROL, fieldErrors.subject && 'border-red-500')}
              />
              {fieldErrors.subject ? (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {fieldErrors.subject}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="feedback-message"
                className="mb-1.5 block text-[13px] font-medium"
              >
                Details
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder={
                  type === 'problem'
                    ? 'What did you do, what did you expect, and what happened instead?'
                    : 'What would make this more useful for you?'
                }
                className={cn(
                  CONTROL,
                  'resize-y',
                  fieldErrors.message && 'border-red-500',
                )}
              />
              <div className="mt-1.5 flex items-start justify-between gap-3">
                {fieldErrors.message ? (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {fieldErrors.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-muted shrink-0 text-[11px] tabular-nums">
                  {message.length}/2000
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              {submitting
                ? 'Sending…'
                : type === 'problem'
                  ? 'Report problem'
                  : 'Send feedback'}
            </Button>
          </form>
        </Card>

        {/* History */}
        <Card className="p-5 lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold">Your messages</h3>

          {loading ? (
            <div className="text-muted flex items-center justify-center gap-3 py-12 text-sm">
              <Spinner className="text-brand-500" />
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
              <span className="text-muted mb-3 grid size-10 place-items-center rounded-xl bg-[color:var(--surface-sunken)]">
                <ChatIcon width={18} height={18} />
              </span>
              <p className="text-[13px] font-medium">Nothing sent yet</p>
              <p className="text-muted mt-1 max-w-xs text-xs leading-relaxed">
                Anything you send shows up here, along with the admin team's reply.
              </p>
            </div>
          ) : (
            <ul className="scroll-slim max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <li key={entry._id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {entry.type === 'problem' ? (
                          <BugIcon width={14} height={14} className="text-muted" />
                        ) : (
                          <ChatIcon width={14} height={14} className="text-muted" />
                        )}
                        <p className="truncate text-[13px] font-medium">
                          {entry.subject}
                        </p>
                      </div>
                      <p className="text-muted mt-1 text-[11px]">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <FeedbackStatusPill status={entry.status} />
                      {entry.status === 'open' ? (
                        <button
                          type="button"
                          aria-label="Withdraw"
                          title="Withdraw"
                          onClick={() => void withdraw(entry)}
                          className="text-muted grid size-7 place-items-center rounded-md transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-muted mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed">
                    {entry.message}
                  </p>

                  {entry.adminNote ? (
                    <div className="mt-3 rounded-lg border-l-2 border-l-brand-500 bg-[color:var(--surface-sunken)] px-3 py-2.5">
                      <p className="text-brand-700 text-[11px] font-semibold dark:text-brand-300">
                        Reply from the admin team
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">
                        {entry.adminNote}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
