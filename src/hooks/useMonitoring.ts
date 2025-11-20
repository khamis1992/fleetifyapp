/**
 * React Hooks for Advanced Monitoring
 * Provides easy integration of monitoring with React components
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { monitoring, createTrace, trackMetric, trackUserEvent } from '../lib/monitoring/core';
import { apm, trackComponentRender } from '../lib/performance/apm';
import { errorTracking, trackError } from '../lib/monitoring/errorTracking';
import { infrastructureMonitoring } from '../lib/monitoring/infrastructure';

export interface UseMonitoringOptions {
  componentName?: string;
  trackPerformance?: boolean;
  trackErrors?: boolean;
  trackUserInteractions?: boolean;
  trackRenders?: boolean;
  customTags?: Record<string, string>;
}

export interface UsePerformanceTracking {
  startOperation: (operation: string) => () => void;
  trackMetric: (name: string, value: number, unit?: string) => void;
  trackCustomMetric: (name: string, value: number, tags?: Record<string, string>) => void;
  getMetrics: () => any[];
}

export interface UseErrorTracking {
  trackError: (error: Error, context?: Record<string, any>) => void;
  trackCustomError: (message: string, type: string, severity: string, context?: Record<string, any>) => void;
  getErrorSummary: () => any;
}

export interface UseUserInteractionTracking {
  trackClick: (element: string, properties?: Record<string, any>) => void;
  trackFormSubmit: (formName: string, data?: Record<string, any>) => void;
  trackPageView: (page: string, properties?: Record<string, any>) => void;
  trackCustomEvent: (eventName: string, properties?: Record<string, any>) => void;
}

export interface UseInfrastructureMonitoring {
  getHealthStatus: () => Promise<any>;
  getSystemMetrics: () => any[];
  getResourceUsage: () => any;
}

/**
 * Hook for comprehensive monitoring of React components
 */
