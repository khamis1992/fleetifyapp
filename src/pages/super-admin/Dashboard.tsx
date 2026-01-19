import React from 'react';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
import { SystemStatsCards } from '@/components/super-admin/SystemStatsCards';
import { CompaniesOverview } from '@/components/super-admin/CompaniesOverview';
import { QuickActions } from '@/components/super-admin/QuickActions';
import { SystemAlerts } from '@/components/super-admin/SystemAlerts';
import { useAuth } from '@/contexts/AuthContext';
import ProfessionalBackground from '@/components/dashboard/ProfessionalBackground';
import { Crown, Target, Zap, Building2, Users, DollarSign, Activity } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { stats, companies, loading } = useSuperAdminData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };

  return (
    <>
      <ProfessionalBackground />
      <div className="relative z-10 space-y-8">
        {/* Professional Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                    <Crown size={20} />
                  </div>
                  <span className="text-sm font-medium text-destructive">لوحة التحكم الرئيسية</span>
                </div>
                
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    {getGreeting()}, {user?.email?.split('@')[0] || 'مشرف النظام'}
                  </h1>
                  <p className="text-lg text-muted-foreground">مراقبة وإدارة جميع عمليات المنصة من مركز التحكم المركزي</p>
                </div>
              </div>
              
              <motion.div
                className="hidden lg:block"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                  <Activity size={32} />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SystemStatsCards stats={stats} loading={false} />
        </motion.div>

        {/* Main Content Grid with Enhanced Styling */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Companies Overview - Takes 2 columns */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <CompaniesOverview companies={companies} loading={false} />
          </motion.div>
          
          {/* System Alerts - Takes 1 column */}
          <motion.div 
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <SystemAlerts />
          </motion.div>
        </div>

        {/* Enhanced Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <QuickActions />
        </motion.div>
      </div>
    </>
  );
};

export default SuperAdminDashboard;