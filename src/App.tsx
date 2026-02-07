/**
 * Main Application Component
 * Refactored to use route registry system for improved maintainability and reduced complexity
 */

import React, { Suspense, useMemo, useEffect } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// Context Providers
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyContextProvider } from '@/contexts/CompanyContext';
import { FABProvider } from '@/contexts/FABContext';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { AIChatProvider } from '@/contexts/AIChatContext';

// UI Components
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';

// Routing System
import { RouteProvider } from '@/components/router/RouteProvider';
import RouteRenderer from '@/components/router/RouteRenderer';
import { routeConfigs } from '@/routes';

// Error Boundaries and Performance
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';

// Suspense Boundaries
import SuspenseBoundary from '@/components/common/SuspenseBoundary';

// PWA and Security
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import SecurityHeaders from '@/components/SecurityHeaders';
import { CommandPalette } from '@/components/ui/CommandPalette';

// Performance Monitoring
import { performanceMonitor } from '@/lib/performanceMonitor';
import { performanceLogger } from '@/lib/performanceLogger';
import { initializePWA } from '@/utils/pwaConfig';
import PerformanceMonitor from '@/components/performance/PerformanceMonitor';

// Preloading and Optimization
import { preloadCriticalRoutes, preloadRelatedRoutes } from '@/utils/routePreloading';

// Mobile Optimization
import { MobileOptimizationProvider } from '@/components/performance';

// === Configuration ===
const APP_CONFIG = {
  // Feature flags
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.DEV,
  ENABLE_REACT_QUERY_DEVTOOLS: import.meta.env.DEV,
  ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA === 'true',
  ENABLE_COMMAND_PALETTE: import.meta.env.VITE_ENABLE_COMMAND_PALETTE !== 'false',

  // Performance settings
  CRITICAL_ROUTES: ['/dashboard', '/customers', '/contracts', '/fleet'],
  PRELOAD_STRATEGY: 'viewport',

  // Cache settings
  QUERY_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  QUERY_STALE_TIME: 2 * 60 * 1000, // 2 minutes
} as const;

// === Mobile Redirect Component ===
// Automatically redirects to mobile app when running in Capacitor (APK)
const MobileRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkMobileAndRedirect = async () => {
      // Check if running in Capacitor (native mobile app)
      const isNative = Capacitor.isNativePlatform();
      const isMobile = Capacitor.getPlatform() !== 'web';

      // If running in native app and not already on mobile routes, redirect
      if ((isNative || isMobile) && !location.pathname.startsWith('/mobile')) {
        // Check if user is authenticated before redirecting to home
        const token = localStorage.getItem('sb-alaraf-auth-token');
        if (token) {
          navigate('/mobile/employee/home', { replace: true });
        } else {
          navigate('/mobile', { replace: true });
        }
      }
    };

    checkMobileAndRedirect();
  }, [navigate, location]);

  return null; // This component doesn't render anything
};

// === Query Client Configuration ===
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Performance optimizations
        refetchOnMount: false, // DISABLED: Prevent refetch on mount to use cached data
        refetchOnWindowFocus: false, // DISABLED: Prevent refetch when switching tabs (causes freezing)
        refetchOnReconnect: true, // Keep enabled for network reconnection

        // Cache configuration - CRITICAL: Keep data in cache longer
        staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
        gcTime: 30 * 60 * 1000, // INCREASED: 30 minutes - keep in cache longer to prevent disappearing data

        // Better cache configuration to prevent data flickering
        structuralSharing: true,
        
        // CRITICAL: Keep previous data while refetching
        placeholderData: (previousData: any) => previousData,

        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 1.5 ** attemptIndex, 3000),

        // Network mode
        networkMode: 'online',
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          console.error('Mutation error:', error);
        },
        onSuccess: (data) => {
          // Invalidate related queries on mutation success
          console.log('Mutation succeeded, data updated');
        }
      },
    },
  });
};

