/**
 * Bento Layout Component
 * Modern layout with BentoSidebar for the entire application
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import BentoSidebar from '@/components/dashboard/bento/BentoSidebar';
import { motion } from 'framer-motion';

interface BentoLayoutProps {
  children?: React.ReactNode;
}

export const BentoLayout: React.FC<BentoLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex bg-neutral-50" dir="rtl">
      {/* Bento Sidebar */}
      <BentoSidebar />
      
      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-auto"
      >
        <div className="p-6 min-h-screen">
          {children}
        </div>
      </motion.main>
    </div>
  );
};

export default BentoLayout;

