import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlerts, getDisruptions, getNetworkHubs, getShipments } from '../lib/api';
import AtlasMap from '../components/map/AtlasMap';
import {
  Badge, Empty, Glyph, Metric, ModeBadge, Panel, RiskPill, StateBlock,
  humanize, severityTone, statusTone,
} from '../components/ui';
import { IconArrowRight } from '../components/Icons';
import { deriveSignals, signalTime } from '../lib/signals';

const MODES = ['ALL', 'OCEAN', 'AIR', 'ROAD', 'RAIL'] as const;
const ACTIVE_STATUSES = ['IN_TRANSIT', 'DELAYED', 'AT_PORT', 'AWAITING_CLEARANCE'];
const POLL_MS = 30000;

export default function CommandCenter() {
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [mode, setMode] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a, h, d] = await Promise.all([
        getShipments({ limit: '200' }),
        getAlerts().catch(() => []),
        getNetworkHubs().catch(() => []),
        getDisruptions().catch(() => []),
      ]);
      setShipments(Array.isArray(s) ? s : []);
      setAlerts(Array.isArray(a) ? a : []);
      setHubs(Array.isArray(h) ? h : []);
      setDisruptions(Array.isArray(d) ? d : []);
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

  const filtered = useMemo(
    () => (mode === 'ALL' ? shipments : shipments.filter(s => (s.transport_mode || '').toUpperCase() === mode)),
    [shipments, mode]
  );

  const active = useMemo(
    () => filtered.filter(s => ACTIVE_STATUSES.includes(s.status)),
    [filtered]
  );

  const ranked = useMemo(
    () => [...filtered].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)),
    [filtered]
  );

  const signals = useMemo(() => deriveSignals(alerts, shipments), [alerts, shipments]);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Bringing command center online" spinner />
      </div>
    );
  }

  if (failed && shipments.length === 0) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Command center unavailable"
          text="The NEXUS API did not respond."
          action={<button className="nx-btn nx-btn-primary" onClick={load}>Retry</button>}
        />
      </div>
    );
  }

  return (
    <div className="nx-page">
      <header className="atl-hero">
        <div className="atl-hero-main">
          <div className="nx-eyebrow">Command Center</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Live Operations Monitoring</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            {active.length} active movements · {disruptions.length} disruptions in scope · refreshing every 30s
          </p>
        </div>
        <div className="nx-pills">
          {MODES.map(m => (
            <button key={m} className={`nx-pill${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
              {m === 'ALL' ? 'All modes' : m}
            </button>
          ))}
        </div>
      </header>

      <div className="nx-metrics">
        <Metric label="In scope" value={filtered.length} note={mode === 'ALL' ? 'all transport modes' : `${mode} only`} tone="teal" />
        <Metric label="Active" value={active.length} note="in transit or awaiting" />
        <Metric
          label="Delayed"
          value={filtered.filter(s => s.status === 'DELAYED').length}
          note="schedule variance"
          tone="warn"
        />
        <Metric
          label="High risk"
          value={filtered.filter(s => ['HIGH', 'CRITICAL'].includes((s.risk_level || '').toUpperCase())).length}
          note="escalation advised"
          tone="high"
        />
        <Metric
          label="Disruptions"
          value={disruptions.length}
          note={disruptions.length > 0 ? disruptions.map((d: any) => d.location_name).join(', ') : 'lanes clear'}
          tone={disruptions.length > 0 ? 'critical' : undefined}
        />
      </div>

      {/* ---- Live map + verified alerts ---- */}
      <div className="atl-split atl-split--map">
        <section className="atl-chrome atl-chrome--tall">
          <div className="atl-chrome-head">
            <span className="atl-chrome-title">
              <Glyph name="command" />
              Live Network Map
            </span>
            <div className="nx-panel-actions">
              <Badge tone="teal">{active.length} live</Badge>
            </div>
          </div>
          <AtlasMap
            shipments={active}
            hubs={hubs}
            disruptions={disruptions}
            mode="network"
            height={520}
            onOpenDossier={ref => navigate(`/shipments/${ref}`)}
          />
        </section>

        <Panel
          title="Live Alerts"
          icon="bolt"
          flush
          actions={<Badge tone={signals.length > 0 ? 'critical' : 'ok'}>{signals.length}</Badge>}
        >
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {signals.length === 0 ? <Empty>No active alerts</Empty> : (
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

      {/* ---- Movements + disruption watch ---- */}
      <div className="atl-split atl-split--even">
        <Panel
          title={`Shipments in scope — ${filtered.length}`}
          icon="shipments"
          flush
          actions={<button className="nx-btn nx-btn-sm nx-btn-ghost" onClick={() => navigate('/shipments')}>Full registry</button>}
        >
          <div className="nx-table-wrap" style={{ maxHeight: 440, overflowY: 'auto' }}>
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Lane</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Delay</th>
                  <th style={{ textAlign: 'right' }}>Risk</th>
                  <th style={{ width: 34 }} />
                </tr>
              </thead>
              <tbody>
                {ranked.map(s => (
                  <tr key={s.id} className="clickable" onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                    <td className="cell-ref">{s.shipment_ref}</td>
                    <td className="cell-route">{s.origin_name} → {s.destination_name}</td>
                    <td><ModeBadge mode={s.transport_mode} /></td>
                    <td><Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge></td>
                    <td className="nx-mono" style={{ fontSize: 11, color: (s.delay_hours || 0) > 0 ? 'var(--nx-warn)' : undefined }}>
                      {(s.delay_hours || 0) > 0 ? `+${s.delay_hours}h` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}><RiskPill level={s.risk_level} score={s.risk_score} /></td>
                    <td><IconArrowRight size={13} /></td>
                  </tr>
                ))}
                {ranked.length === 0 && <tr><td colSpan={7}><Empty>No shipments in this mode</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Disruption Watch" icon="alert" flush>
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {disruptions.length === 0 ? <Empty>No active disruptions</Empty> : disruptions.map((d: any) => {
              const color = d.severity === 'HIGH' ? 'var(--nx-critical)' : 'var(--nx-warn)';
              return (
                <div className="nx-signal" key={d.id}>
                  <div className="nx-signal-icon" style={{ background: `${color}1f`, color }}>
                    <Glyph name="alert" size={12} />
                  </div>
                  <div className="nx-signal-body">
                    <div className="nx-signal-event">{d.location_name}</div>
                    <div className="nx-signal-meta">{humanize(d.category)}</div>
                    <div className="nx-signal-meta" style={{ marginTop: 4 }}>
                      <Badge tone={severityTone(d.severity)}>{d.severity}</Badge>
                      <span className="nx-mono" style={{ fontSize: 10, marginLeft: 6 }}>
                        {d.potential_impact_hours_min}–{d.potential_impact_hours_max}h
                      </span>
                    </div>
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
