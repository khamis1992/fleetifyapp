/**
 * Navigation Badge Component
 * Displays notification badges on navigation items with animations
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NavBadgeData } from '@/types/mobile';

interface NavBadgeProps {
  /**
   * Badge data
   */
  badge: NavBadgeData;

  /**
   * Badge position
   */
  position?: 'top-right' | 'top-left' | 'inline';

  /**
   * Additional class names
   */
  className?: string;

  /**
   * Show tooltip on hover
   */
  showTooltip?: boolean;
}

export const NavBadge: React.FC<NavBadgeProps> = ({
  badge,
  position = 'top-right',
  className,
  showTooltip = true,
}) => {
  // Don't render if count is 0
  if (!badge.count || badge.count === 0) {
    return null;
  }

  // Display count with 99+ limit
  const displayCount = badge.count > 99 ? '99+' : badge.count.toString();

  // Variant-based styling
  const variantStyles = {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    warning: 'bg-warning text-warning-foreground',
    success: 'bg-success text-success-foreground',
  };

  const badgeVariant = badge.variant || 'default';
  const badgeStyle = variantStyles[badgeVariant];

  // Position-based classes
  const positionClasses = {
    'top-right': 'absolute -top-1 -right-1',
    'top-left': 'absolute -top-1 -left-1',
    'inline': 'relative',
  };

  const BadgeElement = (
    <div
      className={cn(
        'nav-badge',
        'flex items-center justify-center',
        'rounded-full',
        'text-xs font-bold',
        'shadow-lg',
        'min-w-[18px] h-[18px] px-1',
        'animate-in zoom-in-50 fade-in',
        'transition-all duration-200',
        badgeStyle,
        positionClasses[position],
        className
      )}
      style={{
        fontSize: displayCount.length > 2 ? '9px' : '10px',
      }}
    >
      {displayCount}
    </div>
  );

  // Wrap with tooltip if enabled and tooltip text exists
  if (showTooltip && badge.tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {BadgeElement}
          </TooltipTrigger>
          <TooltipContent>
            <p>{badge.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return BadgeElement;
};

/**
 * Badge Dot Component (smaller indicator)
 */
export const NavBadgeDot: React.FC<{
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  position?: 'top-right' | 'top-left';
  className?: string;
}> = ({ variant = 'destructive', position = 'top-right', className }) => {
  const variantStyles = {
    default: 'bg-primary',
    destructive: 'bg-destructive',
    warning: 'bg-warning',
    success: 'bg-success',
  };

  const positionClasses = {
    'top-right': 'absolute -top-0.5 -right-0.5',
    'top-left': 'absolute -top-0.5 -left-0.5',
  };

  return (
    <div
      className={cn(
        'nav-badge-dot',
        'w-2 h-2 rounded-full',
        'animate-in zoom-in-50 fade-in',
        'ring-2 ring-card',
        variantStyles[variant],
        positionClasses[position],
        className
      )}
    />
  );
};
