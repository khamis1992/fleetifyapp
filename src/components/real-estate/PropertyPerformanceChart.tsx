import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Home,
  DollarSign,
  Activity
} from 'lucide-react';
import { PropertyStats } from '@/modules/properties/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface PropertyPerformanceChartProps {
  stats?: PropertyStats;
  isLoading?: boolean;
}

const PropertyPerformanceChart: React.FC<PropertyPerformanceChartProps> = ({
  stats,
  isLoading = false,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const [activeChart, setActiveChart] = React.useState<'revenue' | 'types' | 'trends'>('revenue');

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={16} />
            تحليل أداء العقارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={16} />
            تحليل أداء العقارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد بيانات لعرضها</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for revenue chart
  const revenueData = [
    { name: 'يناير', revenue: 85000, target: 90000 },
    { name: 'فبراير', revenue: 92000, target: 90000 },
    { name: 'مارس', revenue: 78000, target: 90000 },
    { name: 'أبريل', revenue: 95000, target: 90000 },
    { name: 'مايو', revenue: 88000, target: 90000 },
    { name: 'يونيو', revenue: stats.total_monthly_rent, target: 90000 }
  ];

  // Prepare data for property types chart
  const typeData = stats.properties_by_type ? Object.entries(stats.properties_by_type).map(([type, count]) => {
    const typeLabels: Record<string, string> = {
      apartment: 'شقق',
      villa: 'فلل',
      office: 'مكاتب',
      shop: 'محلات',
      warehouse: 'مستودعات',
      land: 'أراضي'
    };
    
    return {
      name: typeLabels[type] || type,
      value: count,
      color: getTypeColor(type)
    };
  }).filter(item => item.value > 0) : [];

  // Prepare data for trends chart
  const trendData = [
    { month: 'يناير', occupancy: 78, rent: 2300 },
    { month: 'فبراير', occupancy: 82, rent: 2350 },
    { month: 'مارس', occupancy: 75, rent: 2250 },
    { month: 'أبريل', occupancy: 88, rent: 2400 },
    { month: 'مايو', occupancy: 85, rent: 2380 },
    { month: 'يونيو', occupancy: stats.occupancy_rate, rent: stats.average_rent_per_sqm }
  ];

  function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      apartment: '#3b82f6',
      villa: '#10b981',
      office: '#f59e0b',
      shop: '#ef4444',
      warehouse: '#8b5cf6',
      land: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  }

  const chartTabs = [
    { id: 'revenue', label: 'الإيرادات', icon: DollarSign },
    { id: 'types', label: 'أنواع العقارات', icon: PieChartIcon },
    { id: 'trends', label: 'الاتجاهات', icon: TrendingUp }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 size={16} />
              تحليل أداء العقارات
            </CardTitle>
            
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {chartTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeChart === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveChart(tab.id as any)}
                  className="h-8 text-xs"
                >
                  <tab.icon size={12} className="mr-1" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Chart Summary */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Home size={14} className="text-muted-foreground" />
              <span className="text-sm">إجمالي العقارات: {stats.total_properties}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-green-600" />
              <span className="text-sm">مؤجر: {stats.rented_properties}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-blue-600" />
              <span className="text-sm">إيراد: {formatCurrency(stats.total_monthly_rent)}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <motion.div
            key={activeChart}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-80"
          >
            {activeChart === 'revenue' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    name="الإيرادات الفعلية"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="target" 
                    name="الهدف المطلوب"
                    fill="hsl(var(--muted-foreground))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.3}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'types' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'trends' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="occupancy"
                    name="نسبة الإشغال (%)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rent"
                    name="متوسط الإيجار"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Chart Insights */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-4 pt-4 border-t border-border/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-sm font-medium text-green-600">أفضل شهر</div>
                <div className="text-xs text-muted-foreground">أبريل - {formatCurrency(95000)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-blue-600">متوسط النمو</div>
                <div className="text-xs text-muted-foreground">+5.2% شهرياً</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-purple-600">أعلى نوع</div>
                <div className="text-xs text-muted-foreground">
                  {typeData.length > 0 ? typeData[0].name : 'شقق'}
                </div>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyPerformanceChart;