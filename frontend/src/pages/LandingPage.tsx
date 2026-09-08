import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  LayersIcon,
  LinkIcon,
  ShieldIcon,
  SparkIcon,
} from '../components/Icons';
import { Badge, Button, Card } from '../components/ui/Primitives';
import { useAuth } from '../lib/authContext';

const FEATURES = [
  {
    icon: <LayersIcon width={20} height={20} />,
    title: 'Seven field types',
    body: 'Short answers, paragraphs, email, number, dropdowns, multiple choice and checkboxes — configured without writing a line of code.',
  },
  {
    icon: <LinkIcon width={20} height={20} />,
    title: 'One share link',
    body: 'Publishing returns a public URL. Send it anywhere; anyone can open it and reply without an account of their own.',
  },
  {
    icon: <ShieldIcon width={20} height={20} />,
    title: 'Scoped to your workspace',
    body: 'Every form and response is tied to your user id, so several people or companies can share one deployment safely.',
  },
];

const STEPS = [
  { step: '01', title: 'Create an account', body: 'Sign up once — your session lives in httpOnly cookies, never in localStorage.' },
  { step: '02', title: 'Build the form', body: 'Add fields, set options and required rules, and preview it exactly as a respondent sees it.' },
  { step: '03', title: 'Publish and share', body: 'You get a live link straight away. Copy it into an email, a DM or your site.' },
  { step: '04', title: 'Collect responses', body: 'Every answer lands in your database and shows up in the responses table.' },
];

/** Public marketing page — the entry point before signing in. */
export function LandingPage() {
  const { user } = useAuth();

  // Signed-out visitors go through login first; the guard sends them onward.
  const primaryHref = user ? '/builder' : '/login';

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge tone="brand" className="mb-6">
            <SparkIcon width={12} height={12} />
            Forms, links and responses in one place
          </Badge>

          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Build forms your users
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              {' '}
              actually finish
            </span>
          </h1>

          <p className="text-muted mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            Compose a schema in the visual editor, publish it to a shareable
            link, and watch responses land in your own database.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to={primaryHref}>
              <Button size="lg">
                {user ? 'Start building' : 'Get started free'}
                <ArrowRightIcon width={16} height={16} />
              </Button>
            </Link>
            <Link to={user ? '/dashboard' : '/login'}>
              <Button variant="secondary" size="lg">
                {user ? 'Go to dashboard' : 'Sign in'}
              </Button>
            </Link>
          </div>

          {!user ? (
            <p className="text-muted mt-5 text-xs">
              Free to start — no card, no setup.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-6">
              <span className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
                {feature.icon}
              </span>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="text-muted mt-2 text-[13px] leading-relaxed">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => (
              <li key={item.step} className="border-t pt-5">
                <span className="text-brand-600 text-xs font-semibold tracking-wider dark:text-brand-300">
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                <p className="text-muted mt-1.5 text-[13px] leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center">
            <h3 className="text-lg font-semibold tracking-tight">
              Ready to collect your first response?
            </h3>
            <p className="text-muted max-w-md text-sm leading-relaxed">
              Create an account and publish a working form in a couple of minutes.
            </p>
            <Link to={primaryHref} className="mt-2">
              <Button size="lg">
                {user ? 'Open the builder' : 'Create your account'}
                <ArrowRightIcon width={16} height={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
