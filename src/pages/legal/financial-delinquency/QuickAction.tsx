import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * شريط الإجراءات السريعة
 */
export interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | number;
}

export const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  description,
  color,
  onClick,
  disabled,
  badge,
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-right",
        "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-full"
      )}
      style={{
        borderColor: `hsl(${color} / 0.3)`,
        backgroundColor: `hsl(${color} / 0.05)`,
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
        style={{ backgroundColor: `hsl(${color})` }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold block truncate" style={{ color: `hsl(${color})` }}>
          {label}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground block truncate">{description}</span>
        )}
      </div>
      {badge && (
        <Badge className="shrink-0" style={{ backgroundColor: `hsl(${color})`, color: 'white' }}>
          {badge}
        </Badge>
      )}
    </motion.button>
  );
};
