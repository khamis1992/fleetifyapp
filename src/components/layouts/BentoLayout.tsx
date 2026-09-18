/**
 * Bento Layout Component
 * Modern layout with BentoSidebar for the entire application
 * Now with full mobile responsive support
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import BentoSidebar from '@/components/dashboard/bento/BentoSidebar';
import { PageBreadcrumb } from '@/components/ui/page-breadcrumb';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Menu, X, Search, LayoutDashboard, Wallet, Car, Users, Settings } from 'lucide-react';
import { TaskNotificationBell } from '@/components/tasks/TaskNotificationBell';
import { TourProvider } from '@/components/tour-guide';
import { VerificationTaskAlert } from '@/components/notifications/VerificationTaskAlert';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { FinanceWorkspaceNav } from '@/components/finance/workspace/FinanceWorkspaceNav';
import { LegalWorkspace } from '@/components/legal/workspace/LegalWorkspace';
import '@/components/finance/workspace/finance-system.css';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
// Lazy load AI Chat Widget for performance
const AIChatWidget = lazy(() => import('@/components/ai-chat-assistant/AIChatWidget'));

// Mobile Bottom Navigation Configuration
const bottomNavItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'finance', label: 'المالية', icon: Wallet, href: '/finance/overview' },
  { id: 'fleet', label: 'الأسطول', icon: Car, href: '/fleet' },
  { id: 'customers', label: 'العملاء', icon: Users, href: '/customers' },
  { id: 'settings', label: 'المزيد', icon: Settings, href: '/settings' },
];

// Mobile Bottom Navigation Component
const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 safe-area-pb">
      <nav role="navigation" aria-label="التنقل السريع" className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.id === 'finance' && location.pathname.startsWith('/finance')) ||
            (item.id === 'fleet' && location.pathname.startsWith('/fleet')) ||
            (item.id === 'customers' && location.pathname.startsWith('/customers')) ||
            (item.id === 'dashboard' && location.pathname === '/dashboard');
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px]',
                isActive ? 'text-primary' : 'text-neutral-400'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

interface BentoLayoutProps {
  children?: React.ReactNode;
}

export const BentoLayout: React.FC<BentoLayoutProps> = ({ children }) => {
  const { t } = useFleetifyTranslation("ui");
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('fleetify:sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const mobileMenuButton = React.useRef<HTMLButtonElement>(null);
  const changeSidebarCollapsed = (value: boolean) => {
    setIsSidebarCollapsed(value);
    try { localStorage.setItem('fleetify:sidebar-collapsed', String(value)); } catch { /* Layout remains usable without storage. */ }
  };
  const location = useLocation();
  const isFinance = location.pathname === '/finance' || location.pathname.startsWith('/finance/');
  const isLegal = location.pathname === '/legal' || location.pathname.startsWith('/legal/');
  const isOperationsPage = ['/fleet/maintenance', '/customers', '/customers/crm', '/settings/permissions', '/hr/reports', '/hr/daily-closeouts', '/fleet/dispatch-permits'].includes(location.pathname);
  const [hasMounted, setHasMounted] = useState(false);
  const usesCanonicalOperationalPalette = !isOperationsPage && ['/fleet'].some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`),
  );

  // Track mount state to avoid unnecessary loading spinners during navigation
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (isFinance) document.body.setAttribute('data-finance-active', '');
    else document.body.removeAttribute('data-finance-active');
    return () => document.body.removeAttribute('data-finance-active');
  }, [isFinance]);

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

  // Handle sidebar toggle event from keyboard shortcuts
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsMobileMenuOpen(prev => !prev);
    };
    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-sidebar', handleToggleSidebar);
  }, []);

  // CRITICAL FIX: Only show loading on initial mount, not during navigation
  // This prevents loading spinners from appearing when navigating between pages
  if (loading && !hasMounted && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB]">
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
      <div
        className={cn(
          "min-h-screen flex bg-neutral-50 dark:bg-neutral-950",
          isFinance && "finance-layout",
          usesCanonicalOperationalPalette && "dashboard-system-colors bg-[#F6F8FB]",
        )}
        dir="rtl"
      >
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 z-40 flex items-center justify-between px-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            ref={mobileMenuButton}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600"
            aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-bold text-neutral-900">{t("fleetify")}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => document.dispatchEvent(new Event('fleetify:open-global-search'))}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
              aria-label="بحث"
            >
              <Search className="w-5 h-5" />
            </button>
            <ThemeToggle />
            <NotificationBell />
            <TaskNotificationBell />
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        <Sheet modal open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="sw-mobile-sheet" id="mobile-navigation"
            onCloseAutoFocus={event => { event.preventDefault(); mobileMenuButton.current?.focus(); }}>
            <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
            <SheetDescription className="sr-only">تصفح أقسام النظام أو ابحث عن القسم المطلوب.</SheetDescription>
            <BentoSidebar isMobile onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar - Fixed Position */}
        <div className="hidden lg:block fixed top-3 right-3 bottom-3 z-30">
          <aside role="complementary" aria-label="القائمة الجانبية">
            <BentoSidebar collapsed={isSidebarCollapsed} onCollapsedChange={changeSidebarCollapsed} />
          </aside>
        </div>
        
        {/* Main Content Area - With margin for fixed sidebar */}
        <main
          role="main"
          aria-label="المحتوى الرئيسي"
          className={cn("bento-workspace-main min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:pt-0 pb-20 lg:pb-0", isSidebarCollapsed && "sidebar-is-collapsed")}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="p-4 md:p-6 min-h-screen">
            {/* Breadcrumb Navigation */}
            {!isFinance && !isLegal && !isOperationsPage && <nav role="navigation" aria-label="التنقل الرئيسي">
              <PageBreadcrumb className="mb-4" />
            </nav>}
            {isFinance ? <div className="finance-system"><FinanceWorkspaceNav /><div className="finance-page-body">{children}</div></div> : isLegal ? <LegalWorkspace>{children}</LegalWorkspace> : children}
          </div>
        </main>

        {/* AI Chat Assistant Widget */}
        <Suspense fallback={<div className="w-16 h-16 rounded-full bg-muted animate-pulse" />}>
          <AIChatWidget hideFloatingButton={true} />
        </Suspense>

        {/* Command Palette (Ctrl+K / Cmd+K) */}
        <CommandPalette />

        {/* Global Search (Ctrl+K / Cmd+K) */}
        <GlobalSearch />

        {/* Verification Task Alert Modal */}
        <VerificationTaskAlert />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </TourProvider>
  );
};

export default BentoLayout;

