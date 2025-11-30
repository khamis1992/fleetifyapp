/**
 * FAB Menu Component
 * Modal overlay with action buttons shown on FAB long-press
 * Features:
 * - Blur backdrop
 * - Slides up from bottom
 * - 2-4 action buttons
 * - Click outside to close
 * - Escape key to close
 * - Haptic feedback on actions
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FABAction } from '@/types/mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FABMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: FABAction[];
}

export function FABMenu({ isOpen, onClose, actions }: FABMenuProps) {
  const { vibrate } = useHapticFeedback();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Note: Removed body scroll lock to fix mobile scrolling issues
  // The FAB menu now uses proper overlay that doesn't block page scroll

  // Handle action click
  const handleActionClick = useCallback(
    (action: FABAction) => {
      if (action.disabled) return;

      vibrate('light');
      action.onClick();
      onClose();
    },
    [vibrate, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.15 },
    },
  };

  const menuVariants = {
    hidden: {
      y: '100%',
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      y: '100%',
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
      },
    }),
  };

  // Don't render if no actions
  if (!actions || actions.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
        >
          {/* Menu Panel */}
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-0 left-0 right-0 z-[61] bg-card border-t border-border rounded-t-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                إجراءات سريعة
              </h3>
              <button
                onClick={onClose}
                className={cn(
                  'h-8 w-8 rounded-full',
                  'flex items-center justify-center',
                  'hover:bg-accent',
                  'transition-colors'
                )}
                aria-label="إغلاق"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Actions List */}
            <div className="p-4 space-y-2">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Button
                      onClick={() => handleActionClick(action)}
                      disabled={action.disabled}
                      variant={action.variant || 'outline'}
                      className={cn(
                        'w-full h-14 justify-start gap-3',
                        'text-base font-medium'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {action.label}
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {/* Safe area spacing */}
            <div className="h-mobile-safe-bottom bg-card rounded-b-3xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
