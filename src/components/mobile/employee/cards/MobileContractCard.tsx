/**
 * Mobile Contract Card
 * بطاقة عرض العقد
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Car,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Edit3,
  ChevronLeft,
  PlayCircle,
  XCircle,
  PauseCircle,
  Scale,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import type { EmployeeContract } from '@/types/mobile-employee.types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MobileContractCardProps {
  contract: EmployeeContract;
  onCall?: () => void;
  onPayment?: () => void;
  onNote?: () => void;
  onSchedule?: () => void;
  onClick?: () => void;
  className?: string;
}

const getStatusStyle = (status: string) => {
  const styles = {
    active: {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: PlayCircle,
      label: 'نشط'
    },
    expired: {
      badge: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
      label: 'منتهي'
    },
    cancelled: {
      badge: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: XCircle,
      label: 'ملغي'
    },
    suspended: {
      badge: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: PauseCircle,
      label: 'موقوف'
    },
    under_legal_procedure: {
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Scale,
      label: 'قانوني'
    },
    pending: {
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: Clock,
      label: 'معلق'
    }
  };
  
  return styles[status as keyof typeof styles] || styles.active;
};

export const MobileContractCard: React.FC<MobileContractCardProps> = ({
  contract,
  onCall,
  onPayment,
  onNote,
  onSchedule,
  onClick,
  className,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const statusStyle = getStatusStyle(contract.status);
  const StatusIcon = statusStyle.icon;

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: ar });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4',
        'hover:shadow-lg hover:border-teal-200/50 active:scale-[0.98]',
        'transition-all duration-200 cursor-pointer',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
            <FileText className="w-5 h-5 text-white" strokeWidth={2} />
          </div>

          {/* Info */}
          <div>
            <p className="font-semibold text-slate-900">
              #{contract.contract_number}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'px-2 py-0.5 rounded-lg text-[10px] font-bold border',
                statusStyle.badge
              )}>
                <StatusIcon className="w-3 h-3 inline ml-1" />
                {statusStyle.label}
              </span>
            </div>
          </div>
        </div>

        {/* Days Overdue Badge */}
        {contract.days_overdue && contract.days_overdue > 0 && (
          <span className="px-2 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold">
            {contract.days_overdue} يوم
          </span>
        )}
      </div>

      {/* Customer Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 font-medium">
            {contract.customer_name}
          </span>
        </div>

        {contract.customer_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700" dir="ltr">
              {contract.customer_phone}
            </span>
          </div>
        )}

        {(contract.vehicle_make || contract.vehicle_model || contract.vehicle_plate) && (
          <div className="flex items-center gap-2 text-sm">
            <Car className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700">
              {contract.vehicle_make} {contract.vehicle_model}
              {contract.vehicle_plate && ` | ${contract.vehicle_plate}`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700">
            {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
          </span>
        </div>
      </div>

      {/* Financial Info */}
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-teal-600">
              {formatCurrency(contract.monthly_amount)} / شهرياً
            </span>
          </div>

          {contract.balance_due > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-500">مستحق:</span>
              <span className="font-bold text-amber-600">
                {formatCurrency(contract.balance_due)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {contract.status === 'active' && (onCall || onPayment || onNote || onSchedule) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          {onCall && contract.customer_phone && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onCall();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              اتصال
            </motion.button>
          )}

          {onPayment && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onPayment();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              دفعة
            </motion.button>
          )}

          {onNote && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onNote();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-50 text-purple-600 text-xs font-medium hover:bg-purple-100 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              ملاحظة
            </motion.button>
          )}

          {onSchedule && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onSchedule();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-amber-600 text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              موعد
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MobileContractCard;
