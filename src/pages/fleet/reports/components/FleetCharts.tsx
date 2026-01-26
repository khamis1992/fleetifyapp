/**
 * مكون الرسوم البيانية المتقدمة للأسطول
 * Fleet Advanced Charts Component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import type { 
  FleetAnalyticsSummary, 
  MonthlyRevenueData,
  FleetStatusData,
  VehicleReportData,
} from '../types/reports.types';

// ألوان متناسقة مع التصميم
const CHART_COLORS = {
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
};

const STATUS_COLORS = {
  available: '#22c55e',
  rented: '#f43f5e',
  maintenance: '#f59e0b',
  reserved: '#3b82f6',
};

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  badge?: { text: string; trend: 'up' | 'down' | 'neutral' };
  children: React.ReactNode;
  isDark: boolean;
  delay?: number;
  className?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  badge,
  children,
  isDark,
  delay = 0,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={cn(
      "rounded-2xl p-6",
      "backdrop-blur-xl border",
      isDark 
        ? "bg-slate-900/60 border-slate-800/50" 
        : "bg-white/80 border-slate-200/50",
      "shadow-xl",
      className
    )}
  >
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className={cn(
          "text-lg font-semibold",
          isDark ? "text-white" : "text-slate-900"
        )}>
          {title}
        </h3>
        {subtitle && (
          <p className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            {subtitle}
          </p>
        )}
      </div>
      {badge && (
        <Badge 
          variant="outline" 
          className={cn(
            "font-medium",
            badge.trend === 'up' && "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
            badge.trend === 'down' && "text-rose-500 border-rose-500/30 bg-rose-500/10",
            badge.trend === 'neutral' && "text-slate-500 border-slate-500/30 bg-slate-500/10"
          )}
        >
          {badge.trend === 'up' && <TrendingUp className="w-3 h-3 ml-1" />}
          {badge.trend === 'down' && <TrendingDown className="w-3 h-3 ml-1" />}
          {badge.text}
        </Badge>
      )}
    </div>
    {children}
  </motion.div>
);

interface RevenueChartProps {
  data: MonthlyRevenueData[];
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  isDark,
  formatCurrency,
}) => (
  <ChartContainer
    title="تحليل الإيرادات والأرباح"
    subtitle="آخر 6 أشهر"
    badge={{ text: 'نمو 12%', trend: 'up' }}
    isDark={isDark}
    delay={0.5}
    className="lg:col-span-2"
  >
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.violet} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={CHART_COLORS.violet} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis 
          dataKey="month" 
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
        />
        <YAxis 
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={12}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}
          labelStyle={{ color: isDark ? '#fff' : '#000' }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'revenue' ? 'الإيرادات' : 
            name === 'profit' ? 'الأرباح' : 
            name === 'maintenance' ? 'الصيانة' : name
          ]}
        />
        <Legend 
          formatter={(value) => 
            value === 'revenue' ? 'الإيرادات' : 
            value === 'profit' ? 'الأرباح' : 
            value === 'maintenance' ? 'الصيانة' : value
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={CHART_COLORS.violet}
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
        <Bar dataKey="maintenance" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="profit"
          stroke={CHART_COLORS.emerald}
          strokeWidth={3}
          dot={{ fill: CHART_COLORS.emerald, strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  </ChartContainer>
);

interface FleetStatusChartProps {
  data: FleetStatusData;
  isDark: boolean;
}

export const FleetStatusChart: React.FC<FleetStatusChartProps> = ({
  data,
  isDark,
}) => {
  const chartData = [
    { name: 'متاح', value: data.available, color: STATUS_COLORS.available },
    { name: 'مؤجر', value: data.rented, color: STATUS_COLORS.rented },
    { name: 'صيانة', value: data.maintenance, color: STATUS_COLORS.maintenance },
    { name: 'محجوز', value: data.reserved, color: STATUS_COLORS.reserved },
  ];

  const occupancyRate = data.total > 0 
    ? Math.round((data.rented / data.total) * 100) 
    : 0;

  return (
    <ChartContainer
      title="توزيع حالة الأسطول"
      subtitle={`إجمالي: ${data.total} مركبة`}
      badge={{ 
        text: `${occupancyRate}% إشغال`, 
        trend: occupancyRate >= 70 ? 'up' : occupancyRate >= 50 ? 'neutral' : 'down' 
      }}
      isDark={isDark}
      delay={0.6}
    >
      <div className="flex flex-col items-center">
        <div style={{ width: 220, height: 220 }}>
          <PieChart width={220} height={220}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
              }}
            />
          </PieChart>
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full mt-4">
          {chartData.map((item) => (
            <div 
              key={item.name}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg",
                isDark ? "bg-slate-800/50" : "bg-slate-100"
              )}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <p className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  {item.name}
                </p>
                <p className={cn(
                  "text-sm font-bold",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartContainer>
  );
};

interface UtilizationChartProps {
  analytics: FleetAnalyticsSummary;
  isDark: boolean;
}

export const UtilizationChart: React.FC<UtilizationChartProps> = ({
  analytics,
  isDark,
}) => {
  const data = [
    {
      name: 'معدل الاستخدام',
      value: analytics.utilizationRate,
      fill: CHART_COLORS.violet,
    },
    {
      name: 'معدل الصيانة',
      value: analytics.maintenanceRate,
      fill: CHART_COLORS.amber,
    },
    {
      name: 'هامش الربح',
      value: analytics.profitMargin,
      fill: CHART_COLORS.emerald,
    },
  ];

  return (
    <ChartContainer
      title="مؤشرات الأداء الرئيسية"
      subtitle="النسب المئوية"
      isDark={isDark}
      delay={0.7}
    >
      <div className="flex flex-col items-center">
        {/* Chart */}
        <ResponsiveContainer width="100%" height={180}>
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="60%"
            outerRadius="100%"
            barSize={16}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background
              dataKey="value"
              cornerRadius={8}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Custom Legend - Below Chart */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-2 border-t border-neutral-100">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.fill }}
              />
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-neutral-600'}`}>
                {item.name}
              </span>
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                {item.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartContainer>
  );
};

