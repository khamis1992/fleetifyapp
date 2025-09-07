// React initialization script for lovable.dev
// This script ensures React is loaded before the main application

(function() {
  console.log('🔧 React Init: Starting React initialization...');
  
  // Check if React is available
  if (typeof window.React === 'undefined') {
    console.warn('🔧 React Init: React not found in window, will be loaded by modules');
  } else {
    console.log('🔧 React Init: React found in window:', window.React.version);
  }
  
  // Ensure React hooks are available when React loads
  window.addEventListener('load', function() {
    setTimeout(function() {
      if (window.React && window.React.useState) {
        console.log('🔧 React Init: React hooks are available');
        window.__REACT_HOOKS_AVAILABLE__ = true;
      } else {
        console.error('🔧 React Init: React hooks are not available');
        window.__REACT_HOOKS_AVAILABLE__ = false;
      }
    }, 100);
  });
})();
