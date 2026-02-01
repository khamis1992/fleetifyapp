/**
 * Mobile Collections Page
 * صفحة التحصيل الشهري
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMonthlyCollections } from '@/hooks/useMonthlyCollections';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { MobileEmployeeLayout } from '@/components/mobile/employee/layout/MobileEmployeeLayout';
import { MobileEmployeeHeader } from '@/components/mobile/employee/layout/MobileEmployeeHeader';
import { MobileCustomerCollectionCard } from '@/components/mobile/employee/cards/MobileCustomerCollectionCard';
import type { CustomerCollection } from '@/types/mobile-employee.types';

export const MobileCollections: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { collections, stats, isLoading, refetch } = useMonthlyCollections();
  const [searchQuery, setSearchQuery] = useState('');

  // Group invoices by customer
  const groupedCollections = useMemo(() => {
    const groups = new Map<string, CustomerCollection>();

    collections.forEach(item => {
      if (!groups.has(item.customer_id)) {
        groups.set(item.customer_id, {
          customer_id: item.customer_id,
          customer_name: item.customer_name,
          customer_phone: undefined,
          customer_email: undefined,
          total_amount: 0,
          total_paid: 0,
          total_pending: 0,
          invoices: []
        });
      }

      const group = groups.get(item.customer_id)!;
      const pendingAmount = item.amount - item.paid_amount;
      group.total_amount += item.amount;
      group.total_paid += item.paid_amount;
      group.total_pending += pendingAmount;
      group.invoices.push({
        invoice_id: item.invoice_id,
        invoice_number: item.invoice_number,
        contract_id: item.contract_id,
        contract_number: item.contract_number,
        amount: item.amount,
        paid_amount: item.paid_amount,
        status: item.status,
        due_date: item.due_date,
        payment_date: item.payment_date,
      });
    });

    return Array.from(groups.values())
      .sort((a, b) => b.total_pending - a.total_pending);
  }, [collections]);

  // Filter customers
  const filteredCustomers = groupedCollections.filter(customer => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return customer.customer_name.toLowerCase().includes(query) ||
           customer.customer_phone?.includes(query);
  });

  const handleCall = (phone?: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handlePayment = (customerId: string, customerName: string) => {
    // Navigate to payment dialog or page
    console.log('Open payment for:', customerId, customerName);
    // TODO: Open payment modal
  };

  return (
    <MobileEmployeeLayout showFAB showBottomNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="px-4 pt-4">
          <MobileEmployeeHeader
            title="التحصيل الشهري"
            subtitle={`${groupedCollections.length} عميل`}
            showNotifications
            showRefresh
            onRefresh={refetch}
          />
        </div>

        {/* Stats Summary */}
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">المستهدف هذا الشهر</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats.totalDue)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">تم التحصيل</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(stats.totalCollected)} ({stats.collectionRate}%)
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.collectionRate}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">المتبقي</span>
                <span className="font-bold text-amber-600">
                  {formatCurrency(stats.totalPending)}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">
                  {stats.paidCount}
                </p>
                <p className="text-xs text-slate-500">مدفوع</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600">
                  {stats.pendingCount}
                </p>
                <p className="text-xs text-slate-500">معلق</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">
                  {stats.overdueCount || 0}
                </p>
                <p className="text-xs text-slate-500">متأخر</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search Bar */}
        <div className="px-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن عميل..."
              className={cn(
                'w-full pr-10 pl-10 py-3 rounded-2xl',
                'bg-white/80 backdrop-blur-xl border border-slate-200/50',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                'transition-all duration-200'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Customers List */}
        <div className="px-4 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-teal-600">جاري التحميل...</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-8 text-center"
            >
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {searchQuery ? 'لا توجد نتائج' : 'لا توجد مستحقات'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'جرب البحث بكلمات مختلفة' : 'جميع الفواتير مدفوعة 🎉'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.customer_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MobileCustomerCollectionCard
                    customer={customer}
                    onPayment={() => handlePayment(customer.customer_id, customer.customer_name)}
                    onCall={() => handleCall(customer.customer_phone)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileEmployeeLayout>
  );
};

export default MobileCollections;
