/**
 * Mobile Customer Collection Card
 * بطاقة عرض تحصيل العميل
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import type { CustomerCollection, Invoice } from '@/types/mobile-employee.types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MobileCustomerCollectionCardProps {
  customer: CustomerCollection;
  onPayment?: () => void;
  onCall?: () => void;
  className?: string;
}

const getInvoiceStatusStyle = (status: string) => {
  const styles = {
    paid: {
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'مدفوع'
    },
    unpaid: {
      badge: 'bg-amber-100 text-amber-700',
      label: 'غير مدفوع'
    },
    partially_paid: {
      badge: 'bg-blue-100 text-blue-700',
      label: 'مدفوع جزئياً'
    },
    overdue: {
      badge: 'bg-red-100 text-red-700',
      label: 'متأخر'
    },
  };
  return styles[status as keyof typeof styles] || styles.unpaid;
};

export const MobileCustomerCollectionCard: React.FC<MobileCustomerCollectionCardProps> = ({
  customer,
  onPayment,
  onCall,
  className,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const [isExpanded, setIsExpanded] = useState(false);

  const getCustomerInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 
      ? parts[0][0] + parts[1][0]
      : name.substring(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-teal-500 to-teal-600',
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-cyan-500 to-cyan-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl overflow-hidden',
        'hover:shadow-lg hover:border-teal-200/50',
        'transition-all duration-200',
        className
      )}
    >
      {/* Customer Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br shadow-lg',
            'flex items-center justify-center text-white font-bold text-lg',
            getAvatarColor(customer.customer_name)
          )}>
            {getCustomerInitials(customer.customer_name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">
              {customer.customer_name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
              <FileText className="w-3 h-3" />
              <span>{customer.invoices.length} فاتورة</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="font-bold text-amber-600">
                {formatCurrency(customer.total_pending)} مستحق
              </span>
            </div>
          </div>

          {/* Expand Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </motion.button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          {onPayment && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onPayment();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/20"
            >
              <DollarSign className="w-4 h-4" />
              تسجيل دفعة
            </motion.button>
          )}

          {onCall && customer.customer_phone && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onCall();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <Phone className="w-4 h-4" />
              اتصال
            </motion.button>
          )}
        </div>
      </div>

      {/* Invoices List (Expandable) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200/50 bg-slate-50/50"
          >
            <div className="p-3 space-y-2">
              {customer.invoices.map((invoice) => {
                const statusStyle = getInvoiceStatusStyle(invoice.status);
                const pendingAmount = invoice.amount - invoice.paid_amount;

                return (
                  <motion.div
                    key={invoice.invoice_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl p-3 border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      {/* Invoice Info */}
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            فاتورة #{invoice.invoice_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            عقد #{invoice.contract_number}
                          </p>
                        </div>
                      </div>

                      {/* Amount & Status */}
                      <div className="text-left flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(pendingAmount)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold',
                            statusStyle.badge
                          )}>
                            {statusStyle.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                      <CalendarIcon className="w-3 h-3" />
                      <span>
                        استحقاق: {format(new Date(invoice.due_date), 'd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MobileCustomerCollectionCard;
