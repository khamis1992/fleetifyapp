/**
 * Main Application Component
 * Refactored to use route registry system for improved maintainability and reduced complexity
 */

import React, { Suspense, useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';

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
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Routing System
import { RouteProvider } from '@/components/router/RouteProvider';
import RouteRenderer from '@/components/router/RouteRenderer';
import { routeConfigs } from '@/routes';

// Error Boundaries and Performance
import ErrorBoundary from '@/lib/errorBoundary';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';

// PWA and Security
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import SecurityHeaders from '@/components/SecurityHeaders';
import { CommandPalette } from '@/components/ui/CommandPalette';

// Performance Monitoring
import { performanceMonitor } from '@/lib/performanceMonitor';
import { performanceLogger } from '@/lib/performanceLogger';
import { initializePWA } from '@/utils/pwaConfig';

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

// === Query Client Configuration ===
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Performance optimizations
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,

        // Cache configuration
        staleTime: APP_CONFIG.QUERY_STALE_TIME,
        gcTime: APP_CONFIG.QUERY_CACHE_TIME,

        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

        // Network mode
        networkMode: 'online',

        // Performance monitoring - disabled to prevent errors
        // onSuccess and onError callbacks removed for stability
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
};

// === Main App Component ===
const App: React.FC = () => {
  // Initialize query client with memoization
  const queryClient = useMemo(() => createQueryClient(), []);

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
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
          >
            <TooltipProvider>
              <AuthProvider>
                <AIChatProvider>
                  <CompanyContextProvider>
                  <FABProvider>
                    <FinanceProvider>
                      <MobileOptimizationProvider>
                        <RouteProvider routes={routeConfigs}>
                          <RouteErrorBoundary>
                            <div className="min-h-screen bg-background">
                              {/* Main Application Routes */}
                              <RouteRenderer routes={routeConfigs} />

                              {/* Global UI Components */}
                              {APP_CONFIG.ENABLE_COMMAND_PALETTE && (
                                <Suspense fallback={null}>
                                  <CommandPalette />
                                </Suspense>
                              )}

                              {/* PWA Install Prompt */}
                              {APP_CONFIG.ENABLE_PWA && (
                                <Suspense fallback={null}>
                                  <PWAInstallPrompt />
                                </Suspense>
                              )}

                              {/* Global Toast Notifications */}
                              <Toaster />
                            </div>
                          </RouteErrorBoundary>
                        </RouteProvider>

                        {/* Development Tools */}
                        {APP_CONFIG.ENABLE_REACT_QUERY_DEVTOOLS && (
                          <ReactQueryDevtools initialIsOpen={false} />
                        )}

                        {/* Security Headers */}
                        <SecurityHeaders />
                      </MobileOptimizationProvider>
                    </FinanceProvider>
                  </FABProvider>
                </CompanyContextProvider>
                </AIChatProvider>
              </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

// === App Metadata ===
App.displayName = 'FleetifyApp';

// Error boundary for the entire app
export default App;