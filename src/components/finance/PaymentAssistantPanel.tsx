/**
 * لوحة مساعد الموظف للدفعات
 * Payment Employee Assistant Panel
 * يمكن دمجها في أي صفحة دفعات
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmployeeAssistant } from '@/components/employee-assistant';

interface PaymentAssistantPanelProps {
  // بيانات الدفعة للتحقق التلقائي
  paymentData: {
    customer_id?: string;
    contract_id?: string;
    amount?: number;
    payment_method?: string;
    reference_number?: string;
    cheque_number?: string;
    is_postdated?: boolean;
    customer?: {
      outstanding_balance?: number;
    };
    contract?: {
      status?: string;
    };
    is_submitted?: boolean;
  };
  // التحكم في الظهور
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // الوضع: جانبي أو عائم
  mode?: 'sidebar' | 'floating';
  // الموقع
  position?: 'right' | 'left';
  className?: string;
}

export const PaymentAssistantPanel: React.FC<PaymentAssistantPanelProps> = ({
  paymentData,
  isOpen: controlledOpen,
  onOpenChange,
  mode = 'floating',
  position = 'left',
  className
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  if (mode === 'sidebar') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "border-neutral-200 overflow-y-auto bg-white",
              position === 'right' ? 'border-r' : 'border-l',
              className
            )}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-coral-500" />
                  مساعد تسجيل الدفعة
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <EmployeeAssistant
                workflowType="payment_recording"
                data={paymentData}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Floating mode
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
              x: position === 'right' ? 400 : -400, 
              opacity: 0 
            }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: position === 'right' ? 400 : -400, 
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
                مساعد تسجيل الدفعة
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
                workflowType="payment_recording"
                data={paymentData}
              />
            </div>

            {/* Footer */}
            <div className="bg-white px-5 py-3 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 text-center">
                ✓ اتبع الخطوات لضمان تسجيل دفعة صحيحة
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop للوضع العائم */}
      <AnimatePresence>
        {isOpen && mode === 'floating' && (
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

export default PaymentAssistantPanel;

