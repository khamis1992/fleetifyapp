/**
 * سياق المساعد الذكي - Assistant Context
 * يوفر الوعي بالسياق والإجراءات السريعة
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

// ===== أنواع الإجراءات السريعة =====
export type QuickActionType = 
  | 'open-add-vehicle'
  | 'open-add-customer'
  | 'open-add-contract'
  | 'open-add-payment'
  | 'open-add-invoice'
  | 'open-add-task'
  | 'search-vehicle'
  | 'search-customer'
  | 'search-contract'
  | 'show-dashboard'
  | 'show-reports';

// ===== معلومات الصفحة الحالية =====
export interface PageContext {
  path: string;
  name: string;
  description: string;
  section: string;
  suggestedQuestions: string[];
  availableActions: QuickActionType[];
}

// ===== تعريف الصفحات =====
const PAGE_CONTEXTS: Record<string, PageContext> = {
  '/dashboard': {
    path: '/dashboard',
    name: 'الرئيسية',
    description: 'لوحة التحكم الرئيسية',
    section: 'عام',
    suggestedQuestions: [
      'ما هي إحصائيات اليوم؟',
      'كم عدد العقود النشطة؟',
      'ما هي المركبات المتاحة؟',
      'أرني تقرير الإيرادات',
    ],
    availableActions: ['show-reports', 'open-add-contract', 'open-add-customer'],
  },
  '/fleet': {
    path: '/fleet',
    name: 'المركبات',
    description: 'إدارة أسطول المركبات',
    section: 'الأسطول',
    suggestedQuestions: [
      'كيف أضيف مركبة جديدة؟',
      'كيف أغير حالة مركبة؟',
      'كيف أجدد تأمين مركبة؟',
      'أرني المركبات في الصيانة',
    ],
    availableActions: ['open-add-vehicle', 'search-vehicle'],
  },
  '/fleet/maintenance': {
    path: '/fleet/maintenance',
    name: 'الصيانة',
    description: 'جدول صيانة المركبات',
    section: 'الأسطول',
    suggestedQuestions: [
      'كيف أسجل صيانة جديدة؟',
      'ما هي المركبات التي تحتاج صيانة؟',
      'كم تكلفة الصيانة هذا الشهر؟',
    ],
    availableActions: ['search-vehicle'],
  },
  '/fleet/reports': {
    path: '/fleet/reports',
    name: 'تقارير الأسطول',
    description: 'تقارير وإحصائيات الأسطول',
    section: 'الأسطول',
    suggestedQuestions: [
      'أرني تقرير استخدام المركبات',
      'ما هو معدل الإشغال؟',
      'أرني تقرير التأمين والاستمارة',
    ],
    availableActions: ['show-reports'],
  },
  '/customers': {
    path: '/customers',
    name: 'العملاء',
    description: 'قائمة العملاء',
    section: 'العملاء',
    suggestedQuestions: [
      'كيف أضيف عميل جديد؟',
      'كيف أعدل بيانات عميل؟',
      'كيف أرى عقود عميل معين؟',
    ],
    availableActions: ['open-add-customer', 'search-customer'],
  },
  '/customers/crm': {
    path: '/customers/crm',
    name: 'متابعة العملاء',
    description: 'نظام CRM لمتابعة العملاء',
    section: 'العملاء',
    suggestedQuestions: [
      'من هم العملاء المتأخرين بالدفع؟',
      'كم عميل يحتاج اتصال؟',
      'كيف أسجل مكالمة مع عميل؟',
    ],
    availableActions: ['search-customer'],
  },
  '/contracts': {
    path: '/contracts',
    name: 'العقود',
    description: 'إدارة العقود',
    section: 'العقود',
    suggestedQuestions: [
      'كيف أنشئ عقد جديد؟',
      'كيف أجدد عقد؟',
      'ما هي العقود المنتهية؟',
      'كيف ألغي عقد؟',
    ],
    availableActions: ['open-add-contract', 'search-contract'],
  },
  '/finance/hub': {
    path: '/finance/hub',
    name: 'المالية',
    description: 'مركز الإدارة المالية',
    section: 'المالية',
    suggestedQuestions: [
      'ما هي إيرادات هذا الشهر؟',
      'كم المصروفات هذا الشهر؟',
      'أرني تقرير الأرباح',
    ],
    availableActions: ['open-add-payment', 'open-add-invoice', 'show-reports'],
  },
  '/finance/payments': {
    path: '/finance/payments',
    name: 'المدفوعات',
    description: 'سندات القبض والصرف',
    section: 'المالية',
    suggestedQuestions: [
      'كيف أنشئ سند قبض؟',
      'كيف أنشئ سند صرف؟',
      'كيف أرسل سند عبر واتساب؟',
    ],
    availableActions: ['open-add-payment', 'search-customer'],
  },
  '/finance/invoices': {
    path: '/finance/invoices',
    name: 'الفواتير',
    description: 'إدارة الفواتير',
    section: 'المالية',
    suggestedQuestions: [
      'كيف أنشئ فاتورة جديدة؟',
      'ما هي الفواتير المستحقة؟',
      'كيف أطبع فاتورة؟',
    ],
    availableActions: ['open-add-invoice', 'search-customer'],
  },
  '/tasks': {
    path: '/tasks',
    name: 'المهام',
    description: 'إدارة المهام',
    section: 'المهام',
    suggestedQuestions: [
      'كيف أنشئ مهمة جديدة؟',
      'ما هي مهامي اليوم؟',
      'كيف أعين مهمة لموظف؟',
    ],
    availableActions: ['open-add-task'],
  },
  '/settings': {
    path: '/settings',
    name: 'الإعدادات',
    description: 'إعدادات النظام',
    section: 'الإعدادات',
    suggestedQuestions: [
      'كيف أغير كلمة المرور؟',
      'كيف أضيف مستخدم جديد؟',
      'كيف أعدل بيانات الشركة؟',
    ],
    availableActions: [],
  },
};

// الصفحة الافتراضية
const DEFAULT_PAGE_CONTEXT: PageContext = {
  path: '/',
  name: 'النظام',
  description: 'نظام Fleetify',
  section: 'عام',
  suggestedQuestions: [
    'كيف أستخدم النظام؟',
    'ما هي الميزات المتاحة؟',
    'كيف أتنقل بين الصفحات؟',
  ],
  availableActions: ['show-dashboard'],
};

// ===== واجهة السياق =====
interface AssistantContextType {
  // الوعي بالسياق
  currentPage: PageContext;
  isOnPage: (path: string) => boolean;
  
  // الإجراءات السريعة
  executeAction: (action: QuickActionType, params?: Record<string, unknown>) => void;
  isActionDialogOpen: boolean;
  activeAction: QuickActionType | null;
  closeActionDialog: () => void;
  
  // البيانات المشتركة للإجراءات
  actionParams: Record<string, unknown>;
  setActionParams: (params: Record<string, unknown>) => void;
  
  // الاقتراحات
  getSuggestedQuestions: () => string[];
}

const AssistantContext = createContext<AssistantContextType | null>(null);

// ===== المزود =====
export const AssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickActionType | null>(null);
  const [actionParams, setActionParams] = useState<Record<string, unknown>>({});

  // تحديد الصفحة الحالية
  const currentPage: PageContext = PAGE_CONTEXTS[location.pathname] || DEFAULT_PAGE_CONTEXT;

  // التحقق من الصفحة
  const isOnPage = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // تنفيذ إجراء سريع
  const executeAction = useCallback((action: QuickActionType, params?: Record<string, unknown>) => {
    console.log('🚀 Executing quick action:', action, params);
    
    if (params) {
      setActionParams(params);
    }

    switch (action) {
      // فتح نماذج الإضافة
      case 'open-add-vehicle':
        if (!isOnPage('/fleet')) {
          navigate('/fleet');
        }
        setTimeout(() => {
          // محاولة النقر على زر إضافة مركبة
          const addBtn = document.querySelector('[data-tour="add-vehicle-btn"]') as HTMLElement;
          if (addBtn) {
            addBtn.click();
          } else {
            toast({
              title: '🚗 إضافة مركبة',
              description: 'اضغط على زر "إضافة مركبة" في الصفحة',
            });
          }
        }, 500);
        break;

      case 'open-add-customer':
        if (!isOnPage('/customers')) {
          navigate('/customers');
        }
        setTimeout(() => {
          const addBtn = document.querySelector('[data-tour="add-customer-btn"]') as HTMLElement;
          if (addBtn) {
            addBtn.click();
          } else {
            toast({
              title: '👤 إضافة عميل',
              description: 'اضغط على زر "إضافة عميل" في الصفحة',
            });
          }
        }, 500);
        break;

      case 'open-add-contract':
        if (!isOnPage('/contracts')) {
          navigate('/contracts');
        }
        setTimeout(() => {
          const addBtn = document.querySelector('[data-tour="new-contract-btn"]') as HTMLElement;
          if (addBtn) {
            addBtn.click();
          } else {
            toast({
              title: '📄 إنشاء عقد',
              description: 'اضغط على زر "إنشاء عقد جديد" في الصفحة',
            });
          }
        }, 500);
        break;

      case 'open-add-payment':
        if (!isOnPage('/finance/payments')) {
          navigate('/finance/payments');
        }
        setTimeout(() => {
          const addBtn = document.querySelector('[data-tour="new-payment-btn"]') as HTMLElement;
          if (addBtn) {
            addBtn.click();
          } else {
            toast({
              title: '💳 سند جديد',
              description: 'اضغط على زر "سند جديد" في الصفحة',
            });
          }
        }, 500);
        break;

      case 'open-add-invoice':
        if (!isOnPage('/finance/invoices')) {
          navigate('/finance/invoices');
        }
        setTimeout(() => {
          toast({
            title: '🧾 فاتورة جديدة',
            description: 'اضغط على زر "إنشاء فاتورة" في الصفحة',
          });
        }, 500);
        break;

      case 'open-add-task':
        if (!isOnPage('/tasks')) {
          navigate('/tasks');
        }
        setTimeout(() => {
          const addBtn = document.querySelector('[data-tour="add-task-btn"]') as HTMLElement;
          if (addBtn) {
            addBtn.click();
          } else {
            toast({
              title: '✅ مهمة جديدة',
              description: 'اضغط على زر "إضافة مهمة" في الصفحة',
            });
          }
        }, 500);
        break;

      // البحث
      case 'search-vehicle':
        navigate('/fleet');
        toast({
          title: '🔍 البحث عن مركبة',
          description: 'استخدم خانة البحث في الأعلى',
        });
        break;

      case 'search-customer':
        navigate('/customers');
        toast({
          title: '🔍 البحث عن عميل',
          description: 'استخدم خانة البحث في الأعلى',
        });
        break;

      case 'search-contract':
        navigate('/contracts');
        toast({
          title: '🔍 البحث عن عقد',
          description: 'استخدم خانة البحث في الأعلى',
        });
        break;

      // عرض صفحات
      case 'show-dashboard':
        navigate('/dashboard');
        toast({
          title: '🏠 الرئيسية',
          description: 'تم الانتقال إلى لوحة التحكم',
        });
        break;

      case 'show-reports':
        navigate('/fleet/reports');
        toast({
          title: '📊 التقارير',
          description: 'تم الانتقال إلى صفحة التقارير',
        });
        break;

      default:
        console.warn('Unknown action:', action);
    }
  }, [navigate, toast, isOnPage]);

  // إغلاق نافذة الإجراء
  const closeActionDialog = useCallback(() => {
    setIsActionDialogOpen(false);
    setActiveAction(null);
    setActionParams({});
  }, []);

  // الحصول على الأسئلة المقترحة
  const getSuggestedQuestions = useCallback(() => {
    return currentPage.suggestedQuestions;
  }, [currentPage]);

  return (
    <AssistantContext.Provider
      value={{
        currentPage,
        isOnPage,
        executeAction,
        isActionDialogOpen,
        activeAction,
        closeActionDialog,
        actionParams,
        setActionParams,
        getSuggestedQuestions,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

// ===== Hook =====
export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};

// دالة لتوليد سياق الصفحة للـ AI
export const generatePageContextPrompt = (page: PageContext): string => {
  return `
📍 الصفحة الحالية: ${page.name}
📝 الوصف: ${page.description}
📂 القسم: ${page.section}

الإجراءات المتاحة في هذه الصفحة:
${page.availableActions.map(a => `- ${a}`).join('\n')}

اقتراحات للمستخدم:
${page.suggestedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`;
};

