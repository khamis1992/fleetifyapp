import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'fleetify_onboarding_completed';
const ONBOARDING_SKIPPED_KEY = 'fleetify_onboarding_skipped';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or element ID
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'مرحباً بك في فليتفاي!',
    description: 'دعنا نأخذك في جولة سريعة لتتعرف على أهم الميزات. يمكنك تخطي هذه الجولة في أي وقت.',
    target: 'body',
    placement: 'bottom'
  },
  {
    id: 'add-customer',
    title: 'إضافة عميل جديد',
    description: 'ابدأ بإضافة أول عميل لك من هنا. العملاء هم أساس نظام إدارة التأجير.',
    target: '[data-tour="add-customer"]',
    placement: 'bottom'
  },
  {
    id: 'add-vehicle',
    title: 'إضافة مركبة',
    description: 'بعد ذلك، أضف مركباتك للنظام. يمكنك تتبع حالة كل مركبة وصيانتها.',
    target: '[data-tour="add-vehicle"]',
    placement: 'bottom'
  },
  {
    id: 'create-contract',
    title: 'إنشاء عقد إيجار',
    description: 'الآن يمكنك إنشاء عقد إيجار بربط عميل مع مركبة. العقود تتضمن جميع التفاصيل المالية والشروط.',
    target: '[data-tour="create-contract"]',
    placement: 'bottom'
  },
  {
    id: 'dashboard-metrics',
    title: 'متابعة أداء شركتك',
    description: 'هنا يمكنك مشاهدة جميع المقاييس المهمة: الإيرادات، العقود النشطة، المدفوعات المعلقة، والمزيد!',
    target: '[data-tour="dashboard-metrics"]',
    placement: 'top'
  }
];

export function useOnboarding(steps: OnboardingStep[] = defaultOnboardingSteps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  // Check if onboarding was completed or skipped
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    const skipped = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';

    setIsCompleted(completed);
    setIsSkipped(skipped);

    // ⚠️ TEMPORARILY DISABLED: Auto-start tour
    // The tour was blocking users from accessing the dashboard
    // TODO: Re-enable with a manual trigger button in the header
    // Users can still access the tour from Settings > "إعادة الجولة"
    
    // Auto-start tour for new users (not completed and not skipped)
    // if (!completed && !skipped) {
    //   // Small delay to ensure DOM is ready
    //   setTimeout(() => {
    //     setIsActive(true);
    //   }, 1000);
    // }
  }, []);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      complete();
    }
  }, [currentStep, steps.length]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
    setIsSkipped(true);
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
  }, []);

  const complete = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setIsCompleted(false);
    setIsSkipped(false);
    setCurrentStep(0);
  }, []);

  const restart = useCallback(() => {
    reset();
    start();
  }, [reset, start]);

  return {
    // State
    isActive,
    currentStep,
    totalSteps: steps.length,
    currentStepData: steps[currentStep],
    isCompleted,
    isSkipped,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,

    // Actions
    start,
    next,
    prev,
    skip,
    complete,
    reset,
    restart,
  };
}
