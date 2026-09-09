import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NotificationsContext } from '../lib/notifications';
import type { NotificationsContextValue } from '../lib/notifications';
import { closeSocket, getSocket } from '../lib/socket';
import { notifications as notificationsApi, refreshSession } from '../lib/api';
import type { AppNotification } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toast';

interface IncomingNotification {
  notification: AppNotification;
  unreadCount: number;
}

/**
 * Keeps the notification list and unread badge in sync.
 *
 * History comes from the REST endpoint on load; the socket layers live
 * updates on top. The server is always the source of truth for the count —
 * it ships one with every event, so two open tabs can never disagree.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify } = useToast();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  /** Id of the user whose history has finished loading. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  /* Load history whenever someone signs in. */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    notificationsApi
      .list()
      .then((result) => {
        if (cancelled) return;
        setItems(result.notifications);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => {
        /* The bell simply stays empty — not worth interrupting the user. */
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(user.id);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* Live channel, open only while signed in. */
  useEffect(() => {
    if (!user) {
      closeSocket();
      return;
    }

    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onNew = ({ notification, unreadCount: count }: IncomingNotification) => {
      setItems((current) => [notification, ...current].slice(0, 50));
      setUnreadCount(count);
      notify(notification.title, 'info');
    };

    const onCount = ({ unreadCount: count }: { unreadCount: number }) => {
      setUnreadCount(count);
    };

    /*
     * The handshake uses the access-token cookie, which expires after 15
     * minutes. If the socket drops after that — say the laptop slept — every
     * retry would be rejected. Rotate the cookie and let socket.io's own
     * backoff pick up the fresh one. `refreshSession` is de-duplicated, so
     * repeated retries cannot stampede the endpoint.
     */
    const onConnectError = (error: Error) => {
      if (error.message === 'unauthorized') void refreshSession();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('notification:new', onNew);
    socket.on('notification:count', onCount);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('notification:new', onNew);
      socket.off('notification:count', onCount);
    };
  }, [user, notify]);

  const markRead = useCallback(async (id: string) => {
    // Update straight away; the server's own count arrives right after.
    setItems((current) =>
      current.map((item) => (item._id === id ? { ...item, read: true } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const result = await notificationsApi.markRead(id);
      setUnreadCount(result.unreadCount);
    } catch {
      /* The next load reconciles it. */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
    } catch {
      /* ignore */
    }
  }, []);

  const clearAll = useCallback(async () => {
    setItems([]);
    setUnreadCount(0);

    try {
      await notificationsApi.clearAll();
    } catch {
      /* ignore */
    }
  }, []);

  /*
   * Signed-out sessions read as empty rather than being cleared in an effect.
   * Whatever the previous user left in state is simply never exposed, and the
   * next sign-in overwrites it from the server.
   */
  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications: user ? items : [],
      unreadCount: user ? unreadCount : 0,
      connected: user ? connected : false,
      loading: Boolean(user) && loadedFor !== user?.id,
      markRead,
      markAllRead,
      clearAll,
    }),
    [user, items, unreadCount, connected, loadedFor, markRead, markAllRead, clearAll],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
