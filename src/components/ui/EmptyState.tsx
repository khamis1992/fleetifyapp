import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  FileX,
  Search,
  Filter,
  Settings,
  Database,
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

export type EmptyStateType =
  | 'no-data'
  | 'no-results'
  | 'no-filter-results'
  | 'not-configured'
  | 'no-items'
  | 'no-customers'
  | 'no-orders'
  | 'no-sales'
  | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: LucideIcon;
  className?: string;
  compact?: boolean;
}

const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    color: string;
  }
> = {
  'no-data': {
    icon: Database,
    title: 'لا توجد بيانات متاحة',
    description: 'لم يتم إضافة أي بيانات بعد. ابدأ بإضافة البيانات للحصول على رؤى قيمة.',
    actionLabel: 'إضافة بيانات',
    color: 'text-blue-500',
  },
  'no-results': {
    icon: Search,
    title: 'لا توجد نتائج',
    description: 'لم نتمكن من العثور على أي نتائج مطابقة لبحثك. جرب كلمات مفتاحية أخرى.',
    actionLabel: 'مسح البحث',
    color: 'text-amber-500',
  },
  'no-filter-results': {
    icon: Filter,
    title: 'لا توجد نتائج للفلتر',
    description: 'لم تسفر معايير الفلتر عن أي نتائج. جرب تعديل الفلاتر.',
    actionLabel: 'مسح الفلاتر',
    color: 'text-purple-500',
  },
  'not-configured': {
    icon: Settings,
    title: 'الوحدة غير مفعلة',
    description: 'هذه الوحدة غير مفعلة حالياً. اتصل بالمسؤول لتفعيلها.',
    actionLabel: 'إعدادات الوحدة',
    color: 'text-orange-500',
  },
  'no-items': {
    icon: Package,
    title: 'لا توجد عناصر',
    description: 'لم يتم إضافة أي عناصر بعد. ابدأ بإضافة عناصر جديدة.',
    actionLabel: 'إضافة عنصر',
    color: 'text-green-500',
  },
  'no-customers': {
    icon: Users,
    title: 'لا يوجد عملاء',
    description: 'لم يتم تسجيل أي عملاء بعد. ابدأ بإضافة عميل جديد.',
    actionLabel: 'إضافة عميل',
    color: 'text-blue-500',
  },
  'no-orders': {
    icon: ShoppingCart,
    title: 'لا توجد طلبات',
    description: 'لم يتم إنشاء أي طلبات بعد. ابدأ بإنشاء طلب جديد.',
    actionLabel: 'إنشاء طلب',
    color: 'text-indigo-500',
  },
  'no-sales': {
    icon: TrendingUp,
    title: 'لا توجد مبيعات',
    description: 'لم يتم تسجيل أي مبيعات في هذه الفترة. راجع فترة زمنية أخرى.',
    actionLabel: 'إضافة بيع',
    color: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    title: 'حدث خطأ',
    description: 'عذراً، حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.',
    actionLabel: 'إعادة المحاولة',
    color: 'text-red-500',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title: customTitle,
  description: customDescription,
  actionLabel: customActionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon: CustomIcon,
  className,
  compact = false,
}) => {
  const config = emptyStateConfig[type];
  const Icon = CustomIcon || config.icon;
  const title = customTitle || config.title;
  const description = customDescription || config.description;
  const actionLabel = customActionLabel || config.actionLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('w-full', className)}
    >
      <Card
        className={cn(
          'flex flex-col items-center justify-center text-center bg-card/50 backdrop-blur-sm border-dashed',
          compact ? 'p-8' : 'p-12'
        )}
      >
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
          className={cn(
            'rounded-full bg-muted/50 flex items-center justify-center mb-6',
            compact ? 'p-4' : 'p-6'
          )}
        >
          <Icon className={cn(config.color, compact ? 'h-10 w-10' : 'h-16 w-16')} />
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn('font-semibold text-foreground mb-2', compact ? 'text-lg' : 'text-xl')}
        >
          {title}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn('text-muted-foreground mb-6', compact ? 'text-sm max-w-sm' : 'text-base max-w-md')}
        >
          {description}
        </motion.p>

        {/* Actions */}
        {(onAction || onSecondaryAction) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            {onAction && actionLabel && (
              <Button onClick={onAction} size={compact ? 'sm' : 'default'}>
                {actionLabel}
              </Button>
            )}
            {onSecondaryAction && secondaryActionLabel && (
              <Button onClick={onSecondaryAction} variant="outline" size={compact ? 'sm' : 'default'}>
                {secondaryActionLabel}
              </Button>
            )}
          </motion.div>
        )}

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-secondary blur-3xl" />
        </div>
      </Card>
    </motion.div>
  );
};

// Compact variant for use in widgets
export const EmptyStateCompact: React.FC<EmptyStateProps> = (props) => (
  <EmptyState {...props} compact className="my-4" />
);