interface TopVehiclesChartProps {
  vehicles: VehicleReportData[];
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

export const TopVehiclesChart: React.FC<TopVehiclesChartProps> = ({
  vehicles,
  isDark,
  formatCurrency,
}) => {
  const data = vehicles.slice(0, 8).map(v => ({
    name: v.plate_number,
    revenue: v.monthly_rate,
    make: `${v.make} ${v.model}`,
  }));

  return (
    <ChartContainer
      title="أفضل المركبات أداءً"
      subtitle="حسب الإيرادات الشهرية"
      badge={{ text: 'Top 8', trend: 'neutral' }}
      isDark={isDark}
      delay={0.8}
      className="lg:col-span-2"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis 
            type="number"
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            fontSize={12}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <YAxis 
            dataKey="name"
            type="category"
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            fontSize={11}
            width={70}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: 'none',
              borderRadius: '12px',
            }}
            formatter={(value: number) => [formatCurrency(value), 'الإيرادات']}
            labelFormatter={(label) => {
              const vehicle = data.find(d => d.name === label);
              return vehicle ? `${vehicle.make} (${label})` : label;
            }}
          />
          <Bar 
            dataKey="revenue" 
            fill={CHART_COLORS.cyan}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

interface MonthlyContractsChartProps {
  data: MonthlyRevenueData[];
  isDark: boolean;
}

export const MonthlyContractsChart: React.FC<MonthlyContractsChartProps> = ({
  data,
  isDark,
}) => (
  <ChartContainer
    title="العقود الشهرية"
    subtitle="عدد العقود الجديدة"
    isDark={isDark}
    delay={0.9}
  >
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
        <XAxis 
          dataKey="month"
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={11}
        />
        <YAxis 
          stroke={isDark ? '#9ca3af' : '#6b7280'}
          fontSize={11}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: 'none',
            borderRadius: '12px',
          }}
        />
        <Bar 
          dataKey="contracts" 
          fill={CHART_COLORS.indigo}
          radius={[4, 4, 0, 0]}
          name="العقود"
        />
      </BarChart>
    </ResponsiveContainer>
  </ChartContainer>
);

export default {
  RevenueChart,
  FleetStatusChart,
  UtilizationChart,
  TopVehiclesChart,
  MonthlyContractsChart,
};

