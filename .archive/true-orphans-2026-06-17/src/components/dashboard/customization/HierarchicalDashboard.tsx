import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertCircle, TrendingUp, Car, FileText, Users, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { SkeletonMetrics } from '@/components/loaders';

// مستويات الأهمية
enum PriorityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// تعريف واجهة للبطاقة القابلة للطي
interface CollapsibleSectionProps {
  title: string;
  priority: PriorityLevel;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  alert?: {
    type: 'warning' | 'error' | 'info';
    message: string;
  };
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  priority,
  icon: Icon,
  defaultOpen = false,
  children,
  alert
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // تحديد لون الأولوية
  const priorityColors = {
    [PriorityLevel.CRITICAL]: 'border-red-200 bg-red-50',
    [PriorityLevel.HIGH]: 'border-amber-200 bg-amber-50',
    [PriorityLevel.MEDIUM]: 'border-blue-200 bg-blue-50',
    [PriorityLevel.LOW]: 'border-neutral-200 bg-neutral-50'
  };
  
  // تحديد لون الأيقونة
  const iconColors = {
    [PriorityLevel.CRITICAL]: 'text-red-600',
    [PriorityLevel.HIGH]: 'text-amber-600',
    [PriorityLevel.MEDIUM]: 'text-blue-600',
    [PriorityLevel.LOW]: 'text-neutral-600'
  };
  
  // تحديد ألوان التنبيه
  const alertColors = {
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  };
  
  return (
    <motion.div
      className={cn(
        'rounded-xl border overflow-hidden mb-4 transition-all',
        priorityColors[priority],
        isOpen ? 'shadow-md' : 'shadow-sm'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* رأس القسم */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-opacity-70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('w-5 h-5', iconColors[priority])} />
          <h3 className="font-semibold text-neutral-900">{title}</h3>
          
          {/* عرض أيقونة الأولوية */}
          <div className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            priority === PriorityLevel.CRITICAL && 'bg-red-100 text-red-700',
            priority === PriorityLevel.HIGH && 'bg-amber-100 text-amber-700',
            priority === PriorityLevel.MEDIUM && 'bg-blue-100 text-blue-700',
            priority === PriorityLevel.LOW && 'bg-neutral-100 text-neutral-700'
          )}>
            {priority === PriorityLevel.CRITICAL && 'حرج'}
            {priority === PriorityLevel.HIGH && 'عالي'}
            {priority === PriorityLevel.MEDIUM && 'متوسط'}
            {priority === PriorityLevel.LOW && 'منخفض'}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* عرض التنبيه إن وجد */}
          {alert && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md border text-xs',
              alertColors[alert.type]
            )}>
              <AlertCircle className="w-3 h-3" />
              {alert.message}
            </div>
          )}
          
          {/* أيقونة توسيع/طي */}
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </motion.div>
        </div>
      </button>
      
      {/* محتوى القسم */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// تعريف واجهة للمقياس
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  icon: React.ElementType;
  priority: PriorityLevel;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  priority,
  trend,
  onClick
}) => {
  // تحديد لون الأولوية
  const priorityBorderColors = {
    [PriorityLevel.CRITICAL]: 'border-red-200',
    [PriorityLevel.HIGH]: 'border-amber-200',
    [PriorityLevel.MEDIUM]: 'border-blue-200',
    [PriorityLevel.LOW]: 'border-neutral-200'
  };
  
  // تحديد لون الاتجاه
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-neutral-600'
  };
  
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingUp;
  
  return (
    <motion.div
      className={cn(
        'bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-all',
        priorityBorderColors[priority],
        'h-full'
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-neutral-600" />
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColors[trend])}>
            <TrendIcon className={cn('w-3 h-3', trend === 'down' && 'rotate-180')} />
            {change}
          </div>
        )}
      </div>
      <h4 className="text-sm font-medium text-neutral-500 mb-1">{title}</h4>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
    </motion.div>
  );
};

