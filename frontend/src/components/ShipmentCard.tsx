import { useNavigate } from 'react-router-dom';
import TransportBadge from './TransportBadge';
import { getRiskColor, getStatusColor } from '../lib/format';

export default function ShipmentCard({ shipment }: { shipment: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/shipments/${shipment.shipment_ref}`)}
      className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-500 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm text-blue-400">{shipment.shipment_ref}</span>
        <div className="flex items-center gap-2">
          <TransportBadge mode={shipment.transport_mode} />
          {shipment.risk_level && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: getRiskColor(shipment.risk_level) + '22', color: getRiskColor(shipment.risk_level) }}
            >
              {shipment.risk_level}
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-slate-400">
        {shipment.origin_name} → {shipment.destination_name}
      </div>
      <div className="mt-2">
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: getStatusColor(shipment.status) + '22', color: getStatusColor(shipment.status) }}
        >
          {shipment.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}