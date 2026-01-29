/**
 * Performance Trend Chart
 * رسم بياني لتطور أداء الموظف عبر الوقت
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceData {
  month: string;
  performance_score: number;
  collection_rate: number;
  task_completion: number;
}

interface PerformanceTrendChartProps {
  data: PerformanceData[];
  title?: string;
  showLegend?: boolean;
  height?: number;
}

export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({
  data,
  title = 'تطور الأداء',
  showLegend = true,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">لا توجد بيانات كافية</p>
      </div>
    );
  }

  // Calculate trend
  const firstScore = data[0]?.performance_score || 0;
  const lastScore = data[data.length - 1]?.performance_score || 0;
  const trend = lastScore - firstScore;
  const trendPercentage = firstScore > 0 ? ((trend / firstScore) * 100).toFixed(1) : '0';

  return (
    <div>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
          <motion.div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold',
              trend >= 0
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {trend >= 0 ? '+' : ''}{trendPercentage}%
          </motion.div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: '#78716c', fontWeight: 500 }}
            stroke="#d1d5db"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#78716c', fontWeight: 500 }}
            stroke="#d1d5db"
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              fontSize: '13px',
              padding: '12px',
              direction: 'rtl',
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              iconType="circle"
            />
          )}
          <Area
            type="monotone"
            dataKey="performance_score"
            name="نقاط الأداء"
            stroke="#14b8a6"
            strokeWidth={3}
            fill="url(#colorPerformance)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="collection_rate"
            name="نسبة التحصيل"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorCollection)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="task_completion"
            name="إنجاز المهام"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorTasks)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
