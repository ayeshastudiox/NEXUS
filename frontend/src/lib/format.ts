export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatETA(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatKm(km: number): string {
  return `${formatNumber(Math.round(km))} km`;
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'LOW': return '#22c55e';
    case 'MEDIUM': return '#f59e0b';
    case 'HIGH': return '#f97316';
    case 'CRITICAL': return '#ef4444';
    default: return '#94a3b8';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'IN_TRANSIT': return '#3b82f6';
    case 'DELAYED': return '#f59e0b';
    case 'AT_PORT': return '#14b8a6';
    case 'DELIVERED': return '#22c55e';
    case 'AWAITING_CLEARANCE': return '#f97316';
    default: return '#94a3b8';
  }
}

export function getModeIcon(mode: string): string {
  switch (mode) {
    case 'OCEAN': return '🚢';
    case 'AIR': return '✈️';
    case 'ROAD': return '🚚';
    case 'RAIL': return '🚂';
    default: return '📦';
  }
}