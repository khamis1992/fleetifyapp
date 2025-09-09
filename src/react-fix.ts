import React from 'react';

// Ensure React is available globally for development and production
if (typeof window !== 'undefined') {
  (window as any).React = React;
  
  // Additional global exports for debugging
  (window as any).__REACT_VERSION__ = React.version;
  (window as any).__REACT_HOOKS_AVAILABLE__ = {
    useState: typeof React.useState !== 'undefined',
    useEffect: typeof React.useEffect !== 'undefined',
    useContext: typeof React.useContext !== 'undefined',
    useCallback: typeof React.useCallback !== 'undefined',
    useMemo: typeof React.useMemo !== 'undefined'
  };
}

// Debug logging for React availability
console.log('🔧 React Fix: React version', React.version);
console.log('🔧 React Fix: useState available:', typeof React.useState !== 'undefined');
console.log('🔧 React Fix: useEffect available:', typeof React.useEffect !== 'undefined');

// Validate React is properly loaded
if (!React || typeof React.useState !== 'function') {
  console.error('🔧 React Fix: React is not properly loaded!');
  console.error('🔧 React Fix: React object:', React);
  
  // Try to provide helpful debugging information
  if (typeof React === 'undefined') {
    console.error('🔧 React Fix: React is completely undefined');
  } else if (React === null) {
    console.error('🔧 React Fix: React is null');
  } else if (typeof React.useState === 'undefined') {
    console.error('🔧 React Fix: React.useState is undefined');
  }
  
  throw new Error('React is not properly loaded. This may be due to a bundling issue or version conflict.');
}

// Export React to ensure it's available
export default React;
export { default as React } from 'react';

// Additional safety exports
export const { 
  useState, 
  useEffect, 
  useContext, 
  useCallback, 
  useMemo, 
  useRef, 
  useReducer,
  createContext,
  Component,
  PureComponent,
  memo,
  forwardRef,
  lazy,
  Suspense,
  Fragment
} = React;

console.log('🔧 React Fix: All exports validated successfully');
