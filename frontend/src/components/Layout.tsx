import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';
import { getAlerts } from '../lib/api';
import {
  IconBell, IconClose, IconCommand, IconDocuments, IconExceptions,
  IconIntelligence, IconLogout, IconMenu, IconNetwork, IconOverview,
  IconSearch, IconSettings, IconShipments, type IconProps,
} from './Icons';

/* ------------------------------------------------------------------
   Navigation model
   ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  path: string;
  icon: (p: IconProps) => ReactNode;
  match?: (pathname: string) => boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { label: 'Overview', path: '/', icon: IconOverview, match: p => p === '/' },
  {
    label: 'Command Center', path: '/command-center', icon: IconCommand,
    match: p => p.startsWith('/command-center'),
  },
  { label: 'Network', path: '/network', icon: IconNetwork, match: p => p.startsWith('/network') },
  {
    label: 'Shipments', path: '/shipments', icon: IconShipments,
    match: p => p.startsWith('/shipments') && p !== '/shipments/new',
  },
  { label: 'Exceptions', path: '/exceptions', icon: IconExceptions, match: p => p.startsWith('/exceptions') },
  { label: 'Documents', path: '/documents', icon: IconDocuments, match: p => p.startsWith('/documents') },
  {
    label: 'AI Intelligence', path: '/intelligence', icon: IconIntelligence,
    match: p => p.startsWith('/intelligence'),
  },
];

const PAGE_CONTEXT: { match: (p: string) => boolean; title: string; sub: string }[] = [
  { match: p => p === '/', title: 'Global Overview', sub: 'Network Intelligence' },
  { match: p => p.startsWith('/command-center'), title: 'Command Center', sub: 'Live Operations' },
  { match: p => p.startsWith('/network'), title: 'Network Intelligence', sub: 'Hubs & Lanes' },
  { match: p => p === '/shipments/new', title: 'Register Shipment', sub: 'Intake' },
  { match: p => p === '/shipments', title: 'Shipment Registry', sub: 'All Movements' },
  { match: p => /^\/shipments\/.+/.test(p), title: 'Shipment Intelligence', sub: 'Dossier' },
  { match: p => p.startsWith('/exceptions'), title: 'Exception Center', sub: 'Operational Risk' },
  { match: p => p.startsWith('/documents'), title: 'Document Intelligence', sub: 'Compliance' },
  { match: p => p.startsWith('/intelligence'), title: 'AI Intelligence', sub: 'Reasoning' },
];

function contextFor(pathname: string) {
  const found = PAGE_CONTEXT.find(c => c.match(pathname));
  if (found) return found;
  return { title: 'NEXUS', sub: 'Logistics Intelligence' };
}

/* ------------------------------------------------------------------
   Shell
   ------------------------------------------------------------------ */

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [clock, setClock] = useState('');
  const [alertCount, setAlertCount] = useState(0);

  // UTC mission clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-GB', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC',
      }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ⌘K / Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setRailOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the mobile drawer on navigation
  useEffect(() => { setRailOpen(false); }, [location.pathname]);

  // Alert indicator mirrors real backend state
  useEffect(() => {
    let cancelled = false;
    getAlerts()
      .then(a => { if (!cancelled) setAlertCount(Array.isArray(a) ? a.length : 0); })
      .catch(() => { if (!cancelled) setAlertCount(0); });
    return () => { cancelled = true; };
  }, [location.pathname]);

  const context = useMemo(() => contextFor(location.pathname), [location.pathname]);
  const initials = (user?.name || 'U').trim().charAt(0).toUpperCase();

  const railItem = (item: NavItem) => {
    const active = item.match ? item.match(location.pathname) : false;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`nx-rail-item${active ? ' active' : ''}`}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
      >
        <item.icon />
        <span className="nx-rail-tip">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="nx-shell">
      {railOpen && (
        <button
          type="button"
          className="nx-rail-scrim"
          aria-label="Close navigation"
          onClick={() => setRailOpen(false)}
        />
      )}

      {/* --- Command rail --- */}
      <aside className={`nx-rail${railOpen ? ' open' : ''}`}>
        <Link to="/" className="nx-rail-brand" aria-label="NEXUS home">N</Link>

        <nav className="nx-rail-nav" aria-label="Primary">
          {PRIMARY_NAV.map(railItem)}

          <span className="nx-rail-sep" />

          <Link
            to="/shipments/new"
            className={`nx-rail-item${location.pathname === '/shipments/new' ? ' active' : ''}`}
            aria-label="New shipment"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5.5v13M5.5 12h13" />
            </svg>
            <span className="nx-rail-tip">Register Shipment</span>
          </Link>
        </nav>

        <div className="nx-rail-foot">
          {alertCount > 0 && (
            <button
              type="button"
              className="nx-rail-item"
              aria-label={`${alertCount} active alerts`}
              onClick={() => navigate('/exceptions')}
            >
              <IconBell />
              <span className="nx-rail-badge">{alertCount > 99 ? '99+' : alertCount}</span>
              <span className="nx-rail-tip">{alertCount} active alerts</span>
            </button>
          )}

          <span className="nx-rail-item" style={{ cursor: 'default' }} aria-hidden="true">
            <IconSettings />
            <span className="nx-rail-tip">Settings</span>
          </span>

          <button
            type="button"
            className="nx-rail-item"
            onClick={() => { logout(); navigate('/login'); }}
            aria-label="Sign out"
          >
            <IconLogout />
            <span className="nx-rail-tip">Sign out</span>
          </button>

          <div
            className="nx-rail-avatar"
            title={`${user?.name || 'User'} — ${isAdmin ? 'Administrator' : 'Company'}`}
          >
            {initials}
          </div>
        </div>
      </aside>

      {/* --- Main column --- */}
      <div className="nx-main">
        <header className="nx-topbar">
          <button
            type="button"
            className="nx-rail-toggle"
            onClick={() => setRailOpen(o => !o)}
            aria-label={railOpen ? 'Close navigation' : 'Open navigation'}
          >
            {railOpen ? <IconClose /> : <IconMenu />}
          </button>

          <div className="nx-topbar-identity">
            <span className="nx-topbar-wordmark">NEXUS</span>
          </div>

          <span className="nx-topbar-divider" />

          <div className="nx-topbar-context">
            <span className="nx-topbar-context-title">{context.title}</span>
            <span className="nx-topbar-context-sub">{context.sub}</span>
          </div>

          <div className="nx-topbar-spacer" />

          <button
            type="button"
            className="nx-search-btn"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search shipments"
          >
            <IconSearch />
            <span>Search shipments…</span>
            <span className="nx-kbd">⌘K</span>
          </button>

          {/*
            This reflects backend connectivity, not carrier tracking — the
            shipment positions in this build are simulated. Labelling it
            "LIVE" would imply live tracking, so it states what is true.
          */}
          <span className="nx-live" title="Connected to the NEXUS backend API">
            <span className="nx-live-dot" />
            SYSTEM ONLINE
          </span>

          <span className="nx-clock">{clock} UTC</span>

          <button
            type="button"
            className="nx-icon-btn"
            aria-label={alertCount > 0 ? `${alertCount} active alerts` : 'No active alerts'}
            onClick={() => navigate('/exceptions')}
          >
            <IconBell />
            {alertCount > 0 && <span className="nx-dot" />}
          </button>

          <div className="nx-rail-avatar" title={user?.name || 'User'}>{initials}</div>
        </header>

        <main className="nx-workspace">{children}</main>
      </div>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
