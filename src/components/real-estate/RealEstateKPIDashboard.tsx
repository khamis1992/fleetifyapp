import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  DollarSign,
  Users,
  Home,
  AlertTriangle
} from 'lucide-react';

interface KPIData {
  totalRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
  averageRent: number;
  customerSatisfaction: number;
  maintenanceRequests: number;
  renewalRate: number;
  collectionRate: number;
}

interface RealEstateKPIDashboardProps {
  data?: KPIData;
  isLoading?: boolean;
}

const RealEstateKPIDashboard: React.FC<RealEstateKPIDashboardProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity size={16} />
            مؤشرات الأداء الرئيسية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-2 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default data for demonstration
  const kpiData = data || {
    totalRevenue: 125000,
    revenueGrowth: 8.5,
    occupancyRate: 85,
    averageRent: 2500,
    customerSatisfaction: 4.2,
    maintenanceRequests: 12,
    renewalRate: 78,
    collectionRate: 95
  };

  const kpis = [
    {
      title: 'نمو الإيرادات',
      value: `${kpiData.revenueGrowth}%`,
      target: 10,
      current: kpiData.revenueGrowth,
      icon: TrendingUp,
      color: kpiData.revenueGrowth >= 5 ? 'text-green-600' : 'text-red-600',
      bgColor: kpiData.revenueGrowth >= 5 ? 'bg-green-100' : 'bg-red-100',
      trend: kpiData.revenueGrowth >= 5 ? 'positive' : 'negative'
    },
    {
      title: 'نسبة الإشغال',
      value: `${kpiData.occupancyRate}%`,
      target: 90,
      current: kpiData.occupancyRate,
      icon: Home,
      color: kpiData.occupancyRate >= 80 ? 'text-green-600' : 'text-yellow-600',
      bgColor: kpiData.occupancyRate >= 80 ? 'bg-green-100' : 'bg-yellow-100',
      trend: kpiData.occupancyRate >= 80 ? 'positive' : 'warning'
    },
    {
      title: 'معدل التحصيل',
      value: `${kpiData.collectionRate}%`,
      target: 95,
      current: kpiData.collectionRate,
      icon: DollarSign,
      color: kpiData.collectionRate >= 90 ? 'text-green-600' : 'text-red-600',
      bgColor: kpiData.collectionRate >= 90 ? 'bg-green-100' : 'bg-red-100',
      trend: kpiData.collectionRate >= 90 ? 'positive' : 'negative'
    },
    {
      title: 'معدل التجديد',
      value: `${kpiData.renewalRate}%`,
      target: 80,
      current: kpiData.renewalRate,
      icon: Users,
      color: kpiData.renewalRate >= 75 ? 'text-green-600' : 'text-yellow-600',
      bgColor: kpiData.renewalRate >= 75 ? 'bg-green-100' : 'bg-yellow-100',
      trend: kpiData.renewalRate >= 75 ? 'positive' : 'warning'
    },
    {
      title: 'رضا العملاء',
      value: `${kpiData.customerSatisfaction}/5`,
      target: 4.5,
      current: kpiData.customerSatisfaction,
      icon: Users,
      color: kpiData.customerSatisfaction >= 4 ? 'text-green-600' : 'text-yellow-600',
      bgColor: kpiData.customerSatisfaction >= 4 ? 'bg-green-100' : 'bg-yellow-100',
      trend: kpiData.customerSatisfaction >= 4 ? 'positive' : 'warning'
    },
    {
      title: 'طلبات الصيانة',
      value: `${kpiData.maintenanceRequests}`,
      target: 5,
      current: kpiData.maintenanceRequests,
      icon: AlertTriangle,
      color: kpiData.maintenanceRequests <= 10 ? 'text-green-600' : 'text-red-600',
      bgColor: kpiData.maintenanceRequests <= 10 ? 'bg-green-100' : 'bg-red-100',
      trend: kpiData.maintenanceRequests <= 10 ? 'positive' : 'negative',
      inverse: true // Lower is better
    },
    {
      title: 'متوسط الإيجار',
      value: `${kpiData.averageRent.toLocaleString()} ر.س`,
      target: 3000,
      current: kpiData.averageRent,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: 'neutral'
    },
    {
      title: 'الأداء العام',
      value: '85%',
      target: 90,
      current: 85,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: 'positive'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity size={16} />
            مؤشرات الأداء الرئيسية
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => {
              const progress = kpi.inverse 
                ? Math.max(0, 100 - (kpi.current / kpi.target) * 100)
                : (kpi.current / kpi.target) * 100;
              
              return (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Card className="border-border/50 hover:shadow-md transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                          <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                        </div>
                        <Badge 
                          variant={kpi.trend === 'positive' ? 'default' : kpi.trend === 'warning' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {kpi.trend === 'positive' ? (
                            <TrendingUp size={10} className="mr-1" />
                          ) : kpi.trend === 'negative' ? (
                            <TrendingDown size={10} className="mr-1" />
                          ) : (
                            <Activity size={10} className="mr-1" />
                          )}
                          {progress.toFixed(0)}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {kpi.title}
                        </h4>
                        <div className={`text-xl font-bold ${kpi.color}`}>
                          {kpi.value}
                        </div>
                        
                        <div className="space-y-1">
                          <Progress 
                            value={Math.min(progress, 100)} 
                            className="h-1.5"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>الحالي</span>
                            <span>الهدف: {kpi.target}{kpi.title.includes('رضا') ? '/5' : kpi.title.includes('طلبات') ? '' : kpi.title.includes('متوسط') ? ' ر.س' : '%'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Summary Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 p-4 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target size={16} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">الأداء العام للمحفظة</h4>
                  <p className="text-sm text-muted-foreground">
                    {kpis.filter(k => k.trend === 'positive').length} من {kpis.length} مؤشرات تحقق الأهداف
                  </p>
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                ممتاز
              </Badge>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RealEstateKPIDashboard;