/**
 * Visual Test Wrapper Component
 * Provides utilities for visual testing consistency
 */

import React, { useEffect, ReactNode } from 'react';

interface VisualTestWrapperProps {
  children: ReactNode;
  className?: string;
  dataTestId?: string;
  disableAnimations?: boolean;
  stableIds?: boolean;
}

export function VisualTestWrapper({
  children,
  className = '',
  dataTestId,
  disableAnimations = true,
  stableIds = true,
}: VisualTestWrapperProps) {
  useEffect(() => {
    // Disable animations for consistent screenshots
    if (disableAnimations && process.env.VISUAL_TESTING === 'true') {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        .loading-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: none !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }

    // Generate stable IDs for testing
    if (stableIds && process.env.VISUAL_TESTING === 'true') {
      const generateStableId = (element: Element, prefix = 'test-') => {
        if (!element.id && element.tagName !== 'HTML' && element.tagName !== 'BODY') {
          let id = prefix;
          if (element.className) {
            id += element.className.split(' ').join('-');
          }
          if (element.tagName) {
            id += '-' + element.tagName.toLowerCase();
          }
          element.id = id.replace(/[^a-zA-Z0-9-]/g, '-');
        }
      };

      const generateIdsRecursively = (element: Element) => {
        generateStableId(element);
        for (const child of element.children) {
          generateIdsRecursively(child);
        }
      };

      generateIdsRecursively(document.body);
    }
  }, [disableAnimations, stableIds]);

  // Generate consistent timestamps for tests
  const getTestTimestamp = () => {
    if (process.env.VISUAL_TESTING === 'true') {
      return '2024-01-01T12:00:00Z'; // Fixed timestamp for consistency
    }
    return new Date().toISOString();
  };

  // Mock dynamic data for tests
  const getTestValue = (originalValue: any, testValue?: any) => {
    if (process.env.VISUAL_TESTING === 'true' && testValue !== undefined) {
      return testValue;
    }
    return originalValue;
  };

  return (
    <div
      className={className}
      data-testid={dataTestId}
      data-visual-test={process.env.VISUAL_TESTING === 'true' ? 'true' : undefined}
      data-test-timestamp={getTestTimestamp()}
    >
      {children}
    </div>
  );
}

/**
 * Hook for visual testing utilities
 */
export function useVisualTest() {
  const isVisualTesting = process.env.VISUAL_TESTING === 'true';

  const waitForAnimations = () => {
    if (isVisualTesting) {
      return Promise.resolve(); // No animations to wait for
    }
    // Return a promise that resolves when animations complete
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  };

  const mockImageData = () => {
    if (isVisualTesting) {
      // Return a predictable placeholder image URL
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjxzcGFuPkltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    }
    return undefined;
  };

  return {
    isVisualTesting,
    waitForAnimations,
    mockImageData,
    getTestTimestamp: () => isVisualTesting ? '2024-01-01T12:00:00Z' : new Date().toISOString(),
  };
}

/**
 * Higher-order component for visual testing
 */
export function withVisualTesting<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    disableAnimations?: boolean;
    stableIds?: boolean;
    testData?: Record<string, any>;
  } = {}
) {
  return function VisualTestComponent(props: P) {
    const { isVisualTesting } = useVisualTest();

    // Override props with test data if visual testing
    const enhancedProps = isVisualTesting && options.testData
      ? { ...props, ...options.testData }
      : props;

    return (
      <VisualTestWrapper
        disableAnimations={options.disableAnimations}
        stableIds={options.stableIds}
      >
        <Component {...enhancedProps} />
      </VisualTestWrapper>
    );
  };
}

// Export types for external use
export type { VisualTestWrapperProps };