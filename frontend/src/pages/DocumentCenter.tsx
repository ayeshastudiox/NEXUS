import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShipmentDocuments, getShipments } from '../lib/api';
import {
  Badge, Empty, Glyph, KeyValue, Metric, ModeBadge, Panel, RiskPill, StateBlock,
  humanize, statusTone,
} from '../components/ui';
import { IconArrowRight } from '../components/Icons';

const DOC_LABELS: Record<string, string> = {
  BILL_OF_LADING: 'Bill of Lading',
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  PROOF_OF_DELIVERY: 'Proof of Delivery',
};

const DOC_SHORT: Record<string, string> = {
  BILL_OF_LADING: 'BOL',
  COMMERCIAL_INVOICE: 'Invoice',
  PACKING_LIST: 'Packing',
  PROOF_OF_DELIVERY: 'POD',
};

const REQUIRED = ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'PROOF_OF_DELIVERY'];

const label = (type: string) => DOC_LABELS[type] || humanize(type);

interface ShipmentDocs {
  shipment: any;
  documents: any[];
  discrepancies: any[];
}

export default function DocumentCenter() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ShipmentDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const load = useCallback(async () => {
    let shipments: any[] = [];
    try {
      const list = await getShipments({ limit: '200' });
      shipments = Array.isArray(list) ? list : [];
      setFailed(false);
    } catch {
      setFailed(true);
      setLoading(false);
      return;
    }

    // The list payload carries summary flags, so detail is only fetched for
    // shipments that actually have documents or a recorded discrepancy.
    const targets = shipments.filter(s => (s.documents_uploaded || 0) > 0 || s.has_discrepancy);

    const settled = await Promise.allSettled(targets.map(s => getShipmentDocuments(s.shipment_ref)));

    const next: ShipmentDocs[] = targets.map((s, i) => {
      const result = settled[i];
      const payload = result.status === 'fulfilled' ? result.value : { documents: [], discrepancies: [] };
      return {
        shipment: s,
        documents: payload?.documents || [],
        discrepancies: payload?.discrepancies || [],
      };
    });

    setRows(next);
    // Auto-focus the shipment with the most discrepancies so the workspace opens
    // on the actual compliance issue rather than an empty state.
    const withMost = [...next].sort((a, b) => b.discrepancies.length - a.discrepancies.length)[0];
    setFocus(prev => prev ?? withMost?.shipment.shipment_ref ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    let received = 0;
    let discrepancies = 0;
    let incomplete = 0;
    rows.forEach(r => {
      received += r.documents.length;
      discrepancies += r.discrepancies.length;
      const types = new Set(r.documents.map(d => d.type));
      if (REQUIRED.some(t => !types.has(t))) incomplete += 1;
    });
    return { received, discrepancies, incomplete };
  }, [rows]);

  const allDiscrepancies = useMemo(
    () => rows.flatMap(r => r.discrepancies.map(d => ({ disc: d, shipment: r.shipment }))),
    [rows]
  );

  const focused = useMemo(
    () => (focus ? rows.find(r => r.shipment.shipment_ref === focus) || null : null),
    [focus, rows]
  );

  /* Cross-document matrix for the focused shipment, from real extractions. */
  const matrix = useMemo(() => {
    if (!focused) return { docs: [] as string[], rows: [] as { field: string; values: any[]; differs: boolean }[] };
    const fields = ['quantity', 'weight', 'value'];
    const present = focused.documents
      .filter(d => Array.isArray(d.extractions) && d.extractions.length > 0)
      .map(d => ({ type: String(d.type), data: d.extractions[0].extracted_json || {} }));

    const matrixRows = fields.map(field => {
      const values = present.map(p => ({ type: p.type, value: p.data?.[field] }));
      const distinct = new Set(values.map(v => String(v.value)));
      return { field, values, differs: distinct.size > 1 && values.length > 1 };
    }).filter(r => r.values.some(v => v.value !== undefined));

    return { docs: present.map(p => p.type), rows: matrixRows };
  }, [focused]);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading document intelligence" spinner />
      </div>
    );
  }

  if (failed && rows.length === 0) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Document workspace unavailable"
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
          <div className="nx-eyebrow">Document Intelligence</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Compliance Workspace</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            {summary.received} documents across {rows.length} shipments · {summary.discrepancies} cross-document
            discrepancies detected
            {summary.incomplete > 0 ? ` · ${summary.incomplete} with incomplete document sets` : ''}.
          </p>
        </div>
      </header>

      <div className="nx-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Metric label="Documents received" value={summary.received} note="across all shipments" tone="teal" />
        <Metric
          label="Discrepancies"
          value={summary.discrepancies}
          note="cross-document mismatches"
          tone={summary.discrepancies > 0 ? 'high' : undefined}
        />
        <Metric
          label="Incomplete sets"
          value={summary.incomplete}
          note="missing required documents"
          tone={summary.incomplete > 0 ? 'warn' : undefined}
        />
        <Metric label="Shipments tracked" value={rows.length} note="with documentation on file" />
      </div>

      {/* ============ FOCUSED COMPARISON WORKSPACE ============ */}
      {focused && (
        <section className="atl-chrome">
          <div className="atl-chrome-head">
            <span className="atl-chrome-title">
              <Glyph name="documents" />
              {focused.shipment.shipment_ref} — Evidence Comparison
            </span>
            <div className="nx-panel-actions">
              <ModeBadge mode={focused.shipment.transport_mode} />
              <Badge tone={statusTone(focused.shipment.status)}>{humanize(focused.shipment.status)}</Badge>
              <RiskPill level={focused.shipment.risk_level} score={focused.shipment.risk_score} />
              <button className="nx-btn nx-btn-sm" onClick={() => navigate(`/shipments/${focused.shipment.shipment_ref}`)}>
                Open dossier <IconArrowRight size={12} />
              </button>
            </div>
          </div>

          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Document evidence cards */}
            <div className="nx-doc-grid">
              {REQUIRED.map(type => {
                const doc = focused.documents.find(d => d.type === type);
                const extraction = doc?.extractions?.[0]?.extracted_json;
                const confidence = doc?.extractions?.[0]?.confidence;
                const flagged = Boolean(doc) && focused.discrepancies.length > 0;
                return (
                  <div className="atl-doc" key={type}>
                    <div className="atl-doc-head">
                      <div className="atl-doc-title">
                        <span style={{ color: doc ? 'var(--nx-teal)' : 'var(--nx-text-3)', display: 'flex' }}>
                          <Glyph name={doc ? 'check' : 'documents'} size={13} />
                        </span>
                        <span>{label(type)}</span>
                      </div>
                      <Badge tone={doc ? (flagged ? 'high' : 'ok') : 'neutral'}>
                        {doc ? (flagged ? 'Flagged' : humanize(doc.status)) : 'Missing'}
                      </Badge>
                    </div>

                    {doc && extraction ? (
                      <div className="atl-doc-rows">
                        {(['quantity', 'weight', 'value'] as const).map(f => (
                          <div className="atl-doc-row" key={f}>
                            <span>{f}</span>
                            <b className={flagged ? 'flag' : undefined}>
                              {extraction[f] != null ? Number(extraction[f]).toLocaleString() : '—'}
                            </b>
                          </div>
                        ))}
                        {confidence != null && (
                          <div className="atl-doc-row">
                            <span>confidence</span>
                            <b>{Math.round(confidence * 100)}%</b>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="nx-meta" style={{ fontStyle: 'italic' }}>Not yet received</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cross-document matrix */}
            {matrix.rows.length > 0 && (
              <div>
                <div className="atl-matrix-caption">
                  <span className="nx-label">Cross-document verification</span>
                  {matrix.rows.some(r => r.differs) && (
                    <span className="atl-matrix-legend"><i />Diverging value</span>
                  )}
                </div>
                <div className="atl-matrix" style={{ gridTemplateColumns: `130px repeat(${matrix.docs.length}, minmax(100px, 1fr))` }}>
                  <div className="head">Field</div>
                  {matrix.docs.map(t => <div className="head" key={t}>{DOC_SHORT[t] || humanize(t)}</div>)}
                  {matrix.rows.map(row => (
                    <Fragment key={row.field}>
                      <div className="field">{row.field}</div>
                      {row.values.map((v, i) => (
                        <div className={`val${row.differs ? ' outlier' : ''}`} key={`${row.field}-${v.type}-${i}`}>
                          {v.value != null ? Number(v.value).toLocaleString() : '—'}
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Discrepancy callouts */}
            {focused.discrepancies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {focused.discrepancies.map(disc => {
                  const values: Record<string, any> = disc.values_by_document || {};
                  const numbers = Object.values(values).map(v => Number(v)).filter(v => Number.isFinite(v));
                  const spread = numbers.length > 1 ? Math.max(...numbers) - Math.min(...numbers) : null;
                  return (
                    <div className="atl-callout atl-callout--high" key={disc.id}>
                      <div className="atl-callout-head">
                        <Glyph name="alert" size={13} />
                        {humanize(disc.field_name)} mismatch
                      </div>
                      <div className="atl-callout-body">{disc.difference_description}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(values).map(([k, v]) => (
                          <Badge key={k} tone="neutral">
                            {DOC_SHORT[k] || humanize(k)}: {typeof v === 'number' ? v.toLocaleString() : String(v)}
                          </Badge>
                        ))}
                        {spread != null && <Badge tone="high">Δ {spread.toLocaleString()}</Badge>}
                      </div>
                      {disc.potential_impact && (
                        <div className="atl-callout-body">
                          Potential impact: <strong style={{ color: 'var(--nx-text-1)' }}>{disc.potential_impact}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="atl-callout atl-callout--ok">
                <div className="atl-callout-head">
                  <Glyph name="check" size={13} />
                  Documents consistent
                </div>
                <div className="atl-callout-body">
                  No cross-document discrepancy is recorded for this shipment.
                </div>
              </div>
            )}

            <div className="nx-kv">
              <KeyValue label="Carrier" value={focused.shipment.carrier || '—'} />
              <KeyValue label="Cargo" value={focused.shipment.cargo_description || '—'} />
              <KeyValue label="Company" value={focused.shipment.company_name || '—'} />
            </div>
          </div>
        </section>
      )}

      {/* ============ REGISTER + OPEN DISCREPANCIES ============ */}
      <div className="atl-split atl-split--even">
        <Panel title="Document Register" icon="documents" flush>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Lane</th>
                  <th>Received</th>
                  <th style={{ textAlign: 'right' }}>Discrepancies</th>
                  <th style={{ width: 34 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const types = new Set(r.documents.map(d => d.type));
                  const missing = REQUIRED.filter(t => !types.has(t));
                  return (
                    <tr
                      key={r.shipment.id}
                      className="clickable"
                      onClick={() => setFocus(r.shipment.shipment_ref)}
                      style={focus === r.shipment.shipment_ref ? { background: 'var(--nx-surface-hover)' } : undefined}
                    >
                      <td className="cell-ref">{r.shipment.shipment_ref}</td>
                      <td className="cell-route">{r.shipment.origin_name} → {r.shipment.destination_name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                          {REQUIRED.map(t => (
                            <span
                              key={t}
                              className="nx-badge"
                              style={{
                                background: types.has(t) ? 'var(--nx-teal-dim)' : 'transparent',
                                borderColor: types.has(t) ? 'var(--nx-teal-line)' : 'var(--nx-border)',
                                color: types.has(t) ? 'var(--nx-teal)' : 'var(--nx-text-3)',
                                padding: '1px 4px',
                              }}
                            >
                              {DOC_SHORT[t]}
                            </span>
                          ))}
                          <span className="nx-mono" style={{ fontSize: 10, marginLeft: 4, color: 'var(--nx-text-3)' }}>
                            {r.documents.length}/{REQUIRED.length}
                          </span>
                          {missing.length > 0 && <span className="nx-sev nx-sev-warn" style={{ marginLeft: 3 }} />}
                        </div>
                      </td>
                      <td className="cell-num" style={{ color: r.discrepancies.length > 0 ? 'var(--nx-high)' : undefined }}>
                        {r.discrepancies.length}
                      </td>
                      <td><IconArrowRight size={13} /></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={5}><Empty>No shipments have documentation on file</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Open Discrepancies" icon="alert" flush
          actions={<Badge tone={allDiscrepancies.length > 0 ? 'high' : 'ok'}>{allDiscrepancies.length}</Badge>}
        >
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {allDiscrepancies.length === 0 ? (
              <Empty>No cross-document discrepancies detected</Empty>
            ) : allDiscrepancies.map(({ disc, shipment }, i) => (
              <div
                className="nx-signal"
                key={`${shipment.id}-${disc.id ?? i}`}
                style={{ cursor: 'pointer' }}
                onClick={() => { setFocus(shipment.shipment_ref); }}
              >
                <div className="nx-signal-icon" style={{ background: 'var(--nx-high-dim)', color: 'var(--nx-high)' }}>
                  <Glyph name="alert" size={12} />
                </div>
                <div className="nx-signal-body">
                  <div className="nx-signal-event">
                    {humanize(disc.field_name)}
                    <span className="nx-mono" style={{ color: 'var(--nx-teal)', marginLeft: 6, fontSize: 11 }}>
                      {shipment.shipment_ref}
                    </span>
                  </div>
                  <div className="nx-signal-meta">{disc.difference_description}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
