import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  noPadding = false,
  hover = false,
}) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-300 shadow-sm',
        hover && 'hover:border-teal-500/50 hover:shadow-md cursor-pointer',
        !noPadding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
};

export default GlassCard;
