import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, BugIcon, ChatIcon, UsersIcon } from './Icons';
import { Spinner } from './ui/Primitives';
import { useNotifications } from '../lib/notifications';
import type { AppNotification, NotificationType } from '../lib/api';
import { cn } from '../lib/utils';

/** Small icon per notification kind, so the list scans quickly. */
const ICONS: Record<NotificationType, typeof ChatIcon> = {
  user_registered: UsersIcon,
  feedback_created: BugIcon,
  feedback_replied: ChatIcon,
  feedback_status: ChatIcon,
};

/** "just now", "12m", "3h", "5d" — compact enough for a dropdown row. */
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Bell with an unread badge and a dropdown of recent activity. */
export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, connected, loading, markRead, markAllRead, clearAll } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openNotification = (notification: AppNotification) => {
    setOpen(false);
    if (!notification.read) void markRead(notification._id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        className="text-muted relative grid size-8 place-items-center rounded-lg transition-colors hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--ink)]"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="surface animate-rise absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl shadow-lift"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Notifications</h2>
              <span
                title={connected ? 'Live updates connected' : 'Reconnecting…'}
                className={cn(
                  'size-1.5 rounded-full',
                  connected ? 'bg-emerald-500' : 'bg-amber-500',
                )}
              />
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-brand-600 text-xs font-medium dark:text-brand-300"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="text-muted flex items-center justify-center gap-2 py-10 text-sm">
              <Spinner className="size-4 text-brand-500" />
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <span className="text-muted mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-[color:var(--surface-sunken)]">
                <BellIcon width={18} height={18} />
              </span>
              <p className="text-[13px] font-medium">You are all caught up</p>
              <p className="text-muted mt-1 text-xs">
                New activity will appear here as it happens.
              </p>
            </div>
          ) : (
            <>
              <ul className="scroll-slim max-h-96 overflow-y-auto py-1">
                {notifications.map((notification) => {
                  const Icon = ICONS[notification.type] ?? ChatIcon;
                  return (
                    <li key={notification._id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openNotification(notification)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-sunken)]',
                          !notification.read && 'bg-brand-500/[0.06]',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg',
                            notification.read
                              ? 'bg-[color:var(--surface-sunken)] text-muted'
                              : 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
                          )}
                        >
                          <Icon width={14} height={14} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium">
                              {notification.title}
                            </span>
                            {!notification.read ? (
                              <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />
                            ) : null}
                          </span>
                          <span className="text-muted mt-0.5 line-clamp-2 block text-xs leading-relaxed">
                            {notification.body}
                          </span>
                          <span className="text-muted mt-1 block text-[11px]">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => void clearAll()}
                  className="text-muted text-xs font-medium transition-colors hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
