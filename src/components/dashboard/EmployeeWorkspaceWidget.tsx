/**
 * Employee Workspace Widget
 * Widget يظهر في Dashboard الرئيسي للموظفين الذين لديهم عقود معيّنة
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Briefcase, AlertCircle, CheckCircle, TrendingUp, ChevronLeft } from 'lucide-react';

export const EmployeeWorkspaceWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get user's profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Get assigned contracts count
  const { data: assignedStats } = useQuery({
    queryKey: ['assigned-contracts-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      // Count total assigned contracts
      const { count: totalCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_profile_id', profile.id)
        .neq('status', 'cancelled');

      // Count contracts with balance due
      const { count: overdueCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_profile_id', profile.id)
        .eq('status', 'active')
        .gt('balance_due', 0);

      // Count today's tasks
      const today = new Date().toISOString().split('T')[0];
      const { count: tasksCount } = await supabase
        .from('scheduled_followups')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .eq('scheduled_date', today)
        .eq('status', 'pending');

      return {
        totalContracts: totalCount || 0,
        overdueContracts: overdueCount || 0,
        todayTasks: tasksCount || 0
      };
    },
    enabled: !!profile?.id,
    staleTime: 60 * 1000 // 1 minute
  });

  const hasContracts = assignedStats && assignedStats.totalContracts > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-6"
    >
      <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          
          {/* Header & Icon Area */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <Briefcase className="w-7 h-7" />
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                مساحة عملي
                {hasContracts && assignedStats.overdueContracts > 0 && (
                  <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                    {assignedStats.overdueContracts} تنبيه
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                {hasContracts ? (
                  <span>لديك <span className="text-blue-600 font-bold">{assignedStats.totalContracts}</span> عقود تحت إدارتك</span>
                ) : (
                  "لا توجد عقود معيّنة لك حالياً"
                )}
              </p>
            </div>
          </div>

          {/* Stats Area (Only if contracts exist) */}
          {hasContracts && (
            <div className="flex items-center gap-6 px-6 py-2 bg-white/60 rounded-xl border border-blue-50 backdrop-blur-sm hidden md:flex">
              <div className="text-center">
                <span className="block text-xs text-gray-400 font-medium mb-0.5">المهام</span>
                <span className="block text-lg font-bold text-gray-800">{assignedStats.todayTasks}</span>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="text-center">
                <span className="block text-xs text-gray-400 font-medium mb-0.5">متأخرة</span>
                <span className={`block text-lg font-bold ${assignedStats.overdueContracts > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {assignedStats.overdueContracts}
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={() => navigate('/employee-workspace')}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-xl px-6 h-11 font-medium transition-all group-hover:translate-x-1"
          >
            <span>انتقل إلى مساحة عملي</span>
            <ChevronLeft className="mr-2 w-4 h-4 opacity-80" />
          </Button>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -translate-x-10 -translate-y-10 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl translate-x-10 translate-y-10 pointer-events-none"></div>
      </div>
    </motion.div>
  );
};