export function useMonitoring(options: UseMonitoringOptions = {}) {
  const {
    componentName = 'UnknownComponent',
    trackPerformance = true,
    trackErrors = true,
    trackUserInteractions = true,
    trackRenders = true,
    customTags = {}
  } = options;

  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(Date.now());
  const previousPropsRef = useRef<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  // Component mount tracking
  useEffect(() => {
    mountTimeRef.current = Date.now();
    renderCountRef.current = 0;

    if (trackPerformance) {
      monitoring.trackPerformance({
        name: 'component.mount',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        tags: { component: componentName, ...customTags },
        context: { operation: `Mount: ${componentName}` }
      });
    }

    return () => {
      // Component unmount tracking
      const mountDuration = Date.now() - mountTimeRef.current;

      if (trackPerformance) {
        monitoring.trackPerformance({
          name: 'component.unmount',
          value: mountDuration,
          unit: 'milliseconds',
          timestamp: Date.now(),
          tags: { component: componentName, ...customTags },
          context: { operation: `Unmount: ${componentName}` }
        });
      }
    };
  }, []);

  // Render tracking
  useEffect(() => {
    renderCountRef.current += 1;

    if (trackRenders) {
      trackComponentRender(componentName, 0, renderCountRef.current, 0);
    }
  });

  // Error boundary integration
  useEffect(() => {
    if (trackErrors) {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        // Call original error
        originalError.apply(console, args);

        // Track error if it's related to this component
        const errorString = args.join(' ');
        if (errorString.includes(componentName)) {
          trackError(new Error(errorString), {
            component: componentName,
            action: 'console_error',
            additionalData: { args }
          });
        }
      };

      return () => {
        console.error = originalError;
      };
    }
  }, [componentName, trackErrors]);

  // Performance tracking
  const performanceTracking: UsePerformanceTracking = {
    startOperation: useCallback((operation: string) => {
      const trace = createTrace(`${componentName}.${operation}`);
      return () => monitoring.endTrace(trace.traceId, { component: componentName });
    }, [componentName]),

    trackMetric: useCallback((name: string, value: number, unit = 'count') => {
      monitoring.trackPerformance({
        name,
        value,
        unit,
        timestamp: Date.now(),
        tags: { component: componentName, ...customTags },
        context: { operation: `Custom: ${componentName}` }
      });
    }, [componentName, customTags]),

    trackCustomMetric: useCallback((name: string, value: number, tags?: Record<string, string>) => {
      monitoring.trackPerformance({
        name,
        value,
        unit: 'custom',
        timestamp: Date.now(),
        tags: { component: componentName, ...customTags, ...tags },
        context: { operation: `Custom: ${componentName}` }
      });
    }, [componentName, customTags]),

    getMetrics: useCallback(() => {
      return monitoring.getMetrics().filter(m =>
        m.tags?.component === componentName
      );
    }, [componentName])
  };

  // Error tracking
  const errorTrackingHook: UseErrorTracking = {
    trackError: useCallback((error: Error, context?: Record<string, any>) => {
      trackError(error, {
        component: componentName,
        ...context
      });
    }, [componentName]),

    trackCustomError: useCallback((message: string, type: string, severity: string, context?: Record<string, any>) => {
      errorTracking.trackCustomError(message, type as any, severity as any, {
        component: componentName,
        ...context
      });
    }, [componentName]),

    getErrorSummary: useCallback(() => {
      return errorTracking.getErrorSummary();
    }, [])
  };

  // User interaction tracking
  const userInteractionTracking: UseUserInteractionTracking = {
    trackClick: useCallback((element: string, properties?: Record<string, any>) => {
      if (trackUserInteractions) {
        monitoring.trackUserInteraction({
          type: 'click',
          target: element,
          timestamp: Date.now(),
          properties: { component: componentName, ...properties }
        });
      }
    }, [componentName, trackUserInteractions]),

    trackFormSubmit: useCallback((formName: string, data?: Record<string, any>) => {
      if (trackUserInteractions) {
        monitoring.trackUserInteraction({
          type: 'form_submit',
          target: formName,
          timestamp: Date.now(),
          properties: { component: componentName, data }
        });
      }
    }, [componentName, trackUserInteractions]),

    trackPageView: useCallback((page: string, properties?: Record<string, any>) => {
      if (trackUserInteractions) {
        monitoring.trackUserInteraction({
          type: 'navigation',
          target: page,
          timestamp: Date.now(),
          properties: { component: componentName, ...properties }
        });
      }
    }, [componentName, trackUserInteractions]),

    trackCustomEvent: useCallback((eventName: string, properties?: Record<string, any>) => {
      if (trackUserInteractions) {
        monitoring.trackUserInteraction({
          type: 'view', // Using 'view' as a generic event type
          target: eventName,
          timestamp: Date.now(),
          properties: { component: componentName, ...properties }
        });
      }
    }, [componentName, trackUserInteractions])
  };

  return {
    performance: performanceTracking,
    error: errorTrackingHook,
    userInteraction: userInteractionTracking,
    renderCount: renderCountRef.current,
    componentName,
    metrics
  };
}

/**
 * Hook for performance tracking specifically
 */
export function usePerformanceTracking(componentName?: string) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const operationsRef = useRef<Map<string, number>>(new Map());

  const startOperation = useCallback((operationName: string) => {
    const operationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    operationsRef.current.set(operationId, performance.now());

    return () => {
      const startTime = operationsRef.current.get(operationId);
      if (startTime) {
        const duration = performance.now() - startTime;
        operationsRef.current.delete(operationId);

        trackMetric(`operation.${operationName}`, duration, 'milliseconds', {
          component: componentName || 'UnknownComponent'
        });

        return duration;
      }
      return 0;
    };
  }, [componentName]);

  const trackCustomMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    trackMetric(name, value, 'custom', {
      component: componentName || 'UnknownComponent',
      ...tags
    });
  }, [componentName]);

  const getPerformanceSummary = useCallback(() => {
    return apm.getPerformanceSummary();
  }, []);

  return {
    startOperation,
    trackCustomMetric,
    getPerformanceSummary,
    metrics
  };
}

/**
 * Hook for error tracking specifically
 */
