import React, { useEffect, useState } from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import CarRentalDashboard from './dashboards/CarRentalDashboard';
import RealEstateDashboard from './dashboards/RealEstateDashboard';
import RetailDashboard from './dashboards/RetailDashboard';

const Dashboard: React.FC = () => {
  // Get all needed data from a single hook to avoid hook ordering issues
  const { moduleContext, isLoading: moduleLoading, company, refreshData } = useModuleConfig();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract values from hook result to avoid calling useUnifiedCompanyAccess again
  const companyId = company?.id;
  const isBrowsingMode = false; // This will be handled by useModuleConfig internally
  const browsedCompany = company;

  // Refresh data when switching companies in browse mode
  useEffect(() => {
    if (companyId) {
      console.log('🏢 [DASHBOARD] Company changed, force refreshing data for company:', companyId);
      setIsRefreshing(true);
      refreshData();
      // Give extra time for data to load
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [companyId, refreshData]);

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

  if (moduleLoading || isRefreshing) {
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