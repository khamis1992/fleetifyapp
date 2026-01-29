/**
 * Leaderboard Widget
 * لوحة المتصدرين - عرض أفضل الموظفين
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LeaderboardWidgetProps {
  limit?: number;
  showTrend?: boolean;
}

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  limit = 10,
  showTrend = true,
}) => {
  const { data: topEmployees, isLoading } = useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_performance_view')
        .select('*')
        .order('performance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-neutral-400">#{rank}</span>;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'B':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'C':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'D':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'F':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-500 mt-3">جاري التحميل...</p>
      </div>
    );
  }

  if (!topEmployees || topEmployees.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <Trophy className="w-16 h-16 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          لوحة المتصدرين
        </h3>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Top {topEmployees.length}
        </Badge>
      </div>

      {/* Leaderboard List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {topEmployees.map((employee, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <motion.div
                key={employee.employee_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'group flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer',
                  isTopThree
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 hover:border-yellow-300 shadow-sm'
                    : 'bg-white border-neutral-100 hover:border-teal-200'
                )}
                whileHover={{ scale: 1.02, x: 4 }}
              >
                {/* Rank/Medal */}
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  {getMedalIcon(rank)}
                </div>

                {/* Employee Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-neutral-900 group-hover:text-teal-600 transition-colors">
                      {employee.employee_name || 'غير محدد'}
                    </h4>
                    <Badge className={cn('text-xs font-bold border', getGradeColor(employee.grade))}>
                      {employee.grade}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>{employee.total_contracts} عقود</span>
                    <span>•</span>
                    <span>{Math.round(employee.collection_rate)}% تحصيل</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-center">
                  <motion.p
                    className={cn('text-2xl font-black', getScoreColor(employee.performance_score))}
                    key={employee.performance_score}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {Math.round(employee.performance_score)}
                  </motion.p>
                  <p className="text-[10px] text-neutral-500 font-semibold uppercase">نقطة</p>
                </div>

                {/* Trend (optional) */}
                {showTrend && (
                  <div className="w-16">
                    <div className="h-8 flex items-center justify-center">
                      {/* Placeholder for mini sparkline or trend indicator */}
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Top Performer Highlight */}
      {topEmployees.length > 0 && (
        <motion.div
          className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-amber-700 font-semibold">🏆 موظف الشهر</p>
              <p className="text-sm font-bold text-amber-900">
                {topEmployees[0].employee_name}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-600">
                {Math.round(topEmployees[0].performance_score)}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold uppercase">نقطة</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
