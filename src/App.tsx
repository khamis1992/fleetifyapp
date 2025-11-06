/**
 * App Component - Updated with new systems
 * 
 * Initializes all services and provides app structure.
 */

import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { initializeServices } from '@/services/core/ServiceInitializer';
import { logger } from '@/lib/logger';

// Your existing App content
import './App.css';

function App() {
  // Initialize services on app startup
  useEffect(() => {
    const init = async () => {
      try {
        logger.info('🚀 Starting FleetifyApp...');
        await initializeServices();
        logger.info('✅ FleetifyApp initialized successfully!');
      } catch (error) {
        logger.error('❌ Failed to initialize app', error);
      }
    };

    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Your existing app content */}
        <div className="App">
          {/* Routes, Layout, etc. */}
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
