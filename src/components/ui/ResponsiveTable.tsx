import * as React from 'react';
import { cn } from '@/lib/utils';


export interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveTable wraps the shadcn/ui Table in a horizontally scrolling container.
 * Use this for all data tables so they remain usable on mobile viewports.
 */
export const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative w-full overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveTable.displayName = 'ResponsiveTable';
