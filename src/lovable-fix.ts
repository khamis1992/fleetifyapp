// Lovable.dev Compatibility Layer
// This ensures optimal compatibility with Lovable.dev platform

import * as React from 'react';

// تحسين تهيئة React للتوافق مع Lovable.dev
const initializeReactForLovable = () => {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  // التأكد من وجود React
  if (!React || typeof React !== 'object') {
    console.error('🚨 React object is not available for Lovable.dev initialization');
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
    'useRef',
    'Component'
  ];

  const missingHooks = requiredHooks.filter(hook => 
    typeof (React as any)[hook] !== 'function' && typeof (React as any)[hook] !== 'object'
  );

  if (missingHooks.length > 0) {
    console.error('🚨 Missing React hooks/components:', missingHooks);
    console.error('🚨 Available React properties:', Object.keys(React));
    return;
  }

  // تعيين React عالمياً للتوافق مع Lovable.dev
  try {
    // ضمان توفر React عالمياً
    (window as any).React = React;
    (window as any).__REACT__ = React;
    
    // تهيئة React DevTools للـ Lovable.dev
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {
      isDisabled: false,
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    };

    // إضافة دعم خاص لـ lovable-tagger
    if (typeof (window as any).__LOVABLE_TAGGER__ === 'undefined') {
      (window as any).__LOVABLE_TAGGER__ = {
        enabled: true,
        React: React
      };
    }
    
    console.log('✅ React hooks verified and available globally for Lovable.dev:', {
      useState: typeof React.useState,
      useEffect: typeof React.useEffect,
      useContext: typeof React.useContext,
      createContext: typeof React.createContext,
      Component: typeof React.Component
    });
    
    console.log('🔧 Lovable.dev compatibility layer initialized successfully');
  } catch (error) {
    console.error('🚨 Failed to initialize React for Lovable.dev:', error);
  }
};

// تشغيل التهيئة فوراً
initializeReactForLovable();

// إضافة listener للتأكد من التهيئة عند تحميل DOM
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReactForLovable);
  }
  
  // تشغيل إضافي بعد تأخير قصير للتأكد
  setTimeout(initializeReactForLovable, 100);
}

// تصدير React مع ضمان التهيئة
export default React;
