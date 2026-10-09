import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShipments } from '../lib/api';
import AtlasMap from '../components/map/AtlasMap';
import {
  Badge, Empty, Glyph, ModeBadge, Panel, RiskPill, StateBlock, humanize, statusTone,
} from '../components/ui';
import { IconArrowRight, IconSearch } from '../components/Icons';

const MODES = ['ALL', 'OCEAN', 'AIR', 'ROAD', 'RAIL'] as const;
const RISKS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const SORTS = [
  { key: 'risk', label: 'Risk' },
  { key: 'ref', label: 'Reference' },
  { key: 'progress', label: 'Progress' },
] as const;

type SortKey = typeof SORTS[number]['key'];

export default function ShipmentsList() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [mode, setMode] = useState<string>('ALL');
  const [risk, setRisk] = useState<string>('ALL');
  const [sort, setSort] = useState<SortKey>('risk');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await getShipments({ limit: '200' });
      setShipments(Array.isArray(list) ? list : []);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = shipments.filter(s => {
      if (mode !== 'ALL' && (s.transport_mode || '').toUpperCase() !== mode) return false;
      if (risk !== 'ALL' && (s.risk_level || '').toUpperCase() !== risk) return false;
      if (q) {
        const haystack = [
          s.shipment_ref, s.origin_name, s.destination_name, s.carrier,
          s.company_name, s.container_number, s.booking_number, s.bol_number, s.awb_number,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return rows.sort((a, b) => {
      if (sort === 'ref') return String(a.shipment_ref).localeCompare(String(b.shipment_ref));
      if (sort === 'progress') return (b.progress_percent || 0) - (a.progress_percent || 0);
      return (b.risk_score || 0) - (a.risk_score || 0);
    });
  }, [shipments, mode, risk, query, sort]);

  const counts = useMemo(() => {
    const byRisk: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    shipments.forEach(s => {
      const lv = (s.risk_level || '').toUpperCase();
      if (lv in byRisk) byRisk[lv] += 1;
    });
    return byRisk;
  }, [shipments]);

  if (loading) {
    return (
      <div className="nx-page">
        <StateBlock title="Loading shipment registry" spinner />
      </div>
    );
  }

  if (failed && shipments.length === 0) {
    return (
      <div className="nx-page">
        <StateBlock
          title="Registry unavailable"
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
          <div className="nx-eyebrow">Shipment Registry</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>All Movements</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            {shipments.length} shipments · {counts.CRITICAL} critical · {counts.HIGH} high · {counts.MEDIUM} medium · {counts.LOW} low
          </p>
        </div>
        <button className="nx-btn nx-btn-primary" onClick={() => navigate('/shipments/new')}>
          Register shipment
        </button>
      </header>

      {/* Filters */}
      <section className="atl-chrome">
        <div style={{ padding: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200, maxWidth: 340 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--nx-text-3)', display: 'flex' }}>
              <IconSearch size={14} />
            </span>
            <input
              className="nx-input"
              style={{ paddingLeft: 32, height: 32 }}
              placeholder="Filter by ref, route, carrier, container…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Filter shipments"
            />
          </div>

          <div className="nx-pills">
            {MODES.map(m => (
              <button key={m} className={`nx-pill${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
                {m === 'ALL' ? 'All modes' : m}
              </button>
            ))}
          </div>

          <div className="nx-pills">
            {RISKS.map(r => (
              <button key={r} className={`nx-pill${risk === r ? ' active' : ''}`} onClick={() => setRisk(r)}>
                {r === 'ALL' ? 'All risk' : r}
              </button>
            ))}
          </div>

          <div className="nx-pills">
            {SORTS.map(s => (
              <button key={s.key} className={`nx-pill${sort === s.key ? ' active' : ''}`} onClick={() => setSort(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Geospatial context for the current filter set — same shared ATLAS map */}
      <section className="atl-chrome">
        <div className="atl-chrome-head">
          <span className="atl-chrome-title">
            <Glyph name="target" />
            Filtered Network View
          </span>
          <div className="nx-panel-actions">
            <Badge tone="teal">{filtered.length} in view</Badge>
          </div>
        </div>
        <AtlasMap
          shipments={filtered}
          mode="global"
          height={320}
          showDisruptions={false}
          showHubs={false}
          onOpenDossier={ref => navigate(`/shipments/${ref}`)}
        />
      </section>

      <Panel title={`Results — ${filtered.length}`} icon="shipments" flush>
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Route</th>
                <th>Mode</th>
                <th>Carrier</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Delay</th>
                <th>Docs</th>
                <th style={{ textAlign: 'right' }}>Risk</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/shipments/${s.shipment_ref}`)}>
                  <td className="cell-ref">{s.shipment_ref}</td>
                  <td className="cell-route">{s.origin_name} → {s.destination_name}</td>
                  <td><ModeBadge mode={s.transport_mode} /></td>
                  <td className="nx-truncate" style={{ maxWidth: 150 }}>{s.carrier || '—'}</td>
                  <td><Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge></td>
                  <td className="nx-mono" style={{ fontSize: 11 }}>{s.progress_percent ?? 0}%</td>
                  <td className="nx-mono" style={{ fontSize: 11, color: (s.delay_hours || 0) > 0 ? 'var(--nx-warn)' : undefined }}>
                    {(s.delay_hours || 0) > 0 ? `+${s.delay_hours}h` : '—'}
                  </td>
                  <td className="nx-mono" style={{ fontSize: 11 }}>
                    {s.documents_uploaded ?? 0}/{s.documents_total ?? 4}
                    {s.has_discrepancy ? <span style={{ color: 'var(--nx-high)', marginLeft: 5 }}>•</span> : null}
                  </td>
                  <td style={{ textAlign: 'right' }}><RiskPill level={s.risk_level} score={s.risk_score} /></td>
                  <td><IconArrowRight size={13} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <Empty>No shipments match the current filters</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