// المكون الرئيسي للوحة التحكم الهرمية
export const HierarchicalDashboard: React.FC = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  
  // تحديد الأولويات بناءً على البيانات
  const { criticalMetrics, highMetrics, mediumMetrics } = useMemo(() => {
    if (!stats) {
      return { criticalMetrics: [], highMetrics: [], mediumMetrics: [] };
    }
    
    // تحديد المقاييس الحرجة
    const criticalMetrics = [];
    
    // إذا كان معدل الإشغال منخفض جداً
    if (stats.vehicleActivityRate < 50) {
      criticalMetrics.push({
        title: 'معدل إشغال المركبات',
        value: `${stats.vehicleActivityRate}%`,
        change: '-12%',
        icon: Car,
        priority: PriorityLevel.CRITICAL,
        trend: 'down' as const
      });
    }
    
    // إذا كانت الإيرادات منخفضة
    if (stats.monthlyRevenue < 50000) {
      criticalMetrics.push({
        title: 'إيرادات الشهر',
        value: formatCurrency(stats.monthlyRevenue),
        change: '-8%',
        icon: Banknote,
        priority: PriorityLevel.CRITICAL,
        trend: 'down' as const
      });
    }
    
    // المقاييس العالية الأهمية
    const highMetrics = [
      {
        title: 'العقود النشطة',
        value: stats.activeContracts,
        change: '+5%',
        icon: FileText,
        priority: PriorityLevel.HIGH,
        trend: 'up' as const
      }
    ];
    
    // المقاييس المتوسطة الأهمية
    const mediumMetrics = [
      {
        title: 'إجمالي المركبات',
        value: stats.totalVehicles,
        change: '+2%',
        icon: Car,
        priority: PriorityLevel.MEDIUM,
        trend: 'up' as const
      },
      {
        title: 'إجمالي العملاء',
        value: stats.totalCustomers,
        change: '+12%',
        icon: Users,
        priority: PriorityLevel.MEDIUM,
        trend: 'up' as const
      }
    ];
    
    return { criticalMetrics, highMetrics, mediumMetrics };
  }, [stats, formatCurrency]);
  
  if (isLoading) {
    return <SkeletonMetrics count={3} columns={{ sm: 1, md: 1, lg: 1 }} />;
  }
  
  return (
    <div className="space-y-4">
      {/* المقاييس الحرجة - دائماً مفتوحة */}
      {criticalMetrics.length > 0 && (
        <CollapsibleSection
          title="المقاييس الحرجة"
          priority={PriorityLevel.CRITICAL}
          icon={AlertCircle}
          defaultOpen={true}
          alert={{
            type: 'error',
            message: 'يتطلب انتباه فوري'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalMetrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                icon={metric.icon}
                priority={metric.priority}
                trend={metric.trend}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* المقاييس العالية الأهمية - مفتوحة افتراضياً */}
      {highMetrics.length > 0 && (
        <CollapsibleSection
          title="المقاييس الهامة"
          priority={PriorityLevel.HIGH}
          icon={TrendingUp}
          defaultOpen={true}
          alert={{
            type: 'warning',
            message: 'يحتاج مراقبة'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highMetrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                icon={metric.icon}
                priority={metric.priority}
                trend={metric.trend}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* المقاييس المتوسطة الأهمية - مغلقة افتراضياً */}
      {mediumMetrics.length > 0 && (
        <CollapsibleSection
          title="المقاييس العامة"
          priority={PriorityLevel.MEDIUM}
          icon={FileText}
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediumMetrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                icon={metric.icon}
                priority={metric.priority}
                trend={metric.trend}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}
      
      {/* ملخص النشاط */}
      <CollapsibleSection
        title="ملخص النشاط"
        priority={PriorityLevel.LOW}
        icon={FileText}
        defaultOpen={false}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">آخر تحديث</span>
            <span className="text-sm font-medium text-neutral-900">
              {new Date().toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-600">حالة النظام</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              يعمل بشكل طبيعي
            </span>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default HierarchicalDashboard;
