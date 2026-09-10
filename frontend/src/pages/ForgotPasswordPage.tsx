import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Field } from '../components/ui/Field';
import { Button, Spinner } from '../components/ui/Primitives';
import { ApiError, auth } from '../lib/api';

/**
 * Step 1 of the reset flow: confirm which account is being recovered.
 *
 * On success the API returns a short-lived, single-use token which is handed
 * to the next screen through router state rather than the URL, so it never
 * lands in browser history.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await auth.forgotPassword(email.trim());
      navigate('/reset-password', {
        replace: true,
        state: {
          token: result.resetToken,
          email: result.email,
          name: result.name,
          expiresInMinutes: result.expiresInMinutes,
        },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not check that email. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we will take you straight to setting a new password."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="text-brand-600 font-medium dark:text-brand-300">
            Back to sign in
          </Link>
        </>
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

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <Spinner className="size-4" /> : null}
          {submitting ? 'Checking…' : 'Continue'}
        </Button>
      </form>
    </AuthShell>
  );
}
