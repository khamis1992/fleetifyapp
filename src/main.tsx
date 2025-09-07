// Import React polyfill first to ensure React is available
import './utils/react-polyfill';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Safety check for React availability
if (typeof StrictMode === 'undefined' || typeof createRoot === 'undefined') {
  console.error('React is not properly loaded. This might be a module resolution issue.');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial;">خطأ في تحميل React. يرجى إعادة تحميل الصفحة.</div>';
  throw new Error('React modules not available');
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
