import type { DailyDecisionAction } from '@/hooks/useDailyDecisionCenter';
import type { FleetStatus } from '@/hooks/useFleetStatus';

export type DashboardSource = 'stats' | 'fleet' | 'decision' | 'maintenance';
export type SourceState = { loading: boolean; error: boolean };
export type MaintenanceItem = {
  id: string;
  maintenance_type: string | null;
  scheduled_date: string | null;
  status: string | null;
  vehicles?: { plate_number?: string | null } | null;
};

export const formatDashboardCurrency = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('ar-QA', {
    style: 'currency', currency: 'QAR', maximumFractionDigits: 0,
  }).format(value);

export function dashboardRoute(route: string | undefined, fallback = '/tasks') {
  return route?.startsWith('/') && !route.startsWith('//') && !route.includes('\\') ? route : fallback;
}

export function prioritizeActions(actions: DailyDecisionAction[]) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...actions].sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2));
}

/** Include every vehicle in the visual, including less common operational states. */
export function fleetBreakdown(fleet: FleetStatus) {
  const rows = [
    { label: 'متاحة للتأجير', value: fleet.available, color: '#7c9e65', path: '/fleet?status=available' },
    { label: 'مؤجرة', value: fleet.rented, color: '#2f7966', path: '/fleet?status=rented' },
    { label: 'في الصيانة', value: fleet.maintenance, color: '#d5ad69', path: '/fleet/maintenance' },
    { label: 'محجوزة', value: fleet.reserved, color: '#83a9b2', path: '/fleet/reservations' },
  ];
  return [...rows, {
    label: 'حالات أخرى', value: Math.max(0, fleet.total - rows.reduce((sum, row) => sum + row.value, 0)),
    color: '#d2d9cd', path: '/fleet',
  }].map(row => ({ ...row, percent: fleet.total > 0 ? row.value / fleet.total * 100 : 0 }));
}

export function fleetGradient(rows: ReturnType<typeof fleetBreakdown>) {
  if (!rows.some(row => row.value > 0)) return '#edf0e9';
  let offset = 0;
  return `conic-gradient(${rows.map(row => {
    const start = offset;
    offset += row.percent;
    return `${row.color} ${start}% ${offset}%`;
  }).join(', ')})`;
}
