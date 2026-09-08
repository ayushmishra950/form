import { createContext, useContext } from 'react';
import type { AuthUser } from './api';

export interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial /auth/me check finishes. */
  initialising: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

/** Kept apart from the provider component so Fast Refresh stays happy. */
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
