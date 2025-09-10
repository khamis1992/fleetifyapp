import React, { useEffect } from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import CarRentalDashboard from './dashboards/CarRentalDashboard';
import RealEstateDashboard from './dashboards/RealEstateDashboard';
import RetailDashboard from './dashboards/RetailDashboard';

const Dashboard: React.FC = () => {
  const { moduleContext, isLoading: moduleLoading, company, refreshData } = useModuleConfig();
  const { isBrowsingMode, browsedCompany, companyId } = useUnifiedCompanyAccess();

  // Refresh data when switching companies in browse mode
  useEffect(() => {
    if (isBrowsingMode && companyId) {
      console.log('🏢 [DASHBOARD] Browse mode detected, refreshing data for company:', companyId);
      refreshData();
    }
  }, [isBrowsingMode, companyId, refreshData]);

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

  if (moduleLoading) {
    console.log('🏢 [DASHBOARD] Still loading modules...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Smart router - select dashboard based on business type
  const businessType = moduleContext?.businessType;
  
  console.log('🏢 [DASHBOARD] Final business type decision:', businessType);

  // إذا كان التحميل جارياً أو لا يوجد نوع نشاط، عرض شاشة التحميل
  if (!businessType) {
    console.log('🏢 [DASHBOARD] No business type available, showing loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  switch (businessType) {
    case 'car_rental':
      console.log('🏢 [DASHBOARD] Rendering Car Rental Dashboard');
      return <CarRentalDashboard />;
    case 'real_estate':
      console.log('🏢 [DASHBOARD] Rendering Real Estate Dashboard');
      return <RealEstateDashboard />;
    case 'retail':
      console.log('🏢 [DASHBOARD] Rendering Retail Dashboard');
      return <RetailDashboard />;
    default:
      console.warn('🏢 [DASHBOARD] Unknown business type:', businessType, 'falling back to car rental');
      return <CarRentalDashboard />;
  }
};

export default Dashboard;