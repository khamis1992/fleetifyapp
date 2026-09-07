import { LayoutDashboard, FolderKanban, Gavel, Wallet, Files, CalendarDays, FileCheck2, FileText, Bell, Settings, SearchCheck, FolderOpen } from 'lucide-react';

export const legalDestinations = [
  { label: 'لوحة المتابعة', to: '/legal/cases?view=dashboard', icon: LayoutDashboard, group: 'المتابعة' },
  { label: 'سجل القضايا', to: '/legal/cases?view=cases', icon: FolderKanban, group: 'المتابعة' },
  { label: 'الجلسات والمواعيد', to: '/legal/cases?view=calendar', icon: CalendarDays, group: 'المتابعة' },
  { label: 'تجهيز الدعاوى', to: '/legal/delinquency', icon: Gavel, group: 'التقاضي' },
  { label: 'بيانات التقاضي', to: '/legal/lawsuit-data', icon: FileText, group: 'التقاضي' },
  { label: 'الإيداع المجمع', to: '/legal/batch-filing', icon: FolderOpen, group: 'التقاضي' },
  { label: 'التحصيل القانوني', to: '/legal/cases?view=collection', icon: Wallet, group: 'المطالبات' },
  { label: 'المتأخرون عن الدفع', to: '/legal/defaulters', icon: SearchCheck, group: 'المطالبات' },
  { label: 'غرامات التأخير', to: '/legal/late-fees', icon: Wallet, group: 'المطالبات' },
  { label: 'نزاعات الفواتير', to: '/legal/disputes', icon: FileText, group: 'المطالبات' },
  { label: 'التذكيرات والمتابعة', to: '/legal/whatsapp-reminders', icon: Bell, group: 'المطالبات' },
  { label: 'مستندات الشركة', to: '/legal/documents', icon: Files, group: 'المستندات' },
  { label: 'مساعد الكتب الرسمية', to: '/legal/document-generator', icon: FileText, group: 'المستندات' },
  { label: 'العقود غير الموقعة', to: '/legal/contracts-without-signed-lease', icon: FileCheck2, group: 'المستندات' },
  { label: 'الإنذارات القانونية', to: '/legal/cases?view=notices', icon: Bell, group: 'المستندات' },
  { label: 'البلاغات القانونية', to: '/legal/reports', icon: FileText, group: 'الإدارة' },
  { label: 'الإعدادات', to: '/legal/cases?view=settings', icon: Settings, group: 'الإدارة' },
] as const;

export function isLegalDestinationActive(to: string, pathname: string, search: string) {
  const [path, query] = to.split('?');
  if (path !== pathname && !(pathname === '/legal/cases-v2' && path === '/legal/cases')) return false;
  return !query || new URLSearchParams(query).get('view') === (new URLSearchParams(search).get('view') || 'dashboard');
}

