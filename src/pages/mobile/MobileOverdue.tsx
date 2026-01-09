import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  AlertCircle,
  MessageCircle,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OverdueContract {
  id: string;
  contract_id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  days_overdue: number;
  outstanding_amount: number;
  make: string | null;
  model: string | null;
  license_plate: string | null;
}

type FilterType = 'all' | 'critical' | 'moderate' | 'minor';

const MobileOverdue: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contracts, setContracts] = useState<OverdueContract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<OverdueContract[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<OverdueContract | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'cheque'>('bank');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOverdueContracts();
  }, [user]);

  useEffect(() => {
    filterContracts();
  }, [contracts, activeFilter]);

  const fetchOverdueContracts = async () => {
    if (!user) return;

    try {
      // Fetch company_id from profiles table
      let companyId: string;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.company_id) {
        console.warn('[MobileOverdue] No company_id in profiles, trying employees table', { profileError, user_id: user.id });

        // Try fallback to employees table
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (employeeError || !employeeData?.company_id) {
          console.error('[MobileOverdue] No company_id found', { employeeError, user_id: user.id });
          return;
        }

        companyId = employeeData.company_id;
      } else {
        companyId = profileData.company_id;
      }

      console.log('[MobileOverdue] Using company_id:', companyId);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          days_overdue,
          balance_due,
          make,
          model,
          license_plate,
          customers (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('company_id', companyId)
        .gt('days_overdue', 0)
        .order('days_overdue', { ascending: false });

      if (error) throw error;

      const formattedData: OverdueContract[] = (data || [])
        .filter((c: any) => c.days_overdue > 0)
        .map((c: any) => ({
          id: c.id,
          contract_id: c.id,
          contract_number: c.contract_number,
          customer_id: c.customers?.id || '',
          customer_name: `${c.customers?.first_name || ''} ${c.customers?.last_name || ''}`.trim(),
          phone: c.customers?.phone,
          days_overdue: c.days_overdue,
          outstanding_amount: c.balance_due || 0,
          make: c.make,
          model: c.model,
          license_plate: c.license_plate,
        }));

      setContracts(formattedData);
    } catch (error) {
      console.error('Error fetching overdue contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContracts = () => {
    let filtered = [...contracts];

    if (activeFilter === 'critical') {
      filtered = filtered.filter(c => c.days_overdue > 30);
    } else if (activeFilter === 'moderate') {
      filtered = filtered.filter(c => c.days_overdue >= 15 && c.days_overdue <= 30);
    } else if (activeFilter === 'minor') {
      filtered = filtered.filter(c => c.days_overdue < 15);
    }

    setFilteredContracts(filtered);
  };

  const handleRecordPayment = async () => {
    if (!selectedContract || !paymentAmount) return;

    setProcessing(true);
    try {
      const companyId = user?.profile?.company_id || user?.company?.id || '';

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          customer_id: selectedContract.customer_id,
          contract_id: selectedContract.contract_id,
          amount: parseFloat(paymentAmount),
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod,
          reference_number: paymentReference,
          status: 'verified',
          notes: 'Recorded via mobile app',
        });

      if (paymentError) throw paymentError;

      // Close modal and refresh
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReference('');
      setSelectedContract(null);

      // Refresh data
      await fetchOverdueContracts();

      // Show success
      alert('تم تسجيل الدفعة بنجاح!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('فشل تسجيل الدفعة');
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityColor = (days: number) => {
    if (days > 30) return 'bg-red-100 text-red-600';
    if (days >= 15) return 'bg-amber-100 text-amber-600';
    return 'bg-yellow-100 text-yellow-600';
  };

  const getSeverityLabel = (days: number) => {
    if (days > 30) return 'خطير';
    if (days >= 15) return 'متوسط';
    return 'بسيط';
  };

  const totalOverdue = contracts.reduce((sum, c) => sum + c.outstanding_amount, 0);

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    window.location.href = `https://wa.me/${cleanPhone}`;
  };

  return (
    <div className="px-4 py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">المتأخرات</h1>
          <p className="text-sm text-slate-500 mt-1">
            {contracts.length} عقود متأخرة
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-rose-500/20">
            <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">إجمالي المتأخرات</p>
            <p className="text-2xl font-bold text-slate-900">QAR {totalOverdue.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-red-600">
              {contracts.filter(c => c.days_overdue > 30).length}
            </p>
            <p className="text-xs text-slate-500">خطير (+30)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">
              {contracts.filter(c => c.days_overdue >= 15 && c.days_overdue <= 30).length}
            </p>
            <p className="text-xs text-slate-500">متوسط (15-30)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-600">
              {contracts.filter(c => c.days_overdue < 15).length}
            </p>
            <p className="text-xs text-slate-500">بسيط (&lt;15)</p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterChip
          label="الكل"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <FilterChip
          label="خطير"
          active={activeFilter === 'critical'}
          onClick={() => setActiveFilter('critical')}
        />
        <FilterChip
          label="متوسط"
          active={activeFilter === 'moderate'}
          onClick={() => setActiveFilter('moderate')}
        />
        <FilterChip
          label="بسيط"
          active={activeFilter === 'minor'}
          onClick={() => setActiveFilter('minor')}
        />
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد متأخرات</h3>
          <p className="text-sm text-slate-500">جميع المدفوعات مسددة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((contract) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-rose-500/20">
                    <AlertCircle className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {contract.customer_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', getSeverityColor(contract.days_overdue))}>
                        {getSeverityLabel(contract.days_overdue)} - {contract.days_overdue} يوم
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">QAR {contract.outstanding_amount.toLocaleString()} متبقي</span>
                </div>
                {contract.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700" dir="ltr">{contract.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">العقد: {contract.contract_number}</span>
                </div>
                {(contract.make || contract.model || contract.license_plate) && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      {contract.make} {contract.model} {contract.license_plate && `(${contract.license_plate})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {contract.phone && (
                  <>
                    <button
                      onClick={() => handleCall(contract.phone)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium"
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </button>
                    <button
                      onClick={() => handleWhatsApp(contract.phone)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      واتساب
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedContract(contract);
                    setShowPaymentModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-medium shadow-lg shadow-teal-500/20"
                >
                  <CreditCard className="w-4 h-4" />
                  تسجيل دفعة
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-t-3xl w-full max-w-lg"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="p-6">
              {/* Handle */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-6" />

              {/* Customer Info */}
              <div className="text-center mb-6">
                <p className="text-sm text-slate-500 mb-1">تسجيل دفعة من</p>
                <p className="text-xl font-bold text-slate-900">
                  {selectedContract.customer_name}
                </p>
                <p className="text-sm text-teal-600 mt-1">
                  المتبقي: QAR {selectedContract.outstanding_amount.toLocaleString()}
                </p>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">المبلغ</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="QAR 0.00"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'cash', label: 'نقدي' },
                    { value: 'bank', label: 'تحويل بنكي' },
                    { value: 'card', label: 'بطاقة' },
                    { value: 'cheque', label: 'شيك' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value as any)}
                      className={cn(
                        'py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                        paymentMethod === method.value
                          ? 'border-teal-500 bg-teal-50 text-teal-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">رقم المرجع</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="TRF-2024-001234"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedCustomer(null);
                    setPaymentAmount('');
                    setPaymentReference('');
                  }}
                  disabled={processing}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-700 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={processing || !paymentAmount}
                  className={cn(
                    'flex-1 py-4 rounded-2xl font-semibold text-white',
                    'bg-gradient-to-r from-teal-500 to-teal-600',
                    'shadow-lg shadow-teal-500/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {processing ? 'جاري التسجيل...' : 'تسجيل'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
      active
        ? 'bg-red-500 text-white shadow-md shadow-rose-500/20'
        : 'bg-white/80 text-slate-600 border border-slate-200/50 hover:bg-slate-100'
    )}
  >
    {label}
  </button>
);

export default MobileOverdue;
