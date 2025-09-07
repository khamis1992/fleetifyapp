// React hooks polyfill to prevent hook call errors
import React from 'react';

// Ensure React hooks are available globally to prevent "Invalid hook call" errors
if (typeof window !== 'undefined') {
  // Ensure React is available on window
  (window as any).React = React;
  
  // Ensure hooks are available
  (window as any).useState = React.useState;
  (window as any).useEffect = React.useEffect;
  (window as any).useContext = React.useContext;
  (window as any).useCallback = React.useCallback;
  (window as any).useMemo = React.useMemo;
  (window as any).useRef = React.useRef;
  (window as any).useReducer = React.useReducer;
  
  console.log('React polyfill loaded successfully');
}

export default React;