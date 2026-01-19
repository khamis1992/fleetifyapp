import React, { useState, useEffect, useRef } from 'react';

interface LazyComponentProps {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  enableLazyLoading?: boolean;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  enableLazyLoading = true
}) => {
  const [isVisible, setIsVisible] = useState(!enableLazyLoading);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enableLazyLoading || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, isVisible, enableLazyLoading]);

  return (
    <div ref={elementRef}>
      {isVisible ? children : <div style={{ minHeight: '200px' }} />}
    </div>
  );
};

export default LazyComponent;