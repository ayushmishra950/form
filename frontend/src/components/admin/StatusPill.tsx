import type { AccountStatus } from '../../lib/accountStatus';
import { cn } from '../../lib/utils';

const STYLES: Record<AccountStatus, string> = {
  active: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  inactive: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  deleted: 'bg-red-500/12 text-red-600 dark:text-red-400',
};

const LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  inactive: 'Deactivated',
  deleted: 'Deleted',
};

export function StatusPill({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
