import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShipments, getAlerts, getMetrics, getDisruptions } from '../lib/api';
import { getRiskColor } from '../lib/format';
import WorldVisualization from '../components/WorldVisualization';

const MODES = ['ALL', 'OCEAN', 'AIR', 'ROAD', 'RAIL'] as const;

export default function CommandCenter() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [mode, setMode] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const [s, a, , d] = await Promise.all([getShipments(), getAlerts(), getMetrics(), getDisruptions()]);
      setShipments(s); setAlerts(a); setDisruptions(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ds-spinner" />
    </div>
  );

  const filtered = mode === 'ALL' ? shipments : shipments.filter(s => s.transport_mode === mode);
  const active = filtered.filter(s => ['IN_TRANSIT', 'DELAYED', 'AT_PORT', 'AWAITING_CLEARANCE'].includes(s.status));

  return (
    <div className="ds-page">
      {/* Mode filter pills */}
      <div className="ds-page-header">
        <div>
          <div className="ds-page-title">Command Center</div>
          <div className="ds-page-sub">Live monitoring across all transport modes</div>
        </div>
        <div className="ds-nav-pills">
          {MODES.map(m => (
            <button key={m} className={`ds-nav-pill ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              {m === 'ALL' ? 'All Modes' : m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics cards */}
      <div className="ds-grid ds-grid-4 ds-grid-row">
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
            </div>
            <div className="ds-stat-label">Total Shipments</div>
          </div>
          <div className="ds-stat-card-bottom"><div className="ds-stat-value">{filtered.length}</div></div>
        </div>
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="ds-stat-label">In Transit</div>
          </div>
          <div className="ds-stat-card-bottom"><div className="ds-stat-value">{active.length}</div></div>
        </div>
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
            </div>
            <div className="ds-stat-label">Delayed</div>
          </div>
          <div className="ds-stat-card-bottom"><div className="ds-stat-value" style={{ color: 'var(--ds-warning)' }}>{filtered.filter(s => s.status === 'DELAYED').length}</div></div>
        </div>
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
            </div>
            <div className="ds-stat-label">Disruptions</div>
          </div>
          <div className="ds-stat-card-bottom"><div className="ds-stat-value" style={{ color: disruptions.length > 0 ? 'var(--ds-danger)' : undefined }}>{disruptions.length}</div></div>
        </div>
      </div>

      {/* Map + Alerts table */}
      <div className="ds-grid ds-grid-3-1 ds-grid-row">
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Live Map</span>
          </div>
          <div style={{ height: 380, position: 'relative' }}>
            <WorldVisualization shipments={active} hubs={[]} disruptions={disruptions} width="100%" height="100%" />
            {/* Mode filter bar */}
            <div className="nx-mode-bar">
              {MODES.map(m => (
                <button key={m} className={`nx-mode-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Alerts</span>
            {alerts.length > 0 && <span className="ds-badge ds-badge-danger">{alerts.length}</span>}
          </div>
          <div className="ds-card-body" style={{ maxHeight: 380, overflowY: 'auto' }}>
            {alerts.length === 0 && <div className="nx-empty">No active alerts</div>}
            {alerts.map((a, i) => (
              <div key={a.id || i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,212,170,0.08)', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="ds-badge" style={{ background: a.type === 'HIGH_RISK' ? 'rgba(255,86,48,0.1)' : 'rgba(255,171,0,0.1)', color: a.type === 'HIGH_RISK' ? 'var(--ds-danger)' : 'var(--ds-warning)', fontSize: 10 }}>
                    {(a.type || '').replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ds-gray-500)' }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ color: 'var(--ds-gray-700)', lineHeight: 1.4 }}>{a.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shipments table */}
      <div className="ds-card ds-grid-row">
        <div className="ds-card-header">
          <span className="ds-card-title">All Shipments ({filtered.length})</span>
        </div>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr><th>Reference</th><th>Route</th><th>Mode</th><th>Status</th><th>Risk</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.slice(0, 15).map(s => (
                <tr key={s.id} onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.shipment_ref}</td>
                  <td style={{ color: 'var(--ds-gray-600)' }}>{s.origin_name} → {s.destination_name}</td>
                  <td><span className="ds-badge ds-badge-secondary">{s.transport_mode || '—'}</span></td>
                  <td><span className="ds-badge" style={{ background: 'var(--ds-gray-200)', color: 'var(--ds-gray-600)' }}>{(s.status || '').replace(/_/g, ' ')}</span></td>
                  <td style={{ fontWeight: 700, color: getRiskColor(s.risk_level || 'LOW'), fontVariantNumeric: 'tabular-nums' }}>{s.risk_score || 0}</td>
                  <td><button className="ds-btn ds-btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/shipments/${s.shipment_ref}`); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
