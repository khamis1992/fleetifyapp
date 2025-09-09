// React Fix Layer for Lovable Environment
// This ensures React is properly initialized and available globally

import React from 'react';

console.log('🔧 [REACT_FIX] Initializing React fix layer...');

// Ensure React is available globally
if (typeof window !== 'undefined') {
  // Make React globally available
  (window as any).React = React;
  
  console.log('🔧 [REACT_FIX] React version:', React.version);
  console.log('🔧 [REACT_FIX] useState available:', typeof React.useState === 'function');
  
  // Verify React hooks are working
  if (typeof React.useState !== 'function') {
    console.error('🚨 [REACT_FIX] React hooks are not available!');
    throw new Error('React hooks are not properly loaded. This may be a compatibility issue.');
  }
  
  console.log('✅ [REACT_FIX] React fix layer initialized successfully');
} else {
  console.log('🔧 [REACT_FIX] Server-side environment detected, skipping global React setup');
}

export default React;