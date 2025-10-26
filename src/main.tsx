import './lovable-compatibility'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add loading class to body to disable blur during initial load
document.body.classList.add('loading');

// Remove loading class after app mounts to enable blur effects
setTimeout(() => {
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');
}, 1000);

// Global error handler for dynamic import failures
window.addEventListener('error', (event) => {
  const isChunkLoadError = 
    event.message.includes('Failed to fetch dynamically imported module') ||
    event.message.includes('Importing a module script failed') ||
    event.message.includes('error loading dynamically imported module');
  
  if (isChunkLoadError) {
    console.warn('🔄 [CHUNK_LOAD_ERROR] Detected stale chunk, reloading page...');
    // Prevent infinite reload loop
    const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reload_attempted', 'true');
      window.location.reload();
    } else {
      console.error('🔄 [CHUNK_LOAD_ERROR] Reload attempted but failed, clearing session and trying again');
      sessionStorage.removeItem('chunk_reload_attempted');
      window.location.reload();
    }
  }
});

// Clear reload flag on successful load
window.addEventListener('load', () => {
  sessionStorage.removeItem('chunk_reload_attempted');
});


// Handle unhandled promise rejections (for dynamic imports)
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const isChunkLoadError = 
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('error loading dynamically imported module') ||
    (error instanceof TypeError && error.message.includes('fetch'));
  
  if (isChunkLoadError) {
    console.warn('🔄 [CHUNK_LOAD_ERROR] Detected stale chunk in promise, reloading page...');
    event.preventDefault();
    const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reload_attempted', 'true');
      window.location.reload();
    }
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ [MAIN] Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ [MAIN] Root element found, creating React root');

const root = createRoot(rootElement);

console.log('✅ [MAIN] React root created, rendering app...');

// تمكين React StrictMode في بيئة التطوير
if (import.meta.env.DEV) {
  console.log('✅ [MAIN] Rendering in development mode with StrictMode');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.log('✅ [MAIN] Rendering in production mode');
  root.render(<App />);
}

console.log('✅ [MAIN] App render called');