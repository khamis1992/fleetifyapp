import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

export interface DataCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  children,
  action,
  className,
  onClick,
}) => {
  return (
    <Card
      className={cn('overflow-hidden', onClick && 'cursor-pointer hover:border-teal-300 transition-colors', className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && <CardTitle className="text-base font-semibold truncate">{title}</CardTitle>}
            {subtitle && <CardDescription className="text-sm line-clamp-2">{subtitle}</CardDescription>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-3">{children}</div>}
      </CardContent>
    </Card>
  );
};
