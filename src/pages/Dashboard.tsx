// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import { PageCustomizer } from '@/components/PageCustomizer';
import CarRentalDashboard from './dashboards/CarRentalDashboard';
import RealEstateDashboard from './dashboards/RealEstateDashboard';
import RetailDashboard from './dashboards/RetailDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingProgress, useLoadingSteps } from '@/components/ui/LoadingProgress';
import { DemoTrialBanner } from '@/components/demo';
import { WhatsNewModal } from '@/components/features';
import { useWhatsNew } from '@/hooks/useWhatsNew';

const DashboardInner: React.FC = () => {
  // Get all needed data from a single hook to avoid hook ordering issues
  const { moduleContext, isLoading: moduleLoading, company, refreshData, isBrowsingMode, currentCompanyId } = useModuleConfig();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompanyIdRef = useRef<string>();

  // What's New feature
  const { isModalOpen, openModal, closeModal, changelog, unreadCount, markAsViewed, hasNewUpdates } = useWhatsNew();

  // Show What's New modal on first mount if there are updates
  useEffect(() => {  
    if (hasNewUpdates && !isModalOpen) {
      const showWhatsNewTimeout = setTimeout(() => {
        openModal();
      }, 2000); // Show after 2 seconds
      return () => clearTimeout(showWhatsNewTimeout);
    }
  }, []);

  // Mark as viewed when modal opens
  useEffect(() => {
    if (isModalOpen) {
      markAsViewed();
    }
  }, [isModalOpen, markAsViewed]);

  // Progressive loading steps (K1 Fix #003)
  const loadingSteps = useLoadingSteps([
    'جاري تحميل بيانات الشركة...',
    'جاري تحميل السيارات والعقود...',
    'جاري تحميل البيانات المالية...',
    'جاري تحميل التحليلات والتقارير...'
  ]);

  // Extract values from hook result
  const companyId = currentCompanyId || company?.id;
  const browsedCompany = company;

  // Add error logging
  useEffect(() => {
    if (!moduleLoading && !company?.business_type) {
      console.error('🚨 [DASHBOARD] No business type found:', { company, moduleContext });
    }
  }, [moduleLoading, company, moduleContext]);

  // Progress through loading steps automatically (K1 Fix #003)
  useEffect(() => {
    if (moduleLoading || isRefreshing) {
      loadingSteps.reset();

      // Auto-progress through steps every 2 seconds
      const stepInterval = setInterval(() => {
        if (!loadingSteps.isComplete) {
          loadingSteps.nextStep();
        }
      }, 2000);

      return () => clearInterval(stepInterval);
    }
  }, [moduleLoading, isRefreshing]);

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

  // Only refresh when company actually changes
  useEffect(() => {
    if (companyId && companyId !== lastCompanyIdRef.current && isBrowsingMode) {
      console.log('🏢 [DASHBOARD] Company changed in browse mode:', lastCompanyIdRef.current, '->', companyId);
      lastCompanyIdRef.current = companyId;
      setIsRefreshing(true);
      refreshData();
      setTimeout(() => setIsRefreshing(false), 2000);
    } else if (companyId) {
      lastCompanyIdRef.current = companyId;
    }
  }, [companyId, isBrowsingMode, refreshData]);

  console.log('🏢 [DASHBOARD] ===== DETAILED DEBUG =====');
  console.log('🏢 [DASHBOARD] Module Loading:', moduleLoading);
  console.log('🏢 [DASHBOARD] Company ID:', companyId);
  console.log('🏢 [DASHBOARD] Company Data:', company);
  console.log('🏢 [DASHBOARD] Business Type from Company:', company?.business_type);
  console.log('🏢 [DASHBOARD] Business Type from Context:', moduleContext?.businessType);
  console.log('🏢 [DASHBOARD] Module Context:', moduleContext);
  console.log('🏢 [DASHBOARD] Is Browse Mode:', isBrowsingMode);
  console.log('🏢 [DASHBOARD] Browsed Company:', browsedCompany);
  console.log('🏢 [DASHBOARD] ===========================');

  if ((moduleLoading || isRefreshing) && !timeoutReached) {
    console.log('🏢 [DASHBOARD] Loading modules or refreshing...', { moduleLoading, isRefreshing });
    return (
      <LoadingProgress
        step={loadingSteps.currentStep}
        totalSteps={loadingSteps.totalSteps}
        message={loadingSteps.message}
        showEstimate={true}
      />
    );
  }

  // Handle timeout scenario
  if (timeoutReached && (moduleLoading || !company?.business_type)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">
            انتهت مهلة التحميل - يرجى المحاولة مرة أخرى
          </p>
          <button 
            onClick={() => {
              setTimeoutReached(false);
              refreshData();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // Smart router - select dashboard based on business type
  const businessType = moduleContext?.businessType;
  
  console.log('🏢 [DASHBOARD] Final business type decision:', businessType);

  // التأكد من وجود نوع النشاط قبل عرض أي dashboard
  // عدم عرض fallback dashboard إذا لم يتم تحديد نوع النشاط بعد
  if (!businessType || !company?.id) {
    console.log('🏢 [DASHBOARD] Missing critical data - preventing incorrect dashboard display', { 
      businessType, 
      companyId: company?.id,
      companyData: !!company,
      moduleLoading 
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {!businessType ? 'جاري تحديد نوع النشاط...' : 'جاري تحميل بيانات الشركة...'}
          </p>
          {isBrowsingMode && browsedCompany?.name && (
            <p className="text-xs text-muted-foreground">
              شركة {browsedCompany.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  const renderDashboardContent = () => {
    switch (businessType) {
      case 'car_rental':
        console.log('🏢 [DASHBOARD] Rendering Car Rental Dashboard');
        return (
          <>
            <DemoTrialBanner />
            <CarRentalDashboard key={`car-rental-${companyId}`} />
          </>
        );
      case 'real_estate':
        console.log('🏢 [DASHBOARD] Rendering Real Estate Dashboard');
        return (
          <>
            <DemoTrialBanner />
            <RealEstateDashboard key={`real-estate-${companyId}`} />
          </>
        );
      case 'retail':
        console.log('🏢 [DASHBOARD] Rendering Retail Dashboard');
        return (
          <>
            <DemoTrialBanner />
            <RetailDashboard key={`retail-${companyId}`} />
          </>
        );
      default:
        console.error('🏢 [DASHBOARD] Unknown business type:', businessType, 'for company ID:', company?.id);
        return (
          <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-destructive">
                نوع النشاط غير مدعوم: {businessType}
              </p>
              <p className="text-xs text-muted-foreground">
                يرجى التواصل مع الدعم التقني
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <PageCustomizer
      pageId="main-dashboard"
      title="Dashboard"
      titleAr="لوحة التحكم"
    >
      {renderDashboardContent()}
      <WhatsNewModal
        isOpen={isModalOpen}
        onClose={closeModal}
        changelog={changelog}
        unreadCount={unreadCount}
      />
    </PageCustomizer>
  );
};

const Dashboard: React.FC = () => {
  return (
    <ErrorBoundary>
      <DashboardInner />
    </ErrorBoundary>
  )
};

export default Dashboard;