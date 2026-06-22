/**
 * useWhatsNew Hook
 * Manages What's New modal state and changelog data
 */

import { useState, useEffect, useCallback } from 'react';
import { ChangelogEntry } from '@/components/features/WhatsNewModal';

const CHANGELOG_KEY = 'fleetify_changelog_version';
const LAST_VIEWED_KEY = 'fleetify_last_viewed_changelog';

/**
 * Default changelog entries
 * In a real application, this would come from a backend API
 */
const DEFAULT_CHANGELOG: ChangelogEntry[] = [
  {
    id: 'v2-0-0-global-customization',
    version: '2.0.0',
    date: '2025-10-27',
    title: 'تخصيص الصفحات العالمي',
    description: 'يمكنك الآن تخصيص أي صفحة في النظام بسحب وإفلات الأدوات',
    category: 'feature',
    details: [
      'إعادة ترتيب الأدوات بسهولة في وضع التحرير',
      'إظهار/إخفاء الأدوات المختلفة',
      'حفظ التخطيط المفضل لديك',
      'العودة إلى الإعدادات الافتراضية في أي وقت',
    ],
    badge: 'جديد',
  },
  {
    id: 'v1-9-8-breadcrumbs',
    version: '1.9.8',
    date: '2025-10-27',
    title: 'شريط التنقل المحسّن',
    description: 'اضغط على أي جزء من المسار للعودة السريعة إلى الصفحات السابقة',
    category: 'improvement',
    details: [
      'ربط صفحات كاملة في شريط التنقل',
      'تمييز واضح للصفحة الحالية',
      'تصميم محسّن في جميع الأجهزة',
    ],
  },
  {
    id: 'v1-9-7-navigation-flatten',
    version: '1.9.7',
    date: '2025-10-27',
    title: 'تسطيح قائمة التنقل',
    description: 'قائمة جانبية مبسطة بحد أقصى مستويين للأفضل في الملاحة',
    category: 'improvement',
    details: [
      'حد أقصى مستويين من العمق',
      'نقل العناصر النادرة إلى الإعدادات',
      'دمج العناصر ذات الصلة',
      'اكتشاف أسهل للميزات',
    ],
  },
  {
    id: 'v1-9-6-demo-mode',
    version: '1.9.6',
    date: '2025-10-27',
    title: 'نمط التجربة المجانية',
    description: 'جرب Fleetify مجاناً لمدة 7 أيام بدون الحاجة لتسجيل',
    category: 'feature',
    details: [
      'الوصول الفوري بدون بريد إلكتروني',
      'بيانات تجريبية واقعية جاهزة',
      '7 أيام كاملة من الوصول الكامل',
      'لا توجد قيود أو حدود على الاستخدام',
    ],
    badge: 'جديد',
  },
  {
    id: 'v1-9-5-dashboard-widgets',
    version: '1.9.5',
    date: '2025-10-26',
    title: 'أدوات لوحة التحكم المحسّنة',
    description: 'ابدأ بالميزات الذكية والتقارير المركزة',
    category: 'improvement',
    details: [
      'أداة ملخص سريعة للبيانات المهمة',
      'رسوم بيانية تفاعلية',
      'تنبيهات ذكية قابلة للتخصيص',
    ],
  },
];

export interface WhatsNewHookReturn {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  changelog: ChangelogEntry[];
  unreadCount: number;
  markAsViewed: () => void;
  hasNewUpdates: boolean;
}

/**
 * Hook to manage What's New feature
 */
export const useWhatsNew = (): WhatsNewHookReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [changelog] = useState<ChangelogEntry[]>(DEFAULT_CHANGELOG);

  // Initialize unread count on mount
  useEffect(() => {
    const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
    const lastViewedVersion = lastViewed || '0.0.0';

    // Count unread items (items with badge or newer than last viewed)
    const unread = changelog.filter((entry) => {
      return entry.badge === 'جديد' || entry.version > lastViewedVersion;
    }).length;

    setUnreadCount(unread);
  }, [changelog]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const markAsViewed = useCallback(() => {
    const latestVersion = changelog[0]?.version || '0.0.0';
    localStorage.setItem(LAST_VIEWED_KEY, latestVersion);
    localStorage.setItem(CHANGELOG_KEY, latestVersion);
    setUnreadCount(0);
  }, [changelog]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    changelog,
    unreadCount,
    markAsViewed,
    hasNewUpdates: unreadCount > 0,
  };
};

export default useWhatsNew;
