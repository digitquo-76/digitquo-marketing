'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoIcon, MenuIcon } from '../ui/icons';

interface DashboardShellProps {
  label: string;
  nav: [string, string, React.ReactNode][];
  user: { initials: string; name: string; role: string };
  title: string;
  actions: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ label, nav, user, title, actions, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Need to be careful with hydration mismatch on date. 
  const [dateLabel, setDateLabel] = useState('');
  useEffect(() => {
    setDateLabel(new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch on client-rendered Dashboard
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar" aria-label={`${label} navigation`}>
        <Link className="panel-brand" href="/">
          <span className="panel-brand-mark"><LogoIcon size={19} /></span>DigitQuo
        </Link>
        <p className="panel-label">{label}</p>
        <nav className="sidebar-nav">
          {nav.map(([href, navLabel, icon], index) => (
            <Link className={`sidebar-link${index === 0 ? ' active' : ''}`} href={href} key={navLabel} onClick={() => setSidebarOpen(false)}>
              {icon}{navLabel}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{user.initials}</span>
            <div>
              <p className="user-name">{user.name}</p>
              <p className="user-role">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-actions">
            <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              <MenuIcon />
            </button>
            <div>
              <p className="topbar-title">{title}</p>
              <p className="topbar-meta">{dateLabel}</p>
            </div>
          </div>
          {actions}
        </header>
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
