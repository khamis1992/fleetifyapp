import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

interface InteractiveDashboardCardProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  glowColor?: string;
  gradient?: boolean;
  stats?: {
    value: string;
    change?: number;
    changeLabel?: string;
  };
}

export function InteractiveDashboardCard({ 
  children, 
  title, 
  description, 
  icon: Icon, 
  className = '', 
  glowColor = 'hsl(var(--primary))',
  gradient = false,
  stats
}: InteractiveDashboardCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['12.5deg', '-12.5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-12.5deg', '12.5deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: 'preserve-3d',
      }}
      className={`relative group ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mouseXSpring}px ${mouseYSpring}px, ${glowColor}20, transparent 40%)`,
        }}
      />

      {/* Card */}
      <Card className={`relative h-full transition-all duration-300 ${
        gradient 
          ? 'bg-gradient-to-br from-card via-card/90 to-card/80' 
          : 'bg-card/90'
        } backdrop-blur-md border-border/50 shadow-xl hover:shadow-2xl hover:border-primary/20`}>
        {(title || Icon) && (
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                {title && (
                  <CardTitle className="flex items-center gap-3">
                    {Icon && (
                      <motion.div 
                        className="p-2 bg-primary/10 rounded-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        style={{ transform: 'translateZ(20px)' }}
                      >
                        <Icon className="h-5 w-5 text-primary" />
                      </motion.div>
                    )}
                    <span style={{ transform: 'translateZ(20px)' }}>{title}</span>
                  </CardTitle>
                )}
                {description && (
                  <CardDescription style={{ transform: 'translateZ(15px)' }}>
                    {description}
                  </CardDescription>
                )}
              </div>
              
              {stats && (
                <motion.div 
                  className="text-left"
                  style={{ transform: 'translateZ(25px)' }}
                  animate={{ 
                    scale: isHovered ? 1.05 : 1,
                  }}
                >
                  <div className="text-2xl font-bold text-primary">
                    <StatCardNumber value={stats.value} className="inline" />
                  </div>
                  {stats.change !== undefined && (
                    <div className={`text-sm flex items-center gap-1 ${
                      stats.change >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      <span>{stats.change >= 0 ? '+' : ''}{stats.change}%</span>
                      {stats.changeLabel && <span className="text-muted-foreground">{stats.changeLabel}</span>}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </CardHeader>
        )}

        <CardContent style={{ transform: 'translateZ(30px)' }}>
          {children}
        </CardContent>

        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-transparent"
          style={{
            background: isHovered 
              ? `linear-gradient(45deg, ${glowColor}40, transparent, ${glowColor}40)`
              : 'transparent',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'exclude',
          }}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
  );
}