import './lovable-fix';
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SimpleAppWrapper } from './components/SimpleAppWrapper'

// Ensure React is available before rendering
if (!React || typeof React.useState !== 'function') {
  console.error('🚨 React is not properly initialized');
  throw new Error('React initialization failed');
}

createRoot(document.getElementById('root')!).render(
  <SimpleAppWrapper>
    <App />
  </SimpleAppWrapper>
)