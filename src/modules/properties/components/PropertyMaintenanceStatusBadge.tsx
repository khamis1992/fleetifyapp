import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Wrench, CheckCircle, XCircle, Pause, Calendar } from 'lucide-react';
import { PropertyMaintenanceStatus } from '../types';

interface PropertyMaintenanceStatusBadgeProps {
  status: PropertyMaintenanceStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig = {
  pending: {
    label: 'معلق',
    variant: 'secondary' as const,
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  scheduled: {
    label: 'مجدول',
    variant: 'outline' as const,
    icon: Calendar,
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  in_progress: {
    label: 'قيد التنفيذ',
    variant: 'default' as const,
    icon: Wrench,
    className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  },
  completed: {
    label: 'مكتمل',
    variant: 'secondary' as const,
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  cancelled: {
    label: 'ملغي',
    variant: 'secondary' as const,
    icon: XCircle,
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  on_hold: {
    label: 'متوقف',
    variant: 'secondary' as const,
    icon: Pause,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
};

export const PropertyMaintenanceStatusBadge: React.FC<PropertyMaintenanceStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (!config) {
    return (
      <Badge variant="outline" className="gap-1">
        {showIcon && <XCircle className="h-3 w-3" />}
        غير محدد
      </Badge>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge 
      variant={config.variant}
      className={`gap-1 ${config.className} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};