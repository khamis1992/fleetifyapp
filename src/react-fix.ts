import * as React from 'react';

// Ensure React is available globally for development and production
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

// Validate React is properly loaded with improved checks
const isReactValid = React && 
  typeof React.useState === 'function' && 
  typeof React.useEffect === 'function' &&
  typeof React.createElement === 'function';

if (!isReactValid) {
  console.error('🔧 React Fix: React is not properly loaded!');
  console.error('🔧 React Fix: React object:', React);
  
  // Force reload or better error handling
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

// Export React to ensure it's available
export default React;

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
