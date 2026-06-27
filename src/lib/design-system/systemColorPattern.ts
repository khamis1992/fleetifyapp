export const systemColorPattern = {
  colors: {
    text: '#020617',
    surface: '#FFFFFF',
    innerSurface: '#F6F8FB',
    secondaryText: '#94A3B8',
    border: '#E5EAF1',
    info: '#38BDF8',
    alert: '#FB6B7A',
    focus: '#7C83F6',
    success: '#22C7A1',
  },
  roles: {
    fleet: {
      label: 'مؤشر الأسطول',
      accent: '#38BDF8',
    },
    operations: {
      label: 'مؤشر التشغيل',
      accent: '#7C83F6',
    },
    customers: {
      label: 'مؤشر العملاء',
      accent: '#22C7A1',
    },
    finance: {
      label: 'مؤشر مالي',
      accent: '#FB6B7A',
    },
    progress: {
      label: 'التقدم',
      accent: '#22C7A1',
    },
    smallCard: {
      label: 'تنبيه مختصر',
      accent: '#FB6B7A',
    },
  },
} as const;

export type SystemColorRole = keyof typeof systemColorPattern.roles;
