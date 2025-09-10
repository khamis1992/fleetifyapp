// Critical: Import React FIRST to ensure single instance
import React from 'react'
import { createRoot } from 'react-dom/client'

// React initialization and compatibility fixes
import './react-fix';
import './lovable-compatibility';

// Application imports
import App from './App.tsx'
import './index.css'

// Enhanced React initialization
const initializeApp = async () => {
  console.log('🔧 [MAIN] Starting application initialization...');
  
  // Verify React is available
  if (!React || typeof React.createElement !== 'function') {
    throw new Error('React is not properly loaded');
  }
  
  console.log('🔧 [MAIN] React verified, version:', React.version);
  
  // Get root element
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  // Create React root and render
  const root = createRoot(rootElement);
  root.render(React.createElement(App));
  
  console.log('🔧 [MAIN] Application rendered successfully');
};

// Initialize with error handling
initializeApp().catch((error) => {
  console.error('🚨 [MAIN] Failed to initialize application:', error);
  
  // Fallback error display
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        padding: 40px; 
        text-align: center; 
        background: #fee; 
        border: 1px solid #fcc; 
        border-radius: 8px; 
        margin: 20px; 
        font-family: Arial, sans-serif;
        direction: rtl;
      ">
        <h1 style="color: #d63031;">خطأ في تحميل التطبيق</h1>
        <p>فشل في تهيئة React. يرجى إعادة تحميل الصفحة.</p>
        <button onclick="window.location.reload()" style="
          padding: 12px 24px; 
          background: #0984e3; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px;
        ">
          إعادة تحميل
        </button>
      </div>
    `;
  }
});