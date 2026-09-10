import type { FormResponses, IFormStructure, ISavedForm } from '../types/form.types';

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const isAdmin = (user: AuthUser | null): boolean => user?.role === 'admin';

/* ---- Admin panel shapes ---- */

export interface AdminUserRow {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  formCount: number;
  responseCount: number;
}

export interface AdminFormRow {
  _id: string;
  title: string;
  description?: string;
  isActive: boolean;
  submissionCount: number;
  fieldCount: number;
  createdAt: string;
  userId: string;
  ownerName?: string;
  ownerEmail?: string;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    deleted: number;
    admins: number;
    newThisWeek: number;
  };
  forms: { total: number; live: number };
  responses: { total: number; thisWeek: number };
  feedback: { open: number; total: number };
  topForms: Array<{
    _id: string;
    title: string;
    isActive: boolean;
    submissionCount: number;
    fieldCount: number;
    ownerName?: string;
    ownerEmail?: string;
  }>;
  recentUsers: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
}

/** Pagination metadata returned alongside every admin list. */
export interface PageInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type UserListFilter = 'all' | 'active' | 'inactive' | 'deleted';

/* ---- Notifications ---- */

export type NotificationType =
  | 'user_registered'
  | 'feedback_created'
  | 'feedback_replied'
  | 'feedback_status';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  actorName: string | null;
  createdAt: string;
}

/* ---- Feedback / problem reports ---- */

export type FeedbackType = 'feedback' | 'problem';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved';

export interface FeedbackEntry {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface FieldError {
  field: string;
  message: string;
}

/** Error carrying the API's status code and per-field validation messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  count?: number;
  data?: T;
  errors?: FieldError[];
}

/* ------------------------------------------------------------------ *
 * Transport
 *
 * Auth travels entirely in httpOnly cookies, so every request just sets
 * `credentials: 'include'` — no token is ever read or stored by this code.
 * ------------------------------------------------------------------ */

let refreshInFlight: Promise<boolean> | null = null;
const sessionLostHandlers = new Set<() => void>();

/** Lets the auth provider react when the session can no longer be renewed. */
export function onSessionLost(handler: () => void): () => void {
  sessionLostHandlers.add(handler);
  return () => sessionLostHandlers.delete(handler);
}

/**
 * Refreshes the session at most once even if several callers ask together.
 * Exported so the socket layer can reuse the same de-duplicated call.
 */
export async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skips the refresh-and-retry dance (used by the auth endpoints themselves). */
  skipAuthRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRetry = false } = options;

  const send = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  let response = await send();

  // An expired access token is the normal case here: rotate, then retry once.
  if (response.status === 401 && !skipAuthRetry) {
    const renewed = await refreshSession();
    if (renewed) {
      response = await send();
    } else {
      sessionLostHandlers.forEach((handler) => handler());
    }
  }

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(response.status, `Request failed (${response.status})`);
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(
      response.status,
      payload.message ?? `Request failed (${response.status})`,
      payload.errors ?? [],
    );
  }

  return payload.data as T;
}

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

export const auth = {
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: input,
      skipAuthRetry: true,
    }).then((data) => data.user),

  login: (input: { email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: input,
      skipAuthRetry: true,
    }).then((data) => data.user),

  logout: () =>
    request<null>('/auth/logout', { method: 'POST', skipAuthRetry: true }).catch(
      () => null,
    ),

  /** Restores the session on a page load; retries through /auth/refresh once. */
  me: () => request<{ user: AuthUser }>('/auth/me').then((data) => data.user),

  /**
   * Step 1 of the reset flow: confirm the email belongs to an account.
   * Returns a single-use token that step 2 spends.
   */
  forgotPassword: (email: string) =>
    request<{
      email: string;
      name: string;
      resetToken: string;
      expiresInMinutes: number;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuthRetry: true,
    }),

  /** Step 2: set the new password with the token from step 1. */
  resetPassword: (token: string, password: string) =>
    request<null>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
      skipAuthRetry: true,
    }),

  /** Signed-in change. Other devices are signed out; this one stays in. */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<null>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

/* ------------------------------------------------------------------ *
 * Forms (owner scoped)
 * ------------------------------------------------------------------ */

export const forms = {
  list: () => request<ISavedForm[]>('/forms'),

  get: (id: string) => request<ISavedForm>(`/forms/${id}`),

  create: (form: IFormStructure) =>
    request<ISavedForm>('/forms', { method: 'POST', body: form }),

  update: (id: string, form: IFormStructure) =>
    request<ISavedForm>(`/forms/${id}`, { method: 'PUT', body: form }),

  remove: (id: string) =>
    request<{ id: string }>(`/forms/${id}`, { method: 'DELETE' }),

  submissions: (id: string) =>
    request<{
      form: Pick<ISavedForm, '_id' | 'title' | 'fields'>;
      submissions: Array<{
        _id: string;
        responses: FormResponses;
        createdAt: string;
      }>;
    }>(`/forms/${id}/submissions`),
};

