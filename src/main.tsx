import './lovable-compatibility';
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🔧 Main: Starting application...');
console.log('🔧 Main: React available:', !!React);
console.log('🔧 Main: StrictMode available:', !!StrictMode);
console.log('🔧 Main: createRoot available:', !!createRoot);

// Safety check for React availability
if (typeof React === 'undefined' || typeof StrictMode === 'undefined' || typeof createRoot === 'undefined') {
  console.error('🔧 Main: Critical React modules not available');
  document.body.innerHTML = `
    <div style="
      padding: 20px; 
      text-align: center; 
      font-family: Arial, sans-serif;
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 5px;
      margin: 20px;
      direction: rtl;
    ">
      <h2>خطأ في تحميل React</h2>
      <p>لم يتم تحميل React بشكل صحيح. يرجى إعادة تحميل الصفحة.</p>
      <button 
        onclick="window.location.reload()" 
        style="
          padding: 10px 20px; 
          background-color: #007bff; 
          color: white; 
          border: none; 
          border-radius: 5px;
          cursor: pointer;
          margin: 5px;
        "
      >
        إعادة تحميل الصفحة
      </button>
    </div>
  `;
  throw new Error('React modules not available');
}

// Error boundary for the entire application
const renderWithErrorBoundary = () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    console.log('🔧 Main: Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('🔧 Main: Rendering application...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    console.log('🔧 Main: Application rendered successfully');
  } catch (error) {
    console.error('🔧 Main: Critical error during rendering:', error);
    
    // Fallback error UI
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          padding: 20px; 
          text-align: center; 
          font-family: Arial, sans-serif;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 5px;
          margin: 20px;
          direction: rtl;
        ">
          <h2>خطأ في تحميل التطبيق</h2>
          <p>حدث خطأ أثناء تحميل التطبيق. يرجى المحاولة مرة أخرى.</p>
          <p style="font-size: 12px; color: #666; margin: 10px 0;">
            تفاصيل الخطأ: ${error.message}
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              padding: 10px 20px; 
              background-color: #007bff; 
              color: white; 
              border: none; 
              border-radius: 5px;
              cursor: pointer;
              margin: 5px;
            "
          >
            إعادة تحميل الصفحة
          </button>
          <button 
            onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload()" 
            style="
              padding: 10px 20px; 
              background-color: #dc3545; 
              color: white; 
              border: none; 
              border-radius: 5px;
              cursor: pointer;
              margin: 5px;
            "
          >
            مسح البيانات وإعادة التحميل
          </button>
        </div>
      `;
    }
  }
};

// Initialize the application
renderWithErrorBoundary();
