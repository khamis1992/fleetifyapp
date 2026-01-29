/**
 * Team Comparison Chart
 * رسم بياني لمقارنة أداء الفريق
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface TeamComparisonData {
  employee_name: string;
  performance_score: number;
  collection_rate: number;
  task_completion: number;
}

interface TeamComparisonChartProps {
  data: TeamComparisonData[];
  title?: string;
  metric?: 'performance_score' | 'collection_rate' | 'task_completion';
  height?: number;
}

export const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({
  data,
  title = 'مقارنة الأداء',
  metric = 'performance_score',
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">لا توجد بيانات</p>
      </div>
    );
  }

  const getBarColor = (value: number) => {
    if (value >= 90) return '#10b981'; // emerald
    if (value >= 75) return '#3b82f6'; // blue
    if (value >= 60) return '#f59e0b'; // amber
    if (value >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const metricLabels = {
    performance_score: 'نقاط الأداء',
    collection_rate: 'نسبة التحصيل',
    task_completion: 'إنجاز المهام',
  };

  // Sort data by metric value
  const sortedData = [...data]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 10); // Top 10

  return (
    <div>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
          <span className="text-xs text-neutral-500 font-medium">
            حسب {metricLabels[metric]}
          </span>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sortedData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#78716c', fontWeight: 500 }}
            stroke="#d1d5db"
          />
          <YAxis 
            type="category" 
            dataKey="employee_name"
            tick={{ fontSize: 11, fill: '#78716c', fontWeight: 500 }}
            stroke="#d1d5db"
            width={120}
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
            formatter={(value: number) => [`${Math.round(value)}%`, metricLabels[metric]]}
          />
          <Bar 
            dataKey={metric} 
            radius={[0, 8, 8, 0]}
            animationDuration={1500}
          >
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry[metric])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-200">
        <div className="text-center p-3 bg-emerald-50 rounded-xl">
          <p className="text-xs text-emerald-700 font-semibold mb-1">الأعلى</p>
          <p className="text-lg font-black text-emerald-600">
            {Math.round(sortedData[0]?.[metric] || 0)}%
          </p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-700 font-semibold mb-1">المتوسط</p>
          <p className="text-lg font-black text-blue-600">
            {Math.round(
              sortedData.reduce((sum, emp) => sum + emp[metric], 0) / sortedData.length || 0
            )}%
          </p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-xl">
          <p className="text-xs text-amber-700 font-semibold mb-1">الأدنى</p>
          <p className="text-lg font-black text-amber-600">
            {Math.round(sortedData[sortedData.length - 1]?.[metric] || 0)}%
          </p>
        </div>
      </div>
    </div>
  );
};
