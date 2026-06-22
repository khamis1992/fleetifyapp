import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, AlertTriangle, Bell, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecommendedAction } from '@/utils/delinquency-calculations';

interface RecommendedActionBadgeProps {
  action: RecommendedAction;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RecommendedActionBadge: React.FC<RecommendedActionBadgeProps> = ({
  action,
  showIcon = true,
  size = 'md',
  className,
}) => {
  // Get icon based on action
  const getIcon = () => {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
    
    switch (action.action) {
      case 'BLACKLIST_AND_FILE_CASE':
        return <AlertCircle className={`h-${iconSize} w-${iconSize}`} />;
      case 'FILE_LEGAL_CASE':
        return <FileText className={`h-${iconSize} w-${iconSize}`} />;
      case 'SEND_FORMAL_NOTICE':
        return <AlertTriangle className={`h-${iconSize} w-${iconSize}`} />;
      case 'SEND_WARNING':
        return <Bell className={`h-${iconSize} w-${iconSize}`} />;
      case 'MONITOR':
        return <Eye className={`h-${iconSize} w-${iconSize}`} />;
      default:
        return null;
    }
  };

  // Get variant based on priority
  const getVariant = (): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (action.priority) {
      case 'CRITICAL':
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
      default:
        return 'outline';
    }
  };

  // Get size classes
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-base px-4 py-2';
      case 'md':
      default:
        return 'text-sm px-3 py-1.5';
    }
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        'flex items-center gap-1.5 font-medium',
        getSizeClass(),
        className
      )}
    >
      {showIcon && getIcon()}
      <span>{action.label}</span>
    </Badge>
  );
};

export default RecommendedActionBadge;
