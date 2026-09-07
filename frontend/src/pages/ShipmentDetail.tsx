import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShipment, getShipmentTimeline, getShipmentRisk, getShipmentDelay, getShipmentDocuments, aiQuery } from '../lib/api';
import { getRiskColor } from '../lib/format';
import ShipmentRouteMap from '../components/ShipmentRouteMap';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [risk, setRisk] = useState<any>(null);
  const [delay, setDelay] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setShipment(null);
    Promise.all([
      getShipment(id),
      getShipmentTimeline(id).catch(() => []),
      getShipmentRisk(id).catch(() => null),
      getShipmentDelay(id).catch(() => null),
      getShipmentDocuments(id).catch(() => []),
    ]).then(([s, t, r, d, docs]) => {
      setShipment(s); setTimeline(t); setRisk(r); setDelay(d); setDocuments(docs);
    }).catch((err) => {
      console.error('Failed to load shipment:', err);
      setError(err.message || 'Unable to retrieve shipment data');
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAiQuery = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiQuery(aiQuestion, id);
      setAiAnswer(res.answer || res.message || 'No answer available');
    } catch { setAiAnswer('Failed to get AI response'); }
    setAiLoading(false);
  };

  if (loading) return (
    <div className="nx-dossier" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="ds-spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 12, color: 'var(--ds-gray-500)', letterSpacing: '0.04em' }}>LOADING SHIPMENT DATA</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="nx-dossier" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ds-danger)', marginBottom: 8 }}>SYSTEM ALERT</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-body-color)', marginBottom: 6 }}>Shipment Data Unavailable</div>
        <div style={{ fontSize: 13, color: 'var(--ds-gray-500)', marginBottom: 16 }}>Unable to retrieve shipment {id}. The data source may be temporarily unavailable.</div>
        <button className="ds-btn ds-btn-primary" onClick={() => { setLoading(true); setError(null); getShipment(id!).then(s => { setShipment(s); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); }); }}>Retry</button>
      </div>
    </div>
  );

  if (!shipment) return (
    <div className="nx-dossier" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ds-gray-500)', marginBottom: 8 }}>404</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-body-color)', marginBottom: 6 }}>Shipment Not Found</div>
        <div style={{ fontSize: 13, color: 'var(--ds-gray-500)', marginBottom: 16 }}>Shipment {id} does not exist in the network.</div>
        <button className="ds-btn" onClick={() => navigate('/')}>Return to Dashboard</button>
      </div>
    </div>
  );

  const riskClr = getRiskColor(shipment.risk_level || risk?.risk_level || 'LOW');

  return (
    <div className="nx-dossier">
      {/* Header */}
      <div className="nx-dossier-header">
        <div className="nx-dossier-breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Dashboard</a>
          <span>/</span>
          <span style={{ color: 'var(--ds-gray-700)' }}>{shipment.shipment_ref}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="nx-dossier-ref">{shipment.shipment_ref}</div>
            <div className="nx-dossier-route">
              {shipment.origin_name} → {shipment.destination_name}
              {shipment.transport_mode && <span className="ds-badge ds-badge-secondary" style={{ marginLeft: 8 }}>{shipment.transport_mode}</span>}
            </div>
          </div>
          <div className="nx-dossier-badges">
            <span className="ds-badge" style={{ background: riskClr + '18', color: riskClr }}>
              Risk: {shipment.risk_score || risk?.risk_score || 0}
            </span>
            <span className="ds-badge" style={{ background: 'var(--ds-gray-200)', color: 'var(--ds-gray-600)' }}>
              {(shipment.status || '').replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      {shipment.origin_lat && shipment.destination_lat && (
        <div className="nx-dossier-map">
          <ShipmentRouteMap shipment={shipment} />
        </div>
      )}

      {/* Info grid */}
      <div className="nx-dossier-grid">
        <div className="nx-dossier-cell">
          <div className="nx-dossier-cell-title">Origin</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-body-color)' }}>{shipment.origin_name}</div>
          {shipment.origin_country && <div style={{ fontSize: 12, color: 'var(--ds-gray-500)' }}>{shipment.origin_country}</div>}
        </div>
        <div className="nx-dossier-cell">
          <div className="nx-dossier-cell-title">Destination</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-body-color)' }}>{shipment.destination_name}</div>
          {shipment.destination_country && <div style={{ fontSize: 12, color: 'var(--ds-gray-500)' }}>{shipment.destination_country}</div>}
        </div>
        <div className="nx-dossier-cell">
          <div className="nx-dossier-cell-title">Containers</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-body-color)' }}>{shipment.container_count || '—'}</div>
        </div>
        <div className="nx-dossier-cell">
          <div className="nx-dossier-cell-title">Weight</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-body-color)' }}>{shipment.weight_kg ? `${shipment.weight_kg.toLocaleString()} kg` : '—'}</div>
        </div>
      </div>

      {/* Risk assessment */}
      {risk && (
        <div className="nx-dossier-section">
          <div className="nx-dossier-section-title">Risk Assessment</div>
          <div className="nx-risk-gauge">
            <svg className="nx-risk-gauge-svg" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="var(--ds-gray-200)" strokeWidth="6" />
              <circle cx="40" cy="40" r="35" fill="none" stroke={riskClr} strokeWidth="6"
                strokeDasharray={`${(risk.risk_score || 0) * 2.2} 220`} strokeLinecap="round"
                transform="rotate(-90 40 40)" />
              <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fill={riskClr}
                fontSize="18" fontWeight="800">{risk.risk_score || 0}</text>
            </svg>
            <div className="nx-risk-gauge-info">
              <div style={{ fontSize: 14, fontWeight: 700, color: riskClr }}>{risk.risk_level || 'LOW'} Risk</div>
              <div style={{ fontSize: 12, color: 'var(--ds-gray-500)' }}>Overall assessment</div>
            </div>
          </div>
          {risk.factors && risk.factors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {risk.factors.map((f: any, i: number) => (
                <div key={i} className="nx-risk-factor">
                  <span className="nx-risk-factor-name">{f.name || f.factor}</span>
                  <span className="nx-risk-factor-pts">+{f.points || f.score || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delay info */}
      {delay && (
        <div className="nx-dossier-section">
          <div className="nx-dossier-section-title">Delay Analysis</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ds-gray-500)', marginBottom: 2 }}>Estimated Delay</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-warning)' }}>{delay.estimated_delay_hours || 0}h</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ds-gray-500)', marginBottom: 2 }}>Reason</div>
              <div style={{ fontSize: 13, color: 'var(--ds-gray-700)' }}>{delay.reason || 'Unknown'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="nx-dossier-section">
          <div className="nx-dossier-section-title">Timeline</div>
          {timeline.map((t, i) => (
            <div key={i} className="nx-timeline-item">
              <div className="nx-timeline-dot" style={{ background: i === 0 ? 'var(--ds-primary)' : 'var(--ds-gray-300)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="nx-timeline-loc">{t.location || t.status}</span>
                  <span className="nx-timeline-time">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</span>
                </div>
                {t.description && <div className="nx-timeline-desc">{t.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="nx-dossier-section">
          <div className="nx-dossier-section-title">Documents</div>
          {documents.map((d, i) => (
            <div key={i} className="nx-doc-item">
              <span className="nx-doc-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                </svg>
                {d.name || d.document_type}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ds-gray-500)' }}>{d.status || ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Analyst */}
      <div className="nx-dossier-section">
        <div className="nx-dossier-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ color: 'var(--ds-primary)' }}>
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          AI Analyst
        </div>
        <div className="nx-ai-input-wrap">
          <input
            className="nx-ai-input"
            placeholder="Ask about risk factors, ETA, optimizations..."
            value={aiQuestion}
            onChange={e => setAiQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiQuery()}
          />
          <button
            className="ds-btn ds-btn-primary"
            style={{ height: 36, minWidth: 64, fontSize: 12 }}
            onClick={handleAiQuery}
            disabled={aiLoading || !aiQuestion.trim()}
          >
            {aiLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="ds-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Analyzing
              </span>
            ) : 'Ask'}
          </button>
        </div>
        <div className="nx-ai-suggestions">
          {['What are the risk factors?', 'Predict arrival time', 'Suggest optimization', 'Why is it delayed?'].map(q => (
            <button key={q} className="nx-ai-chip" onClick={() => { setAiQuestion(q); setTimeout(handleAiQuery, 100); }}>{q}</button>
          ))}
        </div>
        {aiAnswer && (
          <div className="nx-ai-answer">
            <div style={{ whiteSpace: 'pre-wrap' }}>{aiAnswer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
