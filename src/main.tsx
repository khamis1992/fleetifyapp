// Import Safe React first
import './utils/safe-react';
import React from 'react';
import App from './App.tsx';
import './index.css';

console.log('🔧 Main: Starting application...');

// Safe React DOM rendering
const safeRender = () => {
  try {
    // Try to use React 18 createRoot
    const { createRoot } = require('react-dom/client');
    const { StrictMode } = React;
    
    if (createRoot && StrictMode) {
      console.log('🔧 Main: Using React 18 createRoot');
      const rootElement = document.getElementById("root");
      if (!rootElement) throw new Error("Root element not found");
      
      const root = createRoot(rootElement);
      root.render(
        React.createElement(StrictMode, null,
          React.createElement(App)
        )
      );
    } else {
      throw new Error('React 18 APIs not available');
    }
  } catch (error) {
    console.error('🔧 Main: Error with React 18, trying React 17 fallback:', error);
    
    try {
      // Fallback to React 17 render
      const ReactDOM = require('react-dom');
      const rootElement = document.getElementById("root");
      
      if (!rootElement) throw new Error("Root element not found");
      
      console.log('🔧 Main: Using React 17 render fallback');
      ReactDOM.render(
        React.createElement(App),
        rootElement
      );
    } catch (fallbackError) {
      console.error('🔧 Main: Both React 18 and 17 failed:', fallbackError);
      
      // Ultimate fallback - direct DOM manipulation
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
          ">
            <h2>خطأ في تحميل React</h2>
            <p>يرجى إعادة تحميل الصفحة أو الاتصال بالدعم الفني</p>
            <button 
              onclick="window.location.reload()" 
              style="
                padding: 10px 20px; 
                background-color: #007bff; 
                color: white; 
                border: none; 
                border-radius: 5px;
                cursor: pointer;
              "
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        `;
      }
    }
  }
};

// Initialize the application
safeRender();
