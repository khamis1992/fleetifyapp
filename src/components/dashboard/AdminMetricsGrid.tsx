import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  Zap,
  Activity,
  BarChart3
} from 'lucide-react';

interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  category: 'financial' | 'operational' | 'growth' | 'efficiency';
  description?: string;
}

interface AdminMetricsGridProps {
  metrics?: MetricData[];
  loading?: boolean;
}

const AdminMetricsGrid: React.FC<AdminMetricsGridProps> = ({ 
  metrics = [], 
  loading = false 
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign;
      case 'operational': return Activity;
      case 'growth': return TrendingUp;
      case 'efficiency': return Zap;
      default: return BarChart3;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'bg-primary/10 text-primary border-primary/20';
      case 'operational': return 'bg-accent/10 text-accent-foreground border-accent/20';
      case 'growth': return 'bg-success/10 text-success border-success/20';
      case 'efficiency': return 'bg-warning/10 text-warning-foreground border-warning/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-glass backdrop-blur-sm border-0 shadow-glass">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            المؤشرات التنفيذية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultMetrics: MetricData[] = [
    {
      id: '1',
      title: 'الإيرادات الشهرية',
      value: '125,450 د.ك',
      change: '+12.5%',
      trend: 'up',
      category: 'financial',
      description: 'مقارنة بالشهر السابق'
    },
    {
      id: '2',
      title: 'العملاء النشطين',
      value: '2,847',
      change: '+8.3%',
      trend: 'up',
      category: 'operational',
      description: 'عميل مسجل ونشط'
    },
    {
      id: '3',
      title: 'معدل النمو',
      value: '18.7%',
      change: '+2.1%',
      trend: 'up',
      category: 'growth',
      description: 'نمو ربع سنوي'
    },
    {
      id: '4',
      title: 'كفاءة العمليات',
      value: '94.2%',
      change: '+1.8%',
      trend: 'up',
      category: 'efficiency',
      description: 'معدل الأداء'
    }
  ];

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  return (
    <Card className="bg-gradient-glass backdrop-blur-sm border-0 shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            المؤشرات التنفيذية
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            تحديث مباشر
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayMetrics.map((metric, index) => {
            const CategoryIcon = getCategoryIcon(metric.category);
            
            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="group"
              >
                <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${getCategoryColor(metric.category)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <CategoryIcon size={18} />
                    <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(metric.trend)}`}>
                      {metric.trend === 'up' ? (
                        <TrendingUp size={14} />
                      ) : metric.trend === 'down' ? (
                        <TrendingDown size={14} />
                      ) : (
                        <Activity size={14} />
                      )}
                      {metric.change}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1 opacity-80">
                      {metric.title}
                    </h4>
                    <div className="text-2xl font-bold mb-1">
                      {metric.value}
                    </div>
                    {metric.description && (
                      <p className="text-xs opacity-70">
                        {metric.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMetricsGrid;