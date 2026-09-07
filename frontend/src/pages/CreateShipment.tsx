import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShipment } from '../lib/api';
import DarkDatePicker from '../components/DarkDatePicker';

const CITIES = [
  'Shanghai', 'Singapore', 'Rotterdam', 'Los Angeles', 'Dubai',
  'Hong Kong', 'Busan', 'Hamburg', 'Antwerp', 'Ningbo',
  'New York', 'Felixstowe', 'Shenzhen', 'Qingdao', 'Tianjin',
  'London', 'Tokyo', 'Mumbai', 'Sao Paulo', 'Lagos',
];

function detectMode(from: string, to: string): string {
  const sea = ['Shanghai', 'Singapore', 'Rotterdam', 'Los Angeles', 'Dubai', 'Hong Kong', 'Busan', 'Hamburg', 'Antwerp', 'Ningbo', 'Felixstowe', 'Shenzhen', 'Qingdao', 'Tianjin'];
  const air = ['London', 'Tokyo', 'Mumbai', 'New York'];
  const road = ['Lagos', 'Sao Paulo'];
  if (sea.includes(from) && sea.includes(to)) return 'OCEAN';
  if (air.includes(from) || air.includes(to)) return 'AIR';
  if (road.includes(from) || road.includes(to)) return 'ROAD';
  return 'OCEAN';
}

export default function CreateShipment() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    origin_name: '', destination_name: '', transport_mode: 'OCEAN',
    container_count: 1, weight_kg: '', description: '',
    estimated_departure: '', estimated_arrival: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if ((k === 'origin_name' || k === 'destination_name') && next.origin_name && next.destination_name) {
        next.transport_mode = detectMode(next.origin_name, next.destination_name);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await createShipment({
        ...form,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      });
      navigate(`/shipments/${created.shipment_ref}`);
    } catch (err: any) { setError(err.message || 'Failed to create shipment'); }
    finally { setLoading(false); }
  };

  return (
    <div className="ds-page" style={{ maxWidth: 720 }}>
      <div className="ds-page-header">
        <div>
          <div className="ds-page-title">New Shipment</div>
          <div className="ds-page-sub">Register a new shipment into the network</div>
        </div>
      </div>

      <div className="ds-card">
        <div className="ds-card-body">
          <form onSubmit={handleSubmit}>
            {error && <div className="ds-form-error">{error}</div>}

            <div className="ds-form-section">
              <div className="ds-form-section-title">Route</div>
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label className="ds-form-label">Origin</label>
                  <select className="ds-form-control" value={form.origin_name} onChange={e => set('origin_name', e.target.value)} required>
                    <option value="">Select origin</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Destination</label>
                  <select className="ds-form-control" value={form.destination_name} onChange={e => set('destination_name', e.target.value)} required>
                    <option value="">Select destination</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="ds-form-section">
              <div className="ds-form-section-title">Details</div>
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label className="ds-form-label">Transport Mode</label>
                  <div className="ds-nav-pills" style={{ marginTop: 4 }}>
                    {['OCEAN', 'AIR', 'ROAD', 'RAIL'].map(m => (
                      <button key={m} type="button" className={`ds-nav-pill ${form.transport_mode === m ? 'active' : ''}`} onClick={() => set('transport_mode', m)}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Container Count</label>
                  <input className="ds-form-control" type="number" min={1} max={50} value={form.container_count} onChange={e => set('container_count', Number(e.target.value))} />
                </div>
              </div>
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label className="ds-form-label">Weight (kg)</label>
                  <input className="ds-form-control" type="number" placeholder="Optional" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Description</label>
                  <input className="ds-form-control" type="text" placeholder="Optional" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="ds-form-section">
              <div className="ds-form-section-title">Schedule</div>
              <div className="ds-form-grid">
                <div className="ds-form-group">
                  <label className="ds-form-label">Estimated Departure</label>
                  <DarkDatePicker value={form.estimated_departure} onChange={v => set('estimated_departure', v)} placeholder="Select departure" />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Estimated Arrival</label>
                  <DarkDatePicker value={form.estimated_arrival} onChange={v => set('estimated_arrival', v)} placeholder="Select arrival" />
                </div>
              </div>
            </div>

            <div className="ds-form-actions">
              <button type="button" className="ds-btn" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
