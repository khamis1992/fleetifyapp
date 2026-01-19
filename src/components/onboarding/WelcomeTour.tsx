import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOnboarding, defaultOnboardingSteps } from '@/hooks/useOnboarding';
import { TourStep } from './TourStep';

interface WelcomeTourProps {
  /**
   * Custom steps to show. If not provided, uses default steps.
   */
  steps?: typeof defaultOnboardingSteps;
  /**
   * Whether to auto-start the tour for new users.
   * Default: true
   */
  autoStart?: boolean;
}

/**
 * WelcomeTour - Interactive onboarding tour for new users
 *
 * Features:
 * - 4-step guided tour highlighting key features
 * - Auto-starts for first-time users
 * - Remembers completion state in localStorage
 * - Can be skipped or restarted from Settings
 * - Mobile-friendly with smooth animations
 *
 * Usage:
 * ```tsx
 * <WelcomeTour />
 * ```
 *
 * To restart the tour programmatically:
 * ```tsx
 * const { restart } = useOnboarding();
 * restart();
 * ```
 */
export const WelcomeTour: React.FC<WelcomeTourProps> = ({
  steps = defaultOnboardingSteps,
  autoStart = true
}) => {
  const onboarding = useOnboarding(steps);

  // Don't render if not active
  if (!onboarding.isActive) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {onboarding.isActive && onboarding.currentStepData && (
        <TourStep
          key={onboarding.currentStep}
          step={onboarding.currentStepData}
          currentStepIndex={onboarding.currentStep}
          totalSteps={onboarding.totalSteps}
          isFirstStep={onboarding.isFirstStep}
          isLastStep={onboarding.isLastStep}
          onNext={onboarding.next}
          onPrev={onboarding.prev}
          onSkip={onboarding.skip}
          onComplete={onboarding.complete}
        />
      )}
    </AnimatePresence>
  );
};

/**
 * Export the hook for use in Settings page to restart tour
 */
export { useOnboarding } from '@/hooks/useOnboarding';
