import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Field } from '../components/ui/Field';
import { Button, Spinner } from '../components/ui/Primitives';
import { useAuth } from '../lib/authContext';
import { ApiError } from '../lib/api';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

const EMPTY: FormState = { name: '', email: '', password: '', confirm: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormState) => (event: { target: { value: string } }) => {
    setValues((previous) => ({ ...previous, [key]: event.target.value }));
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    // Checked here because the API has no idea about the confirmation field.
    if (values.password !== values.confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        // Surface the API's per-field messages next to the right inputs.
        const mapped: Record<string, string> = {};
        caught.fieldErrors.forEach((issue) => {
          mapped[issue.field] = issue.message;
        });
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setError(caught.message);
      } else {
        setError('Could not create the account. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="One account holds your forms, their share links and every response."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium dark:text-brand-300">
            Sign in
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
          label="Full name"
          autoComplete="name"
          placeholder="Priyank Dadhich"
          value={values.name}
          onChange={set('name')}
          error={fieldErrors.name}
          required
        />

        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={set('email')}
          error={fieldErrors.email}
          required
        />

        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.password}
          onChange={set('password')}
          error={fieldErrors.password}
          hint="Use 8 characters or more."
          required
        />

        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={values.confirm}
          onChange={set('confirm')}
          error={fieldErrors.confirm}
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <Spinner className="size-4" /> : null}
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
