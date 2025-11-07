import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { QuickActions } from '@/components/finance/hub/QuickActions';
import { UniversalSearch } from '@/components/finance/hub/UniversalSearch';
import { ActivityTimeline } from '@/components/finance/hub/ActivityTimeline';
import { useFinanceRole } from '@/contexts/FinanceContext';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Finance Hub - المركز المالي الذكي
 * 
 * الصفحة الرئيسية الموحدة للقسم المالي تتضمن:
 * - Quick Actions متكيفة مع دور المستخدم
 * - Universal Search للبحث في جميع العمليات
 * - Activity Timeline لآخر الأنشطة
 * - KPI Cards حسب الدور
 * - Smart Shortcuts للعمليات الشائعة
 */

interface KPICard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ElementType;
  color: string;
  action: () => void;
}

const FinanceHub: React.FC = () => {
  const userRole = useFinanceRole();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();

  // KPI Cards based on user role
  const getKPICards = (): KPICard[] => {
    const cards: KPICard[] = [];

    if (userRole === 'cashier') {
      cards.push(
        {
          title: 'مدفوعات اليوم',
          value: formatCurrency(0), // TODO: Add today's payments
          icon: DollarSign,
          color: 'bg-green-100 text-green-600',
          action: () => navigate('/finance/payments'),
        },
        {
          title: 'الإيداعات المعلقة',
          value: 0,
          icon: AlertCircle,
          color: 'bg-orange-100 text-orange-600',
          action: () => navigate('/finance/deposits'),
        }
      );
    }

    if (userRole === 'accountant' || userRole === 'manager' || userRole === 'admin') {
      cards.push(
        {
          title: 'الإيرادات الشهرية',
          value: formatCurrency(stats?.monthlyRevenue || 0),
          change: stats?.revenueChange,
          trend: stats?.revenueChange?.startsWith('+') ? 'up' : 'down',
          icon: TrendingUp,
          color: 'bg-blue-100 text-blue-600',
          action: () => navigate('/finance/reports'),
        },
        {
          title: 'إجمالي العملاء',
          value: stats?.totalCustomers || 0,
          change: stats?.customersChange,
          icon: Users,
          color: 'bg-purple-100 text-purple-600',
          action: () => navigate('/customers'),
        }
      );
    }

    if (userRole === 'accountant' || userRole === 'admin') {
      cards.push(
        {
          title: 'قيود معلقة',
          value: 0, // TODO: Add pending entries count
          icon: FileText,
          color: 'bg-yellow-100 text-yellow-600',
          action: () => navigate('/finance/journal-entries'),
        },
        {
          title: 'تسويات مطلوبة',
          value: 0, // TODO: Add reconciliation count
          icon: AlertCircle,
          color: 'bg-red-100 text-red-600',
          action: () => navigate('/finance/treasury'),
        }
      );
    }

    return cards;
  };

  const kpiCards = getKPICards();

  // Alerts based on role
  const getAlerts = () => {
    const alerts = [];

    if (userRole === 'accountant' || userRole === 'admin') {
      alerts.push(
        {
          type: 'warning',
          title: 'تنبيه: إقفال شهري',
          description: 'يجب إقفال شهر نوفمبر قبل 10 ديسمبر',
          action: 'إقفال الشهر',
          actionFn: () => navigate('/finance/month-end-close'),
        }
      );
    }

    if (userRole === 'manager' || userRole === 'admin') {
      alerts.push(
        {
          type: 'info',
          title: 'تقرير جاهز',
          description: 'تقرير المركز المالي لشهر نوفمبر متاح الآن',
          action: 'عرض التقرير',
          actionFn: () => navigate('/finance/reports'),
        }
      );
    }

    return alerts;
  };

  const alerts = getAlerts();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">المركز المالي</h1>
            <p className="text-muted-foreground mt-1">
              مرحباً، إليك نظرة سريعة على حالتك المالية
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {userRole === 'cashier' && 'أمين صندوق'}
            {userRole === 'accountant' && 'محاسب'}
            {userRole === 'manager' && 'مدير مالي'}
            {userRole === 'admin' && 'مدير النظام'}
          </Badge>
        </div>
      </motion.div>

      {/* Universal Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <UniversalSearch />
      </motion.div>

      {/* KPI Cards */}
      {kpiCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, index) => (
              <Card
                key={index}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={card.action}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold mb-1">{card.value}</p>
                    {card.change && (
                      <div className="flex items-center gap-1">
                        {card.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-medium',
                            card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {card.change}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={cn('p-3 rounded-lg', card.color)}>
                    <card.icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-3"
        >
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className={cn(
                'p-4 border-r-4',
                alert.type === 'warning' && 'border-r-orange-500 bg-orange-50/50',
                alert.type === 'info' && 'border-r-blue-500 bg-blue-50/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {alert.type === 'warning' && (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  {alert.type === 'info' && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={alert.actionFn}>
                  {alert.action}
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <QuickActions />
      </motion.div>

      {/* Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <ActivityTimeline />
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">روابط سريعة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/finance/reports')}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">التقارير</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/finance/chart-of-accounts')}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">دليل الحسابات</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/finance/treasury')}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">الخزينة</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/finance/settings')}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">الإعدادات</span>
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default FinanceHub;

