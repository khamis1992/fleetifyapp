/**
 * سياق الجولات التفاعلية
 * Tour Guide Context
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TourGuide, TourConfig } from './TourGuide';
import { getTourById, NAVIGATION_ROUTES } from './tours';
import { useToast } from '@/components/ui/use-toast';

interface TourContextType {
  /** بدء جولة تفاعلية */
  startTour: (tourId: string) => void;
  /** إنهاء الجولة الحالية */
  endTour: () => void;
  /** هل الجولة نشطة؟ */
  isActive: boolean;
  /** الجولة الحالية */
  currentTour: TourConfig | null;
  /** التنقل لصفحة معينة */
  navigateTo: (routeKey: string) => void;
  /** التنقل لصفحة مع بدء جولة */
  navigateAndTour: (routeKey: string, tourId: string) => void;
  /** المسارات المتاحة */
  routes: typeof NAVIGATION_ROUTES;
}

const TourContext = createContext<TourContextType | null>(null);
const PENDING_TOUR_STORAGE_KEY = 'fleetify:pending-tour';

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourConfig | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const startTour = useCallback((tourId: string) => {
    const tour = getTourById(tourId);
    if (tour) {
      setCurrentTour({
        ...tour,
        onComplete: () => {
          toast({
            title: '🎉 أحسنت!',
            description: `لقد أكملت جولة "${tour.name}" بنجاح`,
          });
        },
        onCancel: () => {
          toast({
            title: 'تم إيقاف الجولة',
            description: 'يمكنك إعادة بدء الجولة في أي وقت',
          });
        },
      });
      setIsActive(true);
    } else {
      console.warn(`Tour not found: ${tourId}`);
    }
  }, [toast]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentTour(null);
  }, []);

  const navigateTo = useCallback((routeKey: string) => {
    const route = NAVIGATION_ROUTES[routeKey as keyof typeof NAVIGATION_ROUTES];
    if (route) {
      navigate(route.path);
      toast({
        title: `📍 ${route.name}`,
        description: route.description,
      });
    }
  }, [navigate, toast]);

  const navigateAndTour = useCallback((routeKey: string, tourId: string) => {
    const route = NAVIGATION_ROUTES[routeKey as keyof typeof NAVIGATION_ROUTES];
    if (route) {
      window.sessionStorage.setItem(PENDING_TOUR_STORAGE_KEY, tourId);
      navigate(route.path);
    }
  }, [navigate]);

  useEffect(() => {
    const pendingTourId = window.sessionStorage.getItem(PENDING_TOUR_STORAGE_KEY);
    if (!pendingTourId) return;

    const timer = window.setTimeout(() => {
      window.sessionStorage.removeItem(PENDING_TOUR_STORAGE_KEY);
      startTour(pendingTourId);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [location.pathname, startTour]);

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        isActive,
        currentTour,
        navigateTo,
        navigateAndTour,
        routes: NAVIGATION_ROUTES,
      }}
    >
      {children}
      <TourGuide tour={currentTour} isActive={isActive} onEnd={endTour} />
    </TourContext.Provider>
  );
};

export const useTourGuide = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourGuide must be used within a TourProvider');
  }
  return context;
};

