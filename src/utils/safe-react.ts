// Safe React implementation for lovable.dev
// This module provides safe access to React hooks with fallbacks

import React from 'react';

console.log('🔧 Safe React: Module loading...');
console.log('🔧 Safe React: React object:', React);
console.log('🔧 Safe React: React.useState:', React.useState);

// Safe useState implementation
export const safeUseState = <T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  console.log('🔧 Safe React: safeUseState called with:', initialValue);
  
  // Force check React availability
  if (!React || typeof React.useState !== 'function') {
    console.error('🔧 Safe React: React.useState is not available!');
    console.error('🔧 Safe React: React object:', React);
    console.error('🔧 Safe React: typeof React.useState:', typeof React.useState);
    
    // Emergency fallback - throw error to trigger error boundary
    throw new Error(`React hooks are not available. React: ${!!React}, useState: ${typeof React?.useState}`);
  }
  
  try {
    console.log('🔧 Safe React: Using React.useState');
    return React.useState(initialValue);
  } catch (error) {
    console.error('🔧 Safe React: Error calling React.useState:', error);
    throw error;
  }
};

// Safe useEffect implementation
export const safeUseEffect = (effect: () => void | (() => void), deps?: any[]): void => {
  if (!React || typeof React.useEffect !== 'function') {
    throw new Error(`React.useEffect is not available. React: ${!!React}, useEffect: ${typeof React?.useEffect}`);
  }
  
  try {
    return React.useEffect(effect, deps);
  } catch (error) {
    console.error('🔧 Safe React: Error calling React.useEffect:', error);
    throw error;
  }
};

// Safe useContext implementation
export const safeUseContext = <T>(context: React.Context<T>): T => {
  if (!React || typeof React.useContext !== 'function') {
    throw new Error(`React.useContext is not available. React: ${!!React}, useContext: ${typeof React?.useContext}`);
  }
  
  try {
    return React.useContext(context);
  } catch (error) {
    console.error('🔧 Safe React: Error calling React.useContext:', error);
    throw error;
  }
};

// Safe useCallback implementation
export const safeUseCallback = <T extends (...args: any[]) => any>(callback: T, deps?: any[]): T => {
  if (!React || typeof React.useCallback !== 'function') {
    throw new Error(`React.useCallback is not available. React: ${!!React}, useCallback: ${typeof React?.useCallback}`);
  }
  
  try {
    return React.useCallback(callback, deps);
  } catch (error) {
    console.error('🔧 Safe React: Error calling React.useCallback:', error);
    throw error;
  }
};

// Safe createContext implementation
export const safeCreateContext = <T>(defaultValue: T): React.Context<T> => {
  if (!React || typeof React.createContext !== 'function') {
    throw new Error(`React.createContext is not available. React: ${!!React}, createContext: ${typeof React?.createContext}`);
  }
  
  try {
    return React.createContext(defaultValue);
  } catch (error) {
    console.error('🔧 Safe React: Error calling React.createContext:', error);
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
