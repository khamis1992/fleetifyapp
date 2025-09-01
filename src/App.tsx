
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyContextProvider } from '@/contexts/CompanyContext';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Auth from '@/pages/Auth';
import SuperAdmin from '@/pages/SuperAdmin';
import Dashboard from '@/pages/Dashboard';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="fleetify-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CompanyContextProvider>
              <Router>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/super-admin" element={<SuperAdmin />} />
                  <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                  </Route>
                </Routes>
              </Router>
              <Toaster />
            </CompanyContextProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
