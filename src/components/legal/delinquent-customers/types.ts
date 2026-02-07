// ===== System Colors =====
export const colors = {
  primary: '174 80% 40%',      // Teal
  primaryLight: '173 75% 48%',
  primaryDark: '175 84% 32%',
  accent: '25 90% 92%',        // Orange
  accentForeground: '25 85% 55%',
  success: '142 56% 42%',
  warning: '25 85% 55%',
  destructive: '0 65% 51%',
  background: '0 0% 96%',
  card: '0 0% 100%',
  border: '0 0% 85%',
  muted: '0 0% 92%',
  foreground: '0 0% 15%',
};

// ===== View Mode Types =====
export type ViewMode = 'cards' | 'compact' | 'kanban';
export type SortField = 'total_debt' | 'days_overdue' | 'risk_score' | 'last_contact_days' | 'customer_name';
export type SortDirection = 'asc' | 'desc';
