import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanyDashboard, getShipments, getAlerts } from '../lib/api';
import { getRiskColor } from '../lib/format';
import WorldVisualization from '../components/WorldVisualization';
import { useAuth } from '../context/AuthContext';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const [d, s, a] = await Promise.all([
        getCompanyDashboard(user?.company_name || ''), getShipments(), getAlerts()
      ]);
      setData(d); setShipments(s); setAlerts(a);
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
  const healthColor = healthPct > 80 ? 'var(--ds-success)' : healthPct > 50 ? 'var(--ds-warning)' : 'var(--ds-danger)';

  return (
    <div className="ds-page">
      <div className="ds-welcome ds-grid-row">
        <h1>Company Dashboard</h1>
        <p>{active.length} active shipments. {data.delayed || 0} delayed. {healthPct}% network health.</p>
      </div>

      <div className="ds-grid ds-grid-4 ds-grid-row">
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
            </div>
            <div className="ds-stat-label">Active</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value">{active.length}</div>
          </div>
        </div>
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div className="ds-stat-label">Delayed</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value" style={{ color: (data.delayed || 0) > 0 ? 'var(--ds-warning)' : undefined }}>{data.delayed || 0}</div>
          </div>
        </div>
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
            </div>
            <div className="ds-stat-label">High Risk</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value">{data.high_risk || 0}</div>
          </div>
        </div>
        <div className="ds-stat-card">
          <div className="ds-stat-card-top">
            <div className="ds-icon-shape ds-icon-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
            </div>
            <div className="ds-stat-label">Health</div>
          </div>
          <div className="ds-stat-card-bottom">
            <div className="ds-stat-value" style={{ color: healthColor }}>{healthPct}%</div>
          </div>
        </div>
      </div>

      <div className="ds-grid ds-grid-3-1 ds-grid-row">
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Active Shipments</span>
          </div>
          <div style={{ height: 320, position: 'relative' }}>
            <WorldVisualization shipments={active} hubs={[]} disruptions={[]} width="100%" height="100%" />
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Recent Alerts</span>
          </div>
          <div className="ds-card-body" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {alerts.length === 0 && <div className="nx-empty">No alerts</div>}
            {alerts.slice(0, 5).map((a: any, i: number) => (
              <div key={a.id || i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,212,170,0.08)', fontSize: 12 }}>
                <div style={{ color: 'var(--ds-gray-700)' }}>{a.message}</div>
                <div style={{ fontSize: 10, color: 'var(--ds-gray-500)', marginTop: 2 }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ds-card ds-grid-row">
        <div className="ds-card-header">
          <span className="ds-card-title">All Shipments</span>
        </div>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr><th>Reference</th><th>Route</th><th>Status</th><th>Risk</th><th>Action</th></tr>
            </thead>
            <tbody>
              {shipments.slice(0, 10).map(s => (
                <tr key={s.id} onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.shipment_ref}</td>
                  <td style={{ color: 'var(--ds-gray-600)' }}>{s.origin_name} → {s.destination_name}</td>
                  <td><span className="ds-badge" style={{ background: 'var(--ds-gray-200)', color: 'var(--ds-gray-600)' }}>{(s.status || '').replace(/_/g, ' ')}</span></td>
                  <td style={{ fontWeight: 700, color: getRiskColor(s.risk_level || 'LOW'), fontVariantNumeric: 'tabular-nums' }}>{s.risk_score || 0}</td>
                  <td><button className="ds-btn ds-btn-sm">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
