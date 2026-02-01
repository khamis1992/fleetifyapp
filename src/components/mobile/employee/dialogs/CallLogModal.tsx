/**
 * Call Log Modal
 * نافذة تسجيل مكالمة
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Phone,
  Clock,
  FileText,
  Check,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useToast } from '@/hooks/use-toast';

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedContractId?: string;
}

type CallType = 'incoming' | 'outgoing';

export const CallLogModal: React.FC<CallLogModalProps> = ({
  isOpen,
  onClose,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contracts, refetch } = useEmployeeContracts();

  const [selectedContractId, setSelectedContractId] = useState(preselectedContractId || '');
  const [callType, setCallType] = useState<CallType>('outgoing');
  const [duration, setDuration] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedContractId) {
      setSelectedContractId(preselectedContractId);
    }
  }, [preselectedContractId]);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const callOutcomes = [
    'تم الرد - موافق على الدفع',
    'تم الرد - وعد بالدفع',
    'تم الرد - رفض الدفع',
    'لم يرد',
    'رقم مغلق',
    'رقم خاطئ',
  ];

  const handleSubmit = async () => {
    if (!selectedContractId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار العقد',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create call log record
      const { error } = await supabase
        .from('call_logs')
        .insert({
          profile_id: profile.id,
          company_id: profile.company_id,
          contract_id: selectedContractId,
          customer_id: selectedContract?.customer_id,
          call_type: callType,
          duration: duration ? parseInt(duration) : null,
          outcome: outcome || null,
          notes: notes || null,
          call_date: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'تم بنجاح! ✅',
        description: 'تم تسجيل المكالمة بنجاح',
      });

      // Reset form
      setDuration('');
      setOutcome('');
      setNotes('');
      setSelectedContractId('');

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error logging call:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تسجيل المكالمة',
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-t-3xl w-full max-w-lg shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            dir="rtl"
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-4" />

            <div className="px-6 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">تسجيل مكالمة</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Contract */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  العقد
                </label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">اختر العقد...</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      #{contract.contract_number} - {contract.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Call Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  نوع المكالمة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCallType('outgoing')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all',
                      callType === 'outgoing'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-600'
                    )}
                  >
                    <PhoneOutgoing className="w-4 h-4" />
                    صادرة
                  </button>
                  <button
                    onClick={() => setCallType('incoming')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all',
                      callType === 'incoming'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-600'
                    )}
                  >
                    <PhoneIncoming className="w-4 h-4" />
                    واردة
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  المدة (بالثواني)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="120"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  نتيجة المكالمة
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">اختر النتيجة...</option>
                  {callOutcomes.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تفاصيل المكالمة..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedContractId}
                className={cn(
                  'flex-1 py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2',
                  'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg',
                  'disabled:opacity-50'
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
                    تسجيل المكالمة
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

export default CallLogModal;
