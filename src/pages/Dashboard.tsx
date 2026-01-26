import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load the Redesigned Bento Dashboard
const BentoDashboard = lazy(() => import('@/components/dashboard/bento/BentoDashboardRedesigned'));

// Loading component
const DashboardLoader: React.FC = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground font-medium">جاري تحميل لوحة التحكم...</p>
    </div>
  </div>
);

const DashboardInner: React.FC = () => {
  const { isLoading: moduleLoading, company } = useModuleConfig();
  const [forceRender, setForceRender] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // CRITICAL FIX: Force render after 2 seconds to prevent infinite loading on multi-tab scenarios
  useEffect(() => {
    mountedRef.current = true;
    
    // Set a timeout to force render even if loading isn't complete
    loadingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !forceRender) {
        console.warn('🏢 [DASHBOARD] Force render after 2s to prevent multi-tab hang');
        setForceRender(true);
      }
    }, 2000);

    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Clear forceRender when loading completes normally
  useEffect(() => {
    if (!moduleLoading && company?.id) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    }
  }, [moduleLoading, company?.id]);

  // CRITICAL FIX: Show loading for max 2 seconds, then force render
  // This prevents hang on multi-tab scenarios where auth/module loading gets stuck
  const shouldShowLoader = moduleLoading && !forceRender && !company?.id;

  if (shouldShowLoader) {
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
