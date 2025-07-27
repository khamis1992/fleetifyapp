import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { InteractiveDashboardCard } from './InteractiveDashboardCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  FileText, 
  AlertTriangle, 
  Users, 
  Activity,
  ArrowRight,
  Zap
} from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
  color: string;
  priority?: 'high' | 'medium' | 'low';
  amount?: number;
  status?: string;
  created_at: string;
}

interface ParallaxRecentActivitiesProps {
  activities?: Activity[];
  loading?: boolean;
}

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    FileText,
    AlertTriangle,
    Users,
    Activity
  };
  return iconMap[iconName] || Activity;
};

export function ParallaxRecentActivities({ activities, loading }: ParallaxRecentActivitiesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  if (loading) {
    return (
      <InteractiveDashboardCard
        title="الأنشطة الأخيرة"
        description="آخر التحديثات في نظامك"
        icon={Calendar}
        glowColor="hsl(var(--primary))"
      >
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-background-soft rounded-lg animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </InteractiveDashboardCard>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <InteractiveDashboardCard
        title="الأنشطة الأخيرة"
        description="آخر التحديثات في نظامك"
        icon={Calendar}
        glowColor="hsl(var(--primary))"
      >
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          </motion.div>
          <p className="text-sm text-muted-foreground mb-2">لا توجد أنشطة حديثة</p>
          <p className="text-xs text-muted-foreground mb-6">ستظهر الأنشطة هنا عند بدء استخدام النظام</p>
          <Button variant="outline" size="sm" className="group">
            <Zap className="h-4 w-4 mr-2 group-hover:animate-pulse" />
            إنشاء نشاط جديد
          </Button>
        </motion.div>
      </InteractiveDashboardCard>
    );
  }

  return (
    <div ref={ref}>
      <motion.div style={{ y, opacity }}>
        <InteractiveDashboardCard
        title="الأنشطة الأخيرة"
        description="آخر التحديثات في نظامك"
        icon={Calendar}
        glowColor="hsl(var(--primary))"
        gradient
      >
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const IconComponent = getIconComponent(activity.icon);
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -50, rotateY: -15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 100 
                }}
                whileHover={{ 
                  scale: 1.02, 
                  rotateY: 5,
                  transition: { duration: 0.2 }
                }}
                className="group relative"
              >
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-card/50 to-muted/20 rounded-xl border border-border/50 hover:border-primary/20 transition-all duration-300 backdrop-blur-sm">
                  {/* Animated icon container */}
                  <motion.div
                    className={`p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-all duration-300 ${activity.color}`}
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: 10,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  >
                    <IconComponent className="h-4 w-4 text-primary" />
                  </motion.div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="secondary" className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary border-primary/20">
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full backdrop-blur-sm">
                        {activity.time}
                      </span>
                      {activity.priority === 'high' && (
                        <motion.div
                          className="h-2 w-2 bg-destructive rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>
                    
                    <p className="text-sm text-foreground/90 leading-relaxed mb-2">{activity.description}</p>
                    
                    {activity.amount && (
                      <motion.p 
                        className="text-xs text-primary font-semibold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        {activity.amount.toLocaleString()} د.ك
                      </motion.p>
                    )}
                  </div>

                  {/* Hover arrow */}
                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    whileHover={{ x: 5 }}
                  >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </div>

                {/* Animated border on hover */}
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-primary/0 group-hover:border-primary/30 transition-colors duration-300"
                  style={{ transformStyle: 'preserve-3d' }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* View all button */}
        <motion.div
          className="mt-6 pt-4 border-t border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button variant="ghost" className="w-full group">
            عرض جميع الأنشطة
            <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </InteractiveDashboardCard>
      </motion.div>
    </div>
  );
}