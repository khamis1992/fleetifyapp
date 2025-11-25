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

// UI Components
import { SimpleToaster } from '@/components/ui/simple-toaster';
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
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
  ENABLE_REACT_QUERY_DEVTOOLS: process.env.NODE_ENV === 'development',
  ENABLE_PWA: process.env.REACT_APP_ENABLE_PWA === 'true',
  ENABLE_COMMAND_PALETTE: process.env.REACT_APP_ENABLE_COMMAND_PALETTE !== 'false',

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

        // Performance monitoring
        onSuccess: (data, query) => {
          if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
            const executionTime = Date.now() - (query.state.dataUpdatedAt || Date.now());
            performanceLogger.logQuery({
              queryKey: query.queryKey,
              success: true,
              executionTime,
              dataSize: JSON.stringify(data).length,
              cacheHit: query.state.isFetching === false,
            });
          }
        },
        onError: (error, query) => {
          if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
            performanceLogger.logQuery({
              queryKey: query.queryKey,
              success: false,
              error: error.message,
              retryCount: query.state.fetchFailureCount,
            });
          }
        },
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

        // Initialize performance monitoring
        if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
          performanceMonitor.initialize();
          performanceLogger.info('Application initialized', {
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            config: APP_CONFIG,
          });
        }

        // Preload critical routes
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            preloadCriticalRoutes(APP_CONFIG.CRITICAL_ROUTES);
          }, { timeout: 5000 });
        }

      } catch (error) {
        console.error('App initialization error:', error);
        performanceLogger.error('App initialization failed', { error });
      }
    };

    initializeApp();
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (APP_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
        performanceLogger.info('Application unmounted');
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
                              <SimpleToaster />
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