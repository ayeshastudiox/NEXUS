import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchShipments, getShipments } from '../lib/api';
import { statusTone } from './ui';
import { IconSearch, IconShipments } from './Icons';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Static destinations, filterable alongside shipment results. */
const DESTINATIONS = [
  { label: 'Global Overview', path: '/', keywords: 'overview dashboard home global' },
  { label: 'Command Center', path: '/command-center', keywords: 'command center live operations map' },
  { label: 'Network Intelligence', path: '/network', keywords: 'network hubs lanes congestion' },
  { label: 'Shipment Registry', path: '/shipments', keywords: 'shipments list registry all' },
  { label: 'Exception Center', path: '/exceptions', keywords: 'exceptions alerts issues risk' },
  { label: 'Document Intelligence', path: '/documents', keywords: 'documents compliance discrepancy customs' },
  { label: 'AI Intelligence', path: '/intelligence', keywords: 'ai intelligence analyst reasoning ask' },
  { label: 'Register Shipment', path: '/shipments/new', keywords: 'new create register shipment' },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number>(0);
  const navigate = useNavigate();

  // Reset on open, and focus the input.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setCursor(0);
      setLoading(false);
      const t = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  // Recent movements — fetched once per open, only real backend data.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getShipments({ limit: '6' })
      .then(list => { if (!cancelled) setRecent(Array.isArray(list) ? list.slice(0, 6) : []); })
      .catch(() => { if (!cancelled) setRecent([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Clear any pending debounce on unmount.
  useEffect(() => () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); }, []);

  const q = query.trim().toLowerCase();

  const matchedDestinations = q.length === 0
    ? []
    : DESTINATIONS.filter(d => d.label.toLowerCase().includes(q) || d.keywords.includes(q)).slice(0, 4);

  const handleChange = (value: string) => {
    setQuery(value);
    setCursor(0);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchShipments(value.trim());
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 180);
  };

  const go = (path: string) => { onClose(); navigate(path); };

  if (!isOpen) return null;

  const shipRows = q.length === 0 ? recent : results;
  const showRecent = q.length === 0 && recent.length > 0;
  const noneFound = q.length >= 2 && !loading && results.length === 0 && matchedDestinations.length === 0;

  const candidates: string[] = [
    ...matchedDestinations.map(d => `nav:${d.path}`),
    ...shipRows.map(r => `ship:${r.shipment_ref}`),
  ];

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown' && candidates.length > 0) {
      e.preventDefault();
      setCursor(c => (c + 1) % candidates.length);
      return;
    }
    if (e.key === 'ArrowUp' && candidates.length > 0) {
      e.preventDefault();
      setCursor(c => (c - 1 + candidates.length) % candidates.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = candidates[cursor];
      if (target && target.startsWith('nav:')) { go(target.slice(4)); return; }
      if (target && target.startsWith('ship:')) { go(`/shipments/${target.slice(5)}`); return; }
      if (q.length >= 2) go(`/shipments/${query.trim()}`);
    }
  };

  return (
    <div
      className="nx-palette-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="nx-palette" role="dialog" aria-modal="true" aria-label="Global search">
        <div className="nx-palette-input-wrap">
          <IconSearch size={15} />
          <input
            ref={inputRef}
            className="nx-palette-input"
            type="text"
            value={query}
            placeholder="Search shipments, or jump to a view…"
            aria-label="Search shipments or navigate"
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="nx-palette-results">
          {loading && (
            <div className="nx-palette-empty"><div className="nx-spinner" style={{ margin: '0 auto' }} /></div>
          )}

          {!loading && matchedDestinations.length > 0 && (
            <div className="nx-palette-empty" style={{ textAlign: 'left', padding: '9px 14px 3px' }}>
              <span className="nx-label">Views</span>
            </div>
          )}
          {!loading && matchedDestinations.map((d, i) => (
            <div
              key={d.path}
              className="nx-palette-result"
              onClick={() => go(d.path)}
              onMouseEnter={() => setCursor(i)}
              style={cursor === i ? { background: 'var(--nx-surface-4)' } : undefined}
            >
              <div className="nx-palette-result-left">
                <span style={{ fontSize: 12, color: 'var(--nx-text-1)' }}>{d.label}</span>
              </div>
              <span className="nx-meta nx-mono">{d.path}</span>
            </div>
          ))}

          {!loading && showRecent && (
            <div className="nx-palette-empty" style={{ textAlign: 'left', padding: '9px 14px 3px' }}>
              <span className="nx-label">Recent movements</span>
            </div>
          )}

          {!loading && shipRows.map((r, i) => {
            const idx = matchedDestinations.length + i;
            return (
              <div
                key={r.id ?? r.shipment_ref}
                className="nx-palette-result"
                onClick={() => go(`/shipments/${r.shipment_ref}`)}
                onMouseEnter={() => setCursor(idx)}
                style={cursor === idx ? { background: 'var(--nx-surface-4)' } : undefined}
              >
                <div className="nx-palette-result-left">
                  <span className="nx-palette-ref">{r.shipment_ref}</span>
                  <span className="nx-palette-route">{r.origin_name} → {r.destination_name}</span>
                </div>
                <span className={`nx-badge nx-badge-${statusTone(r.status)}`}>
                  {(r.status || '').replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}

          {noneFound && (
            <div className="nx-palette-result" onClick={() => go(`/shipments/${query.trim()}`)}>
              <div className="nx-palette-result-left">
                <IconShipments size={15} />
                <span style={{ fontSize: 12, color: 'var(--nx-text-1)' }}>
                  Open “{query.trim()}”
                </span>
              </div>
              <span className="nx-meta">Enter ↵</span>
            </div>
          )}

          {!loading && q.length === 1 && (
            <div className="nx-palette-empty">Type at least 2 characters</div>
          )}
        </div>
      </div>
    </div>
  );
}
