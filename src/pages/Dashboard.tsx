import React from 'react';
import { useModuleConfig } from '@/modules/core/hooks';
import CarRentalDashboard from './dashboards/CarRentalDashboard';
import RealEstateDashboard from './dashboards/RealEstateDashboard';
import RetailDashboard from './dashboards/RetailDashboard';

const Dashboard: React.FC = () => {
  const { moduleContext, isLoading: moduleLoading } = useModuleConfig();

  if (moduleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Smart router - select dashboard based on business type
  const businessType = moduleContext?.businessType;
  
  console.log('🏢 [DASHBOARD] Business type detected:', businessType, 'Module context:', moduleContext, 'Is loading:', moduleLoading);

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