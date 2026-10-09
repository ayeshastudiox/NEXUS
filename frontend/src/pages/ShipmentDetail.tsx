import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  aiQuery, getShipment, getShipmentDelay, getShipmentDocuments,
  getShipmentRisk, getShipmentTimeline,
} from '../lib/api';
import AtlasMap from '../components/map/AtlasMap';
import AiResponse from '../components/AiResponse';
import DocumentIntakePanel, { documentLabel } from '../components/DocumentIntakePanel';
import {
  Badge, Empty, Glyph, KeyValue, Meter, ModeBadge, Panel, RiskPill,
  StateBlock, humanize, riskColor, riskTone, statusTone,
} from '../components/ui';
import { IconArrowRight, IconSend } from '../components/Icons';

const DOC_SHORT: Record<string, string> = {
  BILL_OF_LADING: 'BOL',
  COMMERCIAL_INVOICE: 'Invoice',
  PACKING_LIST: 'Packing',
  PROOF_OF_DELIVERY: 'POD',
};

const AI_SUGGESTIONS = [
  'What are the risk factors?',
  'Predict arrival time',
  'Suggest optimization',
  'Why is it delayed?',
  'Are there document inconsistencies?',
];

const REQUIRED_DOCS = ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'PROOF_OF_DELIVERY'];

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as {
    uploadFailures?: { type: string; message: string }[];
    uploadedCount?: number;
  } | null;

  /** Types whose upload failed during registration; surfaced so they can be retried. */
  const uploadFailures = useMemo(
    () => (Array.isArray(routeState?.uploadFailures) ? routeState!.uploadFailures! : []),
    [routeState]
  );
  const uploadedAtRegistration = routeState?.uploadedCount ?? 0;

  /** Intake opens automatically when registration left something outstanding. */
  const [showIntake, setShowIntake] = useState<boolean>(uploadFailures.length > 0);

  const [shipment, setShipment] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [risk, setRisk] = useState<any>(null);
  const [delay, setDelay] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    let primary: any;
    try {
      primary = await getShipment(id);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('404') || /not found/i.test(msg)) setNotFound(true);
      else setError(msg || 'Unable to retrieve shipment data');
      setLoading(false);
      return;
    }

    const [t, r, d, docsPayload] = await Promise.all([
      getShipmentTimeline(id).catch(() => []),
      getShipmentRisk(id).catch(() => null),
      getShipmentDelay(id).catch(() => null),
      getShipmentDocuments(id).catch(() => ({ documents: [], discrepancies: [] })),
    ]);

    setShipment(primary);
    setTimeline(Array.isArray(t) ? t : []);
    setRisk(r);
    setDelay(d);
    setDocuments(docsPayload?.documents || []);
    setDiscrepancies(docsPayload?.discrepancies || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runAiQuery = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return;
    setAiLoading(true);
    try {
      const res = await aiQuery(q, id);
      setAiAnswer(res?.answer || res?.message || 'No answer available');
    } catch {
      setAiAnswer('NEXUS Intelligence could not be reached. Verify the backend is running.');
    } finally {
      setAiLoading(false);
    }
  }, [id]);

  /* --- Cross-document extraction matrix --- */
  const extractionMatrix = useMemo(() => {
    const fields = ['quantity', 'weight', 'value'];
    const present = documents
      .filter(d => Array.isArray(d.extractions) && d.extractions.length > 0)
      .map(d => ({ type: String(d.type), data: d.extractions[0].extracted_json || {} }));

    const rows = fields.map(field => {
      const values = present.map(p => ({ type: p.type, value: p.data?.[field] }));
      const distinct = new Set(values.map(v => String(v.value)));
      return { field, values, differs: distinct.size > 1 && values.length > 1 };
    }).filter(r => r.values.some(v => v.value !== undefined));

    return { docs: present.map(p => p.type), rows };
  }, [documents]);

  const sortedTimeline = useMemo(
    () => [...timeline].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [timeline]
  );

  /* --- States --- */
  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title={`Loading dossier ${id}`} text="Retrieving risk, delay, documents and tracking history." spinner />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="nx-page">
        <StateBlock
          title={`Shipment ${id} not found`}
          text="No shipment with that reference exists in the NEXUS network."
          action={<button className="nx-btn nx-btn-primary" onClick={() => navigate('/shipments')}>Back to registry</button>}
        />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Shipment data unavailable"
          text={error || 'The data source did not respond.'}
          action={<button className="nx-btn nx-btn-primary" onClick={load}>Retry</button>}
        />
      </div>
    );
  }

  /* --- Resolved intelligence values (all from the backend) --- */
  const riskScore: number = shipment.risk_score ?? risk?.score ?? 0;
  const riskLevel: string = shipment.risk_level ?? risk?.level ?? 'LOW';
  const factors: any[] = Array.isArray(risk?.factors) ? risk.factors : [];
  const factorTotal = factors.reduce((sum, f) => sum + (f.points || 0), 0);
  const maxFactor = Math.max(1, ...factors.map(f => f.points || 0));

  // Two genuinely different metrics — labelled so they are never conflated.
  const scheduleSlip: number = delay?.base_delay_hours ?? 0;      // original_eta → current_eta
  const additionalDelay: number = delay?.expected_delay_hours ?? shipment.delay_hours ?? 0; // disruption + docs
  const contributors: string[] = Array.isArray(delay?.contributors) ? delay.contributors : [];
  const predictedEta: string | null = delay?.predicted_eta ?? null;

  const progress: number = shipment.progress_percent ?? 0;
  const uploadedTypes = new Set(documents.map(d => d.type));
  const missingDocs = REQUIRED_DOCS.filter(t => !uploadedTypes.has(t));

  const tone = riskTone(riskLevel);
  const calloutTone = tone === 'critical' || tone === 'high' ? 'high' : tone === 'medium' ? 'warn' : 'ok';
  const riskHex = riskColor(riskLevel);

  return (
    <div className="nx-page">
      {/* ===================== HERO ===================== */}
      <section className="atl-chrome">
        <div className="atl-chrome-head">
          <span className="atl-chrome-title">
            <Glyph name="shipments" />
            Shipment Intelligence
          </span>
          <button className="nx-btn nx-btn-sm nx-btn-ghost" onClick={() => navigate('/shipments')}>
            ← Registry
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div className="atl-ref" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{shipment.shipment_ref}</div>
            <div className="nx-body" style={{ marginTop: 5, fontSize: 13.5 }}>
              {shipment.origin_name} → {shipment.destination_name}
            </div>
            <div className="nx-priority-tags" style={{ marginTop: 11 }}>
              <ModeBadge mode={shipment.transport_mode} />
              <Badge tone="neutral">{shipment.carrier}</Badge>
              <Badge tone={statusTone(shipment.status)}>{humanize(shipment.status)}</Badge>
              {/* Only shown when it differs from the carrier, otherwise the same
                  company appears twice for shipments where the two fields match. */}
              {shipment.company_name && shipment.company_name !== shipment.carrier && (
                <Badge tone="neutral">{shipment.company_name}</Badge>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="nx-label">Risk assessment</div>
            <div className="nx-mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.05, marginTop: 4, color: riskHex }}>
              {riskScore}
            </div>
            <div style={{ marginTop: 7 }}>
              <RiskPill level={riskLevel} />
            </div>
            <div className="nx-meta" style={{ marginTop: 6 }}>
              {factors.length} contributing factor{factors.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Journey map — the same shared ATLAS map used everywhere */}
        <AtlasMap
          shipments={[shipment]}
          mode="journey"
          focusRef={shipment.shipment_ref}
          showHubs={false}
          showDisruptions={shipment.has_active_disruption === true}
          height={420}
          onOpenDossier={undefined}
        />
      </section>

      {/* ===================== RISK + DELAY METRICS ===================== */}
      <div className="atl-split atl-split--detail">
        <Panel
          title="Risk Contribution"
          icon="risk"
          actions={<Badge large tone={tone === 'medium' ? 'warn' : tone === 'low' ? 'ok' : tone}>{riskLevel}</Badge>}
        >
          {factors.length === 0 ? (
            <Empty>No risk factors identified for this shipment.</Empty>
          ) : (
            <div className="atl-contrib">
              {factors.map((f, i) => (
                <div className="atl-contrib-row" key={`${f.name}-${i}`}>
                  <span className="atl-contrib-name">{f.name}</span>
                  <span className="atl-contrib-pts">+{f.points}</span>
                  {f.description && <span className="atl-contrib-desc">{f.description}</span>}
                  <span className="atl-contrib-track">
                    <span className="atl-contrib-fill" style={{ width: `${((f.points || 0) / maxFactor) * 100}%` }} />
                  </span>
                </div>
              ))}
              <div className="atl-contrib-total">
                <span className="nx-label">Total assessed risk</span>
                <b>{factors.length > 0 && factorTotal !== riskScore ? `${factorTotal} → ${riskScore}` : `${riskScore} / 100`}</b>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Delay Analysis" icon="clock">
          <div className="atl-metric-pair">
            <div>
              <div className="nx-label">Schedule slip</div>
              <div className="val">{scheduleSlip.toFixed(1)} h</div>
              <div className="hint">Original → current ETA, as reported by the carrier.</div>
            </div>
            <div>
              <div className="nx-label">Additional predicted delay</div>
              <div className="val" style={{ color: additionalDelay > 0 ? 'var(--nx-warn)' : undefined }}>
                {additionalDelay.toFixed(1)} h
              </div>
              <div className="hint">Live disruption and document events beyond the current ETA.</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="nx-label" style={{ marginBottom: 7 }}>Contributing factors</div>
            {contributors.length === 0 ? (
              <div className="nx-meta">No active disruption contributors.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contributors.map(c => <Badge key={c} tone="warn">{c}</Badge>)}
              </div>
            )}
          </div>

          <div className="nx-kv" style={{ marginTop: 14 }}>
            <KeyValue
              label="Predicted ETA"
              value={predictedEta ? new Date(predictedEta).toLocaleString('en-GB') : '—'}
              mono
            />
            <KeyValue
              label="Current ETA"
              value={shipment.current_eta ? new Date(shipment.current_eta).toLocaleString('en-GB') : '—'}
              mono
            />
          </div>
        </Panel>
      </div>

      {/* ===================== STATUS + PROGRESS ===================== */}
      <div className="atl-split atl-split--detail">
        <Panel title="Shipment Status" icon="package">
          <div className="nx-kv">
            <KeyValue label="Container" value={shipment.container_number || '—'} mono />
            <KeyValue label="Booking" value={shipment.booking_number || '—'} mono />
            <KeyValue label="BOL" value={shipment.bol_number || '—'} mono />
            <KeyValue label="AWB" value={shipment.awb_number || '—'} mono />
            <KeyValue label="Cargo" value={shipment.cargo_description || '—'} />
            <KeyValue
              label="Weight"
              value={shipment.cargo_weight_kg != null ? `${Number(shipment.cargo_weight_kg).toLocaleString()} kg` : '—'}
              mono
            />
            <KeyValue
              label="Declared value"
              value={shipment.cargo_value_usd != null ? `$${Number(shipment.cargo_value_usd).toLocaleString()}` : '—'}
              mono
            />
            <KeyValue label="Data source" value={humanize(shipment.data_source)} />
          </div>
        </Panel>

        <Panel title="Route Progress" icon="route">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span className="nx-label">Journey complete</span>
            <span className="nx-mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--nx-teal)' }}>{progress}%</span>
          </div>
          <Meter pct={progress} />

          <div className="nx-kv" style={{ marginTop: 16 }}>
            <KeyValue label="Distance travelled" value={`${Math.round(shipment.distance_travelled_km || 0).toLocaleString()} km`} mono />
            <KeyValue label="Remaining" value={`${Math.round(shipment.distance_remaining_km || 0).toLocaleString()} km`} mono />
            <KeyValue label="Original ETA" value={shipment.original_eta ? new Date(shipment.original_eta).toLocaleString('en-GB') : '—'} mono />
            <KeyValue label="Latest position" value={shipment.latest_tracking?.location_name || 'No tracking reported'} />
          </div>
        </Panel>
      </div>

      {/* ===================== DOCUMENT EVIDENCE ===================== */}
      <Panel
        title="Document Evidence"
        icon="documents"
        actions={
          <>
            <Badge tone={missingDocs.length > 0 ? 'warn' : 'ok'}>
              {documents.length} / {REQUIRED_DOCS.length} received
            </Badge>
            <Badge tone={discrepancies.length > 0 ? 'high' : 'ok'}>
              {discrepancies.length} discrepanc{discrepancies.length === 1 ? 'y' : 'ies'}
            </Badge>
          </>
        }
      >
        <div className="nx-doc-grid">
          {REQUIRED_DOCS.map(type => {
            const doc = documents.find(d => d.type === type);
            const extraction = doc?.extractions?.[0]?.extracted_json;
            const flagged = Boolean(doc) && discrepancies.length > 0;
            return (
              <div className="atl-doc" key={type}>
                <div className="atl-doc-head">
                  <div className="atl-doc-title">
                    <span style={{ color: doc ? 'var(--nx-teal)' : 'var(--nx-text-3)', display: 'flex' }}>
                      <Glyph name={doc ? 'check' : 'documents'} size={13} />
                    </span>
                    <span>{documentLabel(type)}</span>
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
                  </div>
                ) : (
                  <div className="nx-meta" style={{ fontStyle: 'italic' }}>Not yet received</div>
                )}
              </div>
            );
          })}
        </div>

        {extractionMatrix.rows.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="atl-matrix-caption">
              <span className="nx-label">Cross-document verification</span>
              {extractionMatrix.rows.some(r => r.differs) && (
                <span className="atl-matrix-legend"><i />Diverging value</span>
              )}
            </div>
            <div
              className="atl-matrix"
              style={{ gridTemplateColumns: `110px repeat(${extractionMatrix.docs.length}, minmax(90px, 1fr))` }}
            >
              <div className="head">Field</div>
              {extractionMatrix.docs.map(t => <div className="head" key={t}>{DOC_SHORT[t] || humanize(t)}</div>)}
              {extractionMatrix.rows.map(row => (
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

        {discrepancies.map(disc => {
          const values: Record<string, any> = disc.values_by_document || {};
          const numbers = Object.values(values).map(v => Number(v)).filter(v => Number.isFinite(v));
          const spread = numbers.length > 1 ? Math.max(...numbers) - Math.min(...numbers) : null;
          return (
            <div className="atl-callout atl-callout--high" style={{ marginTop: 14 }} key={disc.id}>
              <div className="atl-callout-head">
                <Glyph name="alert" size={13} />
                {humanize(disc.field_name)} mismatch
              </div>
              <div className="atl-callout-body">{disc.difference_description}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(values).map(([doc, val]) => (
                  <Badge key={doc} tone="neutral">
                    {DOC_SHORT[doc] || humanize(doc)}: {typeof val === 'number' ? val.toLocaleString() : String(val)}
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

        {missingDocs.length > 0 && (
          <div className="atl-callout atl-callout--warn" style={{ marginTop: 14 }}>
            <div className="atl-callout-head">
              <Glyph name="alert" size={13} />
              Compliance gap
            </div>
            <div className="atl-callout-body">
              Missing required documentation: {missingDocs.map(documentLabel).join(', ')}.
            </div>
          </div>
        )}

        {/* Outcome of the documents attached during registration */}
        {uploadedAtRegistration > 0 && uploadFailures.length === 0 && (
          <div className="atl-callout atl-callout--ok" style={{ marginTop: 14 }}>
            <div className="atl-callout-head">
              <Glyph name="check" size={13} />
              Attached at registration
            </div>
            <div className="atl-callout-body">
              {uploadedAtRegistration} document{uploadedAtRegistration === 1 ? '' : 's'} uploaded successfully
              when this shipment was created.
            </div>
          </div>
        )}

        {uploadFailures.length > 0 && (
          <div className="atl-callout atl-callout--high" style={{ marginTop: 14 }}>
            <div className="atl-callout-head">
              <Glyph name="alert" size={13} />
              Upload incomplete
            </div>
            <div className="atl-callout-body">
              {uploadedAtRegistration} of {uploadedAtRegistration + uploadFailures.length} documents were attached
              during registration. The following failed and can be retried below:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {uploadFailures.map(f => (
                <div key={f.type} className="nx-meta">
                  <strong style={{ color: 'var(--nx-text-2)' }}>{documentLabel(f.type)}</strong> — {f.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document intake — reachable at any time for outstanding documents. */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <span className="nx-label">Attach documents</span>
            {!showIntake && (
              <button className="nx-btn nx-btn-sm nx-btn-ghost" onClick={() => setShowIntake(true)}>
                Add documents
              </button>
            )}
          </div>

          {showIntake ? (
            <DocumentIntakePanel
              shipmentRef={shipment.shipment_ref}
              types={uploadFailures.length > 0 ? uploadFailures.map(f => f.type) : undefined}
              receivedTypes={documents.map(d => d.type)}
              onUploaded={() => {
                // Refetch so the evidence cards and comparison matrix update.
                load();
              }}
              emptyMessage="Every required document type is now on file for this shipment."
            />
          ) : (
            <div className="nx-meta">
              {missingDocs.length > 0
                ? `${missingDocs.length} required document${missingDocs.length === 1 ? '' : 's'} outstanding. Use “Add documents” to attach them.`
                : 'All required documents are on file for this shipment.'}
            </div>
          )}
        </div>
      </Panel>

      {/* ===================== DISRUPTION + TIMELINE ===================== */}
      <div className="atl-split atl-split--detail">
        <Panel title="Disruption Exposure" icon="alert">
          {shipment.has_active_disruption ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Badge tone="critical" large>Disruption link active</Badge>
              <div className="atl-callout-body">
                This shipment is currently linked to one or more active external disruptions. Contributing
                locations are priced into the risk score above.
              </div>
              {contributors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {contributors.map(c => <Badge key={c} tone="high">{c}</Badge>)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <Badge tone="ok" large>No active disruption</Badge>
              <span className="nx-meta">No external disruption is currently linked to this shipment.</span>
            </div>
          )}
        </Panel>

        <Panel title="Tracking History" icon="layers" flush>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {sortedTimeline.length === 0 ? (
              <Empty>No tracking events recorded</Empty>
            ) : sortedTimeline.map((t, i) => {
              const critical = t.severity === 'CRITICAL';
              const warn = t.severity === 'WARNING';
              const color = critical ? 'var(--nx-critical)' : warn ? 'var(--nx-warn)' : 'var(--nx-teal)';
              return (
                <div className="nx-signal" key={t.id ?? i}>
                  <div className="nx-signal-icon" style={{ background: `${color}1f`, color }}>
                    <Glyph name={critical || warn ? 'alert' : t.event_type === 'ARRIVAL' ? 'check' : 'route'} size={11} />
                  </div>
                  <div className="nx-signal-body">
                    <div className="nx-signal-event">{t.location_name || humanize(t.event_type)}</div>
                    <div className="nx-signal-meta">
                      {humanize(t.event_type)}{t.description ? ` — ${t.description}` : ''}
                    </div>
                  </div>
                  <div className="nx-signal-time">
                    {t.timestamp ? new Date(t.timestamp).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    }) : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ===================== AI + RECOMMENDATION ===================== */}
      <div className="atl-split atl-split--even">
        <Panel
          title="NEXUS Intelligence"
          icon="intelligence"
          actions={<Badge tone="teal">Grounded in shipment data</Badge>}
        >
          <div className="nx-ai-suggest">
            {AI_SUGGESTIONS.map(q => (
              <button
                key={q}
                className="nx-ai-chip"
                disabled={aiLoading}
                onClick={() => { setAiQuestion(q); runAiQuery(q); }}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="nx-ai-input-row" style={{ marginTop: 12 }}>
            <input
              className="nx-ai-input"
              placeholder="Ask NEXUS about risk, ETA, documents or recommended actions…"
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !aiLoading) { e.preventDefault(); runAiQuery(aiQuestion); } }}
              aria-label="Ask NEXUS Intelligence"
            />
            <button
              className="nx-btn nx-btn-primary"
              disabled={aiLoading || !aiQuestion.trim()}
              onClick={() => runAiQuery(aiQuestion)}
            >
              {aiLoading ? 'Analysing…' : <><IconSend size={13} /> Analyse</>}
            </button>
          </div>

          {aiAnswer ? (
            <AiResponse text={aiAnswer} className="atl-rise" />
          ) : (
            <div className="nx-meta" style={{ marginTop: 12 }}>
              Select a question above, or open the full investigation workspace for a structured
              evidence view.
            </div>
          )}

          <button
            className="nx-btn nx-btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => navigate('/intelligence')}
          >
            Open AI workspace <IconArrowRight size={12} />
          </button>
        </Panel>

        <Panel title="Recommended Action" icon="shield">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {calloutTone === 'high' ? (
              <div className="atl-callout atl-callout--high">
                <div className="atl-callout-head">
                  <Glyph name="bolt" size={13} />
                  Escalate
                </div>
                <div className="atl-callout-body">
                  {riskLevel} risk at {riskScore}/100. Prioritise the highest-weighted factor
                  {factors[0] ? ` (${factors[0].name}, +${factors[0].points})` : ''} and confirm corrective
                  action with the carrier
                  {discrepancies.length > 0 ? '; reconcile the flagged documents before customs clearance' : ''}.
                </div>
              </div>
            ) : calloutTone === 'warn' ? (
              <div className="atl-callout atl-callout--warn">
                <div className="atl-callout-head">
                  <Glyph name="info" size={13} />
                  Monitor
                </div>
                <div className="atl-callout-body">
                  Medium risk at {riskScore}/100. Pre-emptive action on the top contributors can prevent
                  escalation to HIGH.
                </div>
              </div>
            ) : (
              <div className="atl-callout atl-callout--ok">
                <div className="atl-callout-head">
                  <Glyph name="check" size={13} />
                  Within tolerance
                </div>
                <div className="atl-callout-body">
                  Low risk at {riskScore}/100. Continue standard monitoring.
                </div>
              </div>
            )}

            <button
              className="nx-btn nx-btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => runAiQuery('What should we do next?')}
              disabled={aiLoading}
            >
              Ask NEXUS for the next action <IconArrowRight size={13} />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
