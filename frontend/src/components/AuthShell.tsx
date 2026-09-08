import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark, ShieldIcon } from './Icons';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Split layout shared by the sign-in and sign-up screens. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[15px] font-semibold tracking-tight">FormCraft</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="text-muted mt-8 text-center text-sm">{footer}</p>
        </div>
      </div>

      {/* Marketing column */}
      <div className="relative hidden overflow-hidden border-l bg-[color:var(--surface-raised)] lg:block">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md">
            <p className="text-xl font-medium leading-relaxed tracking-tight">
              “Every form, every response and every share link stays scoped to
              your own workspace.”
            </p>
            <footer className="text-muted mt-6 flex items-center gap-2 text-sm">
              <ShieldIcon width={16} height={16} />
              Built for teams and agencies
            </footer>
          </blockquote>

          <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t pt-8">
            {[
              ['7', 'field types'],
              ['1 link', 'to share anywhere'],
              ['httpOnly', 'cookie sessions'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-brand-600 text-base font-semibold dark:text-brand-300">
                  {value}
                </dt>
                <dd className="text-muted mt-1 text-xs leading-relaxed">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
