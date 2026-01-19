/**
 * Route Types
 * Type definitions for the route registry system
 */

import { ComponentType } from 'react';

// === Route Configuration Types ===

export interface RouteConfig {
  /** Route path pattern */
  path: string;
  /** React component to render */
  component: ComponentType;
  /** Whether component is lazy loaded */
  lazy: boolean;
  /** Whether path should match exactly */
  exact: boolean;
  /** Page title */
  title: string;
  /** Page description */
  description: string;
  /** Route group for organization */
  group: string;
  /** Priority for ordering */
  priority: number;
  /** Whether route requires authentication */
  protected?: boolean;
  /** Layout to use for this route */
  layout?: 'none' | 'dashboard' | 'admin' | 'minimal';
  /** Required user role(s) */
  requiredRole?: string | string[];
  /** Required permissions */
  requiredPermissions?: string[];
  /** Whether route should be shown in navigation */
  showInNav?: boolean;
  /** Navigation icon */
  navIcon?: string;
  /** Parent route for nested routes */
  parent?: string;
  /** Child routes */
  children?: RouteConfig[];
  /** Custom meta data */
  meta?: Record<string, unknown>;
  /** Feature flag requirement */
  featureFlag?: string;
  /** Whether route is enabled */
  enabled?: boolean;
  /** Preload strategy */
  preload?: 'none' | 'hover' | 'viewport' | 'idle';
  /** Route transitions */
  transition?: string;
  /** Custom route guard */
  guard?: string;
  /** Middleware to apply */
  middleware?: string[];
  /** Route-specific SEO metadata */
  seo?: {
    keywords?: string[];
    canonical?: string;
    noindex?: boolean;
    nofollow?: boolean;
  };
  /** OpenGraph metadata */
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  /** Analytics tracking */
  analytics?: {
    trackPageView?: boolean;
    customProperties?: Record<string, unknown>;
  };
  /** Cache settings */
  cache?: {
    ttl?: number;
    strategy?: 'memory' | 'localStorage' | 'sessionStorage' | 'none';
  };
}

export interface RouteGroup {
  /** Unique group identifier */
  id: string;
  /** Display name */
  name: string;
  /** Group description */
  description: string;
  /** Layout to use for routes in this group */
  layout: 'none' | 'dashboard' | 'admin' | 'minimal';
  /** Priority for ordering */
  priority: number;
  /** Whether group is enabled */
  enabled?: boolean;
  /** Required permissions to access any route in group */
  requiredPermissions?: string[];
  /** Feature flags for entire group */
  featureFlags?: string[];
  /** Group icon */
  icon?: string;
  /** Group color theme */
  color?: string;
  /** Navigation configuration */
  navigation?: {
    showInMainMenu: boolean;
    showInMobileMenu: boolean;
    collapsedByDefault?: boolean;
    maxItemsToShow?: number;
  };
}

export interface LazyRouteComponent {
  default: ComponentType;
}

// === Route State Types ===

export interface RouteState {
  /** Current route config */
  currentRoute?: RouteConfig;
  /** Previous route */
  previousRoute?: RouteConfig;
  /** Navigation history */
  history: RouteConfig[];
  /** Loading states */
  loading: {
    route: boolean;
    component: boolean;
    data: boolean;
  };
  /** Error states */
  error: {
    route?: Error;
    component?: Error;
    data?: Error;
  };
  /** Route parameters */
  params: Record<string, string>;
  /** Query parameters */
  query: Record<string, string>;
  /** Route metadata */
  meta: Record<string, unknown>;
  /** Navigation context */
  navigation: {
    canGoBack: boolean;
    canGoForward: boolean;
    depth: number;
  };
}

export interface RouteNavigation {
  /** Navigate to route */
  navigate: (path: string, options?: NavigationOptions) => void;
  /** Go back in history */
  goBack: () => void;
  /** Go forward in history */
  goForward: () => void;
  /** Replace current route */
  replace: (path: string, options?: NavigationOptions) => void;
  /** Refresh current route */
  refresh: () => void;
  /** Check if route exists */
  exists: (path: string) => boolean;
  /** Get route config by path */
  getRoute: (path: string) => RouteConfig | undefined;
  /** Get routes by group */
  getRoutesByGroup: (groupId: string) => RouteConfig[];
  /** Get parent routes */
  getParentRoutes: (path: string) => RouteConfig[];
  /** Get child routes */
  getChildRoutes: (path: string) => RouteConfig[];
}

