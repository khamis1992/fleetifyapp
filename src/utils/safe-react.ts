// Safe React implementation for lovable.dev
// This module provides safe access to React hooks with fallbacks

import React from 'react';

// Safe useState implementation
export const safeUseState = <T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  try {
    // Try to use React's useState first
    if (React && React.useState && typeof React.useState === 'function') {
      return React.useState(initialValue);
    }
    
    // Fallback implementation using ref-based state
    console.warn('🔧 Safe React: Using fallback useState implementation');
    
    let currentValue = initialValue;
    const setValue = (newValue: T | ((prev: T) => T)) => {
      if (typeof newValue === 'function') {
        currentValue = (newValue as (prev: T) => T)(currentValue);
      } else {
        currentValue = newValue;
      }
      // Trigger re-render if possible
      if (window && (window as any).forceUpdate) {
        (window as any).forceUpdate();
      }
    };
    
    return [currentValue, setValue];
  } catch (error) {
    console.error('🔧 Safe React: Error in useState:', error);
    throw new Error('React hooks are not available and fallback failed');
  }
};

// Safe useEffect implementation
export const safeUseEffect = (effect: () => void | (() => void), deps?: any[]): void => {
  try {
    if (React && React.useEffect && typeof React.useEffect === 'function') {
      return React.useEffect(effect, deps);
    }
    
    console.warn('🔧 Safe React: Using fallback useEffect implementation');
    
    // Fallback: execute effect immediately
    setTimeout(() => {
      try {
        const cleanup = effect();
        if (cleanup && typeof cleanup === 'function') {
          // Store cleanup for later if needed
          (window as any).__CLEANUP_FUNCTIONS__ = (window as any).__CLEANUP_FUNCTIONS__ || [];
          (window as any).__CLEANUP_FUNCTIONS__.push(cleanup);
        }
      } catch (err) {
        console.error('🔧 Safe React: Error in effect:', err);
      }
    }, 0);
  } catch (error) {
    console.error('🔧 Safe React: Error in useEffect:', error);
  }
};

// Safe useContext implementation
export const safeUseContext = <T>(context: React.Context<T>): T => {
  try {
    if (React && React.useContext && typeof React.useContext === 'function') {
      return React.useContext(context);
    }
    
    console.warn('🔧 Safe React: Using fallback useContext implementation');
    
    // Fallback: return default value if available
    if (context && (context as any)._defaultValue !== undefined) {
      return (context as any)._defaultValue;
    }
    
    throw new Error('Context not available and no default value provided');
  } catch (error) {
    console.error('🔧 Safe React: Error in useContext:', error);
    throw error;
  }
};

// Safe useCallback implementation
export const safeUseCallback = <T extends (...args: any[]) => any>(callback: T, deps?: any[]): T => {
  try {
    if (React && React.useCallback && typeof React.useCallback === 'function') {
      return React.useCallback(callback, deps);
    }
    
    console.warn('🔧 Safe React: Using fallback useCallback implementation');
    return callback;
  } catch (error) {
    console.error('🔧 Safe React: Error in useCallback:', error);
    return callback;
  }
};

// Safe createContext implementation
export const safeCreateContext = <T>(defaultValue: T): React.Context<T> => {
  try {
    if (React && React.createContext && typeof React.createContext === 'function') {
      return React.createContext(defaultValue);
    }
    
    console.warn('🔧 Safe React: Using fallback createContext implementation');
    
    // Fallback context implementation
    const context = {
      _defaultValue: defaultValue,
      Provider: ({ children, value }: { children: React.ReactNode; value: T }) => {
        (window as any).__CONTEXT_VALUES__ = (window as any).__CONTEXT_VALUES__ || {};
        (window as any).__CONTEXT_VALUES__[context as any] = value;
        return children as any;
      },
      Consumer: ({ children }: { children: (value: T) => React.ReactNode }) => {
        const value = (window as any).__CONTEXT_VALUES__?.[context as any] || defaultValue;
        return children(value) as any;
      }
    } as React.Context<T>;
    
    return context;
  } catch (error) {
    console.error('🔧 Safe React: Error in createContext:', error);
    throw error;
  }
};

// Debug information
console.log('🔧 Safe React: Module loaded');
console.log('🔧 Safe React: React available:', !!React);
console.log('🔧 Safe React: useState available:', !!(React && React.useState));
console.log('🔧 Safe React: useEffect available:', !!(React && React.useEffect));

export default {
  useState: safeUseState,
  useEffect: safeUseEffect,
  useContext: safeUseContext,
  useCallback: safeUseCallback,
  createContext: safeCreateContext
};
