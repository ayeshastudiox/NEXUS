import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDisruptions, getNetworkHubs, getShipments } from '../lib/api';
import AtlasMap from '../components/map/AtlasMap';
import {
  Badge, Empty, Glyph, KeyValue, Metric, ModeBadge, Panel, RiskPill, StateBlock,
  humanize, severityTone,
} from '../components/ui';
import { IconArrowRight } from '../components/Icons';

/** Great-circle distance in km — mirrors the backend hub-proximity heuristic. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** A shipment is considered to touch a hub if any real route vertex passes nearby. */
function shipmentTouchesHub(s: any, hub: any, thresholdKm = 600): boolean {
  const waypoints: number[][] = Array.isArray(s.route_waypoints) ? s.route_waypoints : [];
  return waypoints.some(
    wp => Array.isArray(wp) && wp.length >= 2 && haversineKm(wp[0], wp[1], hub.lat, hub.lng) < thresholdKm
  );
}

export default function NetworkIntelligence() {
  const navigate = useNavigate();

  const [hubs, setHubs] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, s, d] = await Promise.all([
        getNetworkHubs(),
        getShipments({ limit: '200' }),
        getDisruptions().catch(() => []),
      ]);
      setHubs(Array.isArray(h) ? h : []);
      setShipments(Array.isArray(s) ? s : []);
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
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const active = useMemo(
    () => shipments.filter(s => ['IN_TRANSIT', 'DELAYED', 'AT_PORT', 'AWAITING_CLEARANCE'].includes(s.status)),
    [shipments]
  );

  /** Per-hub metrics derived from real route geometry and real disruption records. */
  const hubStats = useMemo(() => {
    const map = new Map<number, { touching: any[]; disruptions: any[] }>();
    hubs.forEach(hub => {
      const touching = active.filter(s => shipmentTouchesHub(s, hub));
      const linked = disruptions.filter(d => haversineKm(d.lat, d.lng, hub.lat, hub.lng) < 600);
      map.set(hub.id, { touching, disruptions: linked });
    });
    return map;
  }, [hubs, active, disruptions]);

  const modeMix = useMemo(() => {
    const counts: Record<string, number> = { OCEAN: 0, AIR: 0, ROAD: 0, RAIL: 0 };
    shipments.forEach(s => {
      const m = (s.transport_mode || '').toUpperCase();
      if (m in counts) counts[m] += 1;
    });
    return counts;
  }, [shipments]);

  const hubTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    hubs.forEach(h => {
      const t = h.location_type || 'UNKNOWN';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts);
  }, [hubs]);

  const selectedStats = selected ? hubStats.get(selected.id) : undefined;

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading network intelligence" spinner />
      </div>
    );
  }

  if (failed && hubs.length === 0) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Network data unavailable"
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
          <div className="nx-eyebrow">Network Intelligence</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Global Hub &amp; Lane Analysis</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            {hubs.length} hubs · {active.length} active shipments · {disruptions.length} active disruptions
          </p>
        </div>
        <div className="nx-pills">
          <span className="nx-pill active">Atlas view</span>
        </div>
      </header>

      <div className="nx-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Metric
          label="Network hubs"
          value={hubs.length}
          note={hubTypes.map(([t, n]) => `${n} ${humanize(t)}`).slice(0, 2).join(' · ')}
          tone="teal"
        />
        <Metric label="Active shipments" value={active.length} note={`${shipments.length} total registered`} />
        <Metric
          label="Congested / disrupted"
          value={disruptions.length}
          note={disruptions.length > 0 ? 'lanes requiring attention' : 'all lanes clear'}
          tone={disruptions.length > 0 ? 'critical' : undefined}
        />
        <Metric
          label="High risk in network"
          value={active.filter(s => ['HIGH', 'CRITICAL'].includes((s.risk_level || '').toUpperCase())).length}
          note="across all modes"
          tone="high"
        />
      </div>

      {/* ---------- Immersive atlas ---------- */}
      <section className="atl-chrome atl-chrome--tall">
        <div className="atl-chrome-head">
          <span className="atl-chrome-title">
            <Glyph name="network" />
            Global Network Topology
          </span>
          <div className="nx-panel-actions">
            <Badge tone="teal">{active.length} live</Badge>
            {selected && (
              <button className="nx-btn nx-btn-sm nx-btn-ghost" onClick={() => setSelected(null)}>
                Clear selection
              </button>
            )}
          </div>
        </div>
        <AtlasMap
          shipments={active}
          hubs={hubs}
          disruptions={disruptions}
          mode="network"
          height={640}
          onOpenDossier={ref => navigate(`/shipments/${ref}`)}
        />
      </section>

      {/* ---------- Registers ---------- */}
      <div className="atl-split atl-split--even">
        <Panel title="Hub Register" icon="target" flush>
          <div className="nx-table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Hub</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Active shipments</th>
                  <th style={{ textAlign: 'right' }}>Disruptions</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {hubs.map(hub => {
                  const stats = hubStats.get(hub.id);
                  const touching = stats?.touching.length ?? 0;
                  const linked = stats?.disruptions.length ?? 0;
                  return (
                    <tr
                      key={hub.id}
                      className="clickable"
                      onClick={() => setSelected(hub)}
                      style={selected?.id === hub.id ? { background: 'var(--nx-surface-hover)' } : undefined}
                    >
                      <td className="cell-strong">{hub.name}</td>
                      <td><Badge tone="neutral">{humanize(hub.location_type)}</Badge></td>
                      <td className="cell-num">{touching}</td>
                      <td className="cell-num" style={{ color: linked > 0 ? 'var(--nx-critical)' : undefined }}>
                        {linked}
                      </td>
                      <td><IconArrowRight size={13} /></td>
                    </tr>
                  );
                })}
                {hubs.length === 0 && (
                  <tr><td colSpan={5}><Empty>No hubs configured</Empty></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Panel title="Mode Distribution" icon="layers">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {(['OCEAN', 'AIR', 'ROAD', 'RAIL'] as const).map(m => {
                const count = modeMix[m];
                const pct = shipments.length > 0 ? (count / shipments.length) * 100 : 0;
                return (
                  <div key={m}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <ModeBadge mode={m} />
                      <span className="nx-mono" style={{ fontSize: 12, fontWeight: 700 }}>{count}</span>
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
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {disruptions.length === 0 ? (
                <Empty>No active disruptions</Empty>
              ) : disruptions.map(d => (
                <div className="nx-signal" key={d.id}>
                  <div className="nx-signal-icon" style={{ background: 'var(--nx-critical-dim)', color: 'var(--nx-critical)' }}>
                    <Glyph name="alert" size={12} />
                  </div>
                  <div className="nx-signal-body">
                    <div className="nx-signal-event">{d.location_name}</div>
                    <div className="nx-signal-meta">
                      {humanize(d.category)} · {d.potential_impact_hours_min}–{d.potential_impact_hours_max}h impact
                    </div>
                  </div>
                  <Badge tone={severityTone(d.severity)}>{d.severity}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* ---------- Hub intelligence (from the register selection) ---------- */}
      {selected && (
        <Panel
          title={`${selected.name} — Hub Intelligence`}
          icon="target"
          actions={
            <>
              <Badge tone="neutral">{humanize(selected.location_type)}</Badge>
              <button className="nx-btn nx-btn-sm" onClick={() => setSelected(null)}>Close</button>
            </>
          }
        >
          <div className="nx-kv" style={{ marginBottom: 16 }}>
            <KeyValue
              label="Coordinates"
              value={
                selected.lat != null && selected.lng != null
                  ? `${Number(selected.lat).toFixed(3)}, ${Number(selected.lng).toFixed(3)}`
                  : '—'
              }
              mono
            />
            <KeyValue label="Active shipments" value={selectedStats?.touching.length ?? 0} mono />
            <KeyValue label="Linked disruptions" value={selectedStats?.disruptions.length ?? 0} mono />
            <KeyValue
              label="High risk touching"
              value={(selectedStats?.touching || [])
                .filter(s => ['HIGH', 'CRITICAL'].includes((s.risk_level || '').toUpperCase())).length}
              mono
            />
          </div>

          {selectedStats && selectedStats.touching.length > 0 ? (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Shipment</th>
                    <th>Route</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStats.touching.map(s => (
                    <tr key={s.id} className="clickable" onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                      <td className="cell-ref">{s.shipment_ref}</td>
                      <td className="cell-route">{s.origin_name} → {s.destination_name}</td>
                      <td><ModeBadge mode={s.transport_mode} /></td>
                      <td>{humanize(s.status)}</td>
                      <td style={{ textAlign: 'right' }}><RiskPill level={s.risk_level} score={s.risk_score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No active shipments route near this hub</Empty>
          )}
        </Panel>
      )}
    </div>
  );
}
