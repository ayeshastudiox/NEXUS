import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExceptions } from '../lib/api';
import { getRiskColor } from '../lib/format';

const FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export default function ExceptionCenter() {
  const navigate = useNavigate();
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getExceptions().then(data => { setExceptions(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? exceptions : exceptions.filter(e => e.risk_level === filter);

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <div className="ds-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ color: 'var(--ds-warning)' }}>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
            </svg>
            Exception Center
          </div>
          <div className="ds-page-sub">{exceptions.length} shipments with active issues</div>
        </div>
        <div className="ds-nav-pills">
          {FILTERS.map(f => (
            <button key={f} className={`ds-nav-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div className="ds-spinner" />
        </div>
      ) : (
        <div className="ds-card">
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Risk Level</th>
                  <th>Risk Score</th>
                  <th>Flags</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const riskClr = getRiskColor(s.risk_level || 'LOW');
                  return (
                    <tr key={s.id} onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                      <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.shipment_ref}</td>
                      <td style={{ color: 'var(--ds-gray-600)' }}>{s.origin_name} → {s.destination_name}</td>
                      <td>
                        <span className="ds-badge" style={{ background: 'var(--ds-gray-200)', color: 'var(--ds-gray-600)' }}>
                          {(s.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="ds-badge" style={{ background: riskClr + '18', color: riskClr }}>
                          {s.risk_level}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: riskClr, fontVariantNumeric: 'tabular-nums' }}>{s.risk_score || 0}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        {s.has_active_disruption && <span className="ds-badge ds-badge-warning">Disruption</span>}
                        {s.has_discrepancy && <span className="ds-badge ds-badge-danger">Discrepancy</span>}
                      </td>
                      <td><button className="ds-btn ds-btn-sm">View</button></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ds-gray-500)', padding: 30 }}>No exceptions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
