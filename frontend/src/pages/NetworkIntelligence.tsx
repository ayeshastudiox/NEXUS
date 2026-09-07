import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNetworkHubs, getShipments } from '../lib/api';
import WorldVisualization from '../components/WorldVisualization';

export default function NetworkIntelligence() {
  const [hubs, setHubs] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedHub, setSelectedHub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getNetworkHubs(), getShipments()])
      .then(([h, s]) => { setHubs(h); setShipments(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ds-spinner" />
    </div>
  );

  const hubShipments = selectedHub
    ? shipments.filter(s => s.origin_hub_id === selectedHub.id || s.destination_hub_id === selectedHub.id)
    : [];

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <div className="ds-page-title">Network Intelligence</div>
          <div className="ds-page-sub">{hubs.length} hubs in the global network</div>
        </div>
      </div>

      <div className="ds-grid ds-grid-3-1 ds-grid-row">
        {/* Map */}
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Network Map</span>
            <span className="ds-badge ds-badge-primary">{hubs.length} hubs</span>
          </div>
          <div style={{ height: 400, position: 'relative' }}>
            <WorldVisualization shipments={[]} hubs={hubs} disruptions={[]} width="100%" height="100%" />
          </div>
        </div>

        {/* Hub list */}
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Network Hubs</span>
          </div>
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {hubs.map(h => (
              <div
                key={h.id}
                onClick={() => setSelectedHub(selectedHub?.id === h.id ? null : h)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  cursor: 'pointer', borderBottom: '1px solid rgba(0,212,170,0.08)',
                  background: selectedHub?.id === h.id ? 'rgba(0,212,170,0.06)' : undefined,
                  transition: 'background 0.1s'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-primary)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-body-color)' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ds-gray-500)' }}>{h.code || h.region || ''}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ds-gray-500)' }}>
                  {h.active_shipments || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hub detail */}
      {selectedHub && (
        <div className="ds-card ds-grid-row">
          <div className="ds-card-header">
            <span className="ds-card-title">{selectedHub.name} — Hub Detail</span>
            <button className="ds-btn ds-btn-sm" onClick={() => setSelectedHub(null)}>Close</button>
          </div>
          <div className="ds-card-body">
            <div className="ds-grid ds-grid-4" style={{ marginBottom: 16 }}>
              <div className="nx-stat-box">
                <div className="nx-stat-num">{selectedHub.active_shipments || 0}</div>
                <div className="nx-stat-label">Active Shipments</div>
              </div>
              <div className="nx-stat-box">
                <div className="nx-stat-num">{selectedHub.total_shipments || 0}</div>
                <div className="nx-stat-label">Total Shipments</div>
              </div>
              <div className="nx-stat-box">
                <div className="nx-stat-num">{selectedHub.capacity || '—'}</div>
                <div className="nx-stat-label">Capacity</div>
              </div>
              <div className="nx-stat-box">
                <div className="nx-stat-num">{selectedHub.utilization || '—'}%</div>
                <div className="nx-stat-label">Utilization</div>
              </div>
            </div>
            {hubShipments.length > 0 && (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead><tr><th>Reference</th><th>Route</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {hubShipments.slice(0, 5).map(s => (
                      <tr key={s.id} onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                        <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.shipment_ref}</td>
                        <td style={{ color: 'var(--ds-gray-600)' }}>{s.origin_name} → {s.destination_name}</td>
                        <td><span className="ds-badge ds-badge-secondary">{(s.status || '').replace(/_/g, ' ')}</span></td>
                        <td><button className="ds-btn ds-btn-sm">View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
