import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogoMark, MoonIcon, PlusIcon, SunIcon } from './Icons';
import { NotificationBell } from './NotificationBell';
import { Button } from './ui/Primitives';
import { useAuth } from '../lib/authContext';
import { isAdmin } from '../lib/api';
import { cn } from '../lib/utils';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const links = user
    ? [
        { to: '/dashboard', label: 'Dashboard', end: true },
        { to: '/builder', label: 'Builder', end: false },
        ...(isAdmin(user) ? [{ to: '/admin', label: 'Admin', end: false }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b bg-[color:var(--surface-raised)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 rounded-lg">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight">FormCraft</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[color:var(--surface-sunken)] text-[color:var(--ink)]'
                    : 'text-muted hover:text-[color:var(--ink)]',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? <NotificationBell /> : null}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="size-8 px-0"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </Button>

          {user ? (
            <>
              <Link
                to="/builder"
                className="hidden h-8 items-center gap-2 rounded-lg bg-brand-600 px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-brand-700 sm:inline-flex dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                <PlusIcon width={15} height={15} />
                New form
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="grid size-8 place-items-center rounded-full bg-brand-500/15 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-500/25 dark:text-brand-200"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    className="surface animate-rise absolute right-0 mt-2 w-60 rounded-xl p-1.5 shadow-lift"
                  >
                    <div className="border-b px-3 py-2.5">
                      <p className="truncate text-[13px] font-medium">{user.name}</p>
                      <p className="text-muted truncate text-xs">{user.email}</p>
                      {isAdmin(user) ? (
                        <span className="mt-1.5 inline-block rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-300">
                          Administrator
                        </span>
                      ) : null}
                    </div>
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 block rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-[color:var(--surface-sunken)]"
                    >
                      Dashboard
                    </Link>
                    {isAdmin(user) ? (
                      <Link
                        to="/admin"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-[color:var(--surface-sunken)]"
                      >
                        Admin panel
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-muted hidden h-8 items-center rounded-lg px-3 text-[13px] font-medium transition-colors hover:text-[color:var(--ink)] sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
