import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, Calendar, DollarSign, Car, Users, FileText, ChevronRight, RefreshCw, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// أنواع الرؤى
enum InsightType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  WARNING = 'warning',
  NEUTRAL = 'neutral',
  PREDICTIVE = 'predictive'
}

// تعريف واجهة للرؤية
interface SmartInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestedActions: {
    id: string;
    label: string;
    action: string;
  }[];
  data?: any;
  expiresAt?: Date;
}

// تعريف واجهة للمكون
interface SmartInsightsProps {
  className?: string;
  compact?: boolean;
}

// مكون لبطاقة الرؤية الواحدة
const InsightCard: React.FC<{ 
  insight: SmartInsight; 
  onActionClick?: (insightId: string, actionId: string) => void;
  onDismiss?: (insightId: string) => void;
}> = ({ insight, onActionClick, onDismiss }) => {
  // تحديد الألوان بناءً على النوع
  const typeColors = {
    [InsightType.POSITIVE]: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      accent: 'bg-green-100 text-green-700'
    },
    [InsightType.NEGATIVE]: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      accent: 'bg-red-100 text-red-700'
    },
    [InsightType.WARNING]: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      accent: 'bg-amber-100 text-amber-700'
    },
    [InsightType.NEUTRAL]: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      accent: 'bg-blue-100 text-blue-700'
    },
    [InsightType.PREDICTIVE]: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      accent: 'bg-purple-100 text-purple-700'
    }
  };
  
  const colors = typeColors[insight.type];
  
  // تحديد أيقونة التأثير
  const ImpactIcon = insight.impact === 'high' ? AlertTriangle : 
                   insight.impact === 'medium' ? Lightbulb : CheckCircle;
  
  // تحديد أيقونة النوع
  const TypeIcon = insight.type === InsightType.POSITIVE ? TrendingUp :
                  insight.type === InsightType.NEGATIVE ? TrendingDown :
                  insight.type === InsightType.WARNING ? AlertTriangle :
                  insight.type === InsightType.PREDICTIVE ? Brain : Lightbulb;
  
  return (
    <motion.div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-md',
        colors.bg,
        colors.border
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <TypeIcon className={cn('w-5 h-5', colors.icon)} />
          <h3 className="font-semibold text-neutral-900 text-sm">{insight.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('px-2 py-1 rounded-full text-xs font-medium', colors.accent)}>
            {insight.impact === 'high' && 'عالي التأثير'}
            {insight.impact === 'medium' && 'متوسط التأثير'}
            {insight.impact === 'low' && 'منخفض التأثير'}
          </div>
          <button
            onClick={() => onDismiss && onDismiss(insight.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <X className="w-3 h-3 text-neutral-400" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-neutral-700 mb-3">{insight.description}</p>
      
      {/* الإجراءات المقترحة */}
      {insight.suggestedActions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-500">إجراءات مقترحة:</p>
          <div className="space-y-1">
            {insight.suggestedActions.map(action => (
              <button
                key={action.id}
                onClick={() => onActionClick && onActionClick(insight.id, action.id)}
                className="w-full flex items-center justify-between p-2 bg-white rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors text-sm"
              >
                <span className="font-medium text-neutral-700">{action.label}</span>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// المكون الرئيسي للرؤى الذكية
export const SmartInsights: React.FC<SmartInsightsProps> = ({ 
  className, 
  compact = false 
}) => {
  const { user } = useAuth();
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // استعلام للحصول على البيانات التحليلية
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['smart-insights', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;
      
      // الحصول على بيانات العقود
      const { data: contracts } = await supabase
        .from('contracts')
        .select('start_date, end_date, monthly_amount, status')
        .eq('company_id', user.profile.company_id)
        .eq('status', 'active');
      
      // الحصول على بيانات المركبات
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status, is_active')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);
      
      // الحصول على بيانات الدفعات
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date, status')
        .eq('company_id', user.profile.company_id)
        .eq('status', 'completed')
        .gte('payment_date', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());
      
      // تحليل البيانات وإنشاء رؤى
      const insights: SmartInsight[] = [];
      
      if (contracts && vehicles && payments) {
        // رؤية 1: معدل إشغال المركبات
        const totalVehicles = vehicles.length;
        const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
        const occupancyRate = totalVehicles > 0 ? (rentedVehicles / totalVehicles) * 100 : 0;
        
        if (occupancyRate < 60) {
          insights.push({
            id: 'low-occupancy',
            type: InsightType.WARNING,
            title: 'انخفاض معدل إشغال المركبات',
            description: `معدل الإشغال الحالي هو ${Math.round(occupancyRate)}%، وهو أقل من المعدل المستهدف (60%). هذا قد يؤثر على إيرادات الشركة.`,
            impact: 'high',
            suggestedActions: [
              {
                id: 'review-pricing',
                label: 'مراجعة أسعار التأجير',
                action: '/contracts?action=review-pricing'
              },
              {
                id: 'marketing-campaign',
                label: 'إطلاق حملة تسويقية',
                action: '/marketing?action=new-campaign'
              }
            ]
          });
        } else if (occupancyRate > 90) {
          insights.push({
            id: 'high-occupancy',
            type: InsightType.POSITIVE,
            title: 'أداء ممتاز في إشغال المركبات',
            description: `معدل الإشغال الحالي هو ${Math.round(occupancyRate)}%، وهو أعلى من المعدل المستهدف.`,
            impact: 'high',
            suggestedActions: [
              {
                id: 'consider-expansion',
                label: 'النظر في توسيع الأسطول',
                action: '/fleet?action=add-vehicles'
              }
            ]
          });
        }
        
        // رؤية 2: الدفعات المتأخرة
        const today = new Date();
        const overdueContracts = contracts?.filter(c => 
          new Date(c.end_date) < today
        ) || [];
        
        if (overdueContracts.length > 0) {
          insights.push({
            id: 'overdue-payments',
            type: InsightType.NEGATIVE,
            title: 'وجود دفعات متأخرة',
            description: `يوجد ${overdueContracts.length} عقود بتاريخ انتهاء تجاوز اليوم. قد تكون هناك دفعات متأخرة.`,
            impact: 'high',
            suggestedActions: [
              {
                id: 'review-overdue',
                label: 'مراجعة العقود المتأخرة',
                action: '/contracts?status=overdue'
              },
              {
                id: 'send-reminders',
                label: 'إرسال تذكيرات للعملاء',
                action: '/notifications?action=send-reminders'
              }
            ]
          });
        }
        
        // رؤية 3: توقعات الإيرادات
        const totalMonthlyRevenue = contracts?.reduce((sum, c) => sum + (c.monthly_amount || 0), 0) || 0;
        const lastMonthPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        
        const revenueChange = totalMonthlyRevenue - lastMonthPayments;
        const revenueChangePercent = lastMonthPayments > 0 ? (revenueChange / lastMonthPayments) * 100 : 0;
        
        if (revenueChangePercent > 10) {
          insights.push({
            id: 'revenue-growth',
            type: InsightType.POSITIVE,
            title: 'نمو في الإيرادات',
            description: `الإيرادات الشهرية الحالية (${totalMonthlyRevenue} ريال) أعلى من الشهر الماضي بنسبة ${Math.round(revenueChangePercent)}%.`,
            impact: 'medium',
            suggestedActions: [
              {
                id: 'analyze-growth',
                label: 'تحليل أسباب النمو',
                action: '/reports?type=revenue-analysis'
              }
            ]
          });
        } else if (revenueChangePercent < -10) {
          insights.push({
            id: 'revenue-decline',
            type: InsightType.NEGATIVE,
            title: 'انخفاض في الإيرادات',
            description: `الإيرادات الشهرية الحالية (${totalMonthlyRevenue} ريال) أقل من الشهر الماضي بنسبة ${Math.abs(Math.round(revenueChangePercent))}%.`,
            impact: 'high',
            suggestedActions: [
              {
                id: 'analyze-decline',
                label: 'تحليل أسباب الانخفاض',
                action: '/reports?type=revenue-analysis'
              }
            ]
          });
        }
        
        // رؤية 4: تنبؤات ذكية
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const expiringContracts = contracts?.filter(c => 
          new Date(c.end_date).getMonth() === nextMonth.getMonth() &&
          new Date(c.end_date).getFullYear() === nextMonth.getFullYear()
        ) || [];
        
        if (expiringContracts.length > 0) {
          insights.push({
            id: 'expiring-contracts',
            type: InsightType.PREDICTIVE,
            title: 'عقود تنتهي قريباً',
            description: `يوجد ${expiringContracts.length} عقود تنتهي في الشهر القادم. قد تحتاج إلى التخطيط لتجديد هذه العقود.`,
            impact: 'medium',
            suggestedActions: [
              {
                id: 'review-expiring',
                label: 'مراجعة العقود المنتهية',
                action: '/contracts?status=expiring'
              }
            ],
            expiresAt: nextMonth
          });
        }
      }
      
      return {
        insights,
        contracts: contracts?.length || 0,
        vehicles: vehicles?.length || 0,
        payments: payments?.length || 0
      };
    },
    enabled: !!user?.profile?.company_id
  });
  
  // تصفية الرؤى المستبعدة
  const filteredInsights = useMemo(() => {
    if (!analyticsData?.insights) return [];
    return analyticsData.insights.filter(insight => !dismissedInsights.has(insight.id));
  }, [analyticsData, dismissededInsights]);
  
  // ترتيب الرؤى حسب الأولوية
  const sortedInsights = useMemo(() => {
    return [...filteredInsights].sort((a, b) => {
      // الأول حسب التأثير
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      
      // ثم حسب النوع
      const typeOrder = { 
        [InsightType.NEGATIVE]: 0, 
        [InsightType.WARNING]: 1, 
        [InsightType.PREDICTIVE]: 2,
        [InsightType.NEUTRAL]: 3,
        [InsightType.POSITIVE]: 4
      };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }, [filteredInsights]);
  
  // معالجة النقر على الإجراء
  const handleActionClick = (insightId: string, actionId: string) => {
    const insight = analyticsData?.insights.find(i => i.id === insightId);
    if (!insight) return;
    
    const action = insight.suggestedActions.find(a => a.id === actionId);
    if (!action) return;
    
    // تنفيذ الإجراء (هنا يمكن إضافة منطق أكثر تعقيداً)
    if (action.action.startsWith('/')) {
      // التنقل إلى صفحة محددة
      window.location.href = action.action;
    } else {
      // تنفيذ وظيفة أخرى
      console.log('Execute action:', action.action);
    }
  };
  
  // استبعاد الرؤية
  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set(prev).add(insightId));
    // حفظ في التخزين المحلي
    if (typeof window !== 'undefined') {
      const dismissed = JSON.parse(localStorage.getItem('dismissedInsights') || '[]');
      dismissed.push(insightId);
      localStorage.setItem('dismissedInsights', JSON.stringify(dismissed));
    }
  };
  
  // تحديث الرؤى
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // تحميل الرؤى المستبعدة من التخزين المحلي
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedInsights') || '[]');
        setDismissedInsights(new Set(dismissed));
      } catch (error) {
        console.error('Error loading dismissed insights:', error);
      }
    }
  }, []);
  
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // عرض مدمج للرؤى
  if (compact) {
    return (
      <div className={cn('bg-white rounded-xl border border-neutral-200 p-4', className)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">رؤى ذكية</h3>
          <button
            onClick={handleRefresh}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-3 h-3 text-neutral-400', isRefreshing && 'animate-spin')} />
          </button>
        </div>
        
        {sortedInsights.length > 0 ? (
          <div className="space-y-2">
            {sortedInsights.slice(0, 3).map(insight => (
              <div key={insight.id} className="flex items-center gap-2 text-sm">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  insight.type === InsightType.POSITIVE && 'bg-green-500',
                  insight.type === InsightType.NEGATIVE && 'bg-red-500',
                  insight.type === InsightType.WARNING && 'bg-amber-500',
                  insight.type === InsightType.PREDICTIVE && 'bg-purple-500'
                )}></div>
                <p className="text-neutral-700">{insight.title}</p>
              </div>
            ))}
            
            {sortedInsights.length > 3 && (
              <p className="text-xs text-neutral-500">+{sortedInsights.length - 3} رؤى أخرى</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-400">
            <Brain className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد رؤى حالياً</p>
          </div>
        )}
      </div>
    );
  }
  
  // عرض كامل للرؤى
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">رؤى ذكية</h3>
        <button
          onClick={handleRefresh}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('w-3 h-3 text-neutral-400', isRefreshing && 'animate-spin')} />
        </button>
      </div>
      
      <AnimatePresence>
        {sortedInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedInsights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onActionClick={handleActionClick}
                onDismiss={handleDismissInsight}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-neutral-400 bg-white rounded-xl border border-neutral-200"
          >
            <Brain className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">لا توجد رؤى حالياً</p>
            <p className="text-xs mt-1">سيتم عرض الرؤى عند توفر البيانات الكافية</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartInsights;
