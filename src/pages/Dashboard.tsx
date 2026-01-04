// @ts-nocheck
import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load the Redesigned Bento Dashboard
const BentoDashboard = lazy(() => import('@/components/dashboard/bento/BentoDashboardRedesigned'));

// Loading component
const DashboardLoader: React.FC = () => (
  <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#e85a4f] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-neutral-500 font-medium">جاري تحميل لوحة التحكم...</p>
    </div>
  </div>
);

const DashboardInner: React.FC = () => {
  const { moduleContext, isLoading: moduleLoading, company, refreshData, isBrowsingMode, currentCompanyId } = useModuleConfig();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watchdog timer to prevent infinite loading
  useEffect(() => {
    if (moduleLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('🏢 [DASHBOARD] Loading timeout reached after 8 seconds');
        setTimeoutReached(true);
      }, 8000);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setTimeoutReached(false);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [moduleLoading]);

  // Show loading while module is loading
  if (moduleLoading && !timeoutReached) {
    return <DashboardLoader />;
  }

  // Handle timeout scenario
  if (timeoutReached && (moduleLoading || !company?.business_type)) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-red-600">
            انتهت مهلة التحميل - يرجى المحاولة مرة أخرى
          </p>
          <button 
            onClick={() => {
              setTimeoutReached(false);
              refreshData();
            }}
            className="px-4 py-2 bg-[#e85a4f] text-white rounded-lg hover:bg-[#d44332]"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // Show loading if no company data yet
  if (!company?.id) {
    return <DashboardLoader />;
  }

  // Render the original Bento Dashboard directly (no wrappers)
  return (
    <Suspense fallback={<DashboardLoader />}>
      <BentoDashboard />
    </Suspense>
  );
};

const Dashboard: React.FC = () => {
  return (
    <ErrorBoundary>
      <DashboardInner />
    </ErrorBoundary>
  );
};

export default Dashboard;
