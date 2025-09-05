import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveCard, ResponsiveCardContent } from '@/components/ui/responsive-card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileContractsStatsProps {
  activeCount: number;
  draftCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export const MobileContractsStats: React.FC<MobileContractsStatsProps> = ({
  activeCount,
  draftCount,
  cancelledCount,
  totalRevenue
}) => {
  const stats = [
    {
      title: 'عقود نشطة',
      value: activeCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: '+12%'
    },
    {
      title: 'مسودات',
      value: draftCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      trend: '+5%'
    },
    {
      title: 'ملغية',
      value: cancelledCount,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      trend: '-8%'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Revenue Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ResponsiveCard variant="elevated" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          <ResponsiveCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  إجمالي الإيرادات
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-300" />
                  <span className="text-xs text-green-300">+15% هذا الشهر</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </ResponsiveCardContent>
        </ResponsiveCard>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ResponsiveCard 
              variant="outlined" 
              className={cn(
                "relative overflow-hidden",
                stat.bgColor,
                stat.borderColor
              )}
            >
              <ResponsiveCardContent className="p-3">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    "bg-white/80"
                  )}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {stat.title}
                    </p>
                  </div>

                  {stat.trend && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs px-2 py-0 border-0",
                        stat.trend.startsWith('+') 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {stat.trend}
                    </Badge>
                  )}
                </div>
              </ResponsiveCardContent>
            </ResponsiveCard>
          </motion.div>
        ))}
      </div>

      {/* Quick Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <ResponsiveCard variant="outlined" className="bg-amber-50 border-amber-200">
          <ResponsiveCardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  تنبيه هام
                </h4>
                <p className="text-xs text-amber-700">
                  لديك {activeCount > 10 ? '3' : '1'} عقود تحتاج إلى متابعة قريباً
                </p>
              </div>
            </div>
          </ResponsiveCardContent>
        </ResponsiveCard>
      </motion.div>
    </div>
  );
};