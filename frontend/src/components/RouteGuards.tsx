import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { isAdmin } from '../lib/api';
import { Spinner } from './ui/Primitives';

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6 text-brand-500" />
    </div>
  );
}

/** Blocks a route until someone is signed in, remembering where they wanted to go. */
export function RequireAuth() {
  const { user, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <FullPageSpinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Keeps a signed-in user away from the login and register screens. */
export function RedirectIfAuthenticated() {
  const { user, initialising } = useAuth();

  if (initialising) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/** Admin-only routes. Non-admins are sent back to their own dashboard. */
export function RequireAdmin() {
  const { user, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <FullPageSpinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin(user)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
