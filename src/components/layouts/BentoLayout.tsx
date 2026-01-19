/**
 * Bento Layout Component
 * Modern layout with BentoSidebar for the entire application
 * Now with full mobile responsive support
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import BentoSidebar from '@/components/dashboard/bento/BentoSidebar';
import { PageBreadcrumb } from '@/components/ui/page-breadcrumb';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { TaskNotificationBell } from '@/components/tasks/TaskNotificationBell';
import { TourProvider } from '@/components/tour-guide';

// Lazy load AI Chat Widget for performance
const AIChatWidget = lazy(() => import('@/components/ai-chat-assistant/AIChatWidget'));

interface BentoLayoutProps {
  children?: React.ReactNode;
}

export const BentoLayout: React.FC<BentoLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [hasMounted, setHasMounted] = useState(false);

  // Track mount state to avoid unnecessary loading spinners during navigation
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // CRITICAL FIX: Only show loading on initial mount, not during navigation
  // This prevents loading spinners from appearing when navigating between pages
  if (loading && !hasMounted && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only redirect if we're not loading and don't have a user
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <TourProvider>
      <div className="min-h-screen flex bg-neutral-50" dir="rtl">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-neutral-200 z-40 flex items-center justify-between px-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-bold text-neutral-900">Fleetify</span>
          <TaskNotificationBell />
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="lg:hidden fixed top-0 right-0 bottom-0 w-72 z-50"
              >
                <BentoSidebar isMobile onCloseMobile={() => setIsMobileMenuOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar - Fixed Position */}
        <div className="hidden lg:block">
          <BentoSidebar />
        </div>
        
        {/* Main Content Area - With margin for fixed sidebar */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0 pb-20 lg:pb-0 lg:mr-[260px]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="p-4 md:p-6 min-h-screen">
            {/* Breadcrumb Navigation */}
            <PageBreadcrumb className="mb-4" />
            {children}
          </div>
        </motion.main>

        {/* AI Chat Assistant Widget */}
        <Suspense fallback={<div className="w-16 h-16 rounded-full bg-muted animate-pulse" />}>
          <AIChatWidget hideFloatingButton={true} />
        </Suspense>
      </div>
    </TourProvider>
  );
};

export default BentoLayout;

