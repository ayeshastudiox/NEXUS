import { formatDateTime } from '../lib/format';
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';

export default function Timeline({ events }: { events: any[] }) {
  if (!events || events.length === 0) {
    return <div className="glass p-5 text-slate-500 text-sm">No timeline events.</div>;
  }

  const getIcon = (type: string, severity: string) => {
    if (severity === 'WARNING' || severity === 'CRITICAL') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    if (type === 'ARRIVAL') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (type === 'DEPARTURE') return <Clock className="w-3.5 h-3.5 text-sky-400" />;
    if (type === 'ETA_REVISION') return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
    return <Info className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="glass p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-semibold text-white/80">Shipment Timeline</h3>
      </div>
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-sky-500/20 via-white/[0.04] to-transparent" />
        <div className="space-y-0">
          {[...events].reverse().map((e, i) => (
            <div key={e.id || i} className="relative flex gap-4 pb-4 group">
              <div className="relative z-10 w-[30px] h-[30px] rounded-full bg-[#0c1017] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-white/[0.1] transition-colors">
                {getIcon(e.event_type, e.severity)}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/90">{e.location_name}</span>
                  <span className="text-[10px] text-slate-600 font-mono">{formatDateTime(e.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}