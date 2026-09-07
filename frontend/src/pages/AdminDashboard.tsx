import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboard, getShipments, getDisruptions, getNetworkHubs, getAlerts, getInsights } from '../lib/api';
import { getRiskColor } from '../lib/format';
import WorldVisualization from '../components/WorldVisualization';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const [d, s, disp, h, a, ins] = await Promise.all([
        getAdminDashboard(), getShipments(), getDisruptions(), getNetworkHubs(), getAlerts(), getInsights().catch(() => [])
      ]);
      setData(d); setShipments(s); setDisruptions(disp); setHubs(h); setAlerts(a); setInsights(ins);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ds-spinner" />
    </div>
  );
  if (!data) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-gray-500)', fontSize: 14 }}>Connection error</div>;

  const active = shipments.filter(s => ['IN_TRANSIT', 'DELAYED', 'AT_PORT', 'AWAITING_CLEARANCE'].includes(s.status));
  const totalRisk = (data.critical_risk || 0) + (data.high_risk || 0) + (data.medium_risk || 0) + (data.low_risk || 0) || 1;
  const healthPct = Math.round(((data.low_risk + data.medium_risk) / totalRisk) * 100);
  const highPriority = active.filter(s => s.risk_score != null).sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 6);
  const healthColor = healthPct > 80 ? 'var(--ds-success)' : healthPct > 50 ? 'var(--ds-warning)' : 'var(--ds-danger)';
  const primaryInsight = insights.length > 0 ? insights[0] : null;
  const primaryDisruption = disruptions.length > 0 ? disruptions[0] : null;

  return (
    <div className="ds-page">
      {/* Welcome banner */}
      <div className="ds-welcome ds-grid-row">
        <h1>Welcome back, {user?.name || 'Commander'}</h1>
        <p>Global logistics intelligence overview. {active.length} active shipments across {hubs.length} network hubs.</p>
      </div>

      {/* Stat cards */}
      <div className="ds-grid ds-grid-4 ds-grid-row">
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
            </div>
            <div className="ds-stat-label">Active Shipments</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value">{active.length}</div>
            <div className="ds-stat-trend" style={{ color: 'var(--ds-success)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
            </div>
          </div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
            </div>
            <div className="ds-stat-label">High Risk</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value" style={{ color: (data.high_risk || 0) > 0 ? 'var(--ds-danger)' : undefined }}>{data.high_risk || 0}</div>
            <div className="ds-stat-trend" style={{ color: 'var(--ds-gray-500)', fontSize: 11 }}>
              {(data.critical_risk || 0) > 0 && <span>{data.critical_risk} critical</span>}
            </div>
          </div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="ds-stat-label">Delayed</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value" style={{ color: (data.delayed || 0) > 0 ? 'var(--ds-warning)' : undefined }}>{data.delayed || 0}</div>
            <div className="ds-stat-trend" style={{ color: 'var(--ds-gray-500)', fontSize: 11 }}>
              {data.delayed > 0 && <span>Requires attention</span>}
            </div>
          </div>
        </div>

        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
            </div>
            <div className="ds-stat-label">Network Health</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value" style={{ color: healthColor }}>{healthPct}%</div>
            <div className="ds-stat-trend" style={{ color: healthColor, fontSize: 11 }}>
              {healthPct > 80 ? 'Operational' : healthPct > 50 ? 'Degraded' : 'Critical'}
            </div>
          </div>
        </div>
      </div>

      {/* Map + Network Health */}
      <div className="ds-grid ds-grid-3-1 ds-grid-row">
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Global Network</span>
            <span className="ds-badge ds-badge-primary">{active.length} active</span>
          </div>
          <div style={{ height: 380, position: 'relative' }}>
            <WorldVisualization shipments={active} hubs={hubs} disruptions={disruptions} width="100%" height="100%" />
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Network Health</span>
          </div>
          <div className="ds-card-body">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: healthColor, lineHeight: 1 }}>{healthPct}%</div>
              <div style={{ fontSize: 12, color: 'var(--ds-gray-500)', marginTop: 4 }}>Operational Capacity</div>
            </div>
            <div className="ds-progress" style={{ height: 8, marginBottom: 16 }}>
              <div className="ds-progress-bar" style={{ width: `${healthPct}%`, background: healthColor }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ds-gray-500)' }}>Active shipments</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{active.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ds-gray-500)' }}>Network hubs</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{hubs.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ds-gray-500)' }}>Disruptions</span>
                <span style={{ fontWeight: 700, color: disruptions.length > 0 ? 'var(--ds-danger)' : undefined, fontVariantNumeric: 'tabular-nums' }}>{disruptions.length}</span>
              </div>
              {data.delayed > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ds-gray-500)' }}>Delayed</span>
                  <span style={{ fontWeight: 700, color: 'var(--ds-warning)', fontVariantNumeric: 'tabular-nums' }}>{data.delayed}</span>
                </div>
              )}
            </div>
            {hubs.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(0,212,170,0.08)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active Hubs</div>
                {hubs.slice(0, 5).map((h: any) => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                    <span style={{ color: 'var(--ds-gray-700)' }}>{h.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--ds-gray-500)', fontVariantNumeric: 'tabular-nums' }}>{h.active_shipments || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipments table + Alerts */}
      <div className="ds-grid ds-grid-3-1 ds-grid-row">
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Recent Shipments</span>
            <button className="ds-btn ds-btn-sm" onClick={() => navigate('/command-center')}>View All</button>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 8).map(s => {
                  const clr = getRiskColor(s.risk_level || 'LOW');
                  return (
                    <tr key={s.id} onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                      <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.shipment_ref}</td>
                      <td style={{ color: 'var(--ds-gray-600)' }}>{s.origin_name} → {s.destination_name}</td>
                      <td>
                        <span className="ds-badge" style={{ background: getStatusBg(s.status), color: getStatusColor(s.status) }}>
                          {(s.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: clr, fontVariantNumeric: 'tabular-nums' }}>{s.risk_score || 0}</td>
                    </tr>
                  );
                })}
                {shipments.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ds-gray-500)', padding: 20 }}>No shipments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Live Signals</span>
            {alerts.length > 0 && <span className="ds-badge ds-badge-danger">{alerts.length}</span>}
          </div>
          <div className="ds-card-body" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {alerts.length === 0 && <div className="nx-empty">No active alerts</div>}
            {alerts.slice(0, 6).map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(0,212,170,0.08)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: a.type === 'HIGH_RISK' ? 'var(--ds-danger)' : a.type === 'DOCUMENT_ALERT' ? 'var(--ds-warning)' : 'var(--ds-info)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ds-gray-700)', lineHeight: 1.4 }}>{a.message}</div>
                  <div style={{ fontSize: 10, color: 'var(--ds-gray-500)', marginTop: 2 }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority movements */}
      {highPriority.length > 0 && (
        <div className="ds-card ds-grid-row">
          <div className="ds-card-header">
            <span className="ds-card-title">Priority Movements</span>
            <span className="ds-badge ds-badge-danger">{highPriority.length} high risk</span>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Route</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {highPriority.map(s => {
                  const clr = getRiskColor(s.risk_level || 'LOW');
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.shipment_ref}</td>
                      <td style={{ color: 'var(--ds-gray-600)' }}>{s.origin_name} → {s.destination_name}</td>
                      <td style={{ fontWeight: 800, color: clr, fontVariantNumeric: 'tabular-nums' }}>{s.risk_score || 0}</td>
                      <td>
                        <span className="ds-badge" style={{ background: getStatusBg(s.status), color: getStatusColor(s.status) }}>
                          {(s.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <button className="ds-btn ds-btn-sm" onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Intelligence bar */}
      {(primaryInsight || primaryDisruption) && (
        <div className="nx-intel-bar" style={{ position: 'relative', borderRadius: 'var(--ds-border-radius-xl)', marginTop: 0 }}>
          <span className="nx-intel-tag">Intelligence</span>
          <span className="nx-intel-text">
            {primaryDisruption
              ? `${primaryDisruption.location_name} — ${primaryDisruption.category?.replace(/_/g, ' ')} affecting ${primaryDisruption.affected_shipment_count || 0} shipments`
              : primaryInsight?.text}
          </span>
          {primaryDisruption && (
            <span className="nx-intel-action" onClick={() => navigate('/exceptions')}>View Impact</span>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusBg(status: string) {
  switch (status) {
    case 'IN_TRANSIT': return 'rgba(0,184,217,0.1)';
    case 'DELAYED': return 'rgba(255,171,0,0.1)';
    case 'DELIVERED': return 'rgba(34,197,94,0.1)';
    case 'AT_PORT': return 'rgba(0,212,170,0.1)';
    case 'AWAITING_CLEARANCE': return 'rgba(255,171,0,0.1)';
    default: return 'var(--ds-gray-200)';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'IN_TRANSIT': return 'var(--ds-info)';
    case 'DELAYED': return 'var(--ds-warning)';
    case 'DELIVERED': return 'var(--ds-success)';
    case 'AT_PORT': return 'var(--ds-primary)';
    case 'AWAITING_CLEARANCE': return 'var(--ds-warning)';
    default: return 'var(--ds-gray-500)';
  }
}
