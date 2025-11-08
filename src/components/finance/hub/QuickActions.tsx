import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Receipt,
  FileText,
  Calculator,
  TrendingUp,
  DollarSign,
  FileCheck,
  PieChart,
  Settings,
  Wallet,
  Building,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { useFinanceRole } from '@/contexts/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  action: () => void;
  hotkey?: string;
  variant?: 'default' | 'primary' | 'success';
  roles: ('cashier' | 'accountant' | 'manager' | 'admin')[];
}

export const QuickActions: React.FC = () => {
  const userRole = useFinanceRole();
  const navigate = useNavigate();

  const allActions: QuickAction[] = [
    // Cashier Actions
    {
      icon: Receipt,
      label: 'استلام دفعة',
      description: 'تسجيل دفعة من عميل',
      action: () => navigate('/finance/operations/receive-payment'),
      hotkey: 'Alt+R',
      variant: 'primary',
      roles: ['cashier', 'accountant', 'manager', 'admin'],
    },
    {
      icon: CreditCard,
      label: 'إدارة المدفوعات',
      description: 'عرض وإدارة جميع المدفوعات',
      action: () => navigate('/finance/payments'),
      hotkey: 'Alt+P',
      variant: 'primary',
      roles: ['cashier', 'accountant', 'manager', 'admin'],
    },
    {
      icon: FileText,
      label: 'الفواتير',
      description: 'عرض وإدارة جميع الفواتير',
      action: () => navigate('/finance/invoices'),
      hotkey: 'Alt+I',
      variant: 'primary',
      roles: ['cashier', 'accountant', 'manager', 'admin'],
    },
    {
      icon: Wallet,
      label: 'إيداع بنكي',
      description: 'تسجيل إيداع في البنك',
      action: () => navigate('/finance/deposits'),
      roles: ['cashier', 'accountant', 'manager'],
    },

    // Accountant Actions
    {
      icon: Calculator,
      label: 'قيد يومي',
      description: 'إنشاء قيد محاسبي',
      action: () => navigate('/finance/new-entry'),
      hotkey: 'Alt+J',
      variant: 'primary',
      roles: ['accountant', 'admin'],
    },
    {
      icon: FileCheck,
      label: 'مراجعة القيود',
      description: 'مراجعة القيود المعلقة',
      action: () => navigate('/finance/journal-entries'),
      roles: ['accountant', 'admin'],
    },
    {
      icon: BookOpen,
      label: 'دفتر الأستاذ',
      description: 'عرض دفتر الأستاذ العام',
      action: () => navigate('/finance/ledger'),
      roles: ['accountant', 'admin'],
    },
    {
      icon: CreditCard,
      label: 'دفع مورد',
      description: 'تسجيل دفعة لمورد',
      action: () => navigate('/finance/vendors'),
      roles: ['accountant', 'manager', 'admin'],
    },

    // Manager Actions
    {
      icon: PieChart,
      label: 'التقارير المالية',
      description: 'عرض جميع التقارير',
      action: () => navigate('/finance/reports'),
      hotkey: 'Alt+T',
      variant: 'success',
      roles: ['manager', 'admin'],
    },
    {
      icon: TrendingUp,
      label: 'التحليل المالي',
      description: 'تحليل الأداء المالي',
      action: () => navigate('/finance/analysis'),
      roles: ['manager', 'admin'],
    },
    {
      icon: DollarSign,
      label: 'لوحة المحاسب',
      description: 'نظرة شاملة على الحالة المالية',
      action: () => navigate('/finance/accountant-dashboard'),
      roles: ['accountant', 'manager', 'admin'],
    },

    // Admin Actions
    {
      icon: Settings,
      label: 'الإعدادات المالية',
      description: 'إدارة النظام المالي',
      action: () => navigate('/finance/settings'),
      roles: ['admin'],
    },
    {
      icon: Building,
      label: 'دليل الحسابات',
      description: 'إدارة الحسابات المحاسبية',
      action: () => navigate('/finance/chart-of-accounts'),
      roles: ['accountant', 'admin'],
    },
  ];

  // تصفية الإجراءات حسب الدور
  const visibleActions = allActions.filter(action =>
    action.roles.includes(userRole)
  );

  // الإجراءات الرئيسية (أول 4)
  const primaryActions = visibleActions.slice(0, 4);
  const secondaryActions = visibleActions.slice(4, 8);

  return (
    <div className="space-y-4">
      {/* Primary Quick Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">الإجراءات السريعة</h3>
          <span className="text-xs text-muted-foreground">
            استخدم اختصارات لوحة المفاتيح للوصول السريع
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              variant={action.variant === 'primary' ? 'default' : 'outline'}
              className={cn(
                'h-auto py-6 flex flex-col items-center justify-center gap-3',
                action.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                action.variant === 'success' && 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              <action.icon className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold text-sm">{action.label}</div>
                {action.hotkey && (
                  <div className="text-xs opacity-70 mt-1">
                    <kbd className="px-2 py-1 rounded bg-black/10">
                      {action.hotkey}
                    </kbd>
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
            إجراءات إضافية
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                variant="ghost"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:bg-muted"
              >
                <action.icon className="w-6 h-6" />
                <div className="text-xs text-center font-medium">
                  {action.label}
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

