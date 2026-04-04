/**
 * نظام الإرشاد التفاعلي - Interactive Tour Guide
 * يوفر تجربة تعليمية تفاعلية للمستخدمين
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TourStep {
  /** معرف العنصر المستهدف (CSS selector) */
  target: string;
  /** عنوان الخطوة */
  title: string;
  /** محتوى الشرح */
  content: string;
  /** موقع التلميح */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** إجراء عند الوصول لهذه الخطوة */
  onEnter?: () => void;
  /** هل يجب النقر على العنصر للمتابعة؟ */
  waitForClick?: boolean;
  /** رسالة إضافية */
  hint?: string;
}

export interface TourConfig {
  /** معرف الجولة */
  id: string;
  /** اسم الجولة */
  name: string;
  /** الخطوات */
  steps: TourStep[];
  /** عند الانتهاء */
  onComplete?: () => void;
  /** عند الإلغاء */
  onCancel?: () => void;
}

interface TourGuideProps {
  tour: TourConfig | null;
  isActive: boolean;
  onEnd: () => void;
}

// حساب موقع التلميح بناءً على العنصر المستهدف
const calculatePosition = (
  target: HTMLElement,
  placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
) => {
  const rect = target.getBoundingClientRect();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  const positions = {
    top: {
      top: rect.top + scrollY - 16,
      left: rect.left + scrollX + rect.width / 2,
      transform: 'translate(-50%, -100%)',
    },
    bottom: {
      top: rect.bottom + scrollY + 16,
      left: rect.left + scrollX + rect.width / 2,
      transform: 'translate(-50%, 0)',
    },
    left: {
      top: rect.top + scrollY + rect.height / 2,
      left: rect.left + scrollX - 16,
      transform: 'translate(-100%, -50%)',
    },
    right: {
      top: rect.top + scrollY + rect.height / 2,
      left: rect.right + scrollX + 16,
      transform: 'translate(0, -50%)',
    },
  };

  return positions[placement];
};

// مكون Spotlight - تسليط الضوء على العنصر
const Spotlight: React.FC<{ target: HTMLElement }> = ({ target }) => {
  const rect = target.getBoundingClientRect();
  const padding = 8;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* الخلفية المعتمة مع فتحة للعنصر المستهدف */}
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* إطار حول العنصر المستهدف */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute border-2 border-rose-500 rounded-lg shadow-[0_0_0_4px_rgba(241,85,85,0.3)]"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />

      {/* نقطة متحركة للفت الانتباه */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
        className="absolute w-6 h-6 bg-rose-500 rounded-full"
        style={{
          top: rect.top - 12,
          left: rect.left + rect.width / 2 - 12,
        }}
      >
        <MousePointer className="w-4 h-4 text-white absolute top-1 left-1" />
      </motion.div>
    </div>
  );
};

// مكون بطاقة التلميح
const TooltipCard: React.FC<{
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetElement: HTMLElement;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isLastStep: boolean;
}> = ({
  step,
  currentStep,
  totalSteps,
  targetElement,
  onNext,
  onPrev,
  onClose,
  isLastStep,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, transform: '' });

  useEffect(() => {
    const updatePosition = () => {
      const pos = calculatePosition(targetElement, step.placement);
      setPosition(pos);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetElement, step.placement]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed z-[9999] w-80 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        transform: position.transform,
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
            {currentStep + 1} / {totalSteps}
          </span>
          <h3 className="text-white font-bold text-sm">{step.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-neutral-700 text-sm leading-relaxed mb-3">
          {step.content}
        </p>
        
        {step.hint && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <p className="text-amber-800 text-xs">💡 {step.hint}</p>
          </div>
        )}

        {step.waitForClick && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-blue-800 text-xs flex items-center gap-1">
              <MousePointer className="w-3 h-3" />
              اضغط على العنصر المُضاء للمتابعة
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={currentStep === 0}
          className="text-neutral-600"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          السابق
        </Button>

        {/* Progress dots */}
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === currentStep ? 'bg-rose-500' : 'bg-neutral-200'
              )}
            />
          ))}
        </div>

        <Button
          size="sm"
          onClick={onNext}
          className={cn(
            'text-white',
            isLastStep
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-rose-500 hover:bg-coral-600'
          )}
        >
          {isLastStep ? (
            <>
              <Check className="w-4 h-4 ml-1" />
              إنهاء
            </>
          ) : (
            <>
              التالي
              <ChevronLeft className="w-4 h-4 mr-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// المكون الرئيسي
export const TourGuide: React.FC<TourGuideProps> = ({ tour, isActive, onEnd }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStepData = tour?.steps[currentStep];

  // البحث عن العنصر المستهدف مع إعادة المحاولة
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 10;

    const findElement = () => {
      if (cancelled) return;
      
      const element = document.querySelector(currentStepData.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentStepData.onEnter?.();
        return;
      }

      retryCount++;
      if (retryCount >= maxRetries) {
        // Skip step after max retries
        if (tour && currentStep < tour.steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          tour?.onComplete?.();
          setCurrentStep(0);
          onEnd();
        }
        return;
      }

      // Retry with increasing delay (500ms, 600ms, 700ms... up to 2s)
      setTimeout(findElement, 500 + retryCount * 150);
    };

    // Wait for page to load, then start looking
    const timer = setTimeout(findElement, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isActive, currentStepData, currentStep]);

  const handleNext = useCallback(() => {
    if (!tour) return;

    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // انتهت الجولة
      tour.onComplete?.();
      setCurrentStep(0);
      onEnd();
    }
  }, [tour, currentStep, onEnd]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    tour?.onCancel?.();
    setCurrentStep(0);
    onEnd();
  }, [tour, onEnd]);

  // معالجة النقر على العنصر المستهدف
  useEffect(() => {
    if (!isActive || !targetElement || !currentStepData?.waitForClick) return;

    const handleClick = () => {
      handleNext();
    };

    targetElement.addEventListener('click', handleClick);
    return () => targetElement.removeEventListener('click', handleClick);
  }, [isActive, targetElement, currentStepData, handleNext]);

  if (!isActive || !tour || !currentStepData) return null;

  return (
    <AnimatePresence>
      {/* Spotlight overlay */}
      {targetElement && <Spotlight target={targetElement} />}

      {/* Tooltip card */}
      {targetElement && (
        <TooltipCard
          step={currentStepData}
          currentStep={currentStep}
          totalSteps={tour.steps.length}
          targetElement={targetElement}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
          isLastStep={currentStep === tour.steps.length - 1}
        />
      )}
    </AnimatePresence>
  );
};

export default TourGuide;

