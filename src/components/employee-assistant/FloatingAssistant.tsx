/**
 * مكون المساعد العائم
 * Floating Assistant Component
 * يمكن استخدامه في أي صفحة لإظهار مساعد الموظف
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmployeeAssistant } from './EmployeeAssistant';
import type { WorkflowType } from './types';

interface FloatingAssistantProps {
  workflowType: WorkflowType;
  data?: Record<string, any>;
  title?: string;
  position?: 'left' | 'right';
  defaultOpen?: boolean;
  onComplete?: () => void;
  className?: string;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  workflowType,
  data = {},
  title,
  position = 'left',
  defaultOpen = false,
  onComplete,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const workflowTitles: Record<WorkflowType, string> = {
    new_contract: 'مساعد إنشاء العقد',
    payment_recording: 'مساعد تسجيل الدفعة',
    vehicle_return: 'مساعد إعادة المركبة',
    new_customer: 'مساعد إضافة عميل',
    new_invoice: 'مساعد إنشاء فاتورة',
    maintenance: 'مساعد الصيانة',
  };

  const displayTitle = title || workflowTitles[workflowType] || 'مساعد الموظف';

  return (
    <>
      {/* زر فتح المساعد */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed bottom-6 z-50",
              position === 'right' ? 'right-6' : 'left-6'
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 px-5 gap-2 rounded-full bg-gradient-to-l from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 shadow-lg shadow-coral-500/30 hover:shadow-coral-500/40 transition-all"
            >
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">مساعد الموظف</span>
              {position === 'right' ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* لوحة المساعد العائمة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              x: position === 'right' ? 420 : -420, 
              opacity: 0 
            }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: position === 'right' ? 420 : -420, 
              opacity: 0 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-4 bottom-4 w-[400px] z-50 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col",
              position === 'right' ? 'right-4' : 'left-4',
              className
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-coral-500 to-orange-500 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {displayTitle}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-neutral-50">
              <EmployeeAssistant
                workflowType={workflowType}
                data={data}
                onComplete={onComplete}
              />
            </div>

            {/* Footer */}
            <div className="bg-white px-5 py-3 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 text-center">
                ✓ اتبع الخطوات لإتمام العملية بشكل صحيح
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAssistant;

