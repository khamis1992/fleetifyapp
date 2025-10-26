import { useEffect, useState } from 'react';
import { AlertCircle, Clock, Rocket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getDemoSessionInfo, getRemainingTrialDays } from '@/lib/demo';

/**
 * Demo Trial Banner
 * Shows remaining trial days for demo accounts
 */
export const DemoTrialBanner: React.FC = () => {
  const { user } = useAuth();
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const loadDemoInfo = async () => {
      if (!user) return;

      try {
        const sessionInfo: any = await getDemoSessionInfo(user.id);
        
        if (sessionInfo) {
          const days = getRemainingTrialDays(sessionInfo.trial_end_date);
          setRemainingDays(days);
        }
      } catch (error) {
        console.error('Error loading demo info:', error);
      }
    };

    loadDemoInfo();
  }, [user]);

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('demo-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('demo-banner-dismissed', 'true');
  };

  // Don't show if:
  // - No remaining days info
  // - User dismissed it
  // - Not visible
  if (remainingDays === null || isDismissed || !isVisible) {
    return null;
  }

  // Trial expired
  if (remainingDays <= 0) {
    return (
      <Alert variant="destructive" className="mb-4 relative">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">انتهت الفترة التجريبية</AlertTitle>
        <AlertDescription>
          لقد انتهت فترة التجربة المجانية. للاستمرار في استخدام النظام، يرجى الاشتراك في إحدى الباقات المدفوعة.
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    );
  }

  // Trial active - show warning if less than 3 days
  const isUrgent = remainingDays <= 3;

  return (
    <Alert 
      variant={isUrgent ? "destructive" : "default"} 
      className="mb-4 relative border-primary/30 bg-primary/5"
    >
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <AlertCircle className="h-5 w-5 mt-0.5" />
        ) : (
          <Rocket className="h-5 w-5 mt-0.5 text-primary" />
        )}
        <div className="flex-1">
          <AlertTitle className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            النسخة التجريبية
          </AlertTitle>
          <AlertDescription className="mt-1">
            {isUrgent ? (
              <span className="font-medium">
                تنتهي فترة التجربة خلال {remainingDays} {remainingDays === 1 ? 'يوم' : 'أيام'}!
              </span>
            ) : (
              <span>
                لديك {remainingDays} {remainingDays === 1 ? 'يوم' : remainingDays === 2 ? 'يومان' : 'أيام'} متبقية للتجربة المجانية
              </span>
            )}
            <span className="block text-sm mt-1 opacity-80">
              استمتع بجميع ميزات النظام خلال الفترة التجريبية
            </span>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mt-1"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};
