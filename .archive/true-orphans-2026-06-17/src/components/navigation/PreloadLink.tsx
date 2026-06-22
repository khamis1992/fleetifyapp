/**
 * PreloadLink Component
 * 
 * Enhanced Link component that preloads routes on hover/focus
 * for improved perceived performance.
 */

import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useRoutePreload } from '@/utils/routePreloading';
import { cn } from '@/lib/utils';

interface PreloadLinkProps extends LinkProps {
  /**
   * Enable/disable preloading (default: true)
   */
  preload?: boolean;
  
  /**
   * Delay before preloading in ms (default: 0)
   */
  preloadDelay?: number;
  
  children: React.ReactNode;
}

/**
 * PreloadLink - Automatically preloads route on hover/focus
 * 
 * @example
 * ```tsx
 * <PreloadLink to="/finance">Finance</PreloadLink>
 * ```
 */
export const PreloadLink: React.FC<PreloadLinkProps> = ({
  to,
  preload = true,
  preloadDelay = 0,
  className,
  children,
  ...props
}) => {
  const path = typeof to === 'string' ? to : to.pathname || '';
  const preloadHandlers = useRoutePreload(path);
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (preload && preloadHandlers.onMouseEnter) {
      if (preloadDelay > 0) {
        setTimeout(() => preloadHandlers.onMouseEnter?.(), preloadDelay);
      } else {
        preloadHandlers.onMouseEnter();
      }
    }
    props.onMouseEnter?.(e);
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    if (preload && preloadHandlers.onFocus) {
      if (preloadDelay > 0) {
        setTimeout(() => preloadHandlers.onFocus?.(), preloadDelay);
      } else {
        preloadHandlers.onFocus();
      }
    }
    props.onFocus?.(e);
  };
  
  return (
    <Link
      to={to}
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </Link>
  );
};

/**
 * PreloadButton - Button that preloads a route on hover
 * Useful for navigation buttons that will eventually navigate
 * 
 * @example
 * ```tsx
 * <PreloadButton to="/finance" onClick={handleClick}>
 *   Open Finance
 * </PreloadButton>
 * ```
 */
interface PreloadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  to: string;
  preload?: boolean;
  preloadDelay?: number;
}

export const PreloadButton: React.FC<PreloadButtonProps> = ({
  to,
  preload = true,
  preloadDelay = 0,
  onMouseEnter,
  onFocus,
  children,
  ...props
}) => {
  const preloadHandlers = useRoutePreload(to);
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (preload && preloadHandlers.onMouseEnter) {
      if (preloadDelay > 0) {
        setTimeout(() => preloadHandlers.onMouseEnter?.(), preloadDelay);
      } else {
        preloadHandlers.onMouseEnter();
      }
    }
    onMouseEnter?.(e);
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (preload && preloadHandlers.onFocus) {
      if (preloadDelay > 0) {
        setTimeout(() => preloadHandlers.onFocus?.(), preloadDelay);
      } else {
        preloadHandlers.onFocus();
      }
    }
    onFocus?.(e);
  };
  
  return (
    <button
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </button>
  );
};
