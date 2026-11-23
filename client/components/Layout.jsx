'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  FileSignature,
  ShieldCheck,
  Users,
  Scale,
  ClipboardCheck,
  Server,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { STAFF_ROLES } from '@/lib/constants';
import { initials } from '@/lib/format';

/** Workspace links shown to every signed-in user. */
const workspaceNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/contracts', label: 'Contracts', icon: FileSignature },
];

/** Admin links shown only to operators and admins. */
const staffNav = [
  { href: '/admin', label: 'Overview', icon: ShieldCheck },
  { href: '/admin/review', label: 'Review Queue', icon: ClipboardCheck },
  { href: '/admin/users', label: 'User Management', icon: Users, adminOnly: true },
  { href: '/admin/invoices', label: 'All Invoices', icon: Server },
  { href: '/admin/disputes', label: 'All Disputes', icon: Scale },
  { href: '/admin/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

/**
 * Application shell: fixed sidebar, sticky topbar and page content.
 * Responsive: the sidebar becomes an off-canvas drawer below 900px.
 */
export default function Layout({ title, subtitle, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isStaff } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleStaffNav = staffNav.filter((item) => !item.adminOnly || user?.role === 'admin');
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo">
            <ShieldCheck size={19} aria-hidden="true" />
          </div>
          <div>
            <h1>FreightGuard AI</h1>
            <span>Demurrage Recovery</span>
          </div>
          <button
            className="mobile-menu-close"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          {workspaceNav.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={pathname === item.href}
              onClick={closeMenu}
            />
          ))}

          {isStaff && (
            <>
              <div className="nav-label">Admin Panel</div>
              {visibleStaffNav.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  onClick={closeMenu}
                />
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials(user?.name)}</div>
            <div className="user-meta">
              <strong>{user?.name || 'User'}</strong>
              <small>{user?.email || ''}</small>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="btn btn-ghost btn-sm mobile-menu-btn"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <h2>{title}</h2>
              {subtitle && <div className="breadcrumb">{subtitle}</div>}
            </div>
          </div>
          <div className="topbar-user">
            {api.isDemo && (
              <span className="demo-badge">
                <span className="dot" /> Demo data
              </span>
            )}
            <span className={`pill ${STAFF_ROLES.includes(user?.role) ? 'purple' : 'slate'}`}>
              {user?.role || 'user'}
            </span>
            <div className="user-avatar user-avatar-sm">{initials(user?.name)}</div>
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
    <Link
      href={item.href}
      className={`nav-item${active ? ' active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon size={17} aria-hidden="true" />
      {item.label}
    </Link>
  );
}
