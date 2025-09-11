import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock,
  DollarSign,
  Car,
  Building2,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RealTimeAlert } from '@/hooks/useRealTimeAlerts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface NotificationItemProps {
  alert: RealTimeAlert;
  onDismiss: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  alert, 
  onDismiss 
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  const getIcon = () => {
    switch (alert.type) {
      case 'budget':
        return DollarSign;
      case 'vehicle':
        return Car;
      case 'property':
        return Building2;
      default:
        if (alert.severity === 'critical') return AlertCircle;
        if (alert.severity === 'high') return AlertTriangle;
        return Info;
    }
  };

  const getVariant = (): "default" | "destructive" => {
    return alert.severity === 'critical' ? 'destructive' : 'default';
  };

  const getSeverityBadge = () => {
    const variants = {
      critical: { variant: 'destructive' as const, label: 'حرج', color: 'text-destructive' },
      high: { variant: 'destructive' as const, label: 'عالي', color: 'text-orange-600' },
      medium: { variant: 'secondary' as const, label: 'متوسط', color: 'text-yellow-600' },
      low: { variant: 'outline' as const, label: 'منخفض', color: 'text-muted-foreground' }
    };
    
    return variants[alert.severity] || variants.medium;
  };

  const getTypeBadge = () => {
    const types = {
      budget: { label: 'موازنة', color: 'bg-destructive/10 text-destructive' },
      vehicle: { label: 'مركبة', color: 'bg-blue-500/10 text-blue-600' },
      property: { label: 'عقار', color: 'bg-green-500/10 text-green-600' },
      notification: { label: 'إشعار', color: 'bg-primary/10 text-primary' },
      smart: { label: 'ذكي', color: 'bg-purple-500/10 text-purple-600' },
      system: { label: 'نظام', color: 'bg-gray-500/10 text-gray-600' }
    };
    
    return types[alert.type] || types.notification;
  };

  const IconComponent = getIcon();
  const severityBadge = getSeverityBadge();
  const typeBadge = getTypeBadge();

  return (
    <Card className={`p-3 transition-all duration-200 hover:shadow-md border-l-4 ${
      alert.severity === 'critical' 
        ? 'border-l-destructive bg-destructive/5' 
        : alert.severity === 'high'
        ? 'border-l-orange-500 bg-orange-500/5'
        : 'border-l-primary/50'
    }`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`p-1.5 rounded-md flex-shrink-0 ${
              alert.severity === 'critical' 
                ? 'bg-destructive/10' 
                : alert.severity === 'high'
                ? 'bg-orange-500/10'
                : 'bg-primary/10'
            }`}>
              <IconComponent className={`h-4 w-4 ${
                alert.severity === 'critical' 
                  ? 'text-destructive' 
                  : alert.severity === 'high'
                  ? 'text-orange-600'
                  : 'text-primary'
              }`} />
            </div>
            
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-foreground leading-tight truncate">
                {alert.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {alert.message}
              </p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 w-6 p-0 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5">
          <Badge 
            variant={severityBadge.variant}
            className="text-xs px-2 py-0.5 h-5"
          >
            {severityBadge.label}
          </Badge>
          
          <Badge 
            variant="outline"
            className={`text-xs px-2 py-0.5 h-5 border-0 ${typeBadge.color}`}
          >
            {typeBadge.label}
          </Badge>
        </div>

        {/* Alert-specific data */}
        {alert.data && (
          <div className="space-y-1.5">
            {/* Budget Alert Data */}
            {alert.type === 'budget' && alert.data.percentage && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">نسبة التجاوز:</span>
                <Badge variant="outline" className="h-5 text-xs">
                  {alert.data.percentage.toFixed(1)}%
                </Badge>
                {alert.data.amount && (
                  <Badge variant="outline" className="h-5 text-xs">
                    {formatCurrency(alert.data.amount, { minimumFractionDigits: 0 })}
                  </Badge>
                )}
              </div>
            )}

            {/* Vehicle Alert Data */}
            {alert.type === 'vehicle' && alert.data.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>الاستحقاق: {new Date(alert.data.due_date).toLocaleDateString('ar-EG')}</span>
              </div>
            )}

            {/* Property Alert Data */}
            {alert.type === 'property' && (
              <div className="space-y-1">
                {alert.data.days_remaining !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>متبقي: {alert.data.days_remaining} يوم</span>
                  </div>
                )}
                {alert.data.amount && (
                  <Badge variant="outline" className="h-5 text-xs">
                    {formatCurrency(alert.data.amount, { minimumFractionDigits: 0 })}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{new Date(alert.created_at).toLocaleDateString('ar-EG', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>

          {/* Action Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            className="h-6 px-2 text-xs hover:bg-primary/10"
          >
            <CheckCircle className="h-3 w-3 ml-1" />
            تأكيد
          </Button>
        </div>
      </div>
    </Card>
  );
};