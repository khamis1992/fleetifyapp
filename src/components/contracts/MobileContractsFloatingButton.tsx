import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Upload, 
  Filter, 
  RefreshCw,
  X,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileContractsFloatingButtonProps {
  onCreateContract: () => void;
  onShowCSVUpload: () => void;
  onShowExport: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  isRefreshing?: boolean;
  showFilters?: boolean;
}

export const MobileContractsFloatingButton: React.FC<MobileContractsFloatingButtonProps> = ({
  onCreateContract,
  onShowCSVUpload,
  onShowExport,
  onRefresh,
  onToggleFilters,
  isRefreshing = false,
  showFilters = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsExpanded(false);
  };

  const fabActions = [
    {
      icon: FileText,
      label: 'عقد جديد',
      action: onCreateContract,
      primary: true,
      color: 'bg-primary hover:bg-primary/90'
    },
    {
      icon: Upload,
      label: 'رفع ملف',
      action: onShowCSVUpload,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: Download,
      label: 'تصدير',
      action: onShowExport,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: Filter,
      label: showFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر',
      action: onToggleFilters,
      color: showFilters ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: RefreshCw,
      label: 'تحديث',
      action: onRefresh,
      color: 'bg-gray-500 hover:bg-gray-600',
      isLoading: isRefreshing
    }
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col-reverse gap-3 mb-3"
          >
            {fabActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ 
                  opacity: 0, 
                  y: 20, 
                  scale: 0.8,
                  transition: { delay: (fabActions.length - index - 1) * 0.05 }
                }}
                className="flex items-center gap-3"
              >
                <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  {action.label}
                </div>
                <Button
                  size="lg"
                  onClick={() => handleAction(action.action)}
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg border-2 border-white/20",
                    action.color,
                    "hover:scale-110 transition-all duration-200"
                  )}
                  disabled={action.isLoading}
                >
                  <action.icon 
                    className={cn(
                      "h-5 w-5",
                      action.isLoading && "animate-spin"
                    )} 
                  />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          onClick={toggleExpanded}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl border-2 border-white/20",
            "bg-primary hover:bg-primary/90",
            "transition-all duration-300",
            isExpanded && "rotate-45"
          )}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </motion.div>

      {/* Overlay to close when clicking outside */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};