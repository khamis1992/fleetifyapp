/**
 * Route Preloading Utility
 * 
 * Preloads critical routes on hover/focus to improve perceived performance.
 * Uses requestIdleCallback for non-blocking preloading.
 */

// Track preloaded routes to avoid duplicate preloading
const preloadedRoutes = new Set<string>();

// Map of route patterns to their lazy-loaded components
type RouteImportFn = () => Promise<any>;

interface RoutePreloadConfig {
  path: string;
  importFn: RouteImportFn;
  priority: 'high' | 'medium' | 'low';
}

// Critical routes configuration
export const criticalRoutes: RoutePreloadConfig[] = [
  // High priority - Most frequently accessed
  { path: '/dashboard', importFn: () => import('@/pages/Dashboard'), priority: 'high' },
  { path: '/finance', importFn: () => import('@/pages/Finance'), priority: 'high' },
  { path: '/customers', importFn: () => import('@/pages/Customers'), priority: 'high' },
  { path: '/contracts', importFn: () => import('@/pages/Contracts'), priority: 'high' },
  
  // Medium priority - Frequently accessed
  { path: '/fleet', importFn: () => import('@/pages/Fleet'), priority: 'medium' },
  { path: '/reports', importFn: () => import('@/pages/Reports'), priority: 'medium' },
  { path: '/quotations', importFn: () => import('@/pages/Quotations'), priority: 'medium' },
  { path: '/profile', importFn: () => import('@/pages/Profile'), priority: 'medium' },
  { path: '/settings', importFn: () => import('@/pages/Settings'), priority: 'medium' },
  
  // Finance sub-modules (high priority within finance)
  { path: '/finance/chart-of-accounts', importFn: () => import('@/pages/finance/ChartOfAccounts'), priority: 'medium' },
  { path: '/finance/general-ledger', importFn: () => import('@/pages/finance/GeneralLedger'), priority: 'medium' },
  { path: '/finance/billing', importFn: () => import('@/pages/finance/BillingCenter'), priority: 'medium' },
];

/**
 * Preload a specific route
 */
export const preloadRoute = async (path: string, importFn: RouteImportFn): Promise<void> => {
  // Skip if already preloaded
  if (preloadedRoutes.has(path)) {
    return;
  }

  try {
    // Mark as preloaded immediately to prevent duplicate attempts
    preloadedRoutes.add(path);
    
    // Preload the module
    await importFn();
    
    console.log(`✅ Preloaded route: ${path}`);
  } catch (error) {
    console.error(`❌ Failed to preload route: ${path}`, error);
    // Remove from preloaded set on failure so it can be retried
    preloadedRoutes.delete(path);
  }
};

/**
 * Preload route using requestIdleCallback for non-blocking preloading
 */
export const preloadRouteIdle = (path: string, importFn: RouteImportFn): void => {
  if (preloadedRoutes.has(path)) {
    return;
  }

  // Use requestIdleCallback if available, otherwise use setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadRoute(path, importFn);
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      preloadRoute(path, importFn);
    }, 1);
  }
};

/**
 * Preload multiple routes based on priority
 */
export const preloadRoutesByPriority = (priority: 'high' | 'medium' | 'low'): void => {
  const routesToPreload = criticalRoutes.filter(route => route.priority === priority);
  
  routesToPreload.forEach(route => {
    preloadRouteIdle(route.path, route.importFn);
  });
};

/**
 * Preload all high-priority routes (called on app initialization)
 */
export const preloadCriticalRoutes = (): void => {
  // Wait for initial render to complete
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadRoutesByPriority('high');
    }, { timeout: 3000 });
  } else {
    setTimeout(() => {
      preloadRoutesByPriority('high');
    }, 100);
  }
};

/**
 * React hook for route preloading on hover/focus
 */
export const useRoutePreload = (path: string) => {
  const route = criticalRoutes.find(r => r.path === path);
  
  if (!route) {
    return {};
  }

  return {
    onMouseEnter: () => preloadRouteIdle(route.path, route.importFn),
    onFocus: () => preloadRouteIdle(route.path, route.importFn),
  };
};

/**
 * Preload related routes based on current route
 * Example: If on /finance, preload /finance/chart-of-accounts, etc.
 */
export const preloadRelatedRoutes = (currentPath: string): void => {
  // Extract base path (e.g., /finance from /finance/invoices)
  const basePath = currentPath.split('/').slice(0, 2).join('/');
  
  // Find and preload related routes
  const relatedRoutes = criticalRoutes.filter(route => 
    route.path.startsWith(basePath) && route.path !== currentPath
  );
  
  relatedRoutes.forEach(route => {
    preloadRouteIdle(route.path, route.importFn);
  });
};

/**
 * Clear all preloaded routes (useful for testing or memory management)
 */
export const clearPreloadedRoutes = (): void => {
  preloadedRoutes.clear();
};

/**
 * Get preloaded routes count (useful for debugging)
 */
export const getPreloadedRoutesCount = (): number => {
  return preloadedRoutes.size;
};

/**
 * Check if a route is preloaded
 */
export const isRoutePreloaded = (path: string): boolean => {
  return preloadedRoutes.has(path);
};

// Types for external use
export type { RoutePreloadConfig, RouteImportFn };
