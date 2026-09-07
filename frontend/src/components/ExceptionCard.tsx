import { useNavigate } from 'react-router-dom';
import TransportBadge from './TransportBadge';
import { getRiskColor, getStatusColor } from '../lib/format';
import { ChevronRight } from 'lucide-react';

export default function ExceptionCard({ shipment }: { shipment: any }) {
  const navigate = useNavigate();
  const riskColor = getRiskColor(shipment.risk_level || 'LOW');

  return (
    <div
      onClick={() => navigate(`/shipments/${shipment.shipment_ref}`)}
      className="glass p-4 hover:border-white/[0.1] cursor-pointer transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-sky-400 group-hover:text-sky-300 transition-colors">{shipment.shipment_ref}</span>
          <TransportBadge mode={shipment.transport_mode} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tabular" style={{ color: riskColor }}>{shipment.risk_score || 0}</span>
          <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
      <div className="text-xs text-slate-500 mb-2">{shipment.origin_name} → {shipment.destination_name}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ backgroundColor: getStatusColor(shipment.status) + '12', color: getStatusColor(shipment.status) }}
        >
          {shipment.status.replace('_', ' ')}
        </span>
        {shipment.has_active_disruption && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 uppercase tracking-wider">Disruption</span>
        )}
        {shipment.has_discrepancy && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 uppercase tracking-wider">Discrepancy</span>
        )}
      </div>
    </div>
  );
}