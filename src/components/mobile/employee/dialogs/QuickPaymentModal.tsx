/**
 * Quick Payment Modal
 * نافذة تسجيل دفعة سريعة
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DollarSign,
  CreditCard,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedContractId?: string;
}

type PaymentMethod = 'cash' | 'bank' | 'card' | 'cheque';

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const { contracts, refetch } = useEmployeeContracts();

  const [selectedContractId, setSelectedContractId] = useState(preselectedContractId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedContractId) {
      setSelectedContractId(preselectedContractId);
    }
  }, [preselectedContractId]);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const paymentMethods = [
    { value: 'cash', label: 'نقدي', icon: '💵' },
    { value: 'bank', label: 'تحويل بنكي', icon: '🏦' },
    { value: 'card', label: 'بطاقة', icon: '💳' },
    { value: 'cheque', label: 'شيك', icon: '📝' },
  ];

  const handleSubmit = async () => {
    if (!selectedContractId || !amount || parseFloat(amount) <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company ID not found');
      }

      // Create payment record
      const { error } = await supabase
        .from('payments')
        .insert({
          company_id: profile.company_id,
          customer_id: selectedContract?.customer_id,
          contract_id: selectedContractId,
          amount: parseFloat(amount),
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          status: 'verified',
          notes: notes || 'تم التسجيل عبر تطبيق الجوال',
          recorded_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'تم بنجاح! ✅',
        description: 'تم تسجيل الدفعة بنجاح',
      });

      // Reset form
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      setSelectedContractId('');

      // Refetch contracts
      refetch();

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تسجيل الدفعة',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-t-3xl w-full max-w-lg shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            dir="rtl"
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-4" />

            {/* Header */}
            <div className="px-6 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">تسجيل دفعة</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Contract Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  العقد
                </label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                >
                  <option value="">اختر العقد...</option>
                  {contracts.filter(c => c.status === 'active').map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      #{contract.contract_number} - {contract.customer_name}
                      {contract.balance_due > 0 && ` (مستحق: ${formatCurrency(contract.balance_due)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Contract Info */}
              {selectedContract && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-teal-50 border border-teal-200 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-teal-700 font-medium">المبلغ المستحق</p>
                      <p className="text-2xl font-bold text-teal-900">
                        {formatCurrency(selectedContract.balance_due)}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-teal-600" />
                  </div>
                </motion.div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  المبلغ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 pr-16 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                    step="0.01"
                    min="0"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                    QAR
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                        paymentMethod === method.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <span className="text-lg">{method.icon}</span>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  رقم المرجع
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="TRF-2026-001234"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedContractId || !amount}
                className={cn(
                  'flex-1 py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2',
                  'bg-gradient-to-r from-emerald-500 to-emerald-600',
                  'shadow-lg shadow-emerald-500/30',
                  'hover:shadow-xl hover:shadow-emerald-500/40',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all'
                )}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    جاري التسجيل...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    تسجيل الدفعة
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickPaymentModal;
