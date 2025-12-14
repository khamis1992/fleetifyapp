/**
 * لوحة تنبيهات الوثائق المنتهية
 * تعرض الوثائق القريبة أو المنتهية الصلاحية
 */

import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertTriangle,
  FileWarning,
  CreditCard,
  IdCard,
  Phone,
  ChevronLeft,
  X,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocumentAlerts, DocumentAlert } from '@/hooks/useCustomerStats';
import { cn } from '@/lib/utils';

interface DocumentAlertsPanelProps {
  onCustomerClick?: (customerId: string) => void;
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export function DocumentAlertsPanel({
  onCustomerClick,
  maxItems = 5,
  showHeader = true,
  compact = false,
}: DocumentAlertsPanelProps) {
  const { data: alerts = [], isLoading } = useDocumentAlerts(30);

  const getStatusStyles = (status: DocumentAlert['status']) => {
    switch (status) {
      case 'expired':
        return {
          bg: 'bg-coral-50',
          border: 'border-coral-200',
          text: 'text-coral-700',
          badge: 'bg-coral-100 text-coral-700',
          icon: 'text-coral-500',
        };
      case 'expiring_soon':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-700',
          icon: 'text-amber-500',
        };
      case 'expiring':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-700',
          icon: 'text-blue-500',
        };
    }
  };

  const getStatusLabel = (status: DocumentAlert['status'], days: number) => {
    if (status === 'expired') {
      return `منتهية منذ ${Math.abs(days)} يوم`;
    }
    if (days === 0) return 'تنتهي اليوم';
    if (days === 1) return 'تنتهي غداً';
    return `${days} يوم`;
  };

  const getDocumentLabel = (type: DocumentAlert['documentType']) => {
    return type === 'license' ? 'رخصة القيادة' : 'الهوية الوطنية';
  };

  const expiredCount = alerts.filter(a => a.status === 'expired').length;
  const expiringSoonCount = alerts.filter(a => a.status === 'expiring_soon').length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-[1.25rem] p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null; // لا توجد تنبيهات
  }

  const displayedAlerts = alerts.slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[1.25rem] shadow-sm overflow-hidden"
    >
      {showHeader && (
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral-100 rounded-xl">
              <FileWarning className="w-5 h-5 text-coral-600" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">تنبيهات الوثائق</h3>
              <p className="text-xs text-neutral-500">
                {expiredCount > 0 && (
                  <span className="text-coral-600 font-medium">{expiredCount} منتهية</span>
                )}
                {expiredCount > 0 && expiringSoonCount > 0 && ' • '}
                {expiringSoonCount > 0 && (
                  <span className="text-amber-600 font-medium">{expiringSoonCount} قريبة</span>
                )}
              </p>
            </div>
          </div>
          {alerts.length > maxItems && (
            <Badge variant="outline" className="text-xs">
              +{alerts.length - maxItems} آخرين
            </Badge>
          )}
        </div>
      )}

      <div className={cn("divide-y divide-neutral-50", compact ? "p-2" : "p-4")}>
        <AnimatePresence>
          {displayedAlerts.map((alert, index) => {
            const styles = getStatusStyles(alert.status);
            return (
              <motion.div
                key={`${alert.customerId}-${alert.documentType}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:shadow-sm group",
                  styles.bg,
                  styles.border,
                  "border"
                )}
                onClick={() => onCustomerClick?.(alert.customerId)}
              >
                {/* أيقونة */}
                <div className={cn("p-2 rounded-lg bg-white shadow-sm", styles.icon)}>
                  {alert.documentType === 'license' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <IdCard className="w-4 h-4" />
                  )}
                </div>

                {/* المعلومات */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-semibold text-sm truncate", styles.text)}>
                      {alert.customerName}
                    </p>
                    <Badge className={cn("text-[10px] px-1.5 py-0", styles.badge)}>
                      {alert.status === 'expired' ? (
                        <AlertTriangle className="w-3 h-3 ml-0.5" />
                      ) : null}
                      {getStatusLabel(alert.status, alert.daysUntilExpiry)}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {getDocumentLabel(alert.documentType)} • {format(new Date(alert.expiryDate), 'dd/MM/yyyy')}
                  </p>
                </div>

                {/* إجراء سريع */}
                {!compact && alert.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${alert.phone}`, '_self');
                    }}
                  >
                    <Phone className="w-4 h-4 text-neutral-500" />
                  </Button>
                )}

                <ChevronLeft className="w-4 h-4 text-neutral-300 group-hover:text-coral-500 group-hover:translate-x-[-4px] transition-all" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// مكون مصغر للعرض في الهيدر أو البطاقات
export function DocumentAlertsBadge({ onClick }: { onClick?: () => void }) {
  const { data: alerts = [] } = useDocumentAlerts(30);
  
  const expiredCount = alerts.filter(a => a.status === 'expired').length;
  const urgentCount = alerts.filter(a => a.status === 'expired' || a.status === 'expiring_soon').length;

  if (urgentCount === 0) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
        expiredCount > 0 
          ? "bg-coral-100 text-coral-700 hover:bg-coral-200" 
          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
      )}
    >
      <Bell className="w-4 h-4" />
      <span>{urgentCount} تنبيه</span>
      {expiredCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-coral-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {expiredCount}
        </span>
      )}
    </motion.button>
  );
}

