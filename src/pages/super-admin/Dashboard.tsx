import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
import { SystemStatsCards } from '@/components/super-admin/SystemStatsCards';
import { CompaniesOverview } from '@/components/super-admin/CompaniesOverview';
import { QuickActions } from '@/components/super-admin/QuickActions';
import { SystemAlerts } from '@/components/super-admin/SystemAlerts';
import { useAuth } from '@/contexts/AuthContext';

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { stats, companies, loading } = useSuperAdminData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-50"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl"></div>
        <div className="relative p-8">
          <div className="space-y-4">
            <div className="animate-fade-in">
              <p className="text-lg text-muted-foreground font-medium">
                {getGreeting()}, {user?.email?.split('@')[0] || 'Admin'}! 👋
              </p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent leading-tight">
                Super Admin Dashboard
              </h1>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                Monitor system-wide activities, manage companies, and oversee all platform operations from your central command center.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <SystemStatsCards stats={stats} loading={false} />
      </div>

      {/* Main Content Grid with Enhanced Styling */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        {/* Companies Overview - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          <CompaniesOverview companies={companies} loading={false} />
        </div>
        
        {/* System Alerts - Takes 1 column */}
        <div className="xl:col-span-1 space-y-6">
          <SystemAlerts />
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <QuickActions />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;