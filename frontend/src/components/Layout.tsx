import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';

const NAV_SECTIONS = [
  {
    heading: 'Operations',
    items: [
      { label: 'Dashboard', path: '/', icon: 'dashboard' },
      { label: 'Command Center', path: '/command-center', icon: 'crosshair' },
      { label: 'Network', path: '/network', icon: 'network' },
    ],
  },
  {
    heading: 'Logistics',
    items: [
      { label: 'Exceptions', path: '/exceptions', icon: 'alert' },
      { label: 'New Shipment', path: '/shipments/new', icon: 'plus' },
    ],
  },
];

function SidebarIcon({ name }: { name: string }) {
  const p = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'dashboard': return <svg {...p} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case 'crosshair': return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>;
    case 'network': return <svg {...p} viewBox="0 0 24 24"><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></svg>;
    case 'alert': return <svg {...p} viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
    case 'plus': return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>;
    default: return null;
  }
}

const PAGE_INFO: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Dashboard', sub: 'Global Network Overview' },
  '/command-center': { title: 'Command Center', sub: 'Live Monitoring' },
  '/network': { title: 'Network', sub: 'Intelligence' },
  '/exceptions': { title: 'Exceptions', sub: 'Active Issues' },
  '/shipments/new': { title: 'New Shipment', sub: 'Register' },
};

function getPageInfo(path: string) {
  if (PAGE_INFO[path]) return PAGE_INFO[path];
  if (path.startsWith('/shipments/')) return { title: 'Shipment', sub: path.split('/').pop() || '' };
  return { title: 'NEXUS', sub: '' };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ds-sidebar-collapsed') === 'true');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [clock, setClock] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC');
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('ds-sidebar-collapsed', String(next));
  };

  const isActive = (p: string) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p);
  const info = getPageInfo(location.pathname);

  return (
    <div className="ds-shell">
      {/* Sidebar */}
      <aside className={`ds-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="ds-sidebar-brand">
          <Link to="/">
            <div className="ds-sidebar-logo">N</div>
            <span className="ds-sidebar-brand-text">NEXUS</span>
          </Link>
        </div>

        <nav className="ds-sidebar-nav">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              <div className="ds-nav-heading">{section.heading}</div>
              {si > 0 && <div className="ds-nav-line" />}
              <ul className="ds-nav-list">
                {section.items.map(item => (
                  <li key={item.path} className="ds-nav-item">
                    <Link
                      to={item.path}
                      className={`ds-nav-link ${isActive(item.path) ? 'active' : ''}`}
                    >
                      <span className="ds-nav-icon"><SidebarIcon name={item.icon} /></span>
                      <span className="ds-nav-text">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="ds-sidebar-footer">
          <div className="ds-sidebar-user">
            <div
              className="ds-sidebar-avatar"
              style={{ background: isAdmin ? 'linear-gradient(135deg, #ff5630, #f97316)' : 'linear-gradient(135deg, #00a76f, #007867)' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ds-sidebar-user-info">
              <div className="ds-sidebar-user-name">{user?.name || 'User'}</div>
              <div className="ds-sidebar-user-role">{isAdmin ? 'Administrator' : 'Company'}</div>
            </div>
            <button
              className="ds-sidebar-logout"
              onClick={() => { logout(); navigate('/login'); }}
              title="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile offcanvas overlay */}
      {mobileOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="ds-main">
        <header className="ds-topbar">
          <div className="ds-topbar-left">
            {/* Mobile hamburger */}
            <button className="ds-topbar-toggle-mobile ds-sidebar-toggle" onClick={() => setMobileOpen(true)} style={{ display: 'none' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" />
              </svg>
            </button>
            {/* Desktop collapse toggle */}
            <button className="ds-sidebar-toggle" onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                {collapsed ? (
                  <><path d="M20 12l-10 0" /><path d="M20 12l-4 4" /><path d="M20 12l-4 -4" /><path d="M4 4l0 16" /></>
                ) : (
                  <><path d="M4 12l10 0" /><path d="M4 12l4 4" /><path d="M4 12l4 -4" /><path d="M20 4l0 16" /></>
                )}
              </svg>
            </button>
            <span className="ds-topbar-title">{info.title}</span>
            <span className="ds-topbar-divider" />
            <span className="ds-topbar-subtitle">{info.sub}</span>
          </div>

          <div className="ds-topbar-right">
            <button className="ds-search-btn" onClick={() => setPaletteOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <span>Search shipments...</span>
              <span className="ds-search-kbd">&#8984;K</span>
            </button>
            <div className="ds-live-badge"><span className="ds-live-dot" />Live</div>
            <span className="ds-clock">{clock}</span>
            <button className="ds-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6" />
                <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
              </svg>
              <span className="badge" />
            </button>
            <div className="ds-user-trigger" title={user?.name}>
              <div
                className="ds-user-trigger-avatar"
                style={{ background: isAdmin ? 'linear-gradient(135deg, #ff5630, #f97316)' : 'linear-gradient(135deg, #00a76f, #007867)' }}
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        <div className="ds-container">
          {children}
        </div>
      </div>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
