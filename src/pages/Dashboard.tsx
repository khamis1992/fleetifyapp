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
  
  console.log('🏢 [DASHBOARD] Business type detected:', businessType, 'Module context:', moduleContext);

  switch (businessType) {
    case 'car_rental':
      return <CarRentalDashboard />;
    case 'real_estate':
      return <RealEstateDashboard />;
    case 'retail':
      return <RetailDashboard />;
    default:
      // Show appropriate dashboard based on detected type, fallback to car rental only if no type
      if (!businessType) {
        console.warn('🏢 [DASHBOARD] No business type detected, falling back to car rental');
        return <CarRentalDashboard />;
      }
      console.warn('🏢 [DASHBOARD] Unknown business type:', businessType, 'falling back to car rental');
      return <CarRentalDashboard />;
  }
};

export default Dashboard;