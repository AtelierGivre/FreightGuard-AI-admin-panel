'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, FileText, FileSignature, ShieldCheck, Users, Scale,
  ClipboardCheck, Server, Settings, LogOut, Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const userNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/contracts', label: 'Contracts', icon: FileSignature },
];

const adminNav = [
  { href: '/admin', label: 'Overview', icon: ShieldCheck },
  { href: '/admin/review', label: 'Review Queue', icon: ClipboardCheck },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/invoices', label: 'All Invoices', icon: Server },
  { href: '/admin/disputes', label: 'All Disputes', icon: Scale },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ title, subtitle, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = ['admin', 'operator'].includes(user?.role);
  const nav = isAdmin ? [...userNav, ...adminNav] : userNav;

  const go = (href) => { router.push(href); setOpen(false); };

  return (
    <div className="app-shell">
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', zIndex: 25 }} />}
      <aside className="sidebar" style={open ? { transform: 'translateX(0)' } : {}}>
        <div className="sidebar-brand">
          <div className="logo"><ShieldCheck size={19} /></div>
          <div><h1>FreightGuard AI</h1><span>Demurrage Recovery</span></div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Workspace</div>
          {userNav.map((item) => (
            <NavItem key={item.href} item={item} active={pathname === item.href} onClick={() => go(item.href)} />
          ))}
          {isAdmin && (
            <>
              <div className="nav-label">Admin Panel</div>
              {adminNav.map((item) => (
                <NavItem key={item.href} item={item} active={pathname === item.href} onClick={() => go(item.href)} />
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong>{user?.name || 'User'}</strong>
              <small>{user?.email || ''}</small>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); router.push('/login'); }} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} style={{ display: 'none' }}><Menu size={18} /></button>
            <div>
              <h2>{title}</h2>
              {subtitle && <div className="breadcrumb">{subtitle}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="pill slate">{user?.role || 'user'}</span>
            <div className="user-avatar" style={{ width: 30, height: 30 }}>{user?.name?.[0] || 'U'}</div>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={17} />
      {item.label}
    </div>
  );
}
