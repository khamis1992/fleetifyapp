import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useOptimizedRecentActivities } from '@/hooks/useOptimizedRecentActivities';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import QuickActionsDashboard from '@/components/dashboard/QuickActionsDashboard';
import EnhancedActivityFeed from '@/components/dashboard/EnhancedActivityFeed';
import SmartMetricsPanel from '@/components/dashboard/SmartMetricsPanel';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { CommandPalette } from '@/components/command-palette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';
import { SystemLogsDebugger } from '@/components/dashboard/SystemLogsDebugger';


const CarRentalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const { data: recentActivities, isLoading: activitiesLoading } = useOptimizedRecentActivities();
  const { data: financialOverview, isLoading: financialLoading } = useFinancialOverview('car_rental');
  const { formatCurrency } = useCurrencyFormatter();

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenSearch: () => {
      // Focus search input if exists
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      searchInput?.focus();
    },
    onExport: () => {
      // Trigger export button if exists
      const exportButton = document.querySelector<HTMLButtonElement>('[data-action="export"]');
      exportButton?.click();
    },
  });

  // Convert financial overview data
  const smartMetricsData = financialOverview ? {
    totalRevenue: financialOverview.totalRevenue || 0,
    monthlyRevenue: financialOverview.monthlyTrend?.[financialOverview.monthlyTrend.length - 1]?.revenue || 0,
    totalProfit: financialOverview.netIncome || 0,
    profitMargin: financialOverview.profitMargin || 0,
    monthlyGrowth: 0,
    activeContracts: 0,
    pendingPayments: 0,
    overduePayments: 0,
  } : undefined;

  // Convert activities to enhanced format
  const enhancedActivities = recentActivities?.slice(0, 10).map((activity, index) => ({
    id: activity.id || `activity-${index}`,
    type: 'system' as const,
    title: activity.description || 'نشاط جديد',
    description: activity.description || 'لا يوجد وصف',
    user: 'النظام',
    timestamp: new Date(activity.created_at || new Date()),
    status: 'info' as const,
    metadata: {
      'نوع العملية': activity.description || 'غير محدد',
      'الوقت': new Date(activity.created_at || new Date()).toLocaleString('ar-SA')
    }
  })) || [];



  return (
    <>
      <ProfessionalBackground />

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <div className="relative z-10 space-y-8">
        {/* Enhanced Header */}
        <EnhancedDashboardHeader
          isBrowsingMode={isBrowsingMode}
          browsedCompany={browsedCompany}
          onExitBrowseMode={exitBrowseMode}
        />

        {/* Quick Actions Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <QuickActionsDashboard />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Enhanced Activity Feed */}
          <div className="xl:col-span-2">
            <EnhancedActivityFeed
              activities={enhancedActivities}
              loading={activitiesLoading}
              title="النشاطات الأخيرة"
              onRefresh={() => window.location.reload()}
              showFilters={true}
            />
          </div>

          {/* Enhanced Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-6"
            data-tour="dashboard-metrics"
          >
            <SmartMetricsPanel
              financialData={smartMetricsData}
              loading={financialLoading}
            />
          </motion.div>
        </div>

      </div>

      {/* Welcome Tour for New Users (K1 Fix #004) */}
      <WelcomeTour />

      {/* System Logs Debugger - للمطورين فقط */}
      {import.meta.env.DEV && <SystemLogsDebugger />}
    </>
  );
};

export default CarRentalDashboard;