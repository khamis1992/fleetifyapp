import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';

export interface ActionButton {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link' | 'premium' | 'success' | 'warning';
  type?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

interface ResponsivePageActionsProps {
  title: string;
  subtitle?: string;
  primaryAction?: ActionButton;
  secondaryActions?: ActionButton[];
  className?: string;
  showMobileStack?: boolean;
}

export const ResponsivePageActions: React.FC<ResponsivePageActionsProps> = ({
  title,
  subtitle,
  primaryAction,
  secondaryActions = [],
  className,
  showMobileStack = true
}) => {
  const { isMobile } = useSimpleBreakpoint();

  const renderButton = (action: ActionButton, isPrimary: boolean = false) => {
    const baseClassName = isMobile 
      ? isPrimary 
        ? "w-full h-12 gap-3 rounded-xl shadow-lg font-medium text-base"
        : action.type === 'outline'
          ? "h-11 px-4 rounded-xl shadow-sm border-2 font-medium"
          : "flex-1 h-11 gap-2 rounded-xl font-medium"
      : isPrimary
        ? "gap-2"
        : action.type === 'outline'
          ? "size-sm"
          : "size-sm";

    return (
      <Button
        key={action.id}
        variant={action.variant || (isPrimary ? 'default' : action.type === 'outline' ? 'outline' : 'outline')}
        onClick={action.onClick}
        disabled={action.disabled || action.loading}
        className={cn(baseClassName, action.className)}
      >
        {action.loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          action.icon
        )}
        <span className={isMobile && !isPrimary ? "hidden sm:inline" : ""}>{action.label}</span>
      </Button>
    );
  };

  if (isMobile && showMobileStack) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Mobile Actions - Stacked */}
        <div className="space-y-3">
          {/* Primary Action */}
          {primaryAction && renderButton(primaryAction, true)}
          
          {/* Secondary Actions in Grid */}
          {secondaryActions.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {secondaryActions.map(action => renderButton(action, false))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {secondaryActions.map(action => renderButton(action, false))}
        {primaryAction && renderButton(primaryAction, true)}
      </div>
    </div>
  );
};

// Floating Action Button for Mobile
interface FloatingActionButtonProps {
  action: ActionButton;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  action,
  position = 'bottom-right',
  className
}) => {
  const positionClasses = {
    'bottom-right': 'fixed bottom-20 right-4',
    'bottom-left': 'fixed bottom-20 left-4', 
    'bottom-center': 'fixed bottom-20 left-1/2 transform -translate-x-1/2'
  };

  return (
    <Button
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={cn(
        "h-14 w-14 rounded-full shadow-2xl z-50 p-0",
        positionClasses[position],
        className
      )}
      variant={action.variant || 'default'}
    >
      {action.loading ? (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        action.icon
      )}
    </Button>
  );
};