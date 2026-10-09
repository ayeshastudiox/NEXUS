import { useMemo, useState } from 'react';
import { getContinents, project, HUB_POSITIONS } from '../data/worldPaths';

const W = 1200;
const H = 600;

/* ------------------------------------------------------------------
   Geometry helpers
   ------------------------------------------------------------------ */

function arcPath(x1: number, y1: number, x2: number, y2: number, curv = 0.18): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const c = Math.min(dist * curv, 60);
  const nx = (-dy / dist) * c;
  const ny = (dx / dist) * c;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx + nx).toFixed(1)},${(my + ny).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

/**
 * Seeded hub names carry a facility suffix ("Rotterdam Port", "Dubai Airport")
 * while HUB_POSITIONS is keyed by city name. Normalise before lookup so hub
 * anchors resolve instead of silently returning null.
 */
function hubKey(name?: string): string | null {
  if (!name) return null;
  if (HUB_POSITIONS[name]) return name;
  const stripped = name.replace(/\s+(Port|Airport|Checkpoint|Station|Terminal)$/i, '').trim();
  if (HUB_POSITIONS[stripped]) return stripped;
  const partial = Object.keys(HUB_POSITIONS).find(
    k => name.toLowerCase().includes(k.toLowerCase()) || stripped.toLowerCase().includes(k.toLowerCase())
  );
  return partial ?? null;
}

function anchorFor(name?: string, lat?: number, lng?: number): [number, number] | null {
  const key = hubKey(name);
  if (key) {
    const pos = HUB_POSITIONS[key];
    return project(pos[0], pos[1], W, H);
  }
  if (typeof lat === 'number' && typeof lng === 'number') {
    return project(lng, lat, W, H);
  }
  return null;
}

/* ------------------------------------------------------------------
   Risk styling
   ------------------------------------------------------------------ */

type Tone = { stroke: string; opacity: number; width: number; dash?: string; particle: string };

function routeTone(level: string, status: string): Tone {
  const lv = (level || '').toUpperCase();
  if (lv === 'CRITICAL') {
    return { stroke: '#f43f5e', opacity: 0.85, width: 1.5, particle: '#fda4af' };
  }
  if (lv === 'HIGH') {
    return { stroke: '#fb923c', opacity: 0.8, width: 1.4, particle: '#fdba74' };
  }
  if (lv === 'MEDIUM') {
    return { stroke: '#fbbf24', opacity: 0.6, width: 1.2, particle: '#fde68a' };
  }
  if (status === 'DELAYED') {
    return { stroke: '#fbbf24', opacity: 0.5, width: 1, dash: '5 4', particle: '#fde68a' };
  }
  return { stroke: '#2dd4bf', opacity: 0.4, width: 1, particle: '#5eead4' };
}

function markerColor(level: string, status: string): string {
  const lv = (level || '').toUpperCase();
  if (lv === 'CRITICAL') return '#f43f5e';
  if (lv === 'HIGH') return '#fb923c';
  if (lv === 'MEDIUM') return '#fbbf24';
  if (status === 'DELAYED') return '#fbbf24';
  return '#2dd4bf';
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

interface Props {
  shipments: any[];
  hubs: any[];
  disruptions?: any[];
  width?: string;
  height?: string;
  showLabels?: boolean;
  showStats?: boolean;
  interactive?: boolean;
  onSelectShipment?: (ref: string) => void;
  onSelectHub?: (hub: any) => void;
}

export default function WorldVisualization({
  shipments,
  hubs,
  disruptions = [],
  width = '100%',
  height = '100%',
  showLabels = true,
  showStats = true,
  interactive = true,
  onSelectShipment,
  onSelectHub,
}: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const continents = useMemo(() => getContinents(W, H), []);

  const active = useMemo(
    () => (shipments || []).filter(s => s.status !== 'DELIVERED'),
    [shipments]
  );

  /** Per-shipment geometry, derived from real route_waypoints. */
  const routes = useMemo(() => {
    return active.map(s => {
      const wp: number[][] = Array.isArray(s.route_waypoints) ? s.route_waypoints : [];
      const points = wp
        .filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .map(p => project(p[1], p[0], W, H));

      let pts = points;
      if (pts.length < 2) {
        const a = anchorFor(s.origin_name, s.origin_lat, s.origin_lng);
        const b = anchorFor(s.destination_name, s.destination_lat, s.destination_lng);
        pts = a && b ? [a, b] : [];
      }
      if (pts.length < 2) return null;

      const latest = s.latest_tracking;
      const current = latest && Number.isFinite(latest.lat) && Number.isFinite(latest.lng)
        ? project(latest.lng, latest.lat, W, H)
        : pts[0];

      return { s, pts, current, tone: routeTone(s.risk_level, s.status) };
    }).filter(Boolean) as {
      s: any; pts: [number, number][]; current: [number, number]; tone: Tone;
    }[];
  }, [active]);

  /** Hubs anchored from real hub records; unanchored ones fall back to their own coords. */
  const hubNodes = useMemo(() => {
    return (hubs || []).map(h => {
      const xy = anchorFor(h.name, h.lat, h.lng);
      if (!xy) return null;
      const disruptionCount = Array.isArray(h.active_disruptions) ? h.active_disruptions.length : 0;
      return { ...h, x: xy[0], y: xy[1], disruptionCount };
    }).filter(Boolean) as any[];
  }, [hubs]);

  /** Disruption rings anchored from real disruption records. */
  const disruptionNodes = useMemo(() => {
    return (disruptions || []).map(d => {
      const xy = anchorFor(d.location_name, d.lat, d.lng);
      if (!xy) return null;
      const severe = ['HIGH', 'CRITICAL'].includes((d.severity || '').toUpperCase());
      return { ...d, x: xy[0], y: xy[1], severe };
    }).filter(Boolean) as any[];
  }, [disruptions]);

  const labelledHubs = useMemo(
    () => hubNodes.filter(h => (h.active_shipments || 0) >= 2 || h.disruptionCount > 0).slice(0, 10),
    [hubNodes]
  );

  const stats = useMemo(() => {
    const high = active.filter(s => ['HIGH', 'CRITICAL'].includes((s.risk_level || '').toUpperCase())).length;
    const delayed = active.filter(s => s.status === 'DELAYED').length;
    return { shipments: active.length, high, delayed, hubs: hubNodes.length, disruptions: disruptionNodes.length };
  }, [active, hubNodes, disruptionNodes]);

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', background: 'var(--nx-bg-deep)' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Global network map showing ${stats.shipments} active shipments and ${stats.hubs} hubs`}
      >
        <defs>
          <radialGradient id="nxHubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nxHubGlowAlert" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nxVignette" cx="50%" cy="50%" r="68%">
            <stop offset="60%" stopColor="#05070a" stopOpacity="0" />
            <stop offset="100%" stopColor="#05070a" stopOpacity="0.75" />
          </radialGradient>
          <filter id="nxSoftGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="#05070a" />

        {/* Graticule */}
        <g opacity="0.05">
          {Array.from({ length: 11 }, (_, i) => {
            const x = ((i * 36) / 360) * W;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#4b5563" strokeWidth="0.5" />;
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const y = ((i * 36) / 180) * H;
            return <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#4b5563" strokeWidth="0.5" />;
          })}
        </g>

        {/* Landmasses */}
        <g>
          {continents.map((poly, i) => (
            <polygon
              key={i}
              points={poly}
              fill="#111826"
              stroke="#22304a"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Routes */}
        <g>
          {routes.map(({ s, pts, tone }) => {
            const focused = hover === s.shipment_ref;
            const d = pts.length === 2
              ? arcPath(pts[0][0], pts[0][1], pts[1][0], pts[1][1])
              : `M${pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')}`;

            return (
              <g
                key={s.shipment_ref}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onMouseEnter={() => setHover(s.shipment_ref)}
                onMouseLeave={() => setHover(null)}
                onClick={() => interactive && onSelectShipment?.(s.shipment_ref)}
              >
                <path
                  d={d}
                  fill="none"
                  stroke={tone.stroke}
                  strokeWidth={focused ? tone.width + 0.9 : tone.width}
                  opacity={focused ? 1 : tone.opacity}
                  strokeDasharray={tone.dash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: 'opacity 0.15s, stroke-width 0.15s' }}
                />
                {/* Flow particles along the lane */}
                <path
                  d={d}
                  fill="none"
                  stroke={tone.particle}
                  strokeWidth={tone.width + 1.1}
                  opacity={focused ? 0.7 : 0.32}
                  strokeDasharray="1.5 26"
                  strokeLinecap="round"
                  style={{ animation: 'nx-route-dash 14s linear infinite' }}
                />
              </g>
            );
          })}
        </g>

        {/* Disruption rings */}
        <g>
          {disruptionNodes.map((d, i) => (
            <g key={`dis-${d.id ?? i}`}>
              <circle cx={d.x} cy={d.y} r="14" fill={d.severe ? 'url(#nxHubGlowAlert)' : 'url(#nxHubGlow)'} />
              <circle cx={d.x} cy={d.y} r="6" fill="none" stroke="#f43f5e" strokeWidth="0.7" opacity="0.7">
                <animate attributeName="r" values="4;15;4" dur="3.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="3.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={d.x} cy={d.y} r="2.2" fill="#f43f5e" />
            </g>
          ))}
        </g>

        {/* Hub nodes */}
        <g>
          {hubNodes.map(h => {
            const alert = h.disruptionCount > 0;
            const active1 = (h.active_shipments || 0) > 0;
            const focused = hover === h.name;
            return (
              <g
                key={`hub-${h.id ?? h.name}`}
                style={{ cursor: interactive && onSelectHub ? 'pointer' : 'default' }}
                onMouseEnter={() => setHover(h.name)}
                onMouseLeave={() => setHover(null)}
                onClick={() => interactive && onSelectHub?.(h)}
              >
                {alert && <circle cx={h.x} cy={h.y} r={focused ? 17 : 13} fill="url(#nxHubGlowAlert)" />}
                <circle cx={h.x} cy={h.y} r="3.4" fill={alert ? '#f43f5e' : active1 ? '#2dd4bf' : '#334155'} opacity={active1 || alert ? 0.95 : 0.5} />
                <circle
                  cx={h.x} cy={h.y} r={focused ? 7 : 5.5}
                  fill="none"
                  stroke={alert ? '#f43f5e' : '#2dd4bf'}
                  strokeWidth="0.6"
                  opacity={focused ? 0.8 : 0.35}
                />
              </g>
            );
          })}
        </g>

        {/* Live shipment positions */}
        <g filter="url(#nxSoftGlow)">
          {routes.map(({ s, current, tone }) => {
            const focused = hover === s.shipment_ref;
            const color = markerColor(s.risk_level, s.status);
            return (
              <g key={`pos-${s.shipment_ref}`}>
                <circle cx={current[0]} cy={current[1]} r="3.1" fill={color} />
                <circle cx={current[0]} cy={current[1]} r="3.1" fill="none" stroke={tone.particle} strokeWidth="0.7" opacity="0.85">
                  <animate attributeName="r" values="3;9;3" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.85;0;0.85" dur="2.8s" repeatCount="indefinite" />
                </circle>
                {focused && (
                  <text
                    x={current[0] + 7} y={current[1] + 3}
                    fill="#eef1f7" fontSize="8.5" fontFamily="IBM Plex Mono, monospace" fontWeight="600"
                  >
                    {s.shipment_ref}
                  </text>
                )}
                <title>{`${s.shipment_ref} — ${s.origin_name} → ${s.destination_name}`}</title>
              </g>
            );
          })}
        </g>

        {/* Hub labels */}
        {showLabels && (
          <g>
            {labelledHubs.map(h => (
              <text
                key={`lbl-${h.id ?? h.name}`}
                x={h.x + 7} y={h.y + 3}
                fill="#8b95a8" fontSize="6.8"
                fontFamily="Inter, system-ui, sans-serif" fontWeight="500"
                letterSpacing="0.02em"
              >
                {h.name}
              </text>
            ))}
          </g>
        )}

        <rect width={W} height={H} fill="url(#nxVignette)" pointerEvents="none" />
      </svg>

      {showStats && (
        <div className="nx-map-stats">
          <div className="nx-map-stat">
            <span className="nx-map-stat-label">Active</span>
            <span className="nx-map-stat-value">{stats.shipments}</span>
          </div>
          <div className="nx-map-stat">
            <span className="nx-map-stat-label">High risk</span>
            <span className="nx-map-stat-value" style={{ color: stats.high > 0 ? 'var(--nx-high)' : undefined }}>
              {stats.high}
            </span>
          </div>
          <div className="nx-map-stat">
            <span className="nx-map-stat-label">Delayed</span>
            <span className="nx-map-stat-value" style={{ color: stats.delayed > 0 ? 'var(--nx-warn)' : undefined }}>
              {stats.delayed}
            </span>
          </div>
          <div className="nx-map-stat">
            <span className="nx-map-stat-label">Hubs</span>
            <span className="nx-map-stat-value">{stats.hubs}</span>
          </div>
          <div className="nx-map-stat">
            <span className="nx-map-stat-label">Alerts</span>
            <span className="nx-map-stat-value" style={{ color: stats.disruptions > 0 ? 'var(--nx-critical)' : undefined }}>
              {stats.disruptions}
            </span>
          </div>
        </div>
      )}

      <div className="nx-map-legend">
        <span className="nx-legend-item"><span className="nx-legend-line" style={{ background: '#2dd4bf' }} />Normal</span>
        <span className="nx-legend-item"><span className="nx-legend-line" style={{ background: '#fbbf24' }} />Warning</span>
        <span className="nx-legend-item"><span className="nx-legend-line" style={{ background: '#fb923c' }} />High</span>
        <span className="nx-legend-item"><span className="nx-legend-line" style={{ background: '#f43f5e' }} />Critical</span>
        <span className="nx-legend-item"><span className="nx-legend-dot" style={{ background: '#f43f5e' }} />Disruption</span>
      </div>
    </div>
  );
}
