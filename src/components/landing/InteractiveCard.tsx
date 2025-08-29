import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function InteractiveCard({ children, className = '', glowColor = 'hsl(var(--primary))' }: InteractiveCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cachedRect, setCachedRect] = useState<DOMRect | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['17.5deg', '-17.5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-17.5deg', '17.5deg']);

  // Cache the bounding rect on mount and resize to avoid forced reflows
  const updateCachedRect = useCallback(() => {
    if (ref.current) {
      setCachedRect(ref.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateCachedRect();
    const handleResize = () => updateCachedRect();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCachedRect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cachedRect) return;

    const mouseX = e.clientX - cachedRect.left;
    const mouseY = e.clientY - cachedRect.top;

    const xPct = mouseX / cachedRect.width - 0.5;
    const yPct = mouseY / cachedRect.height - 0.5;

    x.set(xPct);
    y.set(yPct);
  }, [cachedRect, x, y]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    updateCachedRect(); // Update rect when entering to ensure accuracy
  }, [updateCachedRect]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: 'preserve-3d',
      }}
      className={`relative ${className}`}
    >
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `radial-gradient(600px circle at ${mouseXSpring}px ${mouseYSpring}px, ${glowColor}20, transparent 40%)`,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      <Card className="relative bg-card/80 backdrop-blur-md border-border/50 shadow-2xl">
        <CardContent className="p-6" style={{ transform: 'translateZ(75px)' }}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}