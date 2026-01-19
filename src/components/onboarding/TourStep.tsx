import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { OnboardingStep } from '@/hooks/useOnboarding';

interface TourStepProps {
  step: OnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export const TourStep: React.FC<TourStepProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTargetVisible, setIsTargetVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Find and highlight target element
  useEffect(() => {
    const findTarget = () => {
      const targetElement = document.querySelector(step.target);

      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);
        setIsTargetVisible(true);

        // Scroll target into view smoothly
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });

        // Add highlight class to target
        targetElement.classList.add('tour-target-highlight');
      } else {
        // If target not found (e.g., button not visible), show card in center
        setIsTargetVisible(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(findTarget, 100);

    return () => {
      clearTimeout(timeout);
      // Remove highlight from previous target
      document.querySelectorAll('.tour-target-highlight').forEach(el => {
        el.classList.remove('tour-target-highlight');
      });
    };
  }, [step.target]);

  // Calculate card position based on target and placement
  const getCardPosition = (): React.CSSProperties => {
    if (!targetRect || !isTargetVisible) {
      // Center of screen if target not found
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      };
    }

    const padding = 20;
    const position: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    switch (step.placement || 'bottom') {
      case 'top':
        position.bottom = `${window.innerHeight - targetRect.top + padding}px`;
        position.left = `${targetRect.left + targetRect.width / 2}px`;
        position.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        position.top = `${targetRect.bottom + padding}px`;
        position.left = `${targetRect.left + targetRect.width / 2}px`;
        position.transform = 'translateX(-50%)';
        break;
      case 'left':
        position.right = `${window.innerWidth - targetRect.left + padding}px`;
        position.top = `${targetRect.top + targetRect.height / 2}px`;
        position.transform = 'translateY(-50%)';
        break;
      case 'right':
        position.left = `${targetRect.right + padding}px`;
        position.top = `${targetRect.top + targetRect.height / 2}px`;
        position.transform = 'translateY(-50%)';
        break;
    }

    return position;
  };

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9998]"
        style={{ backdropFilter: 'blur(2px)' }}
      />

      {/* Spotlight on target element */}
      {targetRect && isTargetVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed z-[9998] pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
          }}
        />
      )}

      {/* Tour card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
        style={getCardPosition()}
      >
        <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-right">
                  {step.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  خطوة {currentStepIndex + 1} من {totalSteps}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-2"
                onClick={onSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-right leading-relaxed">
              {step.description}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 py-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentStepIndex
                      ? 'bg-primary w-6'
                      : i < currentStepIndex
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  className="gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
              )}

              <div className="flex-1" />

              {isLastStep ? (
                <Button
                  onClick={onComplete}
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  إنهاء الجولة
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  size="sm"
                  className="gap-2"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Skip button */}
            {!isLastStep && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  تخطي الجولة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add CSS for highlighting */}
      <style>{`
        .tour-target-highlight {
          position: relative;
          z-index: 9999 !important;
        }
      `}</style>
    </>
  );
};
