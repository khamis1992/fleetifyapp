import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingProgressProps {
  /** Current loading step (1-based) */
  step: number;
  /** Total number of steps */
  totalSteps: number;
  /** Message to display for current step */
  message: string;
  /** Optional: Show estimated time remaining */
  showEstimate?: boolean;
}

export function LoadingProgress({
  step,
  totalSteps,
  message,
  showEstimate = false
}: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const targetProgress = (step / totalSteps) * 100;

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(targetProgress);
    }, 100);

    return () => clearTimeout(timer);
  }, [targetProgress]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 bg-gradient-to-br from-background via-background to-accent/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Logo or Icon Area */}
        <div className="flex justify-center">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary" />
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <Progress
            value={progress}
            className="h-2.5 bg-accent/30"
          />

          {/* Step Counter */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              الخطوة {step} من {totalSteps}
            </span>
            <span className="text-primary font-medium">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Loading Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-2"
          >
            <p className="text-base font-medium text-foreground">
              {message}
            </p>

            {/* Animated dots */}
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Optional: Estimated time */}
        {showEstimate && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-center text-muted-foreground"
          >
            الوقت المتبقي المقدر: {Math.max(1, totalSteps - step)} ثانية
          </motion.p>
        )}

        {/* Loading Tips (optional enhancement) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-xs text-center text-muted-foreground bg-accent/10 rounded-lg p-3"
        >
          💡 نصيحة: يمكنك استخدام اختصار Ctrl+K لفتح لوحة الأوامر السريعة
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Hook to manage loading steps automatically
 *
 * @example
 * const { currentStep, setStep, message, isComplete } = useLoadingSteps([
 *   'جاري تحميل بيانات الشركة...',
 *   'جاري تحميل السيارات...',
 *   'جاري تحميل العقود...',
 *   'جاري تحميل التحليلات...'
 * ]);
 */
export function useLoadingSteps(steps: string[]) {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const reset = () => {
    setCurrentStep(1);
  };

  return {
    currentStep,
    setStep: setCurrentStep,
    nextStep,
    reset,
    message: steps[currentStep - 1] || '',
    totalSteps: steps.length,
    isComplete: currentStep >= steps.length,
    progress: (currentStep / steps.length) * 100
  };
}