// === Main App Component ===
const App: React.FC = () => {
  // Get or create unique tab ID (للتتبع فقط، ليس للعزل)
  const tabId = useMemo(() => {
    let id = sessionStorage.getItem('fleetify_tab_id');
    if (!id) {
      id = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('fleetify_tab_id', id);
    }
    if (import.meta.env.DEV) {
      console.log(`🔍 [APP] Tab ID: ${id}`);
    }
    return id;
  }, []);

  // Initialize query client with shared cache (no tab isolation)
  // This allows all tabs to share the same data
  const queryClient = useMemo(() => {
    const client = createQueryClient();
    
    // Add metadata for tracking only (not for cache isolation)
    client.setDefaultOptions({
      ...client.getDefaultOptions(),
      queries: {
        ...client.getDefaultOptions().queries,
        meta: {
          tabId: tabId, // للتتبع والـ logging فقط
        }
      },
    });
    
    if (import.meta.env.DEV) {
      console.log(`🔍 [APP] Query client initialized with shared cache for tab: ${tabId}`);
    }
    return client;
  }, [tabId]);

  // Initialize cache utilities
  React.useEffect(() => {
    // Set the query client instance for cache utilities
    import('./utils/cacheUtils').then(({ setQueryClient }) => {
      setQueryClient(queryClient);
    });
  }, [queryClient]);

  // DISABLED: Advanced tab sync causes performance issues and tab freezing
  // Each tab will work independently with its own cache
  // React.useEffect(() => {
  //   import('./utils/advancedTabSync').then(({ advancedTabSync }) => {
  //     console.log('🔄 [APP] Tab sync disabled for performance');
  //   });
  // }, [queryClient, tabId]);

  // Debug: Check routes (only in dev)
  if (import.meta.env.DEV) {
    console.log('🔍 [App] routeConfigs length:', routeConfigs.length);
    console.log('🔍 [App] Mobile routes:', routeConfigs.filter(r => r.path.startsWith('/mobile')).map(r => r.path));
  }

  // Initialize PWA and performance monitoring
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize PWA features
        if (APP_CONFIG.ENABLE_PWA) {
          await initializePWA();
        }

        // Performance monitoring initialized via class constructor
        if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
          console.log('✅ [PERF] Performance monitoring enabled');
        }

        // Preload critical routes
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            preloadCriticalRoutes(APP_CONFIG.CRITICAL_ROUTES);
          }, { timeout: 5000 });
        }

      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
        console.log('✅ [PERF] Application unmounted');
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <QueryClientProvider client={queryClient}>
          {/* Temporarily disabled ThemeProvider for debugging */}
          {/* <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
          > */}
          {/* Global TooltipProvider temporarily disabled due to @radix-ui/react-tooltip useRef error */}
          {/* <TooltipProvider delayDuration={200}> */}
            <AuthProvider>
              <CompanyContextProvider>
                <AIChatProvider>
                  <FABProvider>
                    <FinanceProvider>
                      <MobileOptimizationProvider>
                        <PerformanceMonitor>
                          <RouteProvider routes={routeConfigs}>
                            <RouteErrorBoundary>
                              <div className="min-h-screen bg-background">
                                {/* Mobile Auto-Redirect for Native App */}
                                <MobileRedirect />

                                {/* Main Application Routes with Suspense Boundary */}
                                <SuspenseBoundary height="min-h-screen">
                                  <RouteRenderer routes={routeConfigs} />
                                </SuspenseBoundary>

                                {/* Global UI Components */}
                                {/* CommandPalette disabled for now */}

                                {/* PWA Install Prompt */}
                                {APP_CONFIG.ENABLE_PWA && (
                                  <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                                    <PWAInstallPrompt />
                                  </Suspense>
                                )}

                                {/* Global Toast Notifications */}
                                <Toaster />
                                <SonnerToaster />
                              </div>
                            </RouteErrorBoundary>
                          </RouteProvider>
                        </PerformanceMonitor>

                        {/* Development Tools */}
                        {APP_CONFIG.ENABLE_REACT_QUERY_DEVTOOLS && (
                          <ReactQueryDevtools initialIsOpen={false} />
                        )}

                        {/* Security Headers */}
                        <SecurityHeaders />
                      </MobileOptimizationProvider>
                    </FinanceProvider>
                  </FABProvider>
                </AIChatProvider>
              </CompanyContextProvider>
            </AuthProvider>
            {/* </TooltipProvider> */}
          {/* </ThemeProvider> */}
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

// === App Metadata ===
App.displayName = 'FleetifyApp';

// Error boundary for the entire app
export default App;