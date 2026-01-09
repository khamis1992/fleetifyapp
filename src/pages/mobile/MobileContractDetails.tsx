import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Car as CarIcon,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: string;
  reference_number: string | null;
  notes: string | null;
}

interface ContractDetails {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  status: string;
  days_overdue: number | null;
  balance_due: number | null;
  total_paid: number | null;
  make: string | null;
  model: string | null;
  license_plate: string | null;
  year: number | null;
  customer: {
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  };
}

export const MobileContractDetails: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    if (contractId) {
      fetchContractDetails();
    }
  }, [contractId, user]);

  const fetchContractDetails = async () => {
    if (!user || !contractId) return;

    try {
      // Fetch company_id from profiles table
      let companyId: string;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profileData?.company_id) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!employeeData?.company_id) {
          console.error('[MobileContractDetails] No company_id found');
          return;
        }
        companyId = employeeData.company_id;
      } else {
        companyId = profileData.company_id;
      }

      // Fetch contract with customer details
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          start_date,
          end_date,
          monthly_amount,
          status,
          days_overdue,
          balance_due,
          total_paid,
          make,
          model,
          license_plate,
          year,
          customers (
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;

      setContract({
        ...data,
        customer: data.customers || { first_name: '', last_name: '', phone: null, email: null },
      });

      // Fetch payments for this contract
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          payment_status,
          reference_number,
          notes
        `)
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error fetching contract details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!contract) return null;

    if (contract.days_overdue && contract.days_overdue > 0) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600">
          {contract.days_overdue} يوم متأخر
        </span>
      );
    }

    if (contract.status === 'active') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600">
          نشط
        </span>
      );
    }

    if (contract.status === 'expired' || contract.status === 'cancelled') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
          {contract.status === 'expired' ? 'منتهي' : 'ملغي'}
        </span>
      );
    }

    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">العقد غير موجود</h3>
          <p className="text-sm text-slate-500 mb-6">لم يتم العثور على العقد المطلوب</p>
          <button
            onClick={() => navigate('/mobile/home')}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30" dir="rtl" style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate('/mobile/home')}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">تفاصيل العقد</h1>
            <p className="text-sm text-slate-500">{contract.contract_number}</p>
          </div>
          <div>
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Customer Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">بيانات العميل</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">الاسم:</span>
              <span className="font-medium text-slate-900">
                {contract.customer.first_name} {contract.customer.last_name}
              </span>
            </div>
            {contract.customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">الهاتف:</span>
                <span className="font-medium text-slate-900" dir="ltr">
                  {contract.customer.phone}
                </span>
              </div>
            )}
            {contract.customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">البريد:</span>
                <span className="font-medium text-slate-900 text-xs">
                  {contract.customer.email}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Vehicle Info */}
        {(contract.make || contract.model || contract.license_plate) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                <CarIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">بيانات المركبة</h3>
            </div>
            <div className="space-y-2">
              {contract.make && contract.model && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">الموديل:</span>
                  <span className="font-medium text-slate-900">
                    {contract.make} {contract.model}
                  </span>
                </div>
              )}
              {contract.license_plate && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">رقم اللوحة:</span>
                  <span className="font-medium text-slate-900">
                    {contract.license_plate}
                  </span>
                </div>
              )}
              {contract.year && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">السنة:</span>
                  <span className="font-medium text-slate-900">
                    {contract.year}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Contract Dates */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">تاريخ العقد</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">بدء:</span>
              <span className="font-medium text-slate-900">
                {formatDate(contract.start_date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">انتهاء:</span>
              <span className="font-medium text-slate-900">
                {formatDate(contract.end_date)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Financial Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">المعلومات المالية</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">المبلغ الشهري:</span>
              <span className="font-bold text-teal-600">
                QAR {contract.monthly_amount.toLocaleString()}
              </span>
            </div>
            {contract.total_paid !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">إجمالي المدفوع:</span>
                <span className="font-semibold text-slate-900">
                  QAR {contract.total_paid.toLocaleString()}
                </span>
              </div>
            )}
            {contract.balance_due !== null && contract.balance_due > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">المتبقي:</span>
                <span className="font-semibold text-red-600">
                  QAR {contract.balance_due.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Payments Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl overflow-hidden"
        >
          <button
            onClick={() => setShowPayments(!showPayments)}
            className="w-full flex items-center justify-between p-4 text-right"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">المدفوعات</h3>
                <p className="text-sm text-slate-500">{payments.length} دفعة</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-slate-400 transition-transform duration-200",
                showPayments && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {showPayments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {payments.length === 0 ? (
                    <div className="text-center py-6">
                      <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">لا توجد مدفوعات لهذا العقد</p>
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">
                                QAR {payment.amount.toLocaleString()}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-medium",
                                  payment.payment_status === 'verified' || payment.payment_status === 'paid'
                                    ? "bg-green-100 text-green-600"
                                    : payment.payment_status === 'pending'
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {payment.payment_status === 'verified' || payment.payment_status === 'paid'
                                  ? 'مدفوع'
                                  : payment.payment_status === 'pending'
                                  ? 'قيد الانتظار'
                                  : payment.payment_status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(payment.payment_date)}</span>
                            </div>
                            {payment.payment_method && (
                              <div className="text-xs text-slate-500 mt-1">
                                طريقة الدفع: {payment.payment_method}
                              </div>
                            )}
                            {payment.reference_number && (
                              <div className="text-xs text-slate-500">
                                رقم المرجع: {payment.reference_number}
                              </div>
                            )}
                            {payment.notes && (
                              <div className="text-xs text-slate-600 mt-1 bg-white/50 rounded-lg p-2">
                                {payment.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileContractDetails;
