// ===== Types =====
export type ViewMode = 'cards' | 'compact' | 'kanban';
export type SortField = 'total_debt' | 'days_overdue' | 'risk_score' | 'customer_name';
export type SortDirection = 'asc' | 'desc';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TabValue = 'customers' | 'contracts';

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

// ===== Utility Functions =====
export const getRiskColor = (level: RiskLevel | string) => {
  switch (level) {
    case 'CRITICAL': return colors.destructive;
    case 'HIGH': return colors.accentForeground;
    case 'MEDIUM': return colors.warning;
    case 'LOW': return colors.success;
    default: return colors.primary;
  }
};

export const getRiskLabel = (level: RiskLevel | string) => {
  switch (level) {
    case 'CRITICAL': return 'حرج';
    case 'HIGH': return 'عالي';
    case 'MEDIUM': return 'متوسط';
    case 'LOW': return 'منخفض';
    default: return 'غير محدد';
  }
};
