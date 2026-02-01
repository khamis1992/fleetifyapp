/**
 * Schedule Followup Modal
 * نافذة جدولة متابعة
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useToast } from '@/hooks/use-toast';
import type { TaskType, TaskPriority } from '@/types/mobile-employee.types';

interface ScheduleFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedContractId?: string;
}

export const ScheduleFollowupModal: React.FC<ScheduleFollowupModalProps> = ({
  isOpen,
  onClose,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contracts, refetch } = useEmployeeContracts();

  const [selectedContractId, setSelectedContractId] = useState(preselectedContractId || '');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [taskType, setTaskType] = useState<TaskType>('followup');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedContractId) {
      setSelectedContractId(preselectedContractId);
    }
  }, [preselectedContractId]);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const taskTypes = [
    { value: 'call', label: 'مكالمة', icon: '📞' },
    { value: 'followup', label: 'متابعة', icon: '📋' },
    { value: 'visit', label: 'زيارة', icon: '🚗' },
    { value: 'payment', label: 'دفعة', icon: '💰' },
  ];

  const priorities = [
    { value: 'low', label: 'عادي', color: 'slate' },
    { value: 'medium', label: 'متوسط', color: 'blue' },
    { value: 'high', label: 'مهم', color: 'amber' },
    { value: 'urgent', label: 'عاجل', color: 'red' },
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('employee_tasks')
        .insert({
          assigned_to_profile_id: profile.id,
          created_by: user?.id,
          contract_id: selectedContractId,
          customer_id: selectedContract?.customer_id,
          title: `${taskTypes.find(t => t.value === taskType)?.label} - ${selectedContract?.customer_name}`,
          title_ar: `${taskTypes.find(t => t.value === taskType)?.label} - ${selectedContract?.customer_name}`,
          type: taskType,
          priority: priority,
          status: 'pending',
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: 'تم بنجاح! ✅',
        description: 'تم جدولة المتابعة بنجاح',
      });

      setSelectedContractId('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error scheduling followup:', error);
      toast({
        title: 'خطأ',
        description: 'فشل جدولة المتابعة',
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
                  <div className="p-2 rounded-xl bg-purple-100">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">جدولة متابعة</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">العقد</label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">اختر العقد...</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>#{c.contract_number} - {c.customer_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">التاريخ</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">الوقت</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">نوع المهمة</label>
                <div className="grid grid-cols-2 gap-2">
                  {taskTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setTaskType(type.value as TaskType)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all',
                        taskType === type.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-slate-600'
                      )}
                    >
                      <span>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">الأولوية</label>
                <div className="grid grid-cols-4 gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value as TaskPriority)}
                      className={cn(
                        'py-2 rounded-xl border-2 text-xs font-medium transition-all',
                        priority === p.value
                          ? `border-${p.color}-500 bg-${p.color}-50 text-${p.color}-700`
                          : 'border-slate-200 text-slate-600'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تفاصيل المتابعة..."
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
                  'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg',
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
                    جاري الجدولة...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    جدولة المتابعة
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

export default ScheduleFollowupModal;
