import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Eye, ArrowRight } from 'lucide-react';
import { StatCardNumber } from '@/components/ui/NumberDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  index: number;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  gradient?: boolean;
  isLoading?: boolean;
}

const EnhancedStatsCard: React.FC<EnhancedStatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  description,
  index,
  subtitle,
  actionText,
  onAction,
  gradient = false,
  isLoading = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendBadgeColor = () => {
    switch (trend) {
      case 'up': return 'bg-success/10 text-success border-success/20';
      case 'down': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.5, 
          delay: index * 0.1,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        whileHover={{ 
          y: -4,
          transition: { duration: 0.2 }
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
          gradient 
            ? 'bg-gradient-to-br from-card/80 via-card/60 to-card/40' 
            : 'bg-card/60'
        } backdrop-blur-sm border-border/50 hover:border-primary/20`}>
          
          {/* Loading State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center z-10"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Background Glow Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent"
            style={{
              background: "radial-gradient(circle at 50% 50%, rgba(var(--primary-rgb), 0.05) 0%, transparent 70%)"
            }}
            animate={{
              opacity: isHovered ? 1 : 0
            }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Animated Corner Accent */}
          <motion.div
            className="absolute top-0 left-0 w-0 h-0 border-l-[50px] border-t-[50px] border-l-transparent border-t-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={{ scale: 0 }}
            whileHover={{ scale: 1 }}
          />
          
          <div className="relative p-6">
            {/* Header Section */}
            <div className="flex items-start justify-between mb-5">
                <div className="group">
                  <motion.div 
                    className="p-3 rounded-xl bg-primary/10 text-primary shadow-sm group-hover:bg-primary/15 transition-colors duration-300"
                    whileHover={{ 
                      scale: 1.1,
                      rotate: 5,
                      transition: { type: "spring", stiffness: 400, damping: 17 }
                    }}
                  >
                    <Icon size={24} />
                  </motion.div>
                </div>
              
              {change && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Badge 
                    variant="outline" 
                    className={`${getTrendBadgeColor()} flex items-center gap-1 px-2 py-1`}
                  >
                    <TrendIcon size={12} />
                    <span className="text-xs font-medium">{change}</span>
                  </Badge>
                </motion.div>
              )}
            </div>
            
            {/* Content Section */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">{title}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground/80 mb-1">{subtitle}</p>
                )}
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <StatCardNumber 
                  value={value} 
                  className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300" 
                />
              </motion.div>
              
              {description && (
                <p className="text-sm text-muted-foreground/70">{description}</p>
              )}
            </div>

            {/* Action Section */}
            <AnimatePresence>
              {actionText && onAction && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ 
                    opacity: isHovered ? 1 : 0, 
                    height: isHovered ? 'auto' : 0,
                    marginTop: isHovered ? 16 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAction}
                    className="w-full h-8 text-xs hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                  >
                    {actionText}
                    <ArrowRight size={12} className="mr-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick View Button */}
            <motion.div
              className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={{ scale: 0 }}
              whileHover={{ scale: 1 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.();
                }}
              >
                <Eye size={14} />
              </Button>
            </motion.div>
          </div>

          {/* Bottom Border Accent */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/50 to-primary/20 w-0 group-hover:w-full transition-all duration-500"
            initial={{ width: 0 }}
            whileHover={{ width: '100%' }}
          />
        </Card>
      </motion.div>
  );
};

export default EnhancedStatsCard;