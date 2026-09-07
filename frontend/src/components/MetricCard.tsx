export default function MetricCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color: color || '#f0f4f8' }}>{value}</div>
    </div>
  );
}