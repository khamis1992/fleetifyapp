/**
 * Mobile Employee Performance Page
 * صفحة أداء الموظف
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  TrendingUp,
  CheckCircle,
  Phone,
  FileText,
  DollarSign,
  Award,
  Target,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeePerformance } from '@/hooks/useEmployeePerformance';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { MobileEmployeeLayout } from '@/components/mobile/employee/layout/MobileEmployeeLayout';
import { MobileEmployeeHeader } from '@/components/mobile/employee/layout/MobileEmployeeHeader';
import { Progress } from '@/components/ui/progress';

export const MobileEmployeePerformance: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const { performance, performanceGrade, isLoading, refetch } = useEmployeePerformance();

  const getGradeColor = (grade?: string) => {
    const colors = {
      excellent: 'from-emerald-500 to-emerald-600',
      good: 'from-blue-500 to-blue-600',
      average: 'from-amber-500 to-amber-600',
      poor: 'from-red-500 to-red-600',
    };
    return colors[grade as keyof typeof colors] || colors.good;
  };

  const metrics = [
    {
      icon: DollarSign,
      label: 'نسبة التحصيل',
      value: performance?.collection_rate || 0,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: CheckCircle,
      label: 'إنجاز المهام',
      value: performance?.followup_completion_rate || 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: Phone,
      label: 'المكالمات المسجلة',
      value: performance?.calls_logged || 0,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      isCount: true,
    },
    {
      icon: FileText,
      label: 'الملاحظات المضافة',
      value: performance?.notes_added || 0,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      isCount: true,
    },
  ];

  const achievements = [
    {
      icon: '🏆',
      title: 'أفضل موظف الشهر',
      condition: (performance?.performance_score || 0) >= 90,
    },
    {
      icon: '⭐',
      title: '100% إنجاز مهام',
      condition: (performance?.followup_completion_rate || 0) === 100,
    },
    {
      icon: '💰',
      title: 'تحصيل +50,000 QAR',
      condition: (performance?.total_collected || 0) >= 50000,
    },
    {
      icon: '📞',
      title: '50+ مكالمة',
      condition: (performance?.calls_logged || 0) >= 50,
    },
  ];

  const unlockedAchievements = achievements.filter(a => a.condition);

  return (
    <MobileEmployeeLayout showFAB showBottomNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="px-4 pt-4">
          <MobileEmployeeHeader
            title="الأداء"
            subtitle="تقييم أدائك الشهري"
            showNotifications
            showRefresh
            onRefresh={refetch}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-teal-600">جاري التحميل...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Performance Score Card */}
            <div className="px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'bg-gradient-to-br shadow-xl rounded-xl p-6 text-white relative overflow-hidden',
                  getGradeColor(performanceGrade?.grade)
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5" strokeWidth={2.5} />
                    <p className="text-sm opacity-90">نقاط الأداء</p>
                  </div>

                  <div className="flex items-end gap-2 mb-4">
                    <p className="text-5xl font-bold">
                      {Math.round(performance?.performance_score || 0)}
                    </p>
                    <p className="text-2xl opacity-70 mb-1">/100</p>
                  </div>

                  {/* Grade Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <span className="text-2xl">{performanceGrade?.icon}</span>
                    <span className="font-bold">{performanceGrade?.label_ar}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Detailed Metrics */}
            <div className="px-4">
              <h3 className="text-lg font-bold text-slate-900 mb-3">المقاييس التفصيلية</h3>
              <div className="space-y-3">
                {metrics.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white border border-slate-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-xl', metric.bg)}>
                            <Icon className={cn('w-5 h-5', metric.color)} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {metric.label}
                          </span>
                        </div>
                        <span className={cn('text-xl font-bold', metric.color)}>
                          {metric.isCount ? metric.value : `${metric.value}%`}
                        </span>
                      </div>

                      {!metric.isCount && (
                        <Progress 
                          value={metric.value} 
                          className={cn('h-2', metric.bg)}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="px-4">
              <h3 className="text-lg font-bold text-slate-900 mb-3">الملخص المالي</h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">المستهدف</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(performance?.target_amount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">تم التحصيل</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(performance?.total_collected || 0)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">المتبقي</span>
                    <span className="text-lg font-bold text-amber-600">
                      {formatCurrency((performance?.target_amount || 0) - (performance?.total_collected || 0))}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Achievements */}
            {unlockedAchievements.length > 0 && (
              <div className="px-4 pb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">🏆 الإنجازات</h3>
                <div className="grid grid-cols-2 gap-3">
                  {unlockedAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-center"
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="text-xs font-medium text-amber-900">
                        {achievement.title}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MobileEmployeeLayout>
  );
};

export default MobileEmployeePerformance;
