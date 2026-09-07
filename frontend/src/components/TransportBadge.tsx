import { getModeIcon } from '../lib/format';

const MODE_COLORS: Record<string, string> = {
  OCEAN: '#38bdf8',
  AIR: '#818cf8',
  ROAD: '#34d399',
  RAIL: '#fbbf24',
};

export default function TransportBadge({ mode }: { mode: string }) {
  const color = MODE_COLORS[mode] || '#64748b';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: color + '12',
        color: color,
        border: `1px solid ${color}20`,
      }}
    >
      <span className="text-sm">{getModeIcon(mode)}</span>
      {mode}
    </span>
  );
}