import type { FeedbackStatus } from '../lib/api';
import { cn } from '../lib/utils';

const STYLES: Record<FeedbackStatus, string> = {
  open: 'bg-brand-500/12 text-brand-700 dark:text-brand-300',
  in_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  resolved: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
};

const LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
};

export function FeedbackStatusPill({ status }: { status: FeedbackStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
        STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
