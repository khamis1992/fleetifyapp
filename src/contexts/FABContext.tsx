/**
 * Floating Action Button Context
 * Manages FAB state globally across the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { FABConfig, FABContextValue } from '@/types/mobile';

const FABContext = createContext<FABContextValue | null>(null);

const DEFAULT_CONFIG: FABConfig = {
  hidden: false,
  position: 'bottom-right',
};

export function FABProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<FABConfig>(DEFAULT_CONFIG);

  const setConfig = useCallback((newConfig: FABConfig) => {
    setConfigState(prev => ({
      ...DEFAULT_CONFIG,
      ...newConfig,
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfigState(DEFAULT_CONFIG);
  }, []);

  return (
    <FABContext.Provider value={{ config, setConfig, resetConfig }}>
      {children}
    </FABContext.Provider>
  );
}

export function useFAB() {
  const context = useContext(FABContext);
  if (!context) {
    throw new Error('useFAB must be used within FABProvider');
  }
  return context;
}
