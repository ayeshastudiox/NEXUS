import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShipment, uploadShipmentDocument } from '../lib/api';
import DarkDatePicker from '../components/DarkDatePicker';
import LocationCombobox from '../components/LocationCombobox';
import { Badge, KeyValue, ModeBadge, Panel } from '../components/ui';
import { suggestMode, type NexusLocation } from '../data/locations';
import {
  DOCUMENT_TYPES, DocumentFileSet, validateFile, formatBytes,
  type StagedFiles, type UploadPhase,
} from '../components/DocumentIntakePanel';

const MODES = ['OCEAN', 'AIR', 'ROAD', 'RAIL'] as const;

/** The backend enforces ^NX-\d{4,6}$, so generate a unique ref instead of asking for one. */
function nextShipmentRef(): string {
  const now = new Date();
  const suffix = now.getHours() * 60 + now.getMinutes();
  return `NX-${2000 + (suffix % 1000)}`;
}

export default function CreateShipment() {
  const navigate = useNavigate();
  const [form, setForm] = useState<{
    origin: NexusLocation | null;
    destination: NexusLocation | null;
    transport_mode: string;
    carrier: string;
    weight_kg: string;
    description: string;
    estimated_departure: string;
    estimated_arrival: string;
  }>({
    origin: null,
    destination: null,
    transport_mode: 'OCEAN',
    carrier: '',
    weight_kg: '',
    description: '',
    estimated_departure: '',
    estimated_arrival: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  /** Files staged for upload, keyed by document type. */
  const [files, setFiles] = useState<StagedFiles>({});
  /** Transient per-document status shown during the post-creation upload. */
  const [docUpload, setDocUpload] = useState<Record<string, { status: UploadPhase; message?: string }>>({});

  const attachedTypes = DOCUMENT_TYPES.filter(d => files[d.value]).map(d => d.value);
  const attachedBytes = DOCUMENT_TYPES.reduce((sum, d) => sum + (files[d.value]?.size || 0), 0);
  const uploading = Object.values(docUpload).some(s => s.status === 'uploading');

  const pickFile = (type: string, file: File | undefined) => {
    if (!file) {
      setFiles(prev => ({ ...prev, [type]: undefined }));
      return;
    }
    const problem = validateFile(file);
    if (problem) {
      setError(`${DOCUMENT_TYPES.find(d => d.value === type)?.label || type}: ${problem}`);
      return;
    }
    setError('');
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const setField = (k: 'carrier' | 'weight_kg' | 'description' | 'estimated_departure' | 'estimated_arrival', v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  /**
   * Origin/destination are full location records. Coordinates come from the
   * selected record, so the payload can never carry coordinates that belong to
   * a different place than the label.
   */
  const setEndpoint = (which: 'origin' | 'destination', loc: NexusLocation) => {
    setForm(prev => {
      const next = { ...prev, [which]: loc };
      // Only auto-suggest the mode when the endpoints make it unambiguous.
      const suggested = suggestMode(
  next.origin ?? undefined,
  next.destination ?? undefined
);
      if (suggested) next.transport_mode = suggested;
      return next;
    });
  };

  const clearEndpoint = (which: 'origin' | 'destination') => {
    setForm(prev => ({ ...prev, [which]: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { origin, destination } = form;
    if (!origin || !destination) {
      setError('Select both an origin and a destination');
      return;
    }
    if (origin.name === destination.name) {
      setError('Origin and destination must be different');
      return;
    }

    // The form collects a departure/arrival window; the API models original_eta/current_eta.
    const departure = form.estimated_departure ? new Date(form.estimated_departure) : new Date();
    const arrival = form.estimated_arrival
      ? new Date(form.estimated_arrival)
      : new Date(departure.getTime() + 3 * 24 * 3600 * 1000);
    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
      setError('Select valid departure and arrival times');
      return;
    }

    const weight = form.weight_kg ? Number(form.weight_kg) : undefined;
    if (weight !== undefined && (isNaN(weight) || weight < 0)) {
      setError('Weight must be a positive number');
      return;
    }

    const mode = (MODES as readonly string[]).includes(form.transport_mode) ? form.transport_mode : 'OCEAN';

    setLoading(true);
    try {
      const created = await createShipment({
        shipment_ref: nextShipmentRef(),
        transport_mode: mode,
        carrier: form.carrier.trim() || 'NEXUS Network Partner',
        company_name: form.carrier.trim() || 'NEXUS Network Partner',
        cargo_description: form.description.trim() || undefined,
        cargo_weight_kg: weight,
        origin_name: origin.name,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.name,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        // A direct connection between the two real endpoints. The backend stores
        // this as the route geometry; no intermediate waypoints are invented.
        route_waypoints: [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng],
        ],
        original_eta: departure.toISOString(),
        current_eta: arrival.toISOString(),
        data_source: 'SIMULATED',
        status: 'IN_TRANSIT',
      });
      // Documents cannot be part of the creation payload — the backend attaches
      // them per shipment — so any staged files upload immediately afterwards.
      setDocUpload({});
      const failures: { type: string; message: string }[] = [];

      if (attachedTypes.length > 0) {
        const ref = created.shipment_ref as string;
        for (const type of attachedTypes) {
          const file = files[type];
          if (!file) continue;
          setDocUpload(prev => ({ ...prev, [type]: { status: 'uploading' } }));
          try {
            await uploadShipmentDocument(ref, type, file);
            setDocUpload(prev => ({ ...prev, [type]: { status: 'done', message: `${file.name} attached` } }));
          } catch (upErr: any) {
            const message = upErr?.message || 'Upload failed';
            failures.push({ type, message });
            setDocUpload(prev => ({ ...prev, [type]: { status: 'error', message } }));
          }
        }
      }

      navigate(`/shipments/${created.shipment_ref}`, {
        state: {
          uploadFailures: failures,
          uploadedCount: attachedTypes.length - failures.length,
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const originCoord = form.origin;
  const destCoord = form.destination;

  return (
    <div className="nx-page" style={{ maxWidth: 1000 }}>
      <header className="atl-hero">
        <div className="atl-hero-main">
          <div className="nx-eyebrow">Shipment Intake</div>
          <h1 className="atl-display" style={{ marginTop: 6 }}>Register New Shipment</h1>
          <p className="nx-body" style={{ marginTop: 5 }}>
            Creates a live shipment record. A reference is generated automatically and risk is scored on creation.
          </p>
        </div>
      </header>

      <div className="atl-split atl-split--even">
        <Panel title="Shipment Details" icon="shipments">
          <form onSubmit={handleSubmit}>
            {error && <div className="nx-field-error">{error}</div>}

            <div className="nx-fieldset">
              <div className="nx-fieldset-title">Route</div>
              <div className="nx-field-row">
                <div className="nx-field">
                  <label className="nx-field-label">Origin</label>
                  <LocationCombobox
                    value={form.origin?.name || ''}
                    onChange={loc => setEndpoint('origin', loc)}
                    onClear={() => clearEndpoint('origin')}
                    placeholder="Search city, port or airport…"
                    purpose="origin"
                    disabled={loading}
                  />
                </div>
                <div className="nx-field">
                  <label className="nx-field-label">Destination</label>
                  <LocationCombobox
                    value={form.destination?.name || ''}
                    onChange={loc => setEndpoint('destination', loc)}
                    onClear={() => clearEndpoint('destination')}
                    placeholder="Search city, port or airport…"
                    purpose="destination"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="nx-field">
                <label className="nx-field-label" htmlFor="carrier">Carrier</label>
                <input
                  id="carrier"
                  className="nx-input"
                  type="text"
                  placeholder="Optional — defaults to NEXUS Network Partner"
                  value={form.carrier}
                  onChange={e => setField('carrier', e.target.value)}
                />
              </div>
            </div>

            <div className="nx-fieldset">
              <div className="nx-fieldset-title">Movement</div>
              <div className="nx-field">
                <label className="nx-field-label">Transport mode</label>
                <div className="nx-pills" style={{ marginTop: 2 }}>
                  {MODES.map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`nx-pill${form.transport_mode === m ? ' active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, transport_mode: m }))}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="nx-field-row">
                <div className="nx-field">
                  <label className="nx-field-label" htmlFor="weight">Cargo weight (kg)</label>
                  <input
                    id="weight"
                    className="nx-input"
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={form.weight_kg}
                    onChange={e => setField('weight_kg', e.target.value)}
                  />
                </div>
                <div className="nx-field">
                  <label className="nx-field-label" htmlFor="description">Cargo description</label>
                  <input
                    id="description"
                    className="nx-input"
                    type="text"
                    placeholder="Optional"
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="nx-fieldset">
              <div className="nx-fieldset-title">Schedule</div>
              <div className="nx-field-row">
                <div className="nx-field">
                  <label className="nx-field-label">Estimated departure</label>
                  <DarkDatePicker
                    value={form.estimated_departure}
                    onChange={v => setField('estimated_departure', v)}
                    placeholder="Defaults to now"
                  />
                </div>
                <div className="nx-field">
                  <label className="nx-field-label">Estimated arrival</label>
                  <DarkDatePicker
                    value={form.estimated_arrival}
                    onChange={v => setField('estimated_arrival', v)}
                    placeholder="Defaults to +3 days"
                  />
                </div>
              </div>
            </div>

            <div className="nx-fieldset">
              <div className="nx-fieldset-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>Required Document Set</span>
                {attachedTypes.length > 0 && (
                  <button
                    type="button"
                    className="nx-btn nx-btn-sm nx-btn-ghost"
                    disabled={loading || uploading}
                    onClick={() => { setFiles({}); setDocUpload({}); setError(''); }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <DocumentFileSet
                files={files}
                onPick={pickFile}
                disabled={loading}
                status={docUpload}
              />
            </div>

            <div className="nx-form-actions">
              <button type="button" className="nx-btn nx-btn-ghost" onClick={() => navigate(-1)} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="nx-btn nx-btn-primary" disabled={loading || uploading}>
                {loading
                  ? (attachedTypes.length > 0 ? 'Creating & attaching documents…' : 'Creating…')
                  : 'Create shipment'}
              </button>
            </div>
          </form>
        </Panel>

        {/* Live preview of the record that will be created */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Panel title="Record Preview" icon="target">
            <div className="nx-kv">
              <KeyValue label="Generated reference" value={nextShipmentRef()} mono />
              <KeyValue
                label="Origin"
                value={form.origin ? form.origin.name : '—'}
              />
              <KeyValue label="Destination" value={form.destination ? form.destination.name : '—'} />
              <KeyValue
                label="Mode"
                value={<ModeBadge mode={form.transport_mode} />}
              />
              <KeyValue label="Carrier" value={form.carrier.trim() || 'NEXUS Network Partner'} />
              <KeyValue
                label="Weight"
                value={form.weight_kg ? `${Number(form.weight_kg).toLocaleString()} kg` : '—'}
                mono
              />
              <KeyValue
                label="Documents"
                value={
                  attachedTypes.length > 0
                    ? `${attachedTypes.length} of ${DOCUMENT_TYPES.length} attached`
                    : 'None attached'
                }
              />
              {attachedTypes.length > 0 && (
                <KeyValue label="Upload size" value={formatBytes(attachedBytes)} mono />
              )}
            </div>

            {attachedTypes.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {DOCUMENT_TYPES.filter(d => attachedTypes.includes(d.value)).map(d => (
                  <Badge key={d.value} tone="teal">{d.short}</Badge>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Route Geometry" icon="route">
            {originCoord && destCoord ? (
              <div className="nx-kv">
                <KeyValue
                  label={`${originCoord.city} coordinates`}
                  value={`${originCoord.lat.toFixed(3)}, ${originCoord.lng.toFixed(3)}`}
                  mono
                />
                <KeyValue
                  label={`${destCoord.city} coordinates`}
                  value={`${destCoord.lat.toFixed(3)}, ${destCoord.lng.toFixed(3)}`}
                  mono
                />
                <KeyValue
                  label="Endpoint types"
                  value={`${originCoord.kind.toLowerCase()} → ${destCoord.kind.toLowerCase()}`}
                />
              </div>
            ) : (
              <div className="nx-meta">
                Select an origin and destination to resolve route coordinates.
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Badge tone="teal">Risk scored on creation</Badge>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