export interface NavigationOptions {
  /** Replace current history entry */
  replace?: boolean;
  /** Navigation state */
  state?: Record<string, unknown>;
  /** Skip loading states */
  skipLoading?: boolean;
  /** Custom transition */
  transition?: string;
  /** Trigger analytics */
  analytics?: boolean;
  /** Preload related routes */
  preload?: boolean;
}

// === Route Guard Types ===

export interface RouteGuard {
  /** Guard identifier */
  id: string;
  /** Guard function */
  guard: (route: RouteConfig, context: GuardContext) => GuardResult;
  /** Guard priority */
  priority?: number;
  /** Routes to apply guard to */
  routes?: string[];
  /** Groups to apply guard to */
  groups?: string[];
}

export interface GuardContext {
  /** Current user */
  user: unknown;
  /** User permissions */
  permissions: string[];
  /** User roles */
  roles: string[];
  /** Feature flags */
  featureFlags: Record<string, boolean>;
  /** Navigation state */
  navigation: {
    from: string;
    to: string;
  };
  /** Custom context */
  context: Record<string, unknown>;
}

export interface GuardResult {
  /** Whether access is granted */
  granted: boolean;
  /** Redirect path if denied */
  redirect?: string;
  /** Error message */
  message?: string;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Whether to show custom component */
  component?: ComponentType;
}

// === Route Middleware Types ===

export interface RouteMiddleware {
  /** Middleware identifier */
  id: string;
  /** Middleware function */
  middleware: (context: MiddlewareContext, next: () => void) => void;
  /** Middleware priority */
  priority?: number;
  /** Routes to apply middleware to */
  routes?: string[];
  /** Groups to apply middleware to */
  groups?: string[];
  /** Whether to run only on client */
  clientOnly?: boolean;
  /** Whether to run only on server */
  serverOnly?: boolean;
}

export interface MiddlewareContext {
  /** Current route */
  route: RouteConfig;
  /** Request/Response objects (if available) */
  request?: unknown;
  response?: unknown;
  /** User context */
  user?: unknown;
  /** Custom data */
  data: Record<string, unknown>;
  /** Next middleware function */
  next: () => void;
}

// === Route Preloading Types ===

export interface RoutePreloader {
  /** Preload strategy */
  strategy: 'none' | 'hover' | 'viewport' | 'idle' | 'custom';
  /** Preload function */
  preload: (route: RouteConfig) => Promise<void>;
  /** Cache configuration */
  cache: {
    maxAge: number;
    maxSize: number;
    strategy: 'lru' | 'fifo' | 'custom';
  };
  /** Preload triggers */
  triggers: {
    mouseEnter?: boolean;
    mouseOver?: boolean;
    focus?: boolean;
    viewport?: boolean;
    idle?: number;
    custom?: string[];
  };
}

// === Route Analytics Types ===

export interface RouteAnalytics {
  /** Track page view */
  trackPageView: (route: RouteConfig, context: AnalyticsContext) => void;
  /** Track navigation events */
  trackNavigation: (from: RouteConfig, to: RouteConfig, context: AnalyticsContext) => void;
  /** Track route performance */
  trackPerformance: (route: RouteConfig, metrics: PerformanceMetrics) => void;
  /** Track user interactions */
  trackInteraction: (route: RouteConfig, interaction: InteractionEvent) => void;
}

export interface AnalyticsContext {
  /** User identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Page load timestamp */
  loadTime: number;
  /** Previous page */
  referrer?: string;
  /** User agent */
  userAgent?: string;
  /** Custom properties */
  properties?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  /** Time to first byte */
  ttfb?: number;
  /** DOM content loaded */
  domContentLoaded?: number;
  /** Full page load */
  loadComplete?: number;
  /** Component mount time */
  componentMount?: number;
  /** Data fetching time */
  dataFetch?: number;
  /** Total navigation time */
  navigationTime?: number;
}

export interface InteractionEvent {
  /** Event type */
  type: 'click' | 'scroll' | 'hover' | 'form_submit' | 'custom';
  /** Event target */
  target: string;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data: Record<string, unknown>;
}

