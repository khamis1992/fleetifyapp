import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, FileText, Search, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  action: () => void;
  color: string;
}

export const QuickActionBar: React.FC = () => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions: QuickAction[] = [
    {
      label: 'تسجيل دفعة',
      icon: CreditCard,
      action: () => {
        navigate('/finance/payments/quick');
        setIsExpanded(false);
      },
      color: 'text-green-500',
    },
    {
      label: 'إنشاء عقد',
      icon: FileText,
      action: () => {
        navigate('/contracts', { state: { openCreate: true } });
        setIsExpanded(false);
      },
      color: 'text-blue-500',
    },
    {
      label: 'البحث',
      icon: Search,
      action: () => {
        navigate('/search');
        setIsExpanded(false);
      },
      color: 'text-purple-500',
    },
    {
      label: 'إنشاء أمر شراء',
      icon: ShoppingCart,
      action: () => {
        navigate('/finance/purchase-orders');
        setIsExpanded(false);
      },
      color: 'text-orange-500',
    },
  ];

  return (
    <>
      {/* Mobile: Dropdown Menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
            >
              <Plus size={24} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {quickActions.map((action, index) => (
              <React.Fragment key={action.label}>
                <DropdownMenuItem onClick={action.action} className="cursor-pointer">
                  <action.icon className={cn('ml-2 h-4 w-4', action.color)} />
                  <span>{action.label}</span>
                </DropdownMenuItem>
                {index < quickActions.length - 1 && <DropdownMenuSeparator />}
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Expanding Menu */}
      <div className="hidden md:block fixed bottom-6 left-6 z-50">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 left-0 flex flex-col gap-3 mb-2"
            >
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={action.action}
                    className="h-12 px-4 shadow-md hover:shadow-lg transition-shadow whitespace-nowrap bg-card/95 backdrop-blur-sm border border-border/50"
                  >
                    <action.icon className={cn('ml-2 h-4 w-4', action.color)} />
                    <span>{action.label}</span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'h-14 w-14 rounded-full shadow-lg transition-all duration-300',
              isExpanded
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-primary hover:bg-primary/90'
            )}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isExpanded ? <X size={24} /> : <Plus size={24} />}
            </motion.div>
          </Button>
        </motion.div>

        {/* Backdrop */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
