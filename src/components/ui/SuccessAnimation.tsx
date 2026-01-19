import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
  duration?: number;
  variant?: 'simple' | 'confetti' | 'checkmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  show,
  message = 'تم بنجاح',
  onComplete,
  duration = 2000,
  variant = 'checkmark',
  size = 'md',
  className,
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32',
  };

  const iconSizes = {
    sm: 24,
    md: 40,
    lg: 64,
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
            className
          )}
        >
          {variant === 'checkmark' && <CheckmarkAnimation size={size} message={message} />}
          {variant === 'simple' && <SimpleAnimation size={size} message={message} />}
          {variant === 'confetti' && <ConfettiAnimation size={size} message={message} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Checkmark animation with circle
const CheckmarkAnimation: React.FC<{ size: 'sm' | 'md' | 'lg'; message: string }> = ({
  size,
  message,
}) => {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32',
  };

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        className={cn(
          'mx-auto rounded-full bg-success flex items-center justify-center mb-4',
          sizeClasses[size]
        )}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
            damping: 10,
          }}
        >
          <CheckCircle2 className="text-white" size={size === 'sm' ? 24 : size === 'md' ? 40 : 64} />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn('font-semibold text-foreground', size === 'sm' ? 'text-base' : 'text-xl')}
      >
        {message}
      </motion.p>

      {/* Ripple effect */}
      <motion.div
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={cn(
          'absolute rounded-full bg-success',
          sizeClasses[size],
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none'
        )}
      />
    </div>
  );
};

// Simple fade animation
const SimpleAnimation: React.FC<{ size: 'sm' | 'md' | 'lg'; message: string }> = ({
  size,
  message,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-border"
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="flex-shrink-0"
        >
          <Check className="h-8 w-8 text-success" />
        </motion.div>
        <p className="text-lg font-semibold text-foreground">{message}</p>
      </div>
    </motion.div>
  );
};

// Confetti animation with sparkles
const ConfettiAnimation: React.FC<{ size: 'sm' | 'md' | 'lg'; message: string }> = ({
  size,
  message,
}) => {
  const confettiCount = 30;
  const confettiColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="relative">
      {/* Confetti particles */}
      {Array.from({ length: confettiCount }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / confettiCount;
        const distance = 150 + Math.random() * 100;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        const rotation = Math.random() * 360;

        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
            animate={{
              x,
              y,
              opacity: 0,
              scale: 1,
              rotate: rotation,
            }}
            transition={{
              duration: 1.2,
              ease: 'easeOut',
              delay: i * 0.02,
            }}
            className="absolute w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        );
      })}

      {/* Center sparkles */}
      <motion.div
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: 180 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        className="relative"
      >
        <Sparkles className="h-20 w-20 text-yellow-500" />
      </motion.div>

      {/* Success message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-32 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-bold text-foreground"
      >
        {message}
      </motion.p>
    </div>
  );
};

// Inline success animation (smaller, for forms)
export const InlineSuccessAnimation: React.FC<{
  show: boolean;
  message?: string;
  className?: string;
}> = ({ show, message = 'تم', className }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          className={cn('inline-flex items-center gap-2 text-success font-medium', className)}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
          <span className="text-sm">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
