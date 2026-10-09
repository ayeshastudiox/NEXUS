/**
 * NEXUS shared UI primitives.
 *
 * Every page composes these so spacing, borders, typography and risk colour
 * semantics stay identical across the product. No data lives here — pages pass
 * real backend values in.
 */
import type { ReactNode } from 'react';
import {
  IconAlert, IconBolt, IconCheck, IconClock, IconCommand, IconDocuments,
  IconInfo, IconIntelligence, IconLayers, IconNetwork, IconPackage, IconPlane,
  IconRisk, IconRoute, IconShield, IconShipments, IconTarget, IconTrain,
  IconTruck, IconWave, type IconProps,
} from './Icons';

/* ------------------------------------------------------------------
   Icon registry — lets pages reference icons by name (plain strings)
   without passing components through props.
   ------------------------------------------------------------------ */

const ICON_REGISTRY = {
  alert: IconAlert,
  bolt: IconBolt,
  check: IconCheck,
  clock: IconClock,
  command: IconCommand,
  documents: IconDocuments,
  info: IconInfo,
  intelligence: IconIntelligence,
  layers: IconLayers,
  network: IconNetwork,
  package: IconPackage,
  plane: IconPlane,
  risk: IconRisk,
  route: IconRoute,
  shield: IconShield,
  shipments: IconShipments,
  target: IconTarget,
  train: IconTrain,
  truck: IconTruck,
  wave: IconWave,
} satisfies Record<string, (p: IconProps) => ReactNode>;

export type IconName = keyof typeof ICON_REGISTRY;

export function Glyph({ name, size = 14 }: { name: IconName; size?: number }) {
  const Cmp = ICON_REGISTRY[name];
  return <Cmp size={size} />;
}

/* ------------------------------------------------------------------
   Risk / status semantics — single source of truth
   ------------------------------------------------------------------ */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function riskTone(level?: string): 'low' | 'medium' | 'high' | 'critical' {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'medium';
    default: return 'low';
  }
}

export function riskColor(level?: string): string {
  switch (riskTone(level)) {
    case 'critical': return 'var(--nx-critical)';
    case 'high': return 'var(--nx-high)';
    case 'medium': return 'var(--nx-warn)';
    default: return 'var(--nx-ok)';
  }
}

/** Status → badge tone. Mirrors the ShipmentStatus enum. */
export function statusTone(status?: string): 'neutral' | 'ok' | 'info' | 'warn' | 'high' {
  switch ((status || '').toUpperCase()) {
    case 'DELIVERED': return 'ok';
    case 'IN_TRANSIT': return 'info';
    case 'AT_PORT': return 'neutral';
    case 'DELAYED': return 'warn';
    case 'AWAITING_CLEARANCE': return 'high';
    default: return 'neutral';
  }
}

export function humanize(value?: string): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/** Disruption / alert severity → badge tone. */
export function severityTone(severity?: string): 'neutral' | 'ok' | 'info' | 'warn' | 'high' | 'critical' {
  switch ((severity || '').toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'warn';
    case 'LOW': return 'info';
    default: return 'neutral';
  }
}

/* ------------------------------------------------------------------
   Primitives
   ------------------------------------------------------------------ */

/**
 * Surface weight for a Panel.
 * - `panel`  standard intelligence panel
 * - `chrome` immersive console frame (map / heavy visualisation)
 * - `well`   recessed data block (comparison matrices, evidence)
 */
export type PanelVariant = 'panel' | 'chrome' | 'well';

const PANEL_SHELL: Record<PanelVariant, string> = {
  panel: 'nx-panel',
  chrome: 'atl-chrome',
  well: 'atl-well',
};

const PANEL_HEAD_CLASS: Record<PanelVariant, string> = {
  panel: 'nx-panel-head',
  chrome: 'atl-chrome-head',
  well: 'atl-well-head',
};

const PANEL_TITLE_CLASS: Record<PanelVariant, string> = {
  panel: 'nx-panel-title',
  chrome: 'atl-chrome-title',
  well: 'nx-panel-title',
};

