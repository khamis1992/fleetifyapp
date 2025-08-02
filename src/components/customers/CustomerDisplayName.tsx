import React from 'react';
import { Customer } from '@/types/customer';
import { Badge } from '@/components/ui/badge';

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
  className = ""
}) => {
  const getDisplayName = () => {
    if (customer.customer_type === 'individual') {
      // Prefer Arabic names if available, fallback to English
      const firstName = customer.first_name_ar || customer.first_name || '';
      const lastName = customer.last_name_ar || customer.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'غير محدد';
    } else {
      // For companies, prefer Arabic name if available
      return customer.company_name_ar || customer.company_name || 'غير محدد';
    }
  };

  const getSecondaryName = () => {
    if (customer.customer_type === 'individual') {
      // Show English name as secondary if Arabic is primary
      if (customer.first_name_ar || customer.last_name_ar) {
        const firstName = customer.first_name || '';
        const lastName = customer.last_name || '';
        const englishName = `${firstName} ${lastName}`.trim();
        return englishName !== getDisplayName() ? englishName : null;
      }
    } else {
      // For companies, show English name as secondary if Arabic is primary
      if (customer.company_name_ar && customer.company_name) {
        return customer.company_name !== customer.company_name_ar ? customer.company_name : null;
      }
    }
    return null;
  };

  const primaryName = getDisplayName();
  const secondaryName = getSecondaryName();

  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" dir="auto">
          {primaryName}
        </div>
        {secondaryName && (
          <div className="text-sm text-muted-foreground truncate" dir="auto">
            {secondaryName}
          </div>
        )}
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