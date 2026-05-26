'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, CalendarCheck, FileText, Users,
  Settings, LogOut, Building2, User,
} from 'lucide-react';
import { clearToken, authApi } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/meetings', label: 'Meetings', icon: CalendarCheck },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/attendance', label: 'Attendance', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface UserInfo {
  name: string;
  email: string;
  department?: string;
  employee_id?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    authApi.me()
      .then((data: any) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  /* initials from name */
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="w-64 bg-bg-panel border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-bold text-text">GOG OMS</h1>
            <p className="text-xs text-text-dim">Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-xs text-text-dim uppercase tracking-wider px-3 py-2">Core</p>
        {nav.map(item => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-muted hover:bg-bg-card hover:text-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-accent">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">{user.name}</p>
              <p className="text-xs text-accent truncate">
                {user.department
                  ? `${user.department}${user.employee_id ? ' – ' + user.employee_id : ''}`
                  : user.email}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => { clearToken(); window.location.href = '/'; }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-text-muted hover:bg-bg-card hover:text-text"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}