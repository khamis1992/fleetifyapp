import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, DollarSign, FileSignature, Car, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FabAction {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

const fabActions: FabAction[] = [
  {
    id: 'invoice',
    label: 'فاتورة جديدة',
    icon: FileText,
    path: '/finance/billing',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    id: 'payment',
    label: 'دفعة',
    icon: DollarSign,
    path: '/finance/payments/quick',
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    id: 'contract',
    label: 'عقد',
    icon: FileSignature,
    path: '/contracts',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    id: 'vehicle',
    label: 'مركبة',
    icon: Car,
    path: '/fleet',
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    id: 'employee',
    label: 'موظف',
    icon: Users,
    path: '/hr/employees',
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
];

export const QuickCreateFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (action: FabAction) => {
    setIsOpen(false);
    navigate(action.path);
  };

  return (
    <>
      <div className="hidden lg:block fixed bottom-6 left-6 z-50">
        <div className="relative">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute bottom-16 left-0 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 min-w-[180px] mb-2"
              >
                {fabActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={false}
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'h-14 w-14 rounded-full shadow-xl',
                isOpen
                  ? 'bg-neutral-600 dark:bg-neutral-700 hover:bg-neutral-700 dark:hover:bg-neutral-600'
                  : 'bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800'
              )}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Plus className="h-6 w-6 text-neutral-700 dark:text-neutral-200" />
              )}
            </Button>
          </motion.div>

          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[-1] lg:hidden"
              onClick={() => setIsOpen(false)}
            />
          )}
        </div>
      </div>

      <div className="lg:hidden fixed bottom-24 right-4 z-40">
        <div className="relative">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute bottom-16 right-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm p-3 min-w-[180px]"
              >
                {fabActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={false}
            animate={{ scale: isOpen ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'h-14 w-14 rounded-full shadow-xl',
                isOpen
                  ? 'bg-neutral-600 dark:bg-neutral-700 hover:bg-neutral-700 dark:hover:bg-neutral-600'
                  : 'bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800'
              )}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Plus className="h-6 w-6 text-neutral-700 dark:text-neutral-200" />
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/10 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default QuickCreateFAB;