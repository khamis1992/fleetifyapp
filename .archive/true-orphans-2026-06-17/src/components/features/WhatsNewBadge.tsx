/**
 * What's New Badge Component
 * Displays on user avatar when updates are available
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsNewBadgeProps {
  unreadCount: number;
  onClick?: () => void;
  animated?: boolean;
  className?: string;
}

export const WhatsNewBadge: React.FC<WhatsNewBadgeProps> = ({
  unreadCount,
  onClick,
  animated = true,
  className,
}) => {
  if (unreadCount === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative inline-flex',
        animated && 'cursor-pointer hover:scale-110 transition-transform'
      )}
      title="اضغط لرؤية التحديثات الجديدة"
    >
      <Badge
        className={cn(
          'flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white',
          animated && 'animate-pulse',
          className
        )}
      >
        <Sparkles className="h-3 w-3" />
        <span className="text-xs font-semibold">{unreadCount}</span>
      </Badge>
    </button>
  );
};

export default WhatsNewBadge;
