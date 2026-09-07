import { AlertTriangle } from 'lucide-react';

export default function RiskBreakdown({ factors }: { factors: any[] }) {
  if (!factors || factors.length === 0) {
    return (
      <div className="glass p-5">
        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-3">Risk Breakdown</div>
        <p className="text-sm text-slate-500">No risk factors identified.</p>
      </div>
    );
  }
  const total = factors.reduce((sum, f) => sum + f.points, 0);
  const maxPoints = Math.max(...factors.map(f => f.points));

  return (
    <div className="glass p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <h3 className="text-[10px] text-slate-600 uppercase tracking-wider">Risk Breakdown</h3>
      </div>
      <div className="space-y-3">
        {factors.map((f, i) => (
          <div key={i} className="group">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-slate-400 group-hover:text-slate-300 transition-colors">{f.name}</span>
              <span className="font-mono text-orange-400 tabular">+{f.points}</span>
            </div>
            <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500/60 to-orange-400/40 transition-all duration-700"
                style={{ width: `${(f.points / maxPoints) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">{f.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total Risk Score</span>
        <span className="font-mono text-lg font-bold text-white tabular">{total}</span>
      </div>
    </div>
  );
}