// React fix for lovable.dev environment
// This file ensures React is properly loaded and available

import React from 'react';

// Ensure React is available globally
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

// Export React to ensure it's available
export default React;
export * from 'react';

// Debug logging for React availability
console.log('🔧 React Fix: React version', React.version);
console.log('🔧 React Fix: useState available:', typeof React.useState !== 'undefined');
