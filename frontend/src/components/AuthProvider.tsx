import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../lib/authContext';
import type { AuthContextValue } from '../lib/authContext';
import { auth, onSessionLost } from '../lib/api';
import type { AuthUser } from '../lib/api';

/**
 * Holds the signed-in user for the whole app.
 *
 * No token is kept here — the browser stores them as httpOnly cookies, so
 * this only mirrors *who* is signed in, learned from `GET /auth/me`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialising, setInitialising] = useState(true);

  // Restore the session on load. The API client silently tries /auth/refresh
  // first, so a stale access token alone does not sign the user out.
  useEffect(() => {
    let cancelled = false;

    auth
      .me()
      .then((restored) => {
        if (!cancelled) setUser(restored);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setInitialising(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The API client tells us when a refresh failed — drop the user immediately
  // rather than waiting for the next failed request.
  useEffect(() => onSessionLost(() => setUser(null)), []);

  const login = useCallback<AuthContextValue['login']>(async (input) => {
    setUser(await auth.login(input));
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    setUser(await auth.register(input));
  }, []);

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initialising, login, register, logout }),
    [user, initialising, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
