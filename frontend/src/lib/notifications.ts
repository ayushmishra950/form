import { createContext, useContext } from 'react';
import type { AppNotification } from './api';

export interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  /** True while the socket has a live connection. */
  connected: boolean;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

/** Kept apart from the provider component so Fast Refresh stays happy. */
export const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used inside <NotificationsProvider>');
  }
  return context;
}
