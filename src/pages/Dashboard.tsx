// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import CarRentalDashboard from './dashboards/CarRentalDashboard';
import RealEstateDashboard from './dashboards/RealEstateDashboard';
import RetailDashboard from './dashboards/RetailDashboard';

const Dashboard: React.FC = () => {
  // Get all needed data from a single hook to avoid hook ordering issues
  const { moduleContext, isLoading: moduleLoading, company, refreshData, isBrowsingMode, currentCompanyId } = useModuleConfig();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompanyIdRef = useRef<string>();

  // Extract values from hook result
  const companyId = currentCompanyId || company?.id;
  const browsedCompany = company;

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
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {isBrowsingMode ? 'جاري تحميل بيانات الشركة...' : 'جاري تحميل لوحة التحكم...'}
          </p>
          {isBrowsingMode && browsedCompany?.name && (
            <p className="text-xs text-muted-foreground">
              {browsedCompany.name}
            </p>
          )}
        </div>
      </div>
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

  switch (businessType) {
    case 'car_rental':
      console.log('🏢 [DASHBOARD] Rendering Car Rental Dashboard');
      return <CarRentalDashboard key={`car-rental-${companyId}`} />;
    case 'real_estate':
      console.log('🏢 [DASHBOARD] Rendering Real Estate Dashboard');
      return <RealEstateDashboard key={`real-estate-${companyId}`} />;
    case 'retail':
      console.log('🏢 [DASHBOARD] Rendering Retail Dashboard');
      return <RetailDashboard key={`retail-${companyId}`} />;
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

export default Dashboard;