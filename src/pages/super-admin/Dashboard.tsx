import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
import { SystemStatsCards } from '@/components/super-admin/SystemStatsCards';
import { CompaniesOverview } from '@/components/super-admin/CompaniesOverview';
import { QuickActions } from '@/components/super-admin/QuickActions';
import { SystemAlerts } from '@/components/super-admin/SystemAlerts';

const SuperAdminDashboard: React.FC = () => {
  const { stats, companies, loading } = useSuperAdminData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl -m-4 p-4"></div>
        <div className="relative">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Welcome to the system administration panel. Monitor and manage all system activities.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <SystemStatsCards stats={stats} loading={false} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Companies Overview - Takes 2 columns */}
        <div className="xl:col-span-2">
          <CompaniesOverview companies={companies} loading={false} />
        </div>
        
        {/* System Alerts - Takes 1 column */}
        <div className="xl:col-span-1">
          <SystemAlerts />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
};

export default SuperAdminDashboard;