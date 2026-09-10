import { useState } from 'react';
import type { FormEvent } from 'react';
import { LockIcon, ShieldIcon } from './Icons';
import { PasswordField } from './ui/PasswordField';
import { PasswordRules } from './ui/PasswordRules';
import { isStrongPassword } from '../lib/passwordRules';
import { Button, Card, Spinner } from './ui/Primitives';
import { ApiError, auth } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toast';

const EMPTY = { current: '', next: '', confirm: '' };

/** Account security panel on the dashboard: change your own password. */
export function ChangePasswordSection() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) => {
    setValues((previous) => ({ ...previous, [key]: event.target.value }));
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const close = () => {
    setOpen(false);
    setValues(EMPTY);
    setFieldErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    if (!isStrongPassword(values.next)) {
      setFieldErrors({ next: 'Meet all four requirements below.' });
      return;
    }
    if (values.next !== values.confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      await auth.changePassword(values.current, values.next);
      notify('Password changed — other devices have been signed out.', 'success');
      close();
    } catch (caught) {
      if (caught instanceof ApiError) {
        // The API names the offending field; map it onto the right input.
        const mapped: Record<string, string> = {};
        caught.fieldErrors.forEach((issue) => {
          if (issue.field === 'currentPassword') mapped.current = issue.message;
          else if (issue.field === 'newPassword') mapped.next = issue.message;
        });

        if (Object.keys(mapped).length > 0) setFieldErrors(mapped);
        else notify(caught.message, 'error');
      } else {
        notify('Could not change the password. Try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">Account security</h2>
      <p className="text-muted mt-1.5 text-sm">
        Signed in as {user?.email}. Changing your password signs out every other
        device.
      </p>

      <Card className="mt-5 p-5 sm:p-6">
        {!open ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
                <LockIcon width={18} height={18} />
              </span>
              <div>
                <p className="text-[13px] font-medium">Password</p>
                <p className="text-muted mt-0.5 text-xs">
                  Use a password you do not reuse anywhere else.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Change password
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md space-y-4" noValidate>
            <div className="flex items-center gap-2">
              <ShieldIcon width={16} height={16} className="text-muted" />
              <h3 className="text-sm font-semibold">Change your password</h3>
            </div>

            <PasswordField
              label="Current password"
              autoComplete="current-password"
              placeholder="Your password right now"
              value={values.current}
              onChange={set('current')}
              error={fieldErrors.current}
              autoFocus
              required
            />

            <div>
              <PasswordField
                label="New password"
                autoComplete="new-password"
                placeholder="Your new password"
                value={values.next}
                onChange={set('next')}
                error={fieldErrors.next}
                required
              />
              <PasswordRules value={values.next} />
            </div>

            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              placeholder="Repeat the new password"
              value={values.confirm}
              onChange={set('confirm')}
              error={fieldErrors.confirm}
              required
            />

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Spinner className="size-4" /> : null}
                {submitting ? 'Saving…' : 'Update password'}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}
