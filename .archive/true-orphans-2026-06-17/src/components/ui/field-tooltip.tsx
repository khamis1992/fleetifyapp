/**
 * Field Tooltip Component
 * Displays helpful tooltips for form fields
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface FieldTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const FieldTooltip: React.FC<FieldTooltipProps> = ({ content, side = 'right' }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 ml-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="معلومات إضافية"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