export function Panel({
  title, icon, actions, children, bodyClassName, className, flush, variant = 'panel',
}: {
  title?: string;
  icon?: IconName;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  flush?: boolean;
  variant?: PanelVariant;
}) {
  const bodyClass = flush
    ? 'nx-panel-body-flush'
    : variant === 'well'
      ? `atl-well-pad ${bodyClassName || ''}`
      : `nx-panel-body ${bodyClassName || ''}`;

  return (
    <section className={`${PANEL_SHELL[variant]} ${className || ''}`}>
      {title && (
        <header className={PANEL_HEAD_CLASS[variant]}>
          <div className="nx-panel-head-left">
            {icon && <Glyph name={icon} />}
            <span className={PANEL_TITLE_CLASS[variant]}>{title}</span>
          </div>
          {actions && <div className="nx-panel-actions">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>
        {children}
      </div>
    </section>
  );
}

export function Badge({
  tone = 'neutral', children, large,
}: {
  tone?: 'neutral' | 'teal' | 'ok' | 'info' | 'warn' | 'high' | 'critical';
  children: ReactNode;
  large?: boolean;
}) {
  return <span className={`nx-badge nx-badge-${tone}${large ? ' nx-badge-lg' : ''}`}>{children}</span>;
}

export function RiskPill({ level, score }: { level?: string; score?: number | null }) {
  return (
    <span className={`nx-risk-pill nx-risk-${riskTone(level)}`}>
      <span className="nx-sev" style={{ background: riskColor(level) }} />
      {score != null ? `${score} · ${(level || 'LOW').toUpperCase()}` : (level || 'LOW').toUpperCase()}
    </span>
  );
}

/**
 * Metric accent tones. `riskTone()` returns low / medium / high / critical, so
 * those are accepted here and resolve to the established risk colours rather
 * than new tokens: medium → warn, low → ok.
 */
export type MetricTone = 'teal' | 'ok' | 'info' | 'warn' | 'high' | 'critical' | 'low' | 'medium';

const METRIC_TONE_VAR: Record<MetricTone, string> = {
  teal: 'var(--nx-teal)',
  ok: 'var(--nx-ok)',
  info: 'var(--nx-info)',
  warn: 'var(--nx-warn)',
  high: 'var(--nx-high)',
  critical: 'var(--nx-critical)',
  low: 'var(--nx-ok)',
  medium: 'var(--nx-warn)',
};

/** Compact metric for the dashboard strip. Deliberately not a large card. */
export function Metric({
  label, value, note, tone,
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: MetricTone;
}) {
  const color = tone ? METRIC_TONE_VAR[tone] : undefined;
  return (
    <div className="nx-metric">
      {tone && <span className="nx-metric-accent" style={{ background: color }} />}
      <div className="nx-metric-label">{label}</div>
      <div className="nx-metric-value" style={color ? { color } : undefined}>{value}</div>
      {note && <div className="nx-metric-note">{note}</div>}
    </div>
  );
}

export function KeyValue({
  label, value, mono, muted,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="nx-kv-item">
      <div className="nx-kv-label">{label}</div>
      <div className={`nx-kv-value${mono ? ' mono' : ''}${muted ? ' muted' : ''}`}>{value}</div>
    </div>
  );
}

export function Meter({ pct, tone }: { pct: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="nx-meter">
      <div className="nx-meter-fill" style={{ width: `${clamped}%`, background: tone }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="nx-empty">{children}</div>;
}

export function StateBlock({
  title, text, action, spinner,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  spinner?: boolean;
}) {
  return (
    <div className="nx-center-state">
      {spinner && <div className="nx-spinner" />}
      <div className="nx-state-title">{title}</div>
      {text && <div className="nx-state-text">{text}</div>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------
   Transport mode
   ------------------------------------------------------------------ */

const MODE_ICON: Record<string, IconName> = {
  OCEAN: 'wave',
  AIR: 'plane',
  ROAD: 'truck',
  RAIL: 'train',
};

const MODE_COLOR: Record<string, string> = {
  OCEAN: 'var(--nx-info)',
  AIR: '#a78bfa',
  ROAD: 'var(--nx-ok)',
  RAIL: 'var(--nx-warn)',
};

export function ModeBadge({ mode }: { mode?: string }) {
  const key = (mode || '').toUpperCase();
  const color = MODE_COLOR[key] || 'var(--nx-text-3)';
  return (
    <span
      className="nx-badge"
      style={{ background: 'transparent', borderColor: color, color }}
    >
      <Glyph name={MODE_ICON[key] || 'package'} size={11} />
      {key || 'N/A'}
    </span>
  );
}

/* ------------------------------------------------------------------
   Charts
   ------------------------------------------------------------------ */

/** Risk score dial. `score` is 0-100 from the risk engine. */
export function ScoreDial({ score, level, size = 104 }: { score: number; level?: string; size?: number }) {
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const bounded = Math.max(0, Math.min(100, score));
  const offset = circumference - (bounded / 100) * circumference;
  const color = riskColor(level);

  return (
    <div className="nx-dial" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--nx-surface-4)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div className="nx-dial-center">
        <span className="nx-dial-score" style={{ color }}>{bounded}</span>
        <span className="nx-dial-of">/ 100</span>
      </div>
    </div>
  );
}

/** Deterministic bar series — value/100 scaled, no random data. */
export function BarSeries({
  items, tone = 'var(--nx-teal)',
}: {
  items: { label: string; value: number }[];
  tone?: string;
}) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--nx-text-2)' }}>{item.label}</span>
            <span className="nx-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--nx-text-1)' }}>
              {item.value}
            </span>
          </div>
          <div className="nx-meter">
            <div
              className="nx-meter-fill"
              style={{ width: `${(item.value / max) * 100}%`, background: tone }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