export function useErrorTracking(componentName?: string) {
  const [errors, setErrors] = useState<any[]>([]);
  const [errorSummary, setErrorSummary] = useState<any>(null);

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    errorTracking.trackError(error, {
      component: componentName || 'UnknownComponent',
      ...context
    });

    // Update local state
    setErrors(prev => [...prev.slice(-9), { error, context, timestamp: Date.now() }]);
  }, [componentName]);

  const trackCustomError = useCallback((message: string, type: string, severity: string, context?: Record<string, any>) => {
    errorTracking.trackCustomError(message, type as any, severity as any, {
      component: componentName || 'UnknownComponent',
      ...context
    });
  }, [componentName]);

  const updateErrorSummary = useCallback(() => {
    const summary = errorTracking.getErrorSummary(3600000); // Last hour
    setErrorSummary(summary);
  }, []);

  useEffect(() => {
    // Update error summary every 30 seconds
    const interval = setInterval(updateErrorSummary, 30000);
    return () => clearInterval(interval);
  }, [updateErrorSummary]);

  return {
    trackError,
    trackCustomError,
    errors,
    errorSummary,
    updateErrorSummary
  };
}

/**
 * Hook for user interaction tracking
 */
export function useUserInteractionTracking(componentName?: string) {
  const [interactions, setInteractions] = useState<any[]>([]);

  const trackClick = useCallback((element: string, properties?: Record<string, any>) => {
    monitoring.trackUserInteraction({
      type: 'click',
      target: element,
      timestamp: Date.now(),
      properties: { component: componentName || 'UnknownComponent', ...properties }
    });

    setInteractions(prev => [...prev.slice(-49), {
      type: 'click',
      element,
      properties,
      timestamp: Date.now()
    }]);
  }, [componentName]);

  const trackFormSubmit = useCallback((formName: string, data?: Record<string, any>) => {
    monitoring.trackUserInteraction({
      type: 'form_submit',
      target: formName,
      timestamp: Date.now(),
      properties: { component: componentName || 'UnknownComponent', data }
    });

    setInteractions(prev => [...prev.slice(-49), {
      type: 'form_submit',
      form: formName,
      data,
      timestamp: Date.now()
    }]);
  }, [componentName]);

  const trackPageView = useCallback((page: string, properties?: Record<string, any>) => {
    monitoring.trackUserInteraction({
      type: 'navigation',
      target: page,
      timestamp: Date.now(),
      properties: { component: componentName || 'UnknownComponent', ...properties }
    });

    setInteractions(prev => [...prev.slice(-49), {
      type: 'navigation',
      page,
      properties,
      timestamp: Date.now()
    }]);
  }, [componentName]);

  const trackCustomEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    monitoring.trackUserInteraction({
      type: 'view',
      target: eventName,
      timestamp: Date.now(),
      properties: { component: componentName || 'UnknownComponent', ...properties }
    });

    setInteractions(prev => [...prev.slice(-49), {
      type: 'custom',
      event: eventName,
      properties,
      timestamp: Date.now()
    }]);
  }, [componentName]);

  return {
    trackClick,
    trackFormSubmit,
    trackPageView,
    trackCustomEvent,
    interactions
  };
}

/**
 * Hook for infrastructure monitoring
 */
export function useInfrastructureMonitoring() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any[]>([]);
  const [resourceUsage, setResourceUsage] = useState<any>(null);

  const getHealthStatus = useCallback(async () => {
    const health = await infrastructureMonitoring.getInfrastructureHealth();
    setHealthStatus(health);
    return health;
  }, []);

  const getSystemMetrics = useCallback((filter?: { timeRange?: number; type?: string }) => {
    const metrics = infrastructureMonitoring.getSystemMetrics(filter);
    setSystemMetrics(metrics);
    return metrics;
  }, []);

  const getResourceUsage = useCallback(() => {
    const resources = infrastructureMonitoring.getResourceMetrics();
    const latestMemory = resources.filter(r => r.type === 'memory').pop();
    setResourceUsage({
      memory: latestMemory,
      all: resources
    });
    return latestMemory;
  }, []);

  useEffect(() => {
    // Update metrics every 30 seconds
    const interval = setInterval(() => {
      getSystemMetrics({ timeRange: 300000 }); // Last 5 minutes
      getResourceUsage();
    }, 30000);

    // Initial load
    getHealthStatus();
    getSystemMetrics({ timeRange: 300000 });
    getResourceUsage();

    return () => clearInterval(interval);
  }, [getHealthStatus, getSystemMetrics, getResourceUsage]);

  return {
    healthStatus,
    systemMetrics,
    resourceUsage,
    getHealthStatus,
    getSystemMetrics,
    getResourceUsage
  };
}

