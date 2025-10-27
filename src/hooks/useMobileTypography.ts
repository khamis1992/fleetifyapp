/**
 * Mobile Typography Hook
 * 
 * Provides responsive font sizes, line heights, and letter spacing
 * optimized for mobile devices while maintaining readability.
 * 
 * Key Principles:
 * - Base font size 16px on mobile (prevents iOS zoom)
 * - Minimum line height 1.6 for readability
 * - Scalable typography that adapts to device size
 * - Arabic text considerations
 */

import { useMemo } from 'react';
import { useSimpleBreakpoint } from './use-mobile-simple';

export interface TypographyScale {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight?: string;
}

export interface MobileTypographyConfig {
  h1: TypographyScale;
  h2: TypographyScale;
  h3: TypographyScale;
  h4: TypographyScale;
  body: TypographyScale;
  bodySmall: TypographyScale;
  label: TypographyScale;
  caption: TypographyScale;
}

/**
 * Hook to get responsive typography scales
 */
export function useMobileTypography() {
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint();

  const typography = useMemo<MobileTypographyConfig>(() => {
    if (isDesktop) {
      return {
        h1: {
          fontSize: '3.5rem', // 56px
          lineHeight: '1.2',
          letterSpacing: '-0.02em',
          fontWeight: '700',
        },
        h2: {
          fontSize: '2.5rem', // 40px
          lineHeight: '1.3',
          letterSpacing: '-0.01em',
          fontWeight: '700',
        },
        h3: {
          fontSize: '2rem', // 32px
          lineHeight: '1.4',
          fontWeight: '600',
        },
        h4: {
          fontSize: '1.5rem', // 24px
          lineHeight: '1.5',
          fontWeight: '600',
        },
        body: {
          fontSize: '1rem', // 16px
          lineHeight: '1.6',
          letterSpacing: '0.01em',
        },
        bodySmall: {
          fontSize: '0.875rem', // 14px
          lineHeight: '1.6',
        },
        label: {
          fontSize: '0.875rem', // 14px
          lineHeight: '1.5',
          fontWeight: '500',
        },
        caption: {
          fontSize: '0.75rem', // 12px
          lineHeight: '1.5',
          fontWeight: '400',
        },
      };
    }

    if (isTablet) {
      return {
        h1: {
          fontSize: '2.5rem', // 40px
          lineHeight: '1.2',
          letterSpacing: '-0.01em',
          fontWeight: '700',
        },
        h2: {
          fontSize: '2rem', // 32px
          lineHeight: '1.3',
          fontWeight: '700',
        },
        h3: {
          fontSize: '1.5rem', // 24px
          lineHeight: '1.4',
          fontWeight: '600',
        },
        h4: {
          fontSize: '1.25rem', // 20px
          lineHeight: '1.5',
          fontWeight: '600',
        },
        body: {
          fontSize: '1rem', // 16px - Never go below 16px on mobile/tablet
          lineHeight: '1.6',
        },
        bodySmall: {
          fontSize: '0.875rem', // 14px
          lineHeight: '1.6',
        },
        label: {
          fontSize: '0.875rem', // 14px
          lineHeight: '1.5',
          fontWeight: '500',
        },
        caption: {
          fontSize: '0.75rem', // 12px
          lineHeight: '1.5',
        },
      };
    }

    // Mobile (isMobile === true)
    return {
      h1: {
        fontSize: '1.75rem', // 28px
        lineHeight: '1.2',
        letterSpacing: '-0.01em',
        fontWeight: '700',
      },
      h2: {
        fontSize: '1.5rem', // 24px
        lineHeight: '1.3',
        fontWeight: '700',
      },
      h3: {
        fontSize: '1.25rem', // 20px
        lineHeight: '1.4',
        fontWeight: '600',
      },
      h4: {
        fontSize: '1.125rem', // 18px
        lineHeight: '1.5',
        fontWeight: '600',
      },
      body: {
        fontSize: '1rem', // 16px - CRITICAL: Never below 16px on mobile to prevent iOS zoom
        lineHeight: '1.6',
        letterSpacing: '0.01em',
      },
      bodySmall: {
        fontSize: '0.875rem', // 14px
        lineHeight: '1.6',
      },
      label: {
        fontSize: '0.875rem', // 14px
        lineHeight: '1.5',
        fontWeight: '500',
      },
      caption: {
        fontSize: '0.75rem', // 12px
        lineHeight: '1.5',
      },
    };
  }, [isMobile, isTablet, isDesktop]);

  return {
    typography,
    isMobile,
    isTablet,
    isDesktop,
  };
}

/**
 * Get CSS classes for typography scales
 */
export function getTypographyClasses(scale: keyof MobileTypographyConfig) {
  const classMap: Record<string, string> = {
    h1: 'text-2xl sm:text-4xl md:text-5xl font-bold leading-tight',
    h2: 'text-xl sm:text-3xl md:text-4xl font-bold leading-snug',
    h3: 'text-lg sm:text-2xl md:text-3xl font-semibold leading-snug',
    h4: 'text-base sm:text-xl md:text-2xl font-semibold leading-normal',
    body: 'text-base leading-relaxed',
    bodySmall: 'text-sm leading-relaxed',
    label: 'text-sm font-medium leading-normal',
    caption: 'text-xs leading-normal text-muted-foreground',
  };

  return classMap[scale] || classMap.body;
}

/**
 * Component wrapper for responsive typography
 */
export interface ResponsiveTypographyProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  level?: keyof Omit<MobileTypographyConfig, 'label' | 'caption'>;
  variant?: 'heading' | 'body' | 'label' | 'caption';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveTypography: React.FC<ResponsiveTypographyProps> = ({
  as: Component = 'p',
  level = 'body',
  variant,
  children,
  className = '',
  style,
}) => {
  const { typography } = useMobileTypography();
  
  const scale = variant 
    ? variant as keyof MobileTypographyConfig
    : level as keyof MobileTypographyConfig;
  
  const scaleConfig = typography[scale];
  
  const computedStyle: React.CSSProperties = {
    fontSize: scaleConfig.fontSize,
    lineHeight: scaleConfig.lineHeight,
    letterSpacing: scaleConfig.letterSpacing || 'normal',
    fontWeight: scaleConfig.fontWeight || 'normal',
    ...style,
  };

  return (
    <Component
      className={className}
      style={computedStyle}
    >
      {children}
    </Component>
  );
};

/**
 * Preset components for common use cases
 */
export const MobileHeading1 = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h1 className={`text-2xl sm:text-4xl md:text-5xl font-bold leading-tight ${className}`}>
    {children}
  </h1>
);

export const MobileHeading2 = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-xl sm:text-3xl md:text-4xl font-bold leading-snug ${className}`}>
    {children}
  </h2>
);

export const MobileHeading3 = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg sm:text-2xl md:text-3xl font-semibold leading-snug ${className}`}>
    {children}
  </h3>
);

export const MobileBody = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-base leading-relaxed ${className}`}>
    {children}
  </p>
);

export const MobileBodySmall = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm leading-relaxed ${className}`}>
    {children}
  </p>
);

export const MobileLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium leading-normal ${className}`}>
    {children}
  </label>
);

export const MobileCaption = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-xs leading-normal text-muted-foreground ${className}`}>
    {children}
  </span>
);
