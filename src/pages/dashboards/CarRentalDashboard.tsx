import React, { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import EnhancedDashboardHeader from '@/components/dashboard/EnhancedDashboardHeader';
import { CommandPalette } from '@/components/command-palette';

// Lazy load heavy components
const WorldClassStatsCards = lazy(() => import('@/components/dashboard/WorldClassStatsCards').then(m => ({ default: m.WorldClassStatsCards })));
const QuickActionsDashboard = lazy(() => import('@/components/dashboard/QuickActionsDashboard'));
const FinancialAnalyticsSection = lazy(() => import('@/components/dashboard/FinancialAnalyticsSection').then(m => ({ default: m.FinancialAnalyticsSection })));
const FleetOperationsSection = lazy(() => import('@/components/dashboard/FleetOperationsSection').then(m => ({ default: m.FleetOperationsSection })));
const ForecastingSection = lazy(() => import('@/components/dashboard/ForecastingSection').then(m => ({ default: m.ForecastingSection })));
const DashboardActivitySection = lazy(() => import('@/components/dashboard/DashboardActivitySection'));
const WelcomeTour = lazy(() => import('@/components/onboarding/WelcomeTour').then(m => ({ default: m.WelcomeTour })));
const SystemLogsDebugger = lazy(() => import('@/components/dashboard/SystemLogsDebugger').then(m => ({ default: m.SystemLogsDebugger })));

// Loading fallback component
const SectionLoader: React.FC = () => (
  <div className="glass-card rounded-2xl p-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

const CarRentalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      searchInput?.focus();
    },
    onExport: () => {
      const exportButton = document.querySelector<HTMLButtonElement>('[data-action="export"]');
      exportButton?.click();
    },
  });

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

        {/* World-Class Stats Cards - Lazy Loaded */}
        <Suspense fallback={
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="h-16 w-16 bg-gray-200 rounded-2xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </section>
        }>
          <WorldClassStatsCards />
        </Suspense>

        {/* Quick Actions Panel - Lazy Loaded */}
        <Suspense fallback={<SectionLoader />}>
          <QuickActionsDashboard />
        </Suspense>

        {/* Financial Analytics Section - Lazy Loaded */}
        <Suspense fallback={<SectionLoader />}>
          <FinancialAnalyticsSection />
        </Suspense>

        {/* Fleet Operations Section - Lazy Loaded */}
        <Suspense fallback={<SectionLoader />}>
          <FleetOperationsSection />
        </Suspense>

        {/* Forecasting & Calendar Section - Lazy Loaded */}
        <Suspense fallback={<SectionLoader />}>
          <ForecastingSection />
        </Suspense>

        {/* Activity Section - Lazy Loaded */}
        <Suspense fallback={<SectionLoader />}>
          <DashboardActivitySection />
        </Suspense>
      </div>

      {/* Welcome Tour for New Users - Lazy Loaded */}
      <Suspense fallback={null}>
        <WelcomeTour />
      </Suspense>

      {/* System Logs Debugger - للمطورين فقط - Lazy Loaded */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <SystemLogsDebugger />
        </Suspense>
      )}
    </>
  );
};

export default CarRentalDashboard;
