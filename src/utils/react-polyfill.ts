// React polyfill for lovable.dev environment
// This ensures React hooks are available even in problematic environments

import React from 'react';

// Ensure React is available globally
if (typeof window !== 'undefined') {
  (window as any).React = React;
  
  // Ensure React hooks are available globally
  (window as any).useState = React.useState;
  (window as any).useEffect = React.useEffect;
  (window as any).useContext = React.useContext;
  (window as any).useCallback = React.useCallback;
  (window as any).useMemo = React.useMemo;
  (window as any).useRef = React.useRef;
}

// Force React to be available
const ReactPolyfill = React;

// Ensure hooks are available
const useStatePolyfill = React.useState;
const useEffectPolyfill = React.useEffect;
const useContextPolyfill = React.useContext;
const useCallbackPolyfill = React.useCallback;

// Debug logging
console.log('🔧 React Polyfill: React version', React.version);
console.log('🔧 React Polyfill: useState available:', typeof React.useState !== 'undefined');
console.log('🔧 React Polyfill: useEffect available:', typeof React.useEffect !== 'undefined');

export {
  ReactPolyfill as React,
  useStatePolyfill as useState,
  useEffectPolyfill as useEffect,
  useContextPolyfill as useContext,
  useCallbackPolyfill as useCallback
};

export default ReactPolyfill;
