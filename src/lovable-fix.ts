// Lovable.dev Compatibility Layer
// This ensures optimal compatibility with Lovable.dev platform

import * as React from 'react';

// تحسين تهيئة React للتوافق مع Lovable.dev
const initializeReactGlobally = () => {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  // التأكد من وجود React
  if (!React || typeof React !== 'object') {
    console.error('🚨 React object is not available for global initialization');
    return;
  }

  // التحقق من hooks الأساسية
  const requiredHooks = [
    'useState',
    'useEffect', 
    'useContext',
    'createContext',
    'useCallback',
    'useMemo',
    'useRef'
  ];

  const missingHooks = requiredHooks.filter(hook => 
    typeof (React as any)[hook] !== 'function'
  );

  if (missingHooks.length > 0) {
    console.error('🚨 Missing React hooks:', missingHooks);
    console.error('🚨 Available React properties:', Object.keys(React));
    return;
  }

  // تعيين React عالمياً للتوافق مع Lovable.dev
  try {
    (window as any).React = React;
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
    
    console.log('✅ React hooks verified and available globally:', {
      useState: typeof React.useState,
      useEffect: typeof React.useEffect,
      useContext: typeof React.useContext,
      createContext: typeof React.createContext
    });
    
    console.log('🔧 Lovable.dev compatibility layer initialized successfully');
  } catch (error) {
    console.error('🚨 Failed to initialize React globally:', error);
  }
};

// تشغيل التهيئة
initializeReactGlobally();

// تصدير React مع ضمان التهيئة
export default React;
