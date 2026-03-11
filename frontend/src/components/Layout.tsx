import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { getProfile } from '../utils/storage';
import type { UsageInfo } from '../types';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/analyze', label: 'Analyze', icon: '💬' },
  { to: '/inbox', label: 'Inbox', icon: '📬' },
  { to: '/insights', label: 'Insights', icon: '🔍' },
  { to: '/leads', label: 'Lead Finder', icon: '🎯' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profile = getProfile();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [storageToast, setStorageToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/usage`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUsage(data))
      .catch(() => {});
  }, []);

  // Listen for localStorage quota warnings from storage.ts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setStorageToast(detail);
      setTimeout(() => setStorageToast(null), 5000);
    };
    window.addEventListener('rrai:storage-warning', handler);
    return () => window.removeEventListener('rrai:storage-warning', handler);
  }, []);

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">ReviewReply AI</h1>
          <span className="sidebar-tagline">for Restaurants</span>
          {profile?.name && (
            <span className="sidebar-business">{profile.name}</span>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Usage meter */}
        {usage && (
          <div className="sidebar-usage">
            <div className="sidebar-usage-header">
              <span className="sidebar-usage-label">Monthly Usage</span>
              <span className="sidebar-usage-count">{usage.used}/{usage.limit}</span>
            </div>
            <div className="sidebar-usage-bar">
              <div
                className="sidebar-usage-fill"
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
              />
            </div>
            {usage.remaining <= 3 && usage.remaining > 0 && (
              <span className="sidebar-usage-warn">
                {usage.remaining} review{usage.remaining !== 1 ? 's' : ''} left this month
              </span>
            )}
            {usage.remaining === 0 && (
              <span className="sidebar-usage-warn sidebar-usage-warn--red">
                Limit reached — resets monthly
              </span>
            )}
          </div>
        )}

        <div className="sidebar-footer">
          <Link to="/welcome" className="sidebar-landing-link">View Landing Page</Link>
          <span className="sidebar-version">v2.0.0 — Restaurant Edition</span>
        </div>
      </aside>

      {/* Mobile hamburger */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Toggle navigation"
      >
        <span className="sidebar-toggle-bar" />
        <span className="sidebar-toggle-bar" />
        <span className="sidebar-toggle-bar" />
      </button>

      {/* Main content */}
      <div className="page-content">
        <Outlet />
      </div>

      {/* Storage warning toast */}
      {storageToast && (
        <div className="toast toast--warn" role="alert">
          {storageToast}
        </div>
      )}
    </div>
  );
};
