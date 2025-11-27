import React, { useState, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CommandPalette } from '@/components/command-palette';

// Lazy load BentoDashboard
const BentoDashboard = lazy(() => import('@/components/dashboard/bento/BentoDashboard'));

// Lazy load other heavy components for fallback
const WelcomeTour = lazy(() => import('@/components/onboarding/WelcomeTour').then(m => ({ default: m.WelcomeTour })));
const SystemLogsDebugger = lazy(() => import('@/components/dashboard/SystemLogsDebugger').then(m => ({ default: m.SystemLogsDebugger })));

// Loading component for Bento Dashboard
const BentoLoader: React.FC = () => (
  <div className="min-h-screen bg-[#f0efed] p-5">
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-500 font-medium">جاري تحميل لوحة التحكم...</p>
      </div>
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
      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Bento Dashboard - Lazy Loaded */}
      <Suspense fallback={<BentoLoader />}>
        <BentoDashboard />
      </Suspense>

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
