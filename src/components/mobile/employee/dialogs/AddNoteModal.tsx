/**
 * Add Note Modal
 * نافذة إضافة ملاحظة
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useToast } from '@/hooks/use-toast';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedContractId?: string;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  preselectedContractId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contracts, refetch } = useEmployeeContracts();

  const [selectedContractId, setSelectedContractId] = useState(preselectedContractId || '');
  const [noteType, setNoteType] = useState('general');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedContractId) {
      setSelectedContractId(preselectedContractId);
    }
  }, [preselectedContractId]);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const noteTypes = [
    { value: 'general', label: 'عامة', icon: '📝' },
    { value: 'payment', label: 'دفعة', icon: '💰' },
    { value: 'call', label: 'مكالمة', icon: '📞' },
    { value: 'issue', label: 'مشكلة', icon: '⚠️' },
  ];

  const handleSubmit = async () => {
    if (!selectedContractId || !content.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
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
        .from('contract_notes')
        .insert({
          contract_id: selectedContractId,
          customer_id: selectedContract?.customer_id,
          created_by: profile.id,
          note_type: noteType,
          content: content.trim(),
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'تم بنجاح! ✅',
        description: 'تم إضافة الملاحظة بنجاح',
      });

      setContent('');
      setNoteType('general');
      setSelectedContractId('');
      onClose();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إضافة الملاحظة',
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
                  <div className="p-2 rounded-xl bg-amber-100">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">إضافة ملاحظة</h2>
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">نوع الملاحظة</label>
                <div className="grid grid-cols-2 gap-2">
                  {noteTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setNoteType(type.value)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all',
                        noteType === type.value
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  الملاحظة <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب ملاحظتك هنا..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {content.length} / 500 حرف
                </p>
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
                disabled={isSubmitting || !selectedContractId || !content.trim()}
                className={cn(
                  'flex-1 py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2',
                  'bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg',
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
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    حفظ الملاحظة
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

export default AddNoteModal;
