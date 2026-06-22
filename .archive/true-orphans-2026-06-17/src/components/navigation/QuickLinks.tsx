/**
 * Quick Links Component
 * Provides contextual quick navigation between related entities
 * Used in customer, contract, and vehicle detail pages
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  User, 
  Car, 
  DollarSign, 
  Receipt, 
  Calendar,
  ExternalLink,
  ChevronLeft,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
interface QuickLinkItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  count?: number;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface QuickLinksProps {
  /** Type of entity for contextual links */
  entityType: 'customer' | 'contract' | 'vehicle' | 'invoice';
  /** Entity ID */
  entityId: string;
  /** Related data for counts */
  relatedData?: {
    contractsCount?: number;
    invoicesCount?: number;
    paymentsCount?: number;
    maintenanceCount?: number;
    violationsCount?: number;
  };
  /** Custom links */
  customLinks?: QuickLinkItem[];
  /** Compact mode */
  compact?: boolean;
  /** Show as card */
  showCard?: boolean;
}

// Link configurations by entity type
const getLinksByEntity = (
  entityType: string, 
  entityId: string,
  relatedData?: QuickLinksProps['relatedData']
): QuickLinkItem[] => {
  switch (entityType) {
    case 'customer':
      return [
        {
          id: 'contracts',
          label: 'العقود',
          href: `/contracts?customer=${entityId}`,
          icon: FileText,
          count: relatedData?.contractsCount,
        },
        {
          id: 'invoices',
          label: 'الفواتير',
          href: `/finance/invoices?customer=${entityId}`,
          icon: Receipt,
          count: relatedData?.invoicesCount,
        },
        {
          id: 'payments',
          label: 'المدفوعات',
          href: `/finance/payments?customer=${entityId}`,
          icon: DollarSign,
          count: relatedData?.paymentsCount,
        },
        {
          id: 'new-contract',
          label: 'عقد جديد',
          href: `/contracts?action=create&customer=${entityId}`,
          icon: FileText,
          badge: 'إجراء',
          badgeVariant: 'secondary',
        },
      ];

    case 'contract':
      return [
        {
          id: 'customer',
          label: 'العميل',
          href: `/customers/${entityId}`,
          icon: User,
        },
        {
          id: 'vehicle',
          label: 'المركبة',
          href: `/fleet/vehicles/${entityId}`,
          icon: Car,
        },
        {
          id: 'invoices',
          label: 'الفواتير',
          href: `/finance/invoices?contract=${entityId}`,
          icon: Receipt,
          count: relatedData?.invoicesCount,
        },
        {
          id: 'payments',
          label: 'المدفوعات',
          href: `/finance/payments?contract=${entityId}`,
          icon: DollarSign,
          count: relatedData?.paymentsCount,
        },
        {
          id: 'renew',
          label: 'تجديد العقد',
          href: `/contracts?action=renew&contract=${entityId}`,
          icon: Calendar,
          badge: 'إجراء',
          badgeVariant: 'secondary',
        },
      ];

    case 'vehicle':
      return [
        {
          id: 'contracts',
          label: 'العقود',
          href: `/contracts?vehicle=${entityId}`,
          icon: FileText,
          count: relatedData?.contractsCount,
        },
        {
          id: 'maintenance',
          label: 'الصيانة',
          href: `/fleet/maintenance?vehicle=${entityId}`,
          icon: Clock,
          count: relatedData?.maintenanceCount,
        },
        {
          id: 'violations',
          label: 'المخالفات',
          href: `/fleet/traffic-violations?vehicle=${entityId}`,
          icon: AlertTriangle,
          count: relatedData?.violationsCount,
        },
        {
          id: 'new-contract',
          label: 'تأجير المركبة',
          href: `/contracts?action=create&vehicle=${entityId}`,
          icon: FileText,
          badge: 'إجراء',
          badgeVariant: 'secondary',
        },
      ];

    case 'invoice':
      return [
        {
          id: 'customer',
          label: 'العميل',
          href: `/customers/${entityId}`,
          icon: User,
        },
        {
          id: 'contract',
          label: 'العقد',
          href: `/contracts/${entityId}`,
          icon: FileText,
        },
        {
          id: 'payments',
          label: 'المدفوعات',
          href: `/finance/payments?invoice=${entityId}`,
          icon: DollarSign,
          count: relatedData?.paymentsCount,
        },
        {
          id: 'new-payment',
          label: 'تسجيل دفعة',
          href: `/finance/payments/quick?invoice=${entityId}`,
          icon: DollarSign,
          badge: 'إجراء',
          badgeVariant: 'secondary',
        },
      ];

    default:
      return [];
  }
};

// Quick Link Button Component
const QuickLinkButton: React.FC<{
  item: QuickLinkItem;
  compact?: boolean;
  onClick: () => void;
}> = ({ item, compact, onClick }) => {
  const Icon = item.icon;

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="flex items-center gap-2 h-8"
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm">{item.label}</span>
        {item.count !== undefined && (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {item.count}
          </Badge>
        )}
        {item.badge && (
          <Badge variant={item.badgeVariant || 'default'} className="text-xs">
            {item.badge}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        'bg-white hover:bg-neutral-50 transition-colors',
        'text-right w-full group'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
          <Icon className="h-4 w-4 text-neutral-600" />
        </div>
        <div>
          <span className="text-sm font-medium text-neutral-900">{item.label}</span>
          {item.count !== undefined && (
            <span className="text-xs text-neutral-500 block">{item.count} عنصر</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.badge && (
          <Badge variant={item.badgeVariant || 'default'} className="text-xs">
            {item.badge}
          </Badge>
        )}
        <ChevronLeft className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
      </div>
    </button>
  );
};

// Main Component
export const QuickLinks: React.FC<QuickLinksProps> = ({
  entityType,
  entityId,
  relatedData,
  customLinks,
  compact = false,
  showCard = true,
}) => {
  const navigate = useNavigate();
  
  const links = customLinks || getLinksByEntity(entityType, entityId, relatedData);

  const handleClick = (href: string) => {
    navigate(href);
  };

  const content = (
    <div className={cn(
      compact ? 'flex flex-wrap gap-2' : 'space-y-2'
    )}>
      {links.map((item) => (
        <QuickLinkButton
          key={item.id}
          item={item}
          compact={compact}
          onClick={() => handleClick(item.href)}
        />
      ))}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          روابط سريعة
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default QuickLinks;

