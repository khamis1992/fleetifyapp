/**
 * Mirrored Icon Component
 *
 * Component for automatically mirroring directional icons in RTL languages.
 * Handles icon transformation and provides fallbacks for unsupported icons.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import React, { forwardRef, useMemo } from 'react';
import { useFleetifyTranslation } from '../../hooks/useTranslation';
import { LucideProps } from 'lucide-react';

interface MirroredIconProps {
  icon: React.ComponentType<LucideProps>;
  name?: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  forceMirror?: boolean;
  fallback?: React.ComponentType<LucideProps>;
  children?: React.ReactNode;
}

// List of icons that should typically be mirrored in RTL
const RTL_MIRROR_ICONS = new Set([
  'arrow-left',
  'arrow-right',
  'arrow-back',
  'arrow-forward',
  'chevron-left',
  'chevron-right',
  'chevron-left-square',
  'chevron-right-square',
  'skip-back',
  'skip-forward',
  'rewind',
  'fast-forward',
  'step-back',
  'step-forward',
  'first-page',
  'last-page',
  'angle-left',
  'angle-right',
  'angle-double-left',
  'angle-double-right',
  'caret-left',
  'caret-right',
  'corner-up-left',
  'corner-up-right',
  'corner-down-left',
  'corner-down-right',
  'log-in',
  'log-out',
  'sign-in',
  'sign-out',
  'send-horizontal',
  'reply',
  'reply-all',
  'forward',
  'share',
  'upload-cloud',
  'download-cloud',
  'import',
  'export',
  'swap-horizontal',
  'move-horizontal',
  'move-diagonal',
  'move-diagonal-2',
  'git-branch',
  'git-commit',
  'git-pull-request',
  'git-merge',
  'layers',
  'git-compare',
  'git-merge',
  'git-pull-request',
  'git-push',
  'shuffle',
  'repeat',
  'repeat-1',
  'skip-forward',
  'skip-back',
  'play-circle',
  'skip-back',
  'skip-forward',
  'fast-forward',
  'rewind',
  'repeat',
  'repeat-1',
  'wifi',
  'wifi-off',
  'battery-charging',
  'battery-low',
  'battery-full',
  'battery-warning'
]);

const MirroredIcon = forwardRef<any, MirroredIconProps>(
  (
    {
      icon: IconComponent,
      name,
      size = 24,
      className = '',
      style = {},
      disabled = false,
      forceMirror = false,
      fallback: FallbackComponent,
      children,
      ...props
    },
    ref
  ) => {
    const { shouldMirrorIcon, rtl, textDirection } = useFleetifyTranslation();

    // Determine if icon should be mirrored
    const shouldMirror = useMemo(() => {
      if (disabled || !rtl) return false;
      if (forceMirror) return true;
      if (name && RTL_MIRROR_ICONS.has(name.toLowerCase())) return true;
      return false;
    }, [disabled, rtl, forceMirror, name]);

    // Apply transformation styles
    const mirroredStyles = useMemo(() => {
      if (!shouldMirror) return style;

      return {
        ...style,
        transform: `${style.transform || ''} scaleX(-1)`.trim(),
        transformOrigin: 'center'
      };
    }, [shouldMirror, style]);

    // Determine final icon component
    const FinalIconComponent = useMemo(() => {
      if (shouldMirror && FallbackComponent) {
        return FallbackComponent;
      }
      return IconComponent;
    }, [shouldMirror, FallbackComponent, IconComponent]);

    // Generate accessible properties
    const accessibilityProps = useMemo(() => {
      const props: any = {
        'aria-hidden': true,
        'role': 'img',
        'aria-label': name || 'icon'
      };

      if (shouldMirror) {
        props['data-mirrored'] = 'true';
        props['aria-label'] = `${name || 'icon'} (mirrored)`;
      }

      return props;
    }, [shouldMirror, name]);

    if (!FinalIconComponent) {
      return (
        <span
          ref={ref}
          className={`inline-flex items-center justify-center ${className}`}
          style={{ width: size, height: size, ...mirroredStyles }}
          {...accessibilityProps}
          {...props}
        >
          {children || (
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center justify-center ${shouldMirror ? 'icon-mirrored' : ''} ${className}`}
        style={mirroredStyles}
        dir={textDirection}
        {...accessibilityProps}
      >
        <FinalIconComponent
          size={size}
          {...props}
          style={shouldMirror ? { transform: 'scaleX(-1)' } : {}}
        />
      </span>
    );
  }
);

MirroredIcon.displayName = 'MirroredIcon';

// Hook for checking if an icon should be mirrored
export const useIconMirror = (iconName?: string) => {
  const { shouldMirrorIcon } = useFleetifyTranslation();

  const shouldMirror = useMemo(() => {
    if (!iconName) return false;
    return RTL_MIRROR_ICONS.has(iconName.toLowerCase());
  }, [iconName]);

  return {
    shouldMirror: shouldMirrorIcon && shouldMirror,
    isRTL: useFleetifyTranslation().rtl
  };
};

// Higher-order component for automatic icon mirroring
export const withMirroring = <P extends object>(
  WrappedIconComponent: React.ComponentType<P>
) => {
  const MirroredWrapper = forwardRef<any, P & { iconName?: string }>(
    ({ iconName, ...props }, ref) => {
      const { shouldMirrorIcon } = useFleetifyTranslation();
      const shouldMirror = iconName ? RTL_MIRROR_ICONS.has(iconName.toLowerCase()) : false;

      const mirroredProps = useMemo(() => {
        if (shouldMirrorIcon && shouldMirror) {
          return {
            ...props,
            style: {
              ...props.style,
              transform: `${(props.style as any)?.transform || ''} scaleX(-1)`.trim(),
              transformOrigin: 'center'
            }
          };
        }
        return props;
      }, [shouldMirrorIcon, shouldMirror, props]);

      return (
        <span
          className={shouldMirrorIcon && shouldMirror ? 'icon-mirrored' : ''}
          ref={ref}
        >
          <WrappedIconComponent {...(mirroredProps as P)} />
        </span>
      );
    }
  );

  MirroredWrapper.displayName = `withMirroring(${WrappedIconComponent.displayName || 'Component'})`;

  return MirroredWrapper;
};

// CSS for icon mirroring
export const mirrorIconStyles = `
  .icon-mirrored {
    transform: scaleX(-1);
    transform-origin: center;
  }

  /* RTL-specific icon adjustments */
  [dir="rtl"] .icon-mirrored {
    transform: scaleX(-1);
  }

  /* Animation for mirroring */
  .icon-mirror-transition {
    transition: transform 0.2s ease-in-out;
  }

  /* Override for icons that shouldn't be mirrored */
  .icon-no-mirror {
    transform: none !important;
  }

  /* RTL layout helper classes */
  .rtl-mirror-group {
    direction: ltr;
  }

  .rtl-mirror-group > * {
    transform: scaleX(-1);
  }

  /* Icon button mirroring */
  .icon-button-mirror:hover .icon-mirrored {
    transform: scaleX(-1) scale(1.1);
  }

  /* Icon list mirroring */
  .icon-list-mirror li {
    display: flex;
    align-items: center;
  }

  .icon-list-mirror li svg.icon-mirrored {
    margin-right: 0.5rem;
  }

  /* Accessibility improvements */
  .icon-mirrored[aria-hidden="true"] {
    /* Ensure screen readers don't read mirrored content twice */
    speak: none;
  }
`;

export default MirroredIcon;