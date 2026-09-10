import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { PasswordField } from '../components/ui/PasswordField';
import { PasswordRules } from '../components/ui/PasswordRules';
import { isStrongPassword } from '../lib/passwordRules';
import { Button, Spinner } from '../components/ui/Primitives';
import { ApiError, auth } from '../lib/api';
import { useToast } from '../lib/toast';

interface ResetState {
  token?: string;
  email?: string;
  name?: string;
  expiresInMinutes?: number;
}

/**
 * Step 2 of the reset flow: choose the new password.
 *
 * The token normally arrives in router state from the previous screen. A
 * `?token=` query parameter is also accepted, so that switching this flow to
 * an emailed link later needs no change here.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();
  const state = (useLocation().state ?? {}) as ResetState;

  const token = state.token ?? searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (!isStrongPassword(password)) {
      setFieldErrors({ password: 'Meet all four requirements below.' });
      return;
    }
    if (password !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      await auth.resetPassword(token, password);
      notify('Password updated — sign in with your new password.', 'success');
      navigate('/login', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors.length > 0) {
        setFieldErrors({ password: caught.fieldErrors[0]?.message ?? caught.message });
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Could not update the password. Try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* Reached directly, or after a refresh threw the token away. */
  if (!token) {
    return (
      <AuthShell
        title="Start again"
        subtitle="This page needs a valid reset link, and yours has expired or was never issued."
        footer={
          <Link to="/login" className="text-brand-600 font-medium dark:text-brand-300">
            Back to sign in
          </Link>
        }
      >
        <Link to="/forgot-password">
          <Button size="lg" className="w-full">
            Request a new reset link
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        state.email
          ? `Setting a new password for ${state.email}.`
          : 'Pick something you have not used here before.'
      }
      footer={
        <Link to="/login" className="text-brand-600 font-medium dark:text-brand-300">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        {state.expiresInMinutes ? (
          <p className="text-muted rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed">
            This reset expires in {state.expiresInMinutes} minutes and can be used once.
          </p>
        ) : null}

        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            placeholder="Your new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            autoFocus
            required
          />
          <PasswordRules value={password} />
        </div>

        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Repeat the new password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={fieldErrors.confirm}
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <Spinner className="size-4" /> : null}
          {submitting ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthShell>
  );
}