/**
 * Hook for monitoring form submissions
 */
export function useFormTracking(formName: string, options: { trackValidation?: boolean } = {}) {
  const { trackPerformance } = useMonitoring({ componentName: 'Form' });
  const { trackError } = useErrorTracking('Form');
  const { trackFormSubmit } = useUserInteractionTracking('Form');
  const [submissionCount, setSubmissionCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  const trackSubmission = useCallback(async (submitFunction: () => Promise<any>, data?: any) => {
    const endOperation = trackPerformance.startOperation('form_submission');

    try {
      const result = await submitFunction();

      trackFormSubmit(formName, {
        success: true,
        dataKeys: data ? Object.keys(data) : [],
        submissionCount: submissionCount + 1
      });

      setSubmissionCount(prev => prev + 1);

      const duration = endOperation();
      return result;
    } catch (error) {
      trackError(error as Error, {
        component: 'Form',
        action: 'form_submission',
        formName,
        additionalData: { data }
      });

      trackFormSubmit(formName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        submissionCount
      });

      endOperation();
      throw error;
    }
  }, [formName, trackPerformance, trackError, trackFormSubmit, submissionCount]);

  const trackValidationError = useCallback((fieldName: string, error: string) => {
    if (options.trackValidation) {
      trackError(new Error(`Validation Error: ${fieldName} - ${error}`), {
        component: 'Form',
        action: 'validation',
        formName,
        additionalData: { fieldName, error }
      });

      setValidationErrors(prev => [...prev.slice(-9), {
        fieldName,
        error,
        timestamp: Date.now()
      }]);
    }
  }, [formName, trackError, options.trackValidation]);

  return {
    trackSubmission,
    trackValidationError,
    submissionCount,
    validationErrors
  };
}

/**
 * Hook for monitoring API calls
 */
export function useAPITracking() {
  const { trackPerformance } = useMonitoring({ componentName: 'API' });
  const { trackError } = useErrorTracking('API');
  const [requests, setRequests] = useState<any[]>([]);

  const trackAPICall = useCallback(async (apiCall: () => Promise<any>, endpoint: string, method = 'GET') => {
    const endOperation = trackPerformance.startOperation('api_call');
    const startTime = performance.now();

    const requestInfo = {
      endpoint,
      method,
      startTime: Date.now(),
      status: 'pending'
    };

    setRequests(prev => [...prev.slice(-19), requestInfo]);

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      setRequests(prev => prev.map(req =>
        req.startTime === requestInfo.startTime
          ? { ...req, status: 'success', duration, endTime: Date.now() }
          : req
      ));

      trackMetric(`api.${method.toLowerCase()}`, duration, 'milliseconds', {
        endpoint,
        status: 'success'
      });

      endOperation();
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      setRequests(prev => prev.map(req =>
        req.startTime === requestInfo.startTime
          ? { ...req, status: 'error', duration, error: error instanceof Error ? error.message : 'Unknown error', endTime: Date.now() }
          : req
      ));

      trackError(error as Error, {
        component: 'API',
        action: 'api_call',
        additionalData: { endpoint, method, duration }
      });

      trackMetric(`api.${method.toLowerCase()}`, duration, 'milliseconds', {
        endpoint,
        status: 'error'
      });

      endOperation();
      throw error;
    }
  }, [trackPerformance, trackError]);

  return {
    trackAPICall,
    requests
  };
}

// Re-export utility functions
export { trackMetric, trackUserEvent, createTrace };