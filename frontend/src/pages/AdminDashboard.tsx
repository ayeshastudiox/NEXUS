import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminDashboard, getAlerts, getDisruptions, getNetworkHubs, getShipmentRisk, getShipments,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AtlasMap from '../components/map/AtlasMap';
import {
  Badge, Empty, Glyph, Metric, ModeBadge, Panel, RiskPill,
  StateBlock, humanize, riskColor, riskTone, statusTone,
} from '../components/ui';
import { IconArrowRight } from '../components/Icons';
import { deriveSignals, signalTime } from '../lib/signals';

const POLL_MS = 30000;
const ACTIVE_STATUSES = ['IN_TRANSIT', 'DELAYED', 'AT_PORT', 'AWAITING_CLEARANCE'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [priorityRisk, setPriorityRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, s, disp, h, a] = await Promise.all([
        getAdminDashboard(),
        getShipments({ limit: '200' }),
        getDisruptions().catch(() => []),
        getNetworkHubs().catch(() => []),
        getAlerts().catch(() => []),
      ]);
      setData(d);
      setShipments(Array.isArray(s) ? s : []);
      setDisruptions(Array.isArray(disp) ? disp : []);
      setHubs(Array.isArray(h) ? h : []);
      setAlerts(Array.isArray(a) ? a : []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  /* ---------------- Derived intelligence (all backend values) ---------------- */

  const active = useMemo(
    () => shipments.filter(s => ACTIVE_STATUSES.includes(s.status)),
    [shipments]
  );

  const ranked = useMemo(
    () => [...shipments].filter(s => s.risk_score != null).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)),
    [shipments]
  );

  const primary = ranked[0] || null;

  // Risk-factor breakdown for the priority shipment, from the real risk engine.
  useEffect(() => {
    const ref = primary?.shipment_ref;
    if (!ref) { setPriorityRisk(null); return; }
    let cancelled = false;
    getShipmentRisk(ref)
      .then(r => { if (!cancelled) setPriorityRisk(r); })
      .catch(() => { if (!cancelled) setPriorityRisk(null); });
    return () => { cancelled = true; };
  }, [primary?.shipment_ref]);

  const signals = useMemo(() => deriveSignals(alerts, shipments), [alerts, shipments]);

  const modeMix = useMemo(() => {
    const counts: Record<string, number> = { OCEAN: 0, AIR: 0, ROAD: 0, RAIL: 0 };
    shipments.forEach(s => {
      const m = (s.transport_mode || '').toUpperCase();
      if (m in counts) counts[m] += 1;
    });
    return counts;
  }, [shipments]);

  const docStats = useMemo(() => {
    const withDiscrepancy = shipments.filter(s => s.has_discrepancy).length;
    const pending = data?.documents_pending ?? 0;
    return { withDiscrepancy, pending };
  }, [shipments, data]);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading network intelligence" text="Querying shipments, hubs and active disruptions." spinner />
      </div>
    );
  }

  if (failed && !data) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Network intelligence unavailable"
          text="The NEXUS API did not respond. Verify the backend is running on port 8000."
          action={<button className="nx-btn nx-btn-primary" onClick={load}>Retry</button>}
        />
      </div>
    );
  }

  const totalAssessed =
    (data?.critical_risk || 0) + (data?.high_risk || 0) + (data?.medium_risk || 0) + (data?.low_risk || 0);

  const factors: any[] = Array.isArray(priorityRisk?.factors) ? priorityRisk.factors : [];
  const maxFactor = Math.max(1, ...factors.map(f => f.points || 0));

  return (
    <div className="nx-page">
      {/* ===================== HEADER ===================== */}
      <header className="atl-hero">
        <div className="atl-hero-main">
          <div className="nx-eyebrow">Global Logistics Intelligence</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Global Operations</h1>
          <p className="nx-body" style={{ marginTop: 5, maxWidth: 620 }}>
            Live situational awareness across {shipments.length} shipments and {hubs.length} network hubs
            {disruptions.length > 0 ? `, with ${disruptions.length} active disruptions` : ''}.
          </p>
        </div>
        <div className="atl-hero-side">
          <div className="atl-hero-kpi">
            <span className="nx-label">Operator</span>
            <b>{user?.name || 'Operator'}</b>
          </div>
          <div className="atl-hero-kpi">
            <span className="nx-label">Assessed</span>
            <b className="nx-mono">{totalAssessed}</b>
          </div>
        </div>
      </header>

      {/* ===================== METRIC BAND ===================== */}
      <div className="nx-metrics">
        <Metric label="Active Shipments" value={active.length} note={`${shipments.length} registered`} tone="teal" />
        <Metric
          label="High Risk"
          value={data?.high_risk || 0}
          note={(data?.critical_risk || 0) > 0 ? `${data.critical_risk} critical` : 'no critical exposure'}
          tone="high"
        />
        <Metric
          label="Active Disruptions"
          value={disruptions.length}
          note={disruptions.length > 0 ? disruptions.map((d: any) => d.location_name).slice(0, 2).join(', ') : 'all lanes clear'}
          tone={disruptions.length > 0 ? 'critical' : undefined}
        />
        <Metric label="Delayed" value={data?.delayed || 0} note={`${modeMix.OCEAN} ocean · ${modeMix.AIR} air`} tone="warn" />
        <Metric
          label="Average Risk"
          value={data?.average_risk ?? '—'}
          note={`${totalAssessed} assessed`}
          tone={riskTone((data?.average_risk || 0) >= 55 ? 'HIGH' : (data?.average_risk || 0) >= 30 ? 'MEDIUM' : 'LOW')}
        />
      </div>

      {/* ===================== PRIMARY: MAP + PRIORITY INTELLIGENCE ===================== */}
      <div className="atl-split atl-split--map">
        <section className="atl-chrome atl-chrome--tall">
          <div className="atl-chrome-head">
            <span className="atl-chrome-title">
              <Glyph name="target" />
              Global Network
            </span>
            <div className="nx-panel-actions">
              <Badge tone="teal">{active.length} active</Badge>
              <button className="nx-btn nx-btn-sm nx-btn-ghost" onClick={() => navigate('/network')}>
                Network intelligence
              </button>
            </div>
          </div>
          <AtlasMap
            shipments={active}
            hubs={hubs}
            disruptions={disruptions}
            mode="global"
            height={560}
            onOpenDossier={ref => navigate(`/shipments/${ref}`)}
          />
        </section>

        <div className="atl-rail">
          {/* Priority shipment investigation */}
          <Panel
            title="Priority Intelligence"
            icon="risk"
            actions={
              primary && (
                <Badge large tone={riskTone(primary.risk_level) === 'critical' ? 'critical' : riskTone(primary.risk_level) === 'high' ? 'high' : riskTone(primary.risk_level) === 'medium' ? 'warn' : 'ok'}>
                  {primary.risk_level || 'LOW'} · {primary.risk_score}
                </Badge>
              )
            }
          >
            {!primary ? (
              <Empty>No shipments registered</Empty>
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

                {factors.length > 0 && (
                  <div>
                    <div className="nx-label" style={{ marginBottom: 4 }}>Risk contribution</div>
                    {factors.map((f, i) => (
                      <div className="nx-factor" key={`${f.name}-${i}`}>
                        <span className="nx-factor-name" style={{ fontSize: 11.5 }}>{f.name}</span>
                        <span className="nx-factor-points">+{f.points}</span>
                        <span className="nx-factor-bar">
                          <span style={{ width: `${((f.points || 0) / maxFactor) * 100}%` }} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="nx-kv">
                  <div className="nx-kv-item">
                    <div className="nx-kv-label">Additional delay</div>
                    <div className="nx-kv-value mono">{primary.delay_hours ?? 0} h</div>
                  </div>
                  <div className="nx-kv-item">
                    <div className="nx-kv-label">Documents</div>
                    <div className="nx-kv-value mono">
                      {primary.documents_uploaded ?? 0}/{primary.documents_total ?? 4}
                    </div>
                  </div>
                </div>

                <button
                  className="nx-btn nx-btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/shipments/${primary.shipment_ref}`)}
                >
                  Open investigation <IconArrowRight size={13} />
                </button>
              </div>
            )}
          </Panel>

          {/* Verified signal stream */}
          <Panel
            title="Operational Signals"
            icon="bolt"
            flush
            actions={<Badge tone={signals.length > 0 ? 'warn' : 'ok'}>{signals.length}</Badge>}
          >
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
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
                            {sig.corrected && (
                              <span className="atl-flag" title="Stored alert text disagreed with live data; this statement is derived from the current backend state.">
                                verified
                              </span>
                            )}
                            {sig.unverified && <span className="atl-flag atl-flag--muted">unverified</span>}
                          </div>
                          <div className="nx-signal-meta">{sig.message}</div>
                          <div className="nx-signal-meta" style={{ marginTop: 3, opacity: 0.75 }}>
                            Alert raised {signalTime(sig.createdAt) || '—'} · assessed {signalTime(sig.assessedAt)}
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

      {/* ===================== SECONDARY: EXPOSURE ===================== */}
      <Panel
        title="Highest Risk Exposure"
        icon="shield"
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
                <th style={{ textAlign: 'right' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 8).map(s => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                  <td className="cell-ref">{s.shipment_ref}</td>
                  <td className="cell-route">{s.origin_name} → {s.destination_name}</td>
                  <td><ModeBadge mode={s.transport_mode} /></td>
                  <td><Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge></td>
                  <td style={{ textAlign: 'right' }}><RiskPill level={s.risk_level} score={s.risk_score} /></td>
                </tr>
              ))}
              {ranked.length === 0 && <tr><td colSpan={5}><Empty>No shipments registered</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ===================== TERTIARY: OPERATIONS =====================
          Three short panels share one row rather than sitting in a stretched
          two-column split, which is what previously left dead space beneath
          the shorter column. */}
      <div className="atl-split atl-split--three">
        <Panel title="Document Status" icon="documents">
          <div className="nx-kv">
            <div className="nx-kv-item">
              <div className="nx-kv-label">Documents pending</div>
              <div className="nx-kv-value mono">{docStats.pending}</div>
            </div>
            <div className="nx-kv-item">
              <div className="nx-kv-label">Shipments with discrepancies</div>
              <div className="nx-kv-value mono" style={{ color: docStats.withDiscrepancy > 0 ? 'var(--nx-high)' : undefined }}>
                {docStats.withDiscrepancy}
              </div>
            </div>
            <div className="nx-kv-item">
              <div className="nx-kv-label">Exceptions</div>
              <div className="nx-kv-value mono" style={{ color: (data?.exceptions || 0) > 0 ? 'var(--nx-warn)' : undefined }}>
                {data?.exceptions ?? 0}
              </div>
            </div>
          </div>
          <button className="nx-btn nx-btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/documents')}>
            Document workspace
          </button>
        </Panel>

        <Panel title="Fleet Composition" icon="layers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {(['OCEAN', 'AIR', 'ROAD', 'RAIL'] as const).map(m => {
              const count = modeMix[m];
              const pct = shipments.length > 0 ? (count / shipments.length) * 100 : 0;
              return (
                <div key={m}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 10 }}>
                    <ModeBadge mode={m} />
                    <span className="nx-mono" style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{count}</span>
                  </div>
                  <div className="nx-meter">
                    <div className="nx-meter-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Active Disruptions" icon="alert" flush>
          <div>
            {disruptions.length === 0 ? <Empty>No active disruptions</Empty> : disruptions.map((d: any) => (
              <div className="nx-signal" key={d.id}>
                <div className="nx-signal-icon" style={{ background: 'var(--nx-critical-dim)', color: 'var(--nx-critical)' }}>
                  <Glyph name="alert" size={12} />
                </div>
                <div className="nx-signal-body">
                  <div className="nx-signal-event">{d.location_name}</div>
                  <div className="nx-signal-meta">
                    {humanize(d.category)} · {d.potential_impact_hours_min}–{d.potential_impact_hours_max} h impact
                  </div>
                </div>
                <span className="nx-mono" style={{ fontSize: 12, fontWeight: 700, color: riskColor(d.severity === 'HIGH' ? 'HIGH' : 'MEDIUM') }}>
                  {d.affected_shipment_count ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
