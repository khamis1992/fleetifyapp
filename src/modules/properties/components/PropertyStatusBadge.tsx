import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  KeyRound, 
  DollarSign, 
  Wrench,
  Clock,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { PropertyStatus } from '../types';

interface PropertyStatusBadgeProps {
  status: PropertyStatus;
  size?: 'sm' | 'default';
}

export const PropertyStatusBadge: React.FC<PropertyStatusBadgeProps> = ({ 
  status, 
  size = 'default' 
}) => {
  const getStatusConfig = (status: PropertyStatus) => {
    switch (status) {
      case 'available':
        return {
          label: 'متاح',
          icon: Home,
          className: 'bg-success text-success-foreground hover:bg-success/90'
        };
      case 'rented':
        return {
          label: 'مؤجر',
          icon: KeyRound,
          className: 'bg-primary text-primary-foreground hover:bg-primary/90'
        };
      case 'for_sale':
        return {
          label: 'للبيع',
          icon: DollarSign,
          className: 'bg-warning text-warning-foreground hover:bg-warning/90'
        };
      case 'maintenance':
        return {
          label: 'تحت الصيانة',
          icon: Wrench,
          className: 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
        };
      case 'reserved':
        return {
          label: 'محجوز',
          icon: Clock,
          className: 'bg-muted text-muted-foreground hover:bg-muted/90'
        };
      case 'sold':
        return {
          label: 'مباع',
          icon: CheckCircle,
          className: 'bg-success text-success-foreground hover:bg-success/90'
        };
      default:
        return {
          label: status,
          icon: Home,
          className: 'bg-muted text-muted-foreground hover:bg-muted/90'
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge 
      className={`${config.className} gap-1 ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}
    >
      <IconComponent className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </Badge>
  );
};