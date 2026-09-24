export const systemColorPattern = {
  colors: {
    text: '#2c4136',
    surface: '#FFFFFF',
    innerSurface: '#f7f8f4',
    secondaryText: '#829074',
    border: '#dfe5d9',
    info: '#4a707c',
    alert: '#b3694c',
    focus: '#5b6b52',
    success: '#2f7966',
  },
  roles: {
    fleet: {
      label: 'مؤشر الأسطول',
      accent: '#4a707c',
    },
    operations: {
      label: 'مؤشر التشغيل',
      accent: '#5b6b52',
    },
    customers: {
      label: 'مؤشر العملاء',
      accent: '#2f7966',
    },
    finance: {
      label: 'مؤشر مالي',
      accent: '#2f7966',
    },
    progress: {
      label: 'التقدم',
      accent: '#2f7966',
    },
    smallCard: {
      label: 'تنبيه مختصر',
      accent: '#b3694c',
    },
  },
} as const;

export type SystemColorRole = keyof typeof systemColorPattern.roles;