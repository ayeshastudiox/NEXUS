import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExceptions } from '../lib/api';
import {
  Badge, Empty, Metric, ModeBadge, Panel, RiskPill, StateBlock,
  humanize, riskColor, statusTone,
} from '../components/ui';
import { IconArrowRight, IconBolt } from '../components/Icons';

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const;
const POLL_MS = 30000;

/** Causes derived from the real flags the API returns per shipment. */
function causesFor(s: any): { label: string; tone: 'critical' | 'high' | 'warn' | 'neutral' }[] {
  const causes: { label: string; tone: 'critical' | 'high' | 'warn' | 'neutral' }[] = [];
  if (s.has_active_disruption) causes.push({ label: 'External disruption', tone: 'critical' });
  if (s.has_discrepancy) causes.push({ label: 'Document discrepancy', tone: 'high' });
  if (s.status === 'DELAYED') causes.push({ label: 'Schedule delay', tone: 'warn' });
  if ((s.documents_uploaded ?? 0) < (s.documents_total ?? 4)) causes.push({ label: 'Incomplete documents', tone: 'warn' });
  if (s.status === 'AWAITING_CLEARANCE') causes.push({ label: 'Customs clearance hold', tone: 'high' });
  if (causes.length === 0) causes.push({ label: 'Elevated risk score', tone: 'neutral' });
  return causes;
}

function recommended(s: any): string {
  if (s.has_active_disruption && s.has_discrepancy) {
    return 'Escalate to the carrier and reconcile documents before the shipment reaches customs.';
  }
  if (s.has_active_disruption) {
    return 'Confirm revised berthing or routing and communicate an updated ETA to stakeholders.';
  }
  if (s.has_discrepancy) {
    return 'Reconcile the flagged document values and re-verify declared quantities.';
  }
  if (s.status === 'DELAYED') {
    return 'Contact the carrier for a recovery plan and re-baseline the ETA.';
  }
  if ((s.documents_uploaded ?? 0) < (s.documents_total ?? 4)) {
    return 'Request the missing documentation from the shipper.';
  }
  return 'Continue monitoring; no immediate intervention required.';
}

export default function ExceptionCenter() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [severity, setSeverity] = useState<string>('ALL');

  const load = useCallback(async () => {
    try {
      const data = await getExceptions();
      setRows(Array.isArray(data) ? data : []);
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

  const ranked = useMemo(
    () => [...rows].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)),
    [rows]
  );

  const filtered = useMemo(
    () => (severity === 'ALL' ? ranked : ranked.filter(s => (s.risk_level || '').toUpperCase() === severity)),
    [ranked, severity]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
    rows.forEach(s => {
      const lv = (s.risk_level || '').toUpperCase();
      if (lv in c) c[lv] += 1;
    });
    return c;
  }, [rows]);

  const disruptionLinked = useMemo(() => rows.filter(s => s.has_active_disruption).length, [rows]);
  const docFlagged = useMemo(() => rows.filter(s => s.has_discrepancy).length, [rows]);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading exception center" spinner />
      </div>
    );
  }

  if (failed && rows.length === 0) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Exception feed unavailable"
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
          <div className="nx-eyebrow">Exception Center</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Operational Exceptions</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            {rows.length} shipments require attention, ranked by risk exposure.
          </p>
        </div>
        <div className="nx-pills">
          {SEVERITIES.map(s => (
            <button key={s} className={`nx-pill${severity === s ? ' active' : ''}`} onClick={() => setSeverity(s)}>
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
      </header>

      <div className="nx-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Metric label="Total exceptions" value={rows.length} note="shipments with active issues" tone="teal" />
        <Metric label="Critical" value={counts.CRITICAL} note="immediate intervention" tone="critical" />
        <Metric label="High risk" value={counts.HIGH} note="escalation advised" tone="high" />
        <Metric label="Disruption linked" value={disruptionLinked} note={`${docFlagged} with document flags`} tone="warn" />
      </div>

      {filtered.length === 0 ? (
        <Panel title="Exceptions" icon="alert">
          <Empty>No shipments match this severity filter</Empty>
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(s => {
            const causes = causesFor(s);
            const level = (s.risk_level || 'LOW').toUpperCase();
            const accent = riskColor(level);
            return (
              <article
                key={s.id}
                className="atl-exc"
                style={{ borderLeft: `2px solid ${accent}` }}
                onClick={() => navigate(`/shipments/${s.shipment_ref}`)}
              >
                <div className="atl-exc-body">
                  <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span className="atl-ref" style={{ fontSize: 14 }}>{s.shipment_ref}</span>
                      <ModeBadge mode={s.transport_mode} />
                      <Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge>
                    </div>
                    <div className="nx-body" style={{ marginTop: 5 }}>
                      {s.origin_name} → {s.destination_name}
                    </div>
                    <div className="nx-meta" style={{ marginTop: 2 }}>
                      {s.carrier}{s.company_name ? ` · ${s.company_name}` : ''}
                    </div>
                  </div>

                  <div style={{ flex: '1 1 340px', minWidth: 260 }}>
                    <div className="nx-label" style={{ marginBottom: 6 }}>Cause &amp; impact</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {causes.map(c => <Badge key={c.label} tone={c.tone}>{c.label}</Badge>)}
                    </div>
                    <div className="nx-meta" style={{ lineHeight: 1.55 }}>
                      <strong style={{ color: 'var(--nx-text-2)' }}>Recommended:</strong> {recommended(s)}
                    </div>
                  </div>

                  <div style={{ flex: '0 0 auto', display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="nx-label">Delay</div>
                      <div className="nx-mono" style={{ fontSize: 13, fontWeight: 700, color: (s.delay_hours || 0) > 0 ? 'var(--nx-warn)' : 'var(--nx-text-3)' }}>
                        {(s.delay_hours || 0) > 0 ? `+${s.delay_hours}h` : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="nx-label">Docs</div>
                      <div className="nx-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                        {s.documents_uploaded ?? 0}/{s.documents_total ?? 4}
                      </div>
                    </div>
                    <RiskPill level={s.risk_level} score={s.risk_score} />
                    <IconArrowRight size={15} />
                  </div>
                </div>

                <div className="atl-exc-strip">
                  <span className="nx-meta">
                    <IconBolt size={11} /> {causes.length} contributing condition{causes.length === 1 ? '' : 's'}
                  </span>
                  <span className="nx-meta">Progress {s.progress_percent ?? 0}%</span>
                  <span className="nx-meta">Latest: {s.latest_tracking?.location_name || 'unknown'}</span>
                  {s.has_discrepancy && (
                    <span className="nx-meta" style={{ color: 'var(--nx-high)' }}>Document review required</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
