import { AlertTriangle } from 'lucide-react';

export default function DocumentComparison({ discrepancies }: { discrepancies: any[] }) {
  if (!discrepancies || discrepancies.length === 0) {
    return (
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded bg-emerald-500/10 flex items-center justify-center">
            <span className="text-emerald-400 text-xs">✓</span>
          </div>
          <h3 className="text-sm font-semibold text-white/80">Cross-Document Check</h3>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-sm text-emerald-400/80">All documents are consistent. No discrepancies detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-5 animate-fade-in-up border-orange-500/10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-orange-500/10 flex items-center justify-center">
          <AlertTriangle className="w-3 h-3 text-orange-400" />
        </div>
        <h3 className="text-sm font-semibold text-white/80">Cross-Document Check</h3>
      </div>
      <div className="space-y-3">
        {discrepancies.map((d, i) => (
          <div key={i} className="p-3 rounded-xl bg-orange-500/[0.03] border border-orange-500/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-orange-300 capitalize">{d.field_name}</span>
              <span className="text-[10px] text-orange-400/60 uppercase tracking-wider">Mismatch</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(d.values_by_document).map(([doc, val]) => (
                <div key={doc} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{doc.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-white tabular">{String(val)}</span>
                </div>
              ))}
            </div>
            {d.potential_impact && (
              <div className="mt-3 pt-2 border-t border-orange-500/10 text-[11px] text-orange-400/60">
                {d.potential_impact}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}