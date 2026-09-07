import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchShipments } from '../lib/api';
import TransportIcon from './TransportIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchShipments(value);
        setResults(data);
      } catch { setResults([]); }
      setLoading(false);
    }, 200);
  };

  const handleSelect = (ref: string) => {
    onClose();
    navigate(`/shipments/${ref}`);
  };

  const handleEnter = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (results.length > 0) {
      handleSelect(results[0].shipment_ref);
    } else if (trimmed.length >= 2) {
      onClose();
      navigate(`/shipments/${trimmed}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="nx-palette-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nx-palette">
        <div className="nx-palette-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="nx-palette-input"
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by shipment ref, container, tracking..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter') handleEnter();
            }}
          />
        </div>

        <div className="nx-palette-results">
          {loading && (
            <div className="nx-palette-empty">
              <div className="nx-spinner" style={{ margin: '0 auto' }} />
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="nx-palette-result" onClick={handleEnter} style={{ cursor: 'pointer' }}>
              <div className="nx-palette-result-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ color: 'var(--ds-primary)' }}>
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                </svg>
                <span style={{ color: 'var(--ds-primary)', fontSize: 13, fontWeight: 600 }}>Open &ldquo;{query}&rdquo;</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--ds-gray-500)' }}>Enter &#8594;</span>
            </div>
          )}

          {!loading && results.map((r) => (
            <div
              key={r.id}
              className="nx-palette-result"
              onClick={() => handleSelect(r.shipment_ref)}
            >
              <div className="nx-palette-result-left">
                <TransportIcon mode={r.transport_mode} size={16} color="#5b6b8a" />
                <span className="nx-palette-ref">{r.shipment_ref}</span>
                <span className="nx-palette-route">{r.origin_name} → {r.destination_name}</span>
              </div>
              <span
                className={`nx-badge ${
                  r.status === 'DELAYED' ? 'nx-badge-warning' :
                  r.status === 'IN_TRANSIT' ? 'nx-badge-accent' :
                  r.status === 'DELIVERED' ? 'nx-badge-healthy' : 'nx-badge-dim'
                }`}
              >
                {r.status?.replace(/_/g, ' ')}
              </span>
            </div>
          ))}

          {!loading && query.length < 2 && (
            <div className="nx-palette-empty">Type at least 2 characters to search</div>
          )}
        </div>
      </div>
    </div>
  );
}

