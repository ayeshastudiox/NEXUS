import { useMemo } from 'react';
import { getContinents, project, HUB_POSITIONS } from '../data/worldPaths';

const W = 1200;
const H = 600;

function arcPath(x1: number, y1: number, x2: number, y2: number, curv = 0.2): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const c = Math.min(dist * curv, 70);
  const nx = -dy / dist * c;
  const ny = dx / dist * c;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx + nx).toFixed(1)},${(my + ny).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

function hubXY(name: string): [number, number] | null {
  const pos = HUB_POSITIONS[name];
  if (!pos) return null;
  return project(pos[0], pos[1], W, H);
}

function routeStyle(level: string, status: string) {
  if (level === 'CRITICAL' || level === 'HIGH') return { stroke: '#ef4444', opacity: 0.5, width: 1.2, dash: undefined };
  if (status === 'DELAYED') return { stroke: '#eab308', opacity: 0.35, width: 1, dash: '5 4' };
  return { stroke: '#334155', opacity: 0.15, width: 0.7, dash: '3 4' };
}

interface Props {
  shipments: any[];
  hubs: any[];
  disruptions?: any[];
  width?: string;
  height?: string;
  style?: React.CSSProperties;
  showLabels?: boolean;
}

export default function WorldVisualization({ shipments, hubs, disruptions = [], width = '100%', height = '100%', style, showLabels = true }: Props) {
  const continents = useMemo(() => getContinents(W, H), []);

  const active = useMemo(() =>
    shipments.filter(s => s.route_waypoints && s.route_waypoints.length > 1 && s.status !== 'DELIVERED'),
    [shipments]
  );

  const hubNodes = useMemo(() =>
    hubs.filter(h => h.lat && h.lng).map(h => ({
      ...h,
      x: project(h.lng, h.lat, W, H)[0],
      y: project(h.lng, h.lat, W, H)[1],
    })),
    [hubs]
  );

  const disruptionPts = useMemo(() =>
    disruptions.map((d: any) => {
      const pos = HUB_POSITIONS[d.location_name];
      if (!pos) return null;
      const [x, y] = project(pos[0], pos[1], W, H);
      return { ...d, x, y };
    }).filter(Boolean),
    [disruptions]
  );

  // Only label hubs with meaningful activity
  const labeledHubs = useMemo(() =>
    hubNodes.filter(h => (h.active_shipments || 0) > 3 || (h.active_disruptions?.length || 0) > 0),
    [hubNodes]
  );

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', background: '#08090d', ...style }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="hg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hg-r" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vig" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#08090d" stopOpacity="0.5" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="1.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <rect width={W} height={H} fill="#08090d" />

        {/* Grid — barely visible */}
        <g opacity="0.03">
          {Array.from({ length: 12 }, (_, i) => {
            const x = ((i * 30 + 30) / 360) * W;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#475569" strokeWidth="0.4" />;
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const y = ((i * 30 + 30) / 180) * H;
            return <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#475569" strokeWidth="0.4" />;
          })}
        </g>

        {/* Continents */}
        <g>
          {continents.map((path, i) => (
            <polygon key={i} points={path} fill="#0d1520" stroke="#162840" strokeWidth="0.5" strokeLinejoin="round" />
          ))}
        </g>

        {/* Routes */}
        <g>
          {active.map(s => {
            const wp = s.route_waypoints || [];
            const origin = hubXY(s.origin_name);
            const dest = hubXY(s.destination_name);
            if (!origin && !dest && wp.length < 2) return null;

            const pts = wp.length >= 2
              ? wp.map((w: number[]) => project(w[1], w[0], W, H))
              : origin && dest ? [origin, dest] : null;
            if (!pts || pts.length < 2) return null;

            const rs = routeStyle(s.risk_level || 'LOW', s.status || '');

            return (
              <g key={s.id || s.shipment_ref}>
                {pts.length === 2 ? (
                  <path d={arcPath(pts[0][0], pts[0][1], pts[1][0], pts[1][1])} fill="none" stroke={rs.stroke} strokeWidth={rs.width} opacity={rs.opacity} strokeDasharray={rs.dash} strokeLinecap="round" />
                ) : (
                  <polyline points={pts.map((p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} fill="none" stroke={rs.stroke} strokeWidth={rs.width} opacity={rs.opacity} strokeDasharray={rs.dash} strokeLinecap="round" strokeLinejoin="round" />
                )}
              </g>
            );
          })}
        </g>

        {/* Hub glows */}
        <g>
          {hubNodes.map(h => {
            const dis = (h.active_disruptions?.length || 0) > 0;
            const act = (h.active_shipments || 0) > 0;
            if (!act && !dis) return null;
            return <circle key={`g-${h.id || h.name}`} cx={h.x} cy={h.y} r={dis ? 16 : 12} fill={dis ? 'url(#hg-r)' : 'url(#hg)'} />;
          })}
        </g>

        {/* Hub dots */}
        <g filter="url(#glow)">
          {hubNodes.map(h => {
            const dis = (h.active_disruptions?.length || 0) > 0;
            const act = (h.active_shipments || 0) > 0;
            const r = dis ? 3.5 : Math.max(1.8, Math.min(4, 1.8 + (h.active_shipments || 0) / 12));
            return (
              <circle key={h.id || h.name} cx={h.x} cy={h.y} r={r}
                fill={dis ? '#ef4444' : act ? '#3b82f6' : '#1e293b'}
                stroke={dis ? '#ef4444' : act ? '#60a5fa' : '#334155'}
                strokeWidth="0.4"
                opacity={act || dis ? 1 : 0.25}
              />
            );
          })}
        </g>

        {/* Hub labels — minimal */}
        {showLabels && (
          <g>
            {labeledHubs.map(h => (
              <text key={`l-${h.id || h.name}`} x={h.x + 6} y={h.y + 3} fill="#5e6478" fontSize="6.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="500" letterSpacing="0.02em">
                {h.name}
              </text>
            ))}
          </g>
        )}

        {/* Disruption pulses */}
        <g>
          {disruptionPts.map((d: any, i) => (
            <circle key={`d-${i}`} cx={d.x} cy={d.y} r="5" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.2">
              <animate attributeName="r" values="3;12;3" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* Shipment position dots */}
        <g>
          {active.slice(0, 14).map((s, i) => {
            const wp = s.route_waypoints || [];
            if (wp.length < 2) return null;
            const mid = wp[Math.floor(wp.length / 2)];
            if (!mid) return null;
            const [cx, cy] = project(mid[1], mid[0], W, H);
            const hi = s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL';
            return (
              <circle key={`s-${s.id || i}`} cx={cx} cy={cy} r="1.5" fill={hi ? '#ef4444' : '#60a5fa'} opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur={`${2.5 + (i % 3)}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
        </g>

        {/* Vignette */}
        <rect width={W} height={H} fill="url(#vig)" />
      </svg>
    </div>
  );
}
