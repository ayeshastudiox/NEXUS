import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAlerts, getCompanyDashboard, getDisruptions, getNetworkHubs, getShipments,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AtlasMap from '../components/map/AtlasMap';
import {
  Badge, Empty, Glyph, KeyValue, Metric, ModeBadge, Panel, RiskPill, StateBlock,
  humanize, riskColor, riskTone, statusTone,
} from '../components/ui';
import { IconArrowRight } from '../components/Icons';
import { deriveSignals, signalTime } from '../lib/signals';

const POLL_MS = 30000;
const ACTIVE_STATUSES = ['IN_TRANSIT', 'DELAYED', 'AT_PORT', 'AWAITING_CLEARANCE'];

export default function CompanyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const company = user?.company_name?.trim() || null;

  const load = useCallback(async () => {
    const params: Record<string, string> | undefined = company ? { company } : undefined;
    try {
      const [d, s, a, h, disp] = await Promise.all([
        company
          ? getCompanyDashboard(company)
          : Promise.resolve({ total_shipments: 0, high_risk: 0, low_risk: 0, delayed: 0, documents_pending: 0, exceptions: 0, average_risk: 0 }),
        getShipments(params),
        getAlerts().catch(() => []),
        getNetworkHubs().catch(() => []),
        getDisruptions().catch(() => []),
      ]);
      setData(d);
      setShipments(Array.isArray(s) ? s : []);
      setAlerts(Array.isArray(a) ? a : []);
      setHubs(Array.isArray(h) ? h : []);
      setDisruptions(Array.isArray(disp) ? disp : []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const active = useMemo(
    () => shipments.filter(s => ACTIVE_STATUSES.includes(s.status)),
    [shipments]
  );

  const ranked = useMemo(
    () => [...shipments].filter(s => s.risk_score != null).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)),
    [shipments]
  );

  const primary = ranked[0] || null;
  const signals = useMemo(() => deriveSignals(alerts, shipments).slice(0, 6), [alerts, shipments]);

  /**
   * company_dashboard omits the medium/critical split, so medium is derived from
   * the counts it does return rather than invented.
   */
  const highRisk = data?.high_risk || 0;
  const lowRisk = data?.low_risk || 0;
  const totalAssessed = data?.total_shipments || shipments.length || 0;
  const mediumRisk = Math.max(0, totalAssessed - highRisk - lowRisk);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading company intelligence" spinner />
      </div>
    );
  }

  if (failed && !data) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Company intelligence unavailable"
          text="The NEXUS API did not respond."
          action={<button className="nx-btn nx-btn-primary" onClick={load}>Retry</button>}
        />
      </div>
    );
  }

  const averageRisk = data?.average_risk ?? (ranked.length > 0
    ? Math.round(ranked.reduce((sum, s) => sum + (s.risk_score || 0), 0) / ranked.length)
    : 0);

  const averageTone = averageRisk >= 55 ? 'HIGH' : averageRisk >= 30 ? 'MEDIUM' : 'LOW';

  return (
    <div className="nx-page">
      <header className="atl-hero">
        <div className="atl-hero-main">
          <div className="nx-eyebrow">{company ? 'Company Operations' : 'Operations Overview'}</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>{company || 'Assigned Shipments'}</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            {active.length} active shipments{company ? ` under ${company}` : ''} · signed in as {user?.name || 'operator'}
          </p>
        </div>
        <button className="nx-btn" onClick={() => navigate('/shipments')}>
          All shipments <IconArrowRight size={13} />
        </button>
      </header>

      <div className="nx-metrics">
        <Metric label="Active" value={active.length} note={`${shipments.length} assigned`} tone="teal" />
        <Metric label="High risk" value={highRisk} note="escalation advised" tone="high" />
        <Metric label="Delayed" value={data?.delayed || 0} note="schedule variance" tone="warn" />
        <Metric
          label="Average risk"
          value={averageRisk}
          note={`${totalAssessed} assessed`}
          tone={riskTone(averageTone)}
        />
        <Metric
          label="Exceptions"
          value={data?.exceptions || 0}
          note={`${data?.documents_pending ?? 0} documents pending`}
          tone="critical"
        />
      </div>

      <div className="atl-split atl-split--map">
        <section className="atl-chrome atl-chrome--tall">
          <div className="atl-chrome-head">
            <span className="atl-chrome-title">
              <Glyph name="target" />
              Assigned Network
            </span>
            <div className="nx-panel-actions">
              <Badge tone="teal">{active.length} active</Badge>
            </div>
          </div>
          <AtlasMap
            shipments={active}
            hubs={hubs}
            disruptions={disruptions}
            mode="global"
            height={500}
            onOpenDossier={ref => navigate(`/shipments/${ref}`)}
          />
        </section>

        <div className="atl-rail">
          <Panel
            title="Priority Shipment"
            icon="risk"
            actions={primary && (
              <button className="nx-btn nx-btn-sm nx-btn-primary" onClick={() => navigate(`/shipments/${primary.shipment_ref}`)}>
                Open <IconArrowRight size={12} />
              </button>
            )}
          >
            {!primary ? (
              <Empty>No shipments assigned to this company</Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="atl-ref" style={{ fontSize: 16 }}>{primary.shipment_ref}</div>
                  <div className="nx-body" style={{ marginTop: 3 }}>
                    {primary.origin_name} → {primary.destination_name}
                  </div>
                  <div className="nx-priority-tags" style={{ marginTop: 8 }}>
                    <ModeBadge mode={primary.transport_mode} />
                    <Badge tone="neutral">{primary.carrier}</Badge>
                    <Badge tone={statusTone(primary.status)}>{humanize(primary.status)}</Badge>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span
                    className="nx-mono"
                    style={{ fontSize: 30, fontWeight: 700, color: riskColor(primary.risk_level), lineHeight: 1 }}
                  >
                    {primary.risk_score ?? '—'}
                  </span>
                  <RiskPill level={primary.risk_level} />
                </div>
                <div className="nx-kv">
                  <KeyValue label="Additional delay" value={`${primary.delay_hours ?? 0} h`} mono />
                  <KeyValue label="Progress" value={`${primary.progress_percent ?? 0}%`} mono />
                  <KeyValue label="Documents" value={`${primary.documents_uploaded ?? 0} / ${primary.documents_total ?? 4}`} mono />
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Signals" icon="bolt" flush actions={<Badge tone="neutral">{signals.length}</Badge>}>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {signals.length === 0 ? <Empty>No active signals</Empty> : (
                <div className="nx-signals">
                  {signals.map(sig => {
                    const color = sig.tone === 'critical' ? 'var(--nx-critical)'
                      : sig.tone === 'high' ? 'var(--nx-high)'
                      : sig.tone === 'warn' ? 'var(--nx-warn)'
                      : sig.tone === 'ok' ? 'var(--nx-ok)' : 'var(--nx-info)';
                    return (
                      <div
                        className="nx-signal"
                        key={sig.key}
                        style={sig.shipmentRef ? { cursor: 'pointer' } : undefined}
                        onClick={() => sig.shipmentRef && navigate(`/shipments/${sig.shipmentRef}`)}
                      >
                        <div className="nx-signal-icon" style={{ background: `${color}1f`, color }}>
                          <Glyph name={sig.icon} size={12} />
                        </div>
                        <div className="nx-signal-body">
                          <div className="nx-signal-event">
                            {sig.label}
                            {sig.shipmentRef && (
                              <span className="nx-mono" style={{ color: 'var(--nx-teal)', marginLeft: 6, fontSize: 11 }}>
                                {sig.shipmentRef}
                              </span>
                            )}
                            {sig.corrected && <span className="atl-flag">verified</span>}
                            {sig.unverified && <span className="atl-flag atl-flag--muted">unverified</span>}
                          </div>
                          <div className="nx-signal-meta">{sig.message}</div>
                          <div className="nx-signal-meta" style={{ marginTop: 3, opacity: 0.75 }}>
                            Raised {signalTime(sig.createdAt) || '—'} · assessed {signalTime(sig.assessedAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="atl-split atl-split--even">
        <Panel
          title="Assigned Shipments"
          icon="shipments"
          flush
          actions={<button className="nx-btn nx-btn-sm nx-btn-ghost" onClick={() => navigate('/shipments')}>Registry</button>}
        >
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Lane</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Delay</th>
                  <th style={{ textAlign: 'right' }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 10).map(s => (
                  <tr key={s.id} className="clickable" onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                    <td className="cell-ref">{s.shipment_ref}</td>
                    <td className="cell-route">{s.origin_name} → {s.destination_name}</td>
                    <td><ModeBadge mode={s.transport_mode} /></td>
                    <td><Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge></td>
                    <td className="nx-mono" style={{ fontSize: 11, color: (s.delay_hours || 0) > 0 ? 'var(--nx-warn)' : undefined }}>
                      {(s.delay_hours || 0) > 0 ? `+${s.delay_hours}h` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}><RiskPill level={s.risk_level} score={s.risk_score} /></td>
                  </tr>
                ))}
                {ranked.length === 0 && (
                  <tr><td colSpan={6}><Empty>No shipments assigned to this company</Empty></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Risk Profile" icon="layers">
          <div className="nx-kv">
            <KeyValue label="Low risk" value={lowRisk} mono />
            <KeyValue label="Medium risk" value={mediumRisk} mono />
            <KeyValue label="High risk" value={highRisk} mono />
            <KeyValue label="Documents pending" value={data?.documents_pending ?? 0} mono />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="nx-label" style={{ marginBottom: 8 }}>Assessed distribution</div>
            {[
              { label: 'High', value: highRisk, color: 'var(--nx-high)' },
              { label: 'Medium', value: mediumRisk, color: 'var(--nx-warn)' },
              { label: 'Low', value: lowRisk, color: 'var(--nx-ok)' },
            ].map(row => {
              const pct = totalAssessed > 0 ? (row.value / totalAssessed) * 100 : 0;
              return (
                <div key={row.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--nx-text-2)' }}>{row.label}</span>
                    <span className="nx-mono" style={{ fontSize: 11, fontWeight: 700 }}>{row.value}</span>
                  </div>
                  <div className="nx-meter">
                    <div className="nx-meter-fill" style={{ width: `${pct}%`, background: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
