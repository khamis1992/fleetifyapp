// Lovable.dev Compatibility Layer
// This ensures optimal compatibility with Lovable.dev platform

import React from 'react';

// Ensure React is available globally for Lovable.dev
if (typeof window !== 'undefined') {
  (window as any).React = React;
  
  // Explicitly ensure hooks are available (safe checks)
  const hasHooks = !!(React && typeof (React as any).useState === 'function' && typeof (React as any).useEffect === 'function' && typeof (React as any).useContext === 'function');
  if (hasHooks) {
    console.log('🔧 React hooks verified and available globally');
  } else {
    console.error('🚨 React hooks are missing or React is not initialized yet');
  }
}

console.log('🔧 Lovable.dev compatibility initialized');

export default React;
