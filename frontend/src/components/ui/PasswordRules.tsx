import { CheckIcon } from '../Icons';
import { PASSWORD_RULES } from '../../lib/passwordRules';
import { cn } from '../../lib/utils';

/** Live checklist shown under any field where a new password is chosen. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-1.5 text-[11px] transition-colors',
              passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted',
            )}
          >
            <span
              className={cn(
                'grid size-3.5 shrink-0 place-items-center rounded-full border',
                passed
                  ? 'border-emerald-500 bg-emerald-500/15'
                  : 'border-[color:var(--hairline)]',
              )}
            >
              {passed ? <CheckIcon width={9} height={9} /> : null}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
