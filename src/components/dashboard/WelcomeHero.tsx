import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeHeroProps {
  userName: string;
  quickStats?: {
    label: string;
    value: string;
    trend?: string;
  }[];
  className?: string;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ 
  userName, 
  quickStats = [],
  className 
}) => {
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-8 text-primary-foreground",
      "bg-gradient-hero shadow-elevated",
      className
    )}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-light/30 rounded-full translate-y-12 -translate-x-12" />
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {getCurrentGreeting()}، {userName}
              </h1>
              <Badge 
                variant="secondary" 
                className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
              >
                مديرالشركة
              </Badge>
            </div>
            <p className="text-primary-foreground/90 text-lg max-w-2xl">
              نظرة سريعة على أداء شركتك اليوم. جميع الأنظمة تعمل بكفاءة عالية.
            </p>
            
            {quickStats.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-4">
                {quickStats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-3 py-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">{stat.label}:</span>
                    <span className="text-sm font-bold">{stat.value}</span>
                    {stat.trend && (
                      <Badge variant="secondary" className="text-xs bg-success text-success-foreground">
                        {stat.trend}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-accent"
            >
              <Zap className="h-4 w-4 mr-2" />
              عرض التقارير
            </Button>
            <Button 
              variant="outline" 
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Bell className="h-4 w-4 mr-2" />
              التنبيهات (3)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};