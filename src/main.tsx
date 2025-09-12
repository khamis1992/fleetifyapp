// تهيئة React أولاً قبل أي شيء آخر
import * as React from 'react'
import { createRoot } from 'react-dom/client'

// التحقق الفوري من React قبل تحميل أي ملفات أخرى
if (!React) {
  console.error('🚨 React module failed to load');
  throw new Error('React module is not available');
}

if (typeof React.useState !== 'function') {
  console.error('🚨 React hooks are not available');
  console.log('React object:', React);
  console.log('useState type:', typeof React.useState);
  throw new Error('React hooks are not properly initialized');
}

console.log('✅ React initialized successfully');
console.log('✅ React.useState:', typeof React.useState);
console.log('✅ React.useEffect:', typeof React.useEffect);

// الآن يمكن تحميل باقي الملفات بأمان
import './lovable-fix';
import './utils/react-diagnostics'; // أداة التشخيص
import App from './App.tsx'
import './index.css'
import { SimpleAppWrapper } from './components/SimpleAppWrapper'

// التحقق النهائي قبل الرندر
const ensureReactReady = (): boolean => {
  const checks = [
    React && typeof React === 'object',
    typeof React.useState === 'function',
    typeof React.useEffect === 'function',
    typeof React.useContext === 'function',
    typeof React.createContext === 'function'
  ];
  
  const allPassed = checks.every(Boolean);
  
  if (!allPassed) {
    console.error('🚨 React readiness check failed:', {
      'React exists': !!React,
      'useState': typeof React?.useState,
      'useEffect': typeof React?.useEffect,
      'useContext': typeof React?.useContext,
      'createContext': typeof React?.createContext
    });
    return false;
  }
  
  return true;
};

// تأخير قصير للتأكد من تحميل React بالكامل
const initializeApp = () => {
  if (!ensureReactReady()) {
    console.error('🚨 React not ready, retrying in 100ms...');
    setTimeout(initializeApp, 100);
    return;
  }
  
  console.log('🚀 Starting app render...');
  
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    createRoot(rootElement).render(
      <SimpleAppWrapper>
        <App />
      </SimpleAppWrapper>
    );
    
    console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('🚨 App render failed:', error);
    throw error;
  }
};

// بدء التطبيق
initializeApp();