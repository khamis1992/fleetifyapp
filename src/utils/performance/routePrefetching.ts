/**
 * Intelligent Route Prefetching Strategy
 * Preload routes and data before user navigation for instant transitions
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeyFactory, queryOptions } from './queryConfig';

/**
 * Route prefetch configuration
 */
interface PrefetchRoute {
  path: string;
  component: () => Promise<any>;
  dataFetchers?: Array<(queryClient: QueryClient, params?: any) => Promise<void>>;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Prefetch manager class
 */
class RoutePrefetchManager {
  private prefetchedRoutes: Set<string> = new Set();
  private prefetchQueue: Map<string, PrefetchRoute> = new Map();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPrefetchQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Prefetch a route component and its data
   */
  async prefetchRoute(
    route: PrefetchRoute,
    queryClient?: QueryClient,
    params?: any
  ): Promise<void> {
    // Skip if already prefetched
    if (this.prefetchedRoutes.has(route.path)) {
      return;
    }

    // Skip if offline and low priority
    if (!this.isOnline && route.priority === 'low') {
      return;
    }

    try {
      // Prefetch component
      await route.component();

      // Prefetch data if fetchers provided
      if (route.dataFetchers && queryClient) {
        await Promise.all(
          route.dataFetchers.map(fetcher => fetcher(queryClient, params))
        );
      }

      this.prefetchedRoutes.add(route.path);
    } catch (error) {
      console.error(`[Prefetch] Failed to prefetch route ${route.path}:`, error);
    }
  }

  /**
   * Add route to prefetch queue
   */
  queuePrefetch(route: PrefetchRoute): void {
    if (!this.prefetchQueue.has(route.path)) {
      this.prefetchQueue.set(route.path, route);
    }
  }

  /**
   * Process prefetch queue based on priority
   */
  async processPrefetchQueue(queryClient?: QueryClient): Promise<void> {
    if (!this.isOnline) return;

    // Sort by priority
    const sortedRoutes = Array.from(this.prefetchQueue.values()).sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return (priorityMap[b.priority || 'low']) - (priorityMap[a.priority || 'low']);
    });

    // Process high priority routes immediately
    const highPriority = sortedRoutes.filter(r => r.priority === 'high');
    await Promise.all(
      highPriority.map(route => this.prefetchRoute(route, queryClient))
    );

    // Process medium and low priority with delay
    const otherRoutes = sortedRoutes.filter(r => r.priority !== 'high');
    for (const route of otherRoutes) {
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.prefetchRoute(route, queryClient);
        });
      } else {
        setTimeout(() => {
          this.prefetchRoute(route, queryClient);
        }, 100);
      }
    }
  }

  /**
   * Clear prefetch cache
   */
  clear(): void {
    this.prefetchedRoutes.clear();
    this.prefetchQueue.clear();
  }
}

// Singleton instance
export const prefetchManager = new RoutePrefetchManager();

/**
 * Common route prefetch configurations
 */
export const commonRoutes: Record<string, PrefetchRoute> = {
  customers: {
    path: '/customers',
    component: () => import('@/pages/Customers'),
    dataFetchers: [
      async (queryClient, params) => {
        const companyId = params?.companyId;
        if (!companyId) return;
        
        await queryClient.prefetchQuery({
          queryKey: queryKeyFactory.customers.list(companyId),
          queryFn: async () => {
            // Your customer fetch function
            return [];
          },
          ...queryOptions.normal,
        });
      },
    ],
    priority: 'high',
  },
  
  contracts: {
    path: '/contracts',
    component: () => import('@/pages/Contracts'),
    dataFetchers: [
      async (queryClient, params) => {
        const companyId = params?.companyId;
        if (!companyId) return;
        
        await queryClient.prefetchQuery({
          queryKey: queryKeyFactory.contracts.list(companyId),
          queryFn: async () => {
            // Your contract fetch function
            return [];
          },
          ...queryOptions.normal,
        });
      },
    ],
    priority: 'high',
  },
  
  finance: {
    path: '/finance',
    component: () => import('@/pages/Finance'),
    dataFetchers: [
      async (queryClient, params) => {
        const companyId = params?.companyId;
        if (!companyId) return;
        
        await queryClient.prefetchQuery({
          queryKey: queryKeyFactory.financial.overview(companyId),
          queryFn: async () => {
            // Your financial overview fetch function
            return {};
          },
          ...queryOptions.normal,
        });
      },
    ],
    priority: 'medium',
  },
  
  vehicles: {
    path: '/fleet',
    component: () => import('@/pages/Fleet'),
    priority: 'medium',
  },
  
  reports: {
    path: '/reports',
    component: () => import('@/pages/Reports'),
    priority: 'low',
  },
};

/**
 * Hook to enable intelligent prefetching
 */
export function usePrefetchRoutes(queryClient: QueryClient) {
  // Prefetch common routes on mount
  React.useEffect(() => {
    // Queue all common routes
    Object.values(commonRoutes).forEach(route => {
      prefetchManager.queuePrefetch(route);
    });

    // Process queue
    prefetchManager.processPrefetchQueue(queryClient);
  }, [queryClient]);
}

