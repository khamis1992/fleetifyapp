import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Star, TrendingUp, TrendingDown, Clock, Package, Loader2 } from 'lucide-react';
import { useVendorPerformanceMetrics } from '@/hooks/integrations/useVendorPurchaseOrders';

interface VendorPerformanceIndicatorProps {
  vendorId: string;
  variant?: 'compact' | 'detailed' | 'inline';
  className?: string;
}

/**
 * Vendor Performance Indicator Component
 *
 * Displays vendor performance metrics with visual indicators:
 * - Star rating (1-5 based on quality score)
 * - On-time delivery percentage
 * - Quality score
 * - Color-coded performance levels (green/yellow/red)
 *
 * Variants:
 * - compact: Star rating + tooltip
 * - detailed: Full metrics card
 * - inline: Horizontal badge layout
 */
export const VendorPerformanceIndicator: React.FC<VendorPerformanceIndicatorProps> = ({
  vendorId,
  variant = 'compact',
  className = '',
}) => {
  const { data: metrics, isLoading } = useVendorPerformanceMetrics(vendorId);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics || metrics.total_orders === 0) {
    return (
      <Badge variant="outline" className={className}>
        <span className="text-xs text-muted-foreground">لا توجد بيانات</span>
      </Badge>
    );
  }

  // Calculate performance level
  const getPerformanceLevel = (): 'excellent' | 'good' | 'average' | 'poor' => {
    if (metrics.on_time_delivery_rate >= 90) return 'excellent';
    if (metrics.on_time_delivery_rate >= 75) return 'good';
    if (metrics.on_time_delivery_rate >= 60) return 'average';
    return 'poor';
  };

  const performanceLevel = getPerformanceLevel();

  const getPerformanceColor = () => {
    switch (performanceLevel) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'average':
        return 'text-orange-600';
      case 'poor':
        return 'text-red-600';
    }
  };

  const getPerformanceBadgeVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (performanceLevel) {
      case 'excellent':
      case 'good':
        return 'default';
      case 'average':
        return 'secondary';
      case 'poor':
        return 'destructive';
    }
  };

  const getPerformanceLabel = () => {
    switch (performanceLevel) {
      case 'excellent':
        return 'ممتاز';
      case 'good':
        return 'جيد';
      case 'average':
        return 'متوسط';
      case 'poor':
        return 'ضعيف';
    }
  };

  // Star rating component
  const StarRating = ({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' | 'lg' }) => {
    const stars = Math.round(score);
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Compact variant - Star rating with tooltip
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 cursor-pointer ${className}`}>
              <StarRating score={metrics.quality_score} />
              <span className={`text-xs font-medium ${getPerformanceColor()}`}>
                {metrics.quality_score.toFixed(1)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div className="font-medium border-b pb-1">أداء المورد</div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">إجمالي الطلبات:</span>
                <span className="font-medium">{metrics.total_orders}</span>

                <span className="text-muted-foreground">التسليم في الوقت:</span>
                <span className="font-medium">{metrics.on_time_delivery_rate.toFixed(0)}%</span>

                <span className="text-muted-foreground">متوسط أيام التسليم:</span>
                <span className="font-medium">{metrics.avg_delivery_days.toFixed(0)} يوم</span>

                <span className="text-muted-foreground">تقييم الجودة:</span>
                <span className="font-medium">{metrics.quality_score.toFixed(1)}/5</span>

                <span className="text-muted-foreground">المستوى:</span>
                <span className={`font-medium ${getPerformanceColor()}`}>
                  {getPerformanceLabel()}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inline variant - Horizontal badges
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <Badge variant={getPerformanceBadgeVariant()} className="text-xs">
          {getPerformanceLabel()}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{metrics.on_time_delivery_rate.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Package className="h-3 w-3" />
          <span>{metrics.total_orders} طلب</span>
        </div>
        <StarRating score={metrics.quality_score} size="sm" />
      </div>
    );
  }

  // Detailed variant - Full metrics card
  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">أداء المورد</h3>
            <p className="text-xs text-muted-foreground">
              {metrics.vendor_name_ar || metrics.vendor_name}
            </p>
          </div>
          <Badge variant={getPerformanceBadgeVariant()}>{getPerformanceLabel()}</Badge>
        </div>

        {/* Star Rating */}
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-sm text-muted-foreground">التقييم الإجمالي</span>
          <div className="flex items-center gap-2">
            <StarRating score={metrics.quality_score} size="md" />
            <span className={`text-lg font-bold ${getPerformanceColor()}`}>
              {metrics.quality_score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* On-time Delivery */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>التسليم في الوقت</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">
                {metrics.on_time_delivery_rate.toFixed(0)}%
              </span>
              {metrics.on_time_delivery_rate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.on_time_delivery_count} من {metrics.on_time_delivery_count + metrics.late_delivery_count} طلب
            </p>
          </div>

          {/* Total Orders */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              <span>إجمالي الطلبات</span>
            </div>
            <div className="text-2xl font-bold">{metrics.total_orders}</div>
            <p className="text-xs text-muted-foreground">
              بقيمة {(metrics.total_amount / 1000).toFixed(1)} ألف ر.ق
            </p>
          </div>
        </div>

        {/* Delivery Performance */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">متوسط مدة التسليم</span>
            <span className="font-medium">{metrics.avg_delivery_days.toFixed(0)} يوم</span>
          </div>
          {metrics.last_order_date && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">آخر طلب</span>
              <span className="font-medium">
                {new Date(metrics.last_order_date).toLocaleDateString('ar-SA')}
              </span>
            </div>
          )}
        </div>

        {/* Performance Breakdown */}
        <div className="flex gap-2 text-xs">
          <div className="flex-1 text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-700">{metrics.on_time_delivery_count}</div>
            <div className="text-muted-foreground">في الوقت</div>
          </div>
          <div className="flex-1 text-center p-2 bg-red-50 rounded">
            <div className="font-bold text-red-700">{metrics.late_delivery_count}</div>
            <div className="text-muted-foreground">متأخر</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Simple star rating display
 */
export const VendorStars: React.FC<{
  vendorId: string;
  showScore?: boolean;
}> = ({ vendorId, showScore = false }) => {
  const { data: metrics, isLoading } = useVendorPerformanceMetrics(vendorId);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!metrics || metrics.total_orders === 0) {
    return <span className="text-xs text-muted-foreground">لا توجد بيانات</span>;
  }

  const stars = Math.round(metrics.quality_score);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {showScore && (
        <span className="text-xs text-muted-foreground">
          ({metrics.quality_score.toFixed(1)})
        </span>
      )}
    </div>
  );
};
