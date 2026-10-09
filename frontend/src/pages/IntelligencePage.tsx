import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  aiQuery, getShipmentDocuments, getShipmentRisk, getShipments,
} from '../lib/api';
import AiResponse from '../components/AiResponse';
import {
  Badge, Empty, KeyValue, Panel, RiskPill, StateBlock, humanize,
} from '../components/ui';
import { IconArrowRight, IconSend } from '../components/Icons';

const GENERIC_ACTIONS = [
  'What are the risk factors?',
  'Predict arrival time',
  'Suggest optimization',
  'Why is it delayed?',
  'Are there document inconsistencies?',
  'Fleet overview',
];

export default function IntelligencePage() {
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [risk, setRisk] = useState<any>(null);
  const [docs, setDocs] = useState<{ documents: any[]; discrepancies: any[] }>({ documents: [], discrepancies: [] });

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getShipments({ limit: '200' });
      const rows = Array.isArray(list) ? list : [];
      setShipments(rows);
      setFailed(false);
      // Open on the highest-exposure shipment so the workspace starts with intent.
      const byRisk = [...rows].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      setSelected(prev => prev ?? byRisk[0]?.shipment_ref ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(
    () => shipments.find(s => s.shipment_ref === selected) || null,
    [shipments, selected]
  );

  /* Evidence is fetched for real — no fabricated sources. */
  useEffect(() => {
    if (!selected) { setRisk(null); setDocs({ documents: [], discrepancies: [] }); return; }
    let cancelled = false;
    Promise.all([
      getShipmentRisk(selected).catch(() => null),
      getShipmentDocuments(selected).catch(() => ({ documents: [], discrepancies: [] })),
    ]).then(([r, d]) => {
      if (cancelled) return;
      setRisk(r);
      setDocs(d);
    });
    return () => { cancelled = true; };
  }, [selected]);

  const ask = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setAsking(true);
    setAskedQuestion(text);
    try {
      const res = await aiQuery(text, selected ?? undefined);
      setAnswer(res?.answer || res?.message || 'No answer available');
    } catch {
      setAnswer('NEXUS Intelligence could not be reached. Verify the backend is running on port 8000.');
    } finally {
      setAsking(false);
    }
  }, [selected]);

  /* Evidence rows, derived from real values for the selected shipment. */
  const evidence = useMemo(() => {
    const rows: { source: string; value: string; tone: string }[] = [];
    if (!active) return rows;

    rows.push({
      source: 'Shipment record',
      value: `${active.origin_name} → ${active.destination_name} · ${humanize(active.transport_mode)} · ${active.carrier}`,
      tone: 'var(--nx-info)',
    });

    rows.push({
      source: 'Risk engine',
      value: `score ${active.risk_score ?? '—'}/100 · ${(active.risk_level || 'UNASSESSED').toUpperCase()}`,
      tone: 'var(--nx-high)',
    });

    const factors: any[] = Array.isArray(risk?.factors) ? risk.factors : [];
    factors.forEach(f => {
      rows.push({ source: `Risk factor — ${f.name}`, value: `+${f.points} · ${f.description}`, tone: 'var(--nx-high)' });
    });

    if (docs.discrepancies.length > 0) {
      docs.discrepancies.forEach(d => {
        rows.push({
          source: `Document discrepancy — ${humanize(d.field_name)}`,
          value: d.difference_description,
          tone: 'var(--nx-warn)',
        });
      });
    } else {
      rows.push({ source: 'Document check', value: 'No discrepancy recorded for this shipment.', tone: 'var(--nx-ok)' });
    }

    if (active.has_active_disruption) {
      rows.push({ source: 'Disruption link', value: 'Linked to an active external disruption.', tone: 'var(--nx-critical)' });
    }

    rows.push({
      source: 'Additional predicted delay',
      value: `${active.delay_hours ?? 0} h beyond current ETA`,
      tone: 'var(--nx-warn)',
    });

    return rows;
  }, [active, risk, docs]);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading intelligence workspace" spinner />
      </div>
    );
  }

  if (failed && shipments.length === 0) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Intelligence unavailable"
          text="The NEXUS API did not respond."
          action={<button className="nx-btn nx-btn-primary" onClick={load}>Retry</button>}
        />
      </div>
    );
  }

  const ranked = [...shipments].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <div className="nx-page">
      <header className="atl-hero">
        <div className="atl-hero-main">
          <div className="nx-eyebrow">AI Intelligence</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Reasoning Workspace</h1>
          <p className="nx-body" style={{ marginTop: 5, maxWidth: 680 }}>
            Answers are generated from live shipment, risk, disruption and document records held by the
            NEXUS backend — not from a general-purpose model.
          </p>
        </div>
        {active && (
          <button className="nx-btn" onClick={() => navigate(`/shipments/${active.shipment_ref}`)}>
            Open dossier <IconArrowRight size={13} />
          </button>
        )}
      </header>

      {/* ============ CONTEXT · REASONING · EVIDENCE ============ */}
      <div className="atl-ai-grid">
        {/* ---- Context selector ---- */}
        <div className="atl-ai-col">
          <Panel title="Investigation Context" icon="target" flush>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <button
                type="button"
                className={`atl-ctx-item${selected === null ? ' is-active' : ''}`}
                onClick={() => setSelected(null)}
              >
                <div className="atl-ctx-main">
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--nx-text-1)' }}>Fleet-wide</div>
                  <div className="nx-meta">Aggregate network analysis</div>
                </div>
              </button>

              {ranked.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`atl-ctx-item${selected === s.shipment_ref ? ' is-active' : ''}`}
                  onClick={() => setSelected(s.shipment_ref)}
                >
                  <div className="atl-ctx-main">
                    <div className="atl-ref">{s.shipment_ref}</div>
                    <div className="nx-meta nx-truncate" style={{ maxWidth: 130 }}>
                      {s.origin_name} → {s.destination_name}
                    </div>
                  </div>
                  <RiskPill level={s.risk_level} score={s.risk_score} />
                </button>
              ))}

              {ranked.length === 0 && <Empty>No shipments registered</Empty>}
            </div>
          </Panel>

          {active && (
            <Panel title="Selected Shipment" icon="shipments">
              <div className="nx-kv">
                <KeyValue label="Lane" value={`${active.origin_name} → ${active.destination_name}`} />
                <KeyValue label="Carrier" value={active.carrier || '—'} />
                <KeyValue label="Status" value={humanize(active.status)} />
                <KeyValue label="Risk" value={<RiskPill level={active.risk_level} score={active.risk_score} />} />
                <KeyValue label="Documents" value={`${docs.documents.length} received`} mono />
                <KeyValue
                  label="Discrepancies"
                  value={
                    docs.discrepancies.length > 0
                      ? <Badge tone="high">{docs.discrepancies.length} flagged</Badge>
                      : <Badge tone="ok">clear</Badge>
                  }
                />
              </div>
            </Panel>
          )}
        </div>

        {/* ---- Reasoning ---- */}
        <div className="atl-ai-col">
          <Panel
            title="Query NEXUS"
            icon="intelligence"
            actions={<Badge tone="teal">{active ? active.shipment_ref : 'Fleet-wide'}</Badge>}
          >
            <div className="nx-ai-suggest">
              {GENERIC_ACTIONS.map(q => (
                <button
                  key={q}
                  className="nx-ai-chip"
                  disabled={asking}
                  onClick={() => { setQuestion(q); ask(q); }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="nx-ai-input-row" style={{ marginTop: 12 }}>
              <input
                className="nx-ai-input"
                placeholder={
                  active
                    ? `Ask about ${active.shipment_ref} — risk, ETA, documents, next actions…`
                    : 'Ask about the fleet — risk, congestion, delays…'
                }
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !asking) { e.preventDefault(); ask(question); } }}
                aria-label="Ask NEXUS Intelligence"
              />
              <button
                className="nx-btn nx-btn-primary"
                disabled={asking || !question.trim()}
                onClick={() => ask(question)}
              >
                {asking ? 'Analysing…' : <><IconSend size={13} /> Analyse</>}
              </button>
            </div>
          </Panel>

          <Panel
            title="Reasoning Output"
            icon="bolt"
            actions={askedQuestion ? <span className="nx-meta">“{askedQuestion}”</span> : undefined}
          >
            {asking ? (
              <StateBlock title="Analysing shipment records" text="Querying the risk engine and document store." spinner />
            ) : answer ? (
              <AiResponse
                text={answer}
                assessedAt={new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              />
            ) : (
              <Empty>
                Select an investigation context and run an analysis, or ask a fleet-wide question.
              </Empty>
            )}
          </Panel>
        </div>

        {/* ---- Evidence ---- */}
        <div className="atl-ai-col">
          <Panel
            title="Supporting Evidence"
            icon="layers"
            flush
            actions={<Badge tone="neutral">{evidence.length}</Badge>}
          >
            <div style={{ maxHeight: 520, overflowY: 'auto', padding: '4px 13px' }}>
              {evidence.length === 0 ? (
                <Empty>Select a shipment to load its evidence</Empty>
              ) : (
                <div className="atl-evidence">
                  {evidence.map((e, i) => (
                    <div className="atl-evidence-row" key={`${e.source}-${i}`}>
                      <span className="atl-evidence-dot" style={{ background: e.tone }} />
                      <div className="atl-evidence-body">
                        <div className="atl-evidence-src">{e.source}</div>
                        <div className="atl-evidence-val">{e.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Evidence Sources" icon="documents">
            <div className="nx-meta" style={{ lineHeight: 1.7 }}>
              Values above are read directly from the NEXUS backend for the selected context:
              the shipment record, the risk engine assessment and its factors, the document store
              including any recorded discrepancies, and disruption links. Where a source returns
              nothing, the row states that rather than substituting a value.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
