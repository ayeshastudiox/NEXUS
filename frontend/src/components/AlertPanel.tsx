import { formatDateTime } from '../lib/format';
import { AlertTriangle, Clock, FileText, Zap } from 'lucide-react';

const TYPE_CONFIG: Record<string, { color: string; icon: any }> = {
  HIGH_RISK: { color: '#f87171', icon: AlertTriangle },
  DOCUMENT_ALERT: { color: '#fbbf24', icon: FileText },
  DELAY_ALERT: { color: '#fb923c', icon: Clock },
  DISRUPTION_ALERT: { color: '#a78bfa', icon: Zap },
};

export default function AlertPanel({ alerts }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) {
    return <div className="text-slate-600 text-sm py-4 text-center">No alerts.</div>;
  }
  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((a, i) => {
        const config = TYPE_CONFIG[a.type] || { color: '#64748b', icon: AlertTriangle };
        const Icon = config.icon;
        return (
          <div key={a.id || i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: config.color + '10' }}>
              <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 leading-relaxed">{a.message}</p>
              <p className="text-[10px] text-slate-600 mt-1 font-mono">{formatDateTime(a.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}