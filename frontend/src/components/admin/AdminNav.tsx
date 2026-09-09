import { NavLink } from 'react-router-dom';
import { ChatIcon, DocumentIcon, GaugeIcon, UsersIcon } from '../Icons';
import { Badge } from '../ui/Primitives';
import { cn } from '../../lib/utils';

const TABS = [
  { to: '/admin', label: 'Overview', icon: <GaugeIcon width={15} height={15} />, end: true },
  { to: '/admin/users', label: 'Users', icon: <UsersIcon width={15} height={15} />, end: false },
  { to: '/admin/forms', label: 'Forms', icon: <DocumentIcon width={15} height={15} />, end: false },
  { to: '/admin/feedback', label: 'Feedback', icon: <ChatIcon width={15} height={15} />, end: false },
];

/** Header and tab bar shared by every admin screen. */
export function AdminNav({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b bg-[color:var(--surface-raised)]">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <Badge tone="brand" className="mb-3">
          Admin panel
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted mt-1.5 text-sm">{subtitle}</p>

        <nav className="mt-6 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-brand-500 text-[color:var(--ink)]'
                    : 'text-muted border-transparent hover:text-[color:var(--ink)]',
                )
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