/**
 * Prefetch route on hover (for links)
 */
export function usePrefetchOnHover(
  route: PrefetchRoute,
  queryClient: QueryClient,
  params?: any
) {
  const handleHover = React.useCallback(() => {
    prefetchManager.prefetchRoute(route, queryClient, params);
  }, [route, queryClient, params]);

  return { onMouseEnter: handleHover };
}

/**
 * Prefetch route on viewport entry
 */
export function usePrefetchOnVisible(
  route: PrefetchRoute,
  queryClient: QueryClient,
  params?: any
) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            prefetchManager.prefetchRoute(route, queryClient, params);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [route, queryClient, params]);

  return ref;
}

/**
 * Prefetch based on user navigation patterns
 */
export class NavigationPatternLearner {
  private patterns: Map<string, string[]> = new Map();
  private readonly maxHistory = 10;

  /**
   * Record navigation
   */
  recordNavigation(from: string, to: string): void {
    const history = this.patterns.get(from) || [];
    history.unshift(to);
    
    // Keep only recent history
    if (history.length > this.maxHistory) {
      history.pop();
    }
    
    this.patterns.set(from, history);
    
    // Store in localStorage
    this.savePatterns();
  }

  /**
   * Get likely next routes
   */
  getLikelyNextRoutes(currentPath: string): string[] {
    const history = this.patterns.get(currentPath) || [];
    
    // Count frequency
    const frequency = new Map<string, number>();
    history.forEach(path => {
      frequency.set(path, (frequency.get(path) || 0) + 1);
    });
    
    // Sort by frequency
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([path]) => path)
      .slice(0, 3); // Top 3 likely routes
  }

  /**
   * Save patterns to localStorage
   */
  private savePatterns(): void {
    try {
      const data = JSON.stringify(Array.from(this.patterns.entries()));
      localStorage.setItem('navigation_patterns', data);
    } catch (error) {
      console.error('[NavigationPatternLearner] Failed to save patterns:', error);
    }
  }

  /**
   * Load patterns from localStorage
   */
  loadPatterns(): void {
    try {
      const data = localStorage.getItem('navigation_patterns');
      if (data) {
        const entries = JSON.parse(data);
        this.patterns = new Map(entries);
      }
    } catch (error) {
      console.error('[NavigationPatternLearner] Failed to load patterns:', error);
    }
  }
}

export const navigationLearner = new NavigationPatternLearner();

/**
 * Hook to track and learn navigation patterns
 */
export function useNavigationLearning(currentPath: string, queryClient: QueryClient) {
  const previousPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Load patterns on mount
    navigationLearner.loadPatterns();
  }, []);

  React.useEffect(() => {
    // Record navigation
    if (previousPath.current && previousPath.current !== currentPath) {
      navigationLearner.recordNavigation(previousPath.current, currentPath);
      
      // Prefetch likely next routes
      const likelyRoutes = navigationLearner.getLikelyNextRoutes(currentPath);
      likelyRoutes.forEach(path => {
        const route = commonRoutes[path];
        if (route) {
          prefetchManager.queuePrefetch(route);
        }
      });
      
      prefetchManager.processPrefetchQueue(queryClient);
    }
    
    previousPath.current = currentPath;
  }, [currentPath, queryClient]);
}

/**
 * Prefetch critical data for a specific entity
 */
export async function prefetchEntityData(
  queryClient: QueryClient,
  entity: 'customer' | 'contract' | 'vehicle',
  id: string
): Promise<void> {
  switch (entity) {
    case 'customer':
      await queryClient.prefetchQuery({
        queryKey: queryKeyFactory.customers.detail(id),
        queryFn: async () => {
          // Your customer detail fetch function
          return {};
        },
        ...queryOptions.normal,
      });
      
      // Also prefetch related contracts
      await queryClient.prefetchQuery({
        queryKey: queryKeyFactory.contracts.byCustomer(id),
        queryFn: async () => {
          // Your contracts fetch function
          return [];
        },
        ...queryOptions.normal,
      });
      break;
      
    case 'contract':
      await queryClient.prefetchQuery({
        queryKey: queryKeyFactory.contracts.detail(id),
        queryFn: async () => {
          // Your contract detail fetch function
          return {};
        },
        ...queryOptions.normal,
      });
      break;
      
    case 'vehicle':
      await queryClient.prefetchQuery({
        queryKey: queryKeyFactory.vehicles.detail(id),
        queryFn: async () => {
          // Your vehicle detail fetch function
          return {};
        },
        ...queryOptions.normal,
      });
      
      // Also prefetch maintenance history
      await queryClient.prefetchQuery({
        queryKey: queryKeyFactory.vehicles.maintenance(id),
        queryFn: async () => {
          // Your maintenance fetch function
          return [];
        },
        ...queryOptions.normal,
      });
      break;
  }
}

// Missing React import
import React from 'react';
