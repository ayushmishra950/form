import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Primitives';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center">
      <p className="text-brand-500 text-5xl font-semibold tracking-tight">404</p>
      <h1 className="mt-4 text-lg font-semibold">Page not found</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        The page you were looking for has moved or never existed.
      </p>
      <Link to="/" className="mt-7">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
