import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  hover?: boolean;
}

/**
 * GlassCard - Reusable glass-morphism card component
 *
 * Usage:
 * <GlassCard>Content</GlassCard>
 * <GlassCard hover>Clickable card</GlassCard>
 * <GlassCard noPadding>Custom padding content</GlassCard>
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  noPadding = false,
  hover = false,
}) => {
  return (
    <div
      className={cn(
        'bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl transition-all duration-300 shadow-sm',
        hover && 'hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 cursor-pointer',
        !noPadding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
};

export default GlassCard;