// === Route Error Types ===

export interface RouteError extends Error {
  /** Error code */
  code: string;
  /** Route that caused the error */
  route?: RouteConfig;
  /** Error severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Error context */
  context: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
  /** Stack trace */
  stack?: string;
}

export interface RouteErrorHandler {
  /** Handle route errors */
  handleError: (error: RouteError, context: ErrorContext) => void;
  /** Recovery strategies */
  recover: (error: RouteError, context: ErrorContext) => Promise<boolean>;
  /** Error reporting */
  report: (error: RouteError, context: ErrorContext) => void;
}

export interface ErrorContext {
  /** Current route */
  route: RouteConfig;
  /** Attempted navigation */
  navigation: {
    from?: string;
    to: string;
  };
  /** User context */
  user?: unknown;
  /** Error boundary */
  boundary?: string;
  /** Retry count */
  retryCount: number;
}

// === Route Layout Types ===

export interface RouteLayout {
  /** Layout identifier */
  id: string;
  /** Layout component */
  component: ComponentType<LayoutProps>;
  /** Layout priority */
  priority?: number;
  /** Routes that use this layout */
  routes?: string[];
  /** Groups that use this layout */
  groups?: string[];
  /** Layout configuration */
  config: {
    /** Whether to show header */
    showHeader?: boolean;
    /** Whether to show sidebar */
    showSidebar?: boolean;
    /** Whether to show footer */
    showFooter?: boolean;
    /** Layout theme */
    theme?: string;
    /** Layout width */
    width?: 'full' | 'contained' | 'narrow';
    /** Layout padding */
    padding?: string;
    /** Custom CSS classes */
    className?: string;
  };
}

export interface LayoutProps {
  /** Current route */
  route: RouteConfig;
  /** Route parameters */
  params: Record<string, string>;
  /** Query parameters */
  query: Record<string, string>;
  /** Child components */
  children: React.ReactNode;
  /** Layout configuration */
  config: Record<string, unknown>;
  /** Custom props */
  [key: string]: unknown;
}

// === Route Cache Types ===

export interface RouteCache {
  /** Cache identifier */
  id: string;
  /** Cache data */
  data: unknown;
  /** Cache metadata */
  metadata: {
    createdAt: number;
    accessedAt: number;
    hits: number;
    size: number;
    ttl?: number;
    tags?: string[];
  };
  /** Cache expiration */
  expires?: number;
  /** Cache validation */
  validate?: () => boolean;
  /** Cache invalidation */
  invalidate?: () => void;
}

export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Maximum cache size */
  maxSize: number;
  /** Cache strategy */
  strategy: 'lru' | 'fifo' | 'custom';
  /** Cache storage */
  storage: 'memory' | 'localStorage' | 'sessionStorage' | 'custom';
  /** Cache validation */
  validateOnAccess: boolean;
  /** Cache invalidation */
  invalidateOnNavigation?: boolean;
  /** Custom cache storage */
  customStorage?: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown, ttl?: number) => void;
    delete: (key: string) => void;
    clear: () => void;
  };
}

// === Route Meta Types ===

export interface RouteMeta {
  /** SEO metadata */
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    noindex?: boolean;
    nofollow?: boolean;
    robots?: string;
    openGraph?: OpenGraphMeta;
    twitter?: TwitterMeta;
  };
  /** Page metadata */
  page?: {
    title?: string;
    subtitle?: string;
    icon?: string;
    color?: string;
    image?: string;
    breadcrumb?: BreadcrumbItem[];
  };
  /** Analytics metadata */
  analytics?: {
    track?: boolean;
    category?: string;
    action?: string;
    label?: string;
    value?: number;
    customProperties?: Record<string, unknown>;
  };
  /** Feature flags */
  features?: string[];
  /** Permissions */
  permissions?: string[];
  /** Roles */
  roles?: string[];
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

export interface OpenGraphMeta {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  image?: string;
  site_name?: string;
  locale?: string;
  article?: {
    published_time?: string;
    modified_time?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

export interface TwitterMeta {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface BreadcrumbItem {
  /** Item title */
  title: string;
  /** Item path */
  path?: string;
  /** Whether item is active */
  active?: boolean;
  /** Item icon */
  icon?: string;
  /** Custom properties */
  [key: string]: unknown;
}