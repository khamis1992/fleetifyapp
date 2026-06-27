import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, MousePointer2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onEnter?: () => void;
  waitForClick?: boolean;
  hint?: string;
}

export interface TourConfig {
  id: string;
  name: string;
  steps: TourStep[];
  onComplete?: () => void;
  onCancel?: () => void;
}

interface TourGuideProps {
  tour: TourConfig | null;
  isActive: boolean;
  onEnd: () => void;
}

type TourPosition = {
  top: number;
  left: number;
  width: number;
};

const colors = {
  text: systemColorPattern.colors.text,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTargetRect(target: HTMLElement) {
  return target.getBoundingClientRect();
}

function calculatePosition(target: HTMLElement, placement: TourStep['placement'] = 'bottom'): TourPosition {
  const rect = getTargetRect(target);
  const cardWidth = Math.min(390, window.innerWidth - 32);
  const estimatedCardHeight = 288;
  const gap = 18;

  const viewportMaxLeft = window.innerWidth - cardWidth - 16;
  const viewportMaxTop = window.innerHeight - estimatedCardHeight - 16;

  const centeredLeft = rect.left + rect.width / 2 - cardWidth / 2;
  const centeredTop = rect.top + rect.height / 2 - estimatedCardHeight / 2;

  const candidates: Record<NonNullable<TourStep['placement']>, TourPosition> = {
    top: {
      top: rect.top - estimatedCardHeight - gap,
      left: centeredLeft,
      width: cardWidth,
    },
    bottom: {
      top: rect.bottom + gap,
      left: centeredLeft,
      width: cardWidth,
    },
    left: {
      top: centeredTop,
      left: rect.left - cardWidth - gap,
      width: cardWidth,
    },
    right: {
      top: centeredTop,
      left: rect.right + gap,
      width: cardWidth,
    },
  };

  const preferred = candidates[placement];
  return {
    top: clamp(preferred.top, 16, Math.max(16, viewportMaxTop)),
    left: clamp(preferred.left, 16, Math.max(16, viewportMaxLeft)),
    width: cardWidth,
  };
}

const Spotlight = ({ target }: { target: HTMLElement }) => {
  const [rect, setRect] = useState(() => getTargetRect(target));
  const padding = 10;

  useEffect(() => {
    const updateRect = () => setRect(getTargetRect(target));
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [target]);

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      <svg className="h-full w-full">
        <defs>
          <mask id="fleetify-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="14"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.58)" mask="url(#fleetify-tour-mask)" />
      </svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute rounded-[14px] border-2 bg-white/5 shadow-[0_20px_55px_rgba(34,199,161,0.26)]"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          borderColor: colors.success,
        }}
      />

      <motion.div
        animate={{ y: [0, -4, 0], opacity: [0.72, 1, 0.72] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="absolute flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg"
        style={{
          top: clamp(rect.top - 18, 14, window.innerHeight - 50),
          left: clamp(rect.left + rect.width / 2 - 18, 14, window.innerWidth - 50),
          backgroundColor: colors.success,
        }}
      >
        <MousePointer2 className="h-4 w-4" />
      </motion.div>
    </div>
  );
};

const TourCard = ({
  step,
  currentStep,
  totalSteps,
  targetElement,
  onNext,
  onPrev,
  onClose,
  isLastStep,
}: {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetElement: HTMLElement;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isLastStep: boolean;
}) => {
  const [position, setPosition] = useState<TourPosition>(() => calculatePosition(targetElement, step.placement));
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

  useEffect(() => {
    const updatePosition = () => setPosition(calculatePosition(targetElement, step.placement));
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetElement, step.placement]);

  return (
    <motion.aside
      dir="rtl"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed z-[9999] overflow-hidden rounded-xl border bg-white shadow-[0_24px_70px_rgba(2,6,23,0.22)]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        borderColor: colors.border,
      }}
    >
      <div className="border-b px-4 pb-3 pt-4" style={{ borderColor: colors.border, backgroundColor: colors.inner }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${colors.success}16`, color: colors.success }}
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-normal" style={{ color: colors.muted }}>
                جولة تعريفية
              </p>
              <h3 className="truncate text-base font-black tracking-normal" style={{ color: colors.text }}>
                {step.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white transition-colors hover:bg-slate-50"
            style={{ borderColor: colors.border, color: colors.muted }}
            aria-label="إغلاق الجولة"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              style={{ backgroundColor: colors.success }}
            />
          </div>
          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black" style={{ color: colors.text }}>
            {currentStep + 1}/{totalSteps}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <p className="text-sm font-medium leading-7" style={{ color: colors.text }}>
          {step.content}
        </p>

        {step.hint && (
          <div className="rounded-lg border px-3 py-2 text-xs font-bold leading-6" style={{ borderColor: `${colors.info}40`, backgroundColor: `${colors.info}10`, color: colors.text }}>
            {step.hint}
          </div>
        )}

        {step.waitForClick && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold" style={{ backgroundColor: `${colors.success}12`, color: colors.success }}>
            <MousePointer2 className="h-4 w-4" />
            اضغط على العنصر المحدد للمتابعة
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={currentStep === 0}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black transition-colors',
            currentStep === 0 ? 'cursor-not-allowed opacity-45' : 'hover:bg-slate-50'
          )}
          style={{ borderColor: colors.border, color: colors.muted }}
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className="h-2 rounded-full transition-all"
              style={{
                width: index === currentStep ? 18 : 7,
                backgroundColor: index === currentStep ? colors.success : '#E5EAF1',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: isLastStep ? colors.success : colors.text }}
        >
          {isLastStep ? (
            <>
              <Check className="h-4 w-4" />
              إنهاء
            </>
          ) : (
            <>
              التالي
              <ChevronLeft className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export const TourGuide: React.FC<TourGuideProps> = ({ tour, isActive, onEnd }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const currentStepData = tour?.steps[currentStep];

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setTargetElement(null);
    }
  }, [isActive, tour?.id]);

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 12;

    const findElement = () => {
      if (cancelled) return;

      const element = document.querySelector(currentStepData.target) as HTMLElement | null;
      if (element) {
        setTargetElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        currentStepData.onEnter?.();
        return;
      }

      retryCount += 1;
      if (retryCount >= maxRetries) {
        if (tour && currentStep < tour.steps.length - 1) {
          setCurrentStep((previous) => previous + 1);
        } else {
          tour?.onComplete?.();
          setCurrentStep(0);
          onEnd();
        }
        return;
      }

      window.setTimeout(findElement, 250 + retryCount * 120);
    };

    const timer = window.setTimeout(findElement, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isActive, currentStepData, currentStep, tour, onEnd]);

  const handleNext = useCallback(() => {
    if (!tour) return;
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep((previous) => previous + 1);
      setTargetElement(null);
      return;
    }
    tour.onComplete?.();
    setCurrentStep(0);
    setTargetElement(null);
    onEnd();
  }, [tour, currentStep, onEnd]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((previous) => previous - 1);
      setTargetElement(null);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    tour?.onCancel?.();
    setCurrentStep(0);
    setTargetElement(null);
    onEnd();
  }, [tour, onEnd]);

  useEffect(() => {
    if (!isActive || !targetElement || !currentStepData?.waitForClick) return;

    const handleClick = () => handleNext();
    targetElement.addEventListener('click', handleClick);
    return () => targetElement.removeEventListener('click', handleClick);
  }, [isActive, targetElement, currentStepData, handleNext]);

  const activeTourCard = useMemo(() => {
    if (!isActive || !tour || !currentStepData || !targetElement) return null;
    return (
      <TourCard
        step={currentStepData}
        currentStep={currentStep}
        totalSteps={tour.steps.length}
        targetElement={targetElement}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={handleClose}
        isLastStep={currentStep === tour.steps.length - 1}
      />
    );
  }, [isActive, tour, currentStepData, targetElement, currentStep, handleNext, handlePrev, handleClose]);

  if (!isActive || !tour || !currentStepData || !targetElement) return null;

  return (
    <AnimatePresence>
      <Spotlight target={targetElement} />
      {activeTourCard}
    </AnimatePresence>
  );
};

export default TourGuide;
