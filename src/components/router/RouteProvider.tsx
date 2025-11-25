/**
 * Route Provider Component
 * Provides routing context and utilities throughout the application
 */

import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RouteConfig, RouteState, RouteNavigation, NavigationOptions } from '@/routes/types';

interface RouteContextType {
  /** Current route configuration */
  currentRoute?: RouteConfig;
  /** Route navigation utilities */
  navigation: RouteNavigation;
  /** Route state */
  state: RouteState;
  /** Update route state */
  updateState: (updates: Partial<RouteState>) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

interface RouteProviderProps {
  /** Route configurations */
  routes: RouteConfig[];
  /** Children components */
  children: React.ReactNode;
  /** Initial route state */
  initialState?: Partial<RouteState>;
}

export const RouteProvider: React.FC<RouteProviderProps> = ({
  routes,
  children,
  initialState = {},
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Find current route configuration
  const currentRoute = useMemo(() => {
    return routes.find(route => {
      const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pathPattern}$`);
      return regex.test(location.pathname);
    });
  }, [routes, location.pathname]);

  // Initialize route state
  const [state, setState] = useState<RouteState>(() => ({
    loading: {
      route: false,
      component: false,
      data: false,
    },
    error: {},
    params: {},
    query: {},
    meta: {},
    navigation: {
      canGoBack: false,
      canGoForward: false,
      depth: 0,
    },
    history: [],
    ...initialState,
  }));

  // Update route state
  const updateState = useCallback((updates: Partial<RouteState>) => {
    setState(prevState => ({
      ...prevState,
      ...updates,
    }));
  }, []);

  // Navigation utilities
  const navigation = useMemo<RouteNavigation>(() => ({
    navigate: (path: string, options: NavigationOptions = {}) => {
      updateState({
        loading: { ...state.loading, route: true },
      });

      if (options.replace) {
        navigate(path, { replace: true, state: options.state });
      } else {
        navigate(path, { state: options.state });
      }

      // Clear loading state after navigation
      setTimeout(() => {
        updateState({
          loading: { ...state.loading, route: false },
        });
      }, 100);
    },

    goBack: () => {
      if (state.navigation.canGoBack) {
        window.history.back();
      }
    },

    goForward: () => {
      if (state.navigation.canGoForward) {
        window.history.forward();
      }
    },

    replace: (path: string, options: NavigationOptions = {}) => {
      navigate(path, { replace: true, state: options.state });
    },

    refresh: () => {
      window.location.reload();
    },

    exists: (path: string) => {
      return routes.some(route => {
        const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pathPattern}$`);
        return regex.test(path);
      });
    },

    getRoute: (path: string) => {
      return routes.find(route => {
        const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pathPattern}$`);
        return regex.test(path);
      });
    },

    getRoutesByGroup: (groupId: string) => {
      return routes.filter(route => route.group === groupId);
    },

    getParentRoutes: (path: string) => {
      const route = routes.find(route => {
        const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pathPattern}$`);
        return regex.test(path);
      });

      if (!route || !route.parent) {
        return [];
      }

      const parentRoute = routes.find(r => r.path === route.parent);
      if (!parentRoute) {
        return [];
      }

      return [...navigation.getParentRoutes(parentRoute.path), parentRoute];
    },

    getChildRoutes: (path: string) => {
      return routes.filter(route => route.parent === path);
    },
  }), [routes, navigate, state.loading, state.navigation]);

  // Parse URL parameters and query
  const routeParams = useMemo(() => {
    if (!currentRoute) return {};

    const params: Record<string, string> = {};
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const routeSegments = currentRoute.path.split('/').filter(Boolean);

    routeSegments.forEach((segment, index) => {
      if (segment.startsWith(':')) {
        const paramName = segment.substring(1);
        params[paramName] = pathSegments[index] || '';
      }
    });

    return params;
  }, [currentRoute, location.pathname]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(location.search);

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  }, [location.search]);

  // Update state when route changes
  React.useEffect(() => {
    const previousRoute = state.currentRoute;

    updateState({
      currentRoute,
      params: routeParams,
      query: queryParams,
      history: previousRoute ? [...state.history, previousRoute] : [],
      navigation: {
        ...state.navigation,
        canGoBack: state.history.length > 0,
        depth: state.history.length + 1,
      },
    });
  }, [currentRoute, routeParams, queryParams]);

  // Update document metadata when route changes
  React.useEffect(() => {
    if (currentRoute) {
      // Update page title
      if (currentRoute.title) {
        document.title = `${currentRoute.title} - FleetifyApp`;
      }

      // Update meta description
      if (currentRoute.description) {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', currentRoute.description);
        } else {
          const meta = document.createElement('meta');
          meta.name = 'description';
          meta.content = currentRoute.description;
          document.head.appendChild(meta);
        }
      }

      // Update route-specific meta tags
      if (currentRoute.meta) {
        // SEO meta
        if (currentRoute.meta.seo?.title) {
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            ogTitle.setAttribute('content', currentRoute.meta.seo.title);
          }
        }

        if (currentRoute.meta.seo?.description) {
          const ogDescription = document.querySelector('meta[property="og:description"]');
          if (ogDescription) {
            ogDescription.setAttribute('content', currentRoute.meta.seo.description);
          }
        }
      }
    }
  }, [currentRoute]);

  const contextValue: RouteContextType = useMemo(() => ({
    currentRoute,
    navigation,
    state,
    updateState,
  }), [currentRoute, navigation, state, updateState]);

  return (
    <RouteContext.Provider value={contextValue}>
      {children}
    </RouteContext.Provider>
  );
};

// Hook to use route context
export const useRoute = (): RouteContextType => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
};

// Hook to use current route configuration
export const useCurrentRoute = (): RouteConfig | undefined => {
  const { currentRoute } = useRoute();
  return currentRoute;
};

// Hook to use route navigation
export const useRouteNavigation = (): RouteNavigation => {
  const { navigation } = useRoute();
  return navigation;
};

// Hook to use route state
export const useRouteState = (): RouteState => {
  const { state } = useRoute();
  return state;
};

// Hook to use route parameters
export const useRouteParams = (): Record<string, string> => {
  const { state } = useRoute();
  return state.params;
};

// Hook to use query parameters
export const useRouteQuery = (): Record<string, string> => {
  const { state } = useRoute();
  return state.query;
};

export default RouteProvider;