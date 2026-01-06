import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconGradient?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - Standardized page header with optional icon
 *
 * Usage:
 * <PageHeader title="Customers" description="Manage your customers" icon={Users} />
 * <PageHeader title="Settings" icon={Settings} actions={<Button>Save</Button>} />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  iconGradient = 'from-teal-500 to-teal-600',
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${iconGradient} shadow-lg shadow-teal-500/20`}>
            <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export default PageHeader;
