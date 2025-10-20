import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrillDownLevel {
  title: string;
  subtitle?: string;
  data: Array<{
    label: string;
    value: string | number;
    badge?: string;
    color?: string;
  }>;
}

export interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  levels: DrillDownLevel[];
  currentLevel: number;
  onLevelChange: (level: number) => void;
  navigateTo?: string;
  onNavigate?: () => void;
  className?: string;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  open,
  onOpenChange,
  title,
  levels,
  currentLevel,
  onLevelChange,
  navigateTo,
  onNavigate,
  className,
}) => {
  const navigate = useNavigate();
  const currentData = levels[currentLevel];

  const handleNavigate = () => {
    if (navigateTo) {
      navigate(navigateTo);
      onOpenChange(false);
    }
    onNavigate?.();
  };

  const handleBack = () => {
    if (currentLevel > 0) {
      onLevelChange(currentLevel - 1);
    }
  };

  const handleReset = () => {
    onLevelChange(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl', className)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Breadcrumb navigation */}
          {levels.length > 1 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 px-2 text-xs"
                disabled={currentLevel === 0}
              >
                <Home className="h-3 w-3 ml-1" />
                البداية
              </Button>
              {levels.slice(0, currentLevel + 1).map((level, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <Button
                    variant={index === currentLevel ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onLevelChange(index)}
                    className="h-7 px-3 text-xs"
                    disabled={index === currentLevel}
                  >
                    {level.title}
                  </Button>
                </React.Fragment>
              ))}
            </div>
          )}
        </DialogHeader>

        <Separator className="my-4" />

        {/* Current level content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLevel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Level subtitle */}
            {currentData.subtitle && (
              <p className="text-sm text-muted-foreground">{currentData.subtitle}</p>
            )}

            {/* Data list */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {currentData.data.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Empty state */}
            {currentData.data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">لا توجد بيانات متاحة</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {currentLevel > 0 && (
              <Button variant="outline" onClick={handleBack}>
                رجوع
              </Button>
            )}
          </div>

          {navigateTo && (
            <Button onClick={handleNavigate} className="gap-2">
              عرض التفاصيل الكاملة
              <ArrowRight className="h-4 w-4 mr-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
