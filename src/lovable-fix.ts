// Lovable.dev Compatibility Layer
// This ensures optimal compatibility with Lovable.dev platform

import React from 'react';

// Ensure React is available globally for Lovable.dev
if (typeof window !== 'undefined') {
  (window as any).React = React;
  
  // Explicitly ensure hooks are available
  if (React.useState && React.useEffect && React.useContext) {
    console.log('🔧 React hooks verified and available globally');
  } else {
    console.error('🚨 React hooks are missing!');
  }
}

console.log('🔧 Lovable.dev compatibility initialized');

export default React;
