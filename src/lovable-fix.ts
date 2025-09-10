// Lovable.dev Compatibility Layer
// This ensures optimal compatibility with Lovable.dev platform

import React from 'react';

// Ensure React is available globally for Lovable.dev
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

console.log('🔧 Lovable.dev compatibility initialized');

export default React;
