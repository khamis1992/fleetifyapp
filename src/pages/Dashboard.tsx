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
  const [retryCount, setRetryCount] = useState(0);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // CRITICAL FIX: Reduced timeout from 8s to 3s to prevent navigation hanging
  // Also added retry count to prevent infinite retry loops
  useEffect(() => {
    mountedRef.current = true;
    
    if (moduleLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('🏢 [DASHBOARD] Loading timeout reached after 3 seconds');
          setTimeoutReached(true);
        }
      }, 3000); // Reduced from 8000ms to 3000ms
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setTimeoutReached(false);
    }

    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [moduleLoading]);

  // CRITICAL FIX: Auto-retry once on timeout
  useEffect(() => {
    if (timeoutReached && retryCount < 1) {
      console.log('🏢 [DASHBOARD] Auto-retrying after timeout...');
      setRetryCount(prev => prev + 1);
      setTimeoutReached(false);
      refreshData();
    }
  }, [timeoutReached, retryCount, refreshData]);

  // Show loading while module is loading (max 3 seconds)
  if (moduleLoading && !timeoutReached) {
    return <DashboardLoader />;
  }

  // Handle timeout scenario after auto-retry failed
  if (timeoutReached && retryCount >= 1 && (moduleLoading || !company?.business_type)) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-red-600">
            انتهت مهلة التحميل - يرجى المحاولة مرة أخرى
          </p>
          <button 
            onClick={() => {
              setTimeoutReached(false);
              setRetryCount(0);
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

  // CRITICAL FIX: Don't block on company ID - proceed if we have timed out
  // The BentoDashboard will handle missing data gracefully
  if (!company?.id && !timeoutReached) {
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
