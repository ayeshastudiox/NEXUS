import { getRiskColor } from '../lib/format';

export default function RiskScore({ score, level }: { score: number; level: string }) {
  const color = getRiskColor(level);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass p-5 animate-fade-in-up relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent" />
      <div className="relative flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none" stroke={color}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular" style={{ color }}>{score}</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">/100</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Risk Assessment</div>
          <div
            className="text-lg font-bold uppercase tracking-wide"
            style={{ color, textShadow: `0 0 20px ${color}30` }}
          >
            {level}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-slate-500">Recalculated on read</span>
          </div>
        </div>
      </div>
    </div>
  );
}