/* ------------------------------------------------------------------ *
 * Public form + submission (no authentication)
 * ------------------------------------------------------------------ */

export const publicForms = {
  get: (id: string) =>
    request<ISavedForm>(`/forms/${id}/public`, { skipAuthRetry: true }),

  submit: (id: string, responses: FormResponses) =>
    request<{ id: string }>(`/forms/${id}/submissions`, {
      method: 'POST',
      body: { responses },
      skipAuthRetry: true,
    }),
};

/* ------------------------------------------------------------------ *
 * Admin (role: admin only — the API rejects everyone else)
 * ------------------------------------------------------------------ */

const listQuery = (params: { search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  const serialised = query.toString();
  return serialised ? `?${serialised}` : '';
};

export const admin = {
  stats: () => request<AdminStats>('/admin/stats'),

  users: (params: { search?: string; status?: UserListFilter } = {}) =>
    request<PageInfo & { users: AdminUserRow[] }>(
      `/admin/users${listQuery(params)}`,
    ),

  user: (id: string) =>
    request<{
      user: AdminUserRow;
      forms: Array<{
        _id: string;
        title: string;
        isActive: boolean;
        submissionCount: number;
        fieldCount: number;
        createdAt: string;
      }>;
      stats: { formCount: number; responseCount: number; activeSessions: number };
    }>(`/admin/users/${id}`),

  setUserStatus: (id: string, isActive: boolean) =>
    request<{ user: AdminUserRow }>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    }),

  setUserRole: (id: string, role: 'admin' | 'user') =>
    request<{ user: AdminUserRow }>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
    }),

  /** Soft delete — reversible, and the person sees a clear sign-in message. */
  deleteUser: (id: string) =>
    request<{ user: AdminUserRow }>(`/admin/users/${id}`, { method: 'DELETE' }),

  restoreUser: (id: string) =>
    request<{ user: AdminUserRow }>(`/admin/users/${id}/restore`, { method: 'POST' }),

  /** Irreversible: removes the account, its forms and every response. */
  purgeUser: (id: string) =>
    request<{ id: string; formsRemoved: number; responsesRemoved: number }>(
      `/admin/users/${id}/purge`,
      { method: 'DELETE' },
    ),

  feedback: (
    params: {
      search?: string;
      status?: 'all' | FeedbackStatus;
      type?: 'all' | FeedbackType;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.type && params.type !== 'all') query.set('type', params.type);
    const serialised = query.toString();
    return request<PageInfo & { feedback: FeedbackEntry[]; openCount: number }>(
      `/admin/feedback${serialised ? `?${serialised}` : ''}`,
    );
  },

  updateFeedback: (
    id: string,
    changes: { status?: FeedbackStatus; adminNote?: string },
  ) =>
    request<FeedbackEntry>(`/admin/feedback/${id}`, {
      method: 'PATCH',
      body: changes,
    }),

  deleteFeedback: (id: string) =>
    request<{ id: string }>(`/admin/feedback/${id}`, { method: 'DELETE' }),

  forms: (params: { search?: string; status?: 'all' | 'active' | 'inactive' } = {}) =>
    request<PageInfo & { forms: AdminFormRow[] }>(
      `/admin/forms${listQuery(params)}`,
    ),

  setFormStatus: (id: string, isActive: boolean) =>
    request<{ form: AdminFormRow }>(`/admin/forms/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    }),

  deleteForm: (id: string) =>
    request<{ id: string; responsesRemoved: number }>(`/admin/forms/${id}`, {
      method: 'DELETE',
    }),
};

/* ------------------------------------------------------------------ *
 * Feedback — what a signed-in user can do with their own submissions
 * ------------------------------------------------------------------ */

export const feedback = {
  create: (input: { type: FeedbackType; subject: string; message: string }) =>
    request<FeedbackEntry>('/feedback', { method: 'POST', body: input }),

  mine: () => request<FeedbackEntry[]>('/feedback/mine'),

  withdraw: (id: string) =>
    request<{ id: string }>(`/feedback/${id}`, { method: 'DELETE' }),
};

/* ------------------------------------------------------------------ *
 * Notifications
 *
 * The socket delivers them live; these endpoints restore the list and
 * the unread badge after a reload, and record what has been seen.
 * ------------------------------------------------------------------ */

export const notifications = {
  list: () =>
    request<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),

  markRead: (id: string) =>
    request<{ notification: AppNotification; unreadCount: number }>(
      `/notifications/${id}/read`,
      { method: 'PATCH' },
    ),

  markAllRead: () =>
    request<{ unreadCount: number }>('/notifications/read-all', { method: 'POST' }),

  clearAll: () =>
    request<{ removed: number; unreadCount: number }>('/notifications', {
      method: 'DELETE',
    }),
};
