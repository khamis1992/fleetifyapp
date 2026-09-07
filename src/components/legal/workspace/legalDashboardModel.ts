import type { LegalCase } from '@/hooks/useLegalCases';

export function legalDashboardModel(cases: LegalCase[], now = new Date()) {
  const terminal = new Set(['closed', 'cancelled', 'canceled', 'won', 'lost', 'settled', 'dismissed', 'withdrawn']);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const current = cases.filter(item => !terminal.has((item.case_status || '').toLowerCase()));
  const hearings = current.filter(item => item.hearing_date && Number.isFinite(Date.parse(item.hearing_date)) && Date.parse(item.hearing_date) >= start)
    .sort((a, b) => Date.parse(a.hearing_date || '') - Date.parse(b.hearing_date || ''));
  const attention = [...current].sort((a, b) => {
    const score = (item: LegalCase) => item.priority === 'urgent' ? 2 : item.priority === 'high' ? 1 : 0;
    return score(b) - score(a) || Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at);
  });
  const types = new Map<string, number>();
  cases.forEach(item => { const type = item.case_type === 'collection' ? 'payment_collection' : item.case_type || 'other'; types.set(type, (types.get(type) || 0) + 1); });
  return { hearings, attention, types: [...types.entries()].sort((a, b) => b[1] - a[1]) };
}
