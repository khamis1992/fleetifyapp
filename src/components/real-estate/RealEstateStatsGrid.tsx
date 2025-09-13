import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Home, 
  TrendingUp, 
  DollarSign, 
  Building,
  AlertTriangle,
  Calendar,
  Percent,
  MapPin
} from 'lucide-react';
import { PropertyStats } from '@/modules/properties/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface RealEstateStatsGridProps {
  stats?: PropertyStats;
  alerts?: any[];
  isLoading?: boolean;
}

const RealEstateStatsGrid: React.FC<RealEstateStatsGridProps> = ({
  stats,
  alerts = [],
  isLoading = false,
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Alerts skeleton */}
        <div className="h-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!stats) return null;

  const occupancyRate = stats.total_properties > 0 
    ? ((stats.rented_properties / stats.total_properties) * 100).toFixed(1)
    : '0';

  const mainStats = [
    {
      title: 'إجمالي العقارات',
      value: stats.total_properties,
      icon: Home,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'عقار مسجل'
    },
    {
      title: 'العقارات المؤجرة',
      value: stats.rented_properties,
      icon: Building,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: `${occupancyRate}% نسبة الإشغال`,
      trend: occupancyRate
    },
    {
      title: 'الإيرادات الشهرية',
      value: formatCurrency(stats.total_monthly_rent),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      description: 'إيراد متوقع'
    },
    {
      title: 'العقارات المتاحة',
      value: stats.available_properties,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'متاح للإيجار'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Alert className="border-yellow-200 bg-yellow-50/50 backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              يوجد {alerts.length} تنبيه يحتاج إلى متابعة
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <motion.div 
                  className={`p-2 rounded-lg ${stat.bgColor}`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </motion.div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {stat.description}
                  {stat.trend && (
                    <Badge variant="secondary" className="text-xs">
                      {stat.trend}%
                    </Badge>
                  )}
                </p>
                {stat.trend && (
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${stat.color.replace('text-', 'bg-')} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.trend}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Occupancy Rate Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                نسبة الإشغال
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{occupancyRate}%</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>مؤجر: {stats.rented_properties}</span>
                  <span>متاح: {stats.available_properties}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${occupancyRate}%` }}
                    transition={{ duration: 1.2, delay: 0.5 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Average Rent Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                متوسط سعر المتر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {formatCurrency(stats.average_rent_per_sqm)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(1).replace(/[0-9.,\s]/g, '').trim()} / م²
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Property Types Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                أنواع العقارات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.properties_by_type && Object.entries(stats.properties_by_type)
                  .slice(0, 3)
                  .map(([type, count]) => {
                    const typeLabels: Record<string, string> = {
                      apartment: 'شقق',
                      villa: 'فلل',
                      office: 'مكاتب',
                      shop: 'محلات',
                    };
                    
                    return (
                      <div key={type} className="flex justify-between items-center text-xs">
                        <span>{typeLabels[type] || type}</span>
                        <Badge variant="outline" className="text-xs">{count}</Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RealEstateStatsGrid;