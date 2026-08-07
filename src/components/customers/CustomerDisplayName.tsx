import React from 'react';
import { Customer } from '@/types/customer';
import { Badge } from '@/components/ui/badge';
import { formatCustomerName } from '@/utils/formatCustomerName';

interface CustomerDisplayNameProps {
  customer: Customer;
  showStatus?: boolean;
  showBadges?: boolean;
  className?: string;
}

export const CustomerDisplayName: React.FC<CustomerDisplayNameProps> = ({
  customer,
  showStatus = false,
  showBadges = true,
  className = '',
}) => {
  const primaryName = formatCustomerName(customer);

  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" dir="auto">
          {primaryName}
        </div>
        {showStatus && customer.phone && (
          <div className="text-xs text-muted-foreground">
            {customer.phone}
          </div>
        )}
      </div>

      {showBadges && (
        <div className="flex gap-1 ml-2 flex-shrink-0">
          {customer.is_blacklisted && (
            <Badge variant="destructive" className="text-xs">
              محظور
            </Badge>
          )}
          {!customer.is_active && (
            <Badge variant="secondary" className="text-xs">
              غير نشط
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
          </Badge>
        </div>
      )}
    </div>
  );
};
