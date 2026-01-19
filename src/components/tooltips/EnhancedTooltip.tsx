import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info, Keyboard, HelpCircle } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface TooltipSection {
  /** Section title */
  title?: string;
  /** Section content */
  content: React.ReactNode;
}

interface EnhancedTooltipProps {
  /** Trigger element */
  children: React.ReactNode;
  /** Tooltip title */
  title?: string;
  /** Simple description (for basic tooltips) */
  description?: string;
  /** Rich sections (for advanced tooltips) */
  sections?: TooltipSection[];
  /** Show info icon */
  showIcon?: boolean;
  /** Icon type */
  icon?: LucideIcon;
  /** Keyboard shortcut to display */
  shortcut?: string;
  /** Formula or calculation to display */
  formula?: string;
  /** Example to show */
  example?: string;
  /** Help link */
  helpLink?: string;
  /** Custom metadata key-value pairs */
  metadata?: Record<string, string | number>;
  /** Tooltip side */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Custom width */
  width?: number;
}

export const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  children,
  title,
  description,
  sections,
  showIcon = false,
  icon: Icon = Info,
  shortcut,
  formula,
  example,
  helpLink,
  metadata,
  side = 'top',
  width = 300,
}) => {
  // Simple tooltip
  if (description && !sections && !formula && !example && !metadata) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent side={side} className="max-w-xs">
            {title && <p className="font-semibold mb-1">{title}</p>}
            <p className="text-sm text-muted-foreground">{description}</p>
            {shortcut && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                <Keyboard className="h-3 w-3" />
                <Badge variant="secondary" className="text-xs font-mono">
                  {shortcut}
                </Badge>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Rich tooltip
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {children}
            {showIcon && <Icon className="h-4 w-4 text-muted-foreground" />}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="p-0"
          style={{ maxWidth: width }}
        >
          <div className="space-y-3 p-4">
            {/* Title */}
            {title && (
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">{title}</h4>
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {/* Formula */}
            {formula && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">المعادلة:</p>
                <div className="p-2 bg-muted rounded-md">
                  <code className="text-xs font-mono">{formula}</code>
                </div>
              </div>
            )}

            {/* Example */}
            {example && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">مثال:</p>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-100">{example}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            {metadata && Object.keys(metadata).length > 0 && (
              <div className="space-y-1">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Rich Sections */}
            {sections && sections.length > 0 && (
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div key={index} className="space-y-1">
                    {section.title && (
                      <p className="text-xs font-semibold text-muted-foreground">
                        {section.title}
                      </p>
                    )}
                    <div className="text-sm">{section.content}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              {/* Keyboard Shortcut */}
              {shortcut && (
                <div className="flex items-center gap-1">
                  <Keyboard className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs font-mono">
                    {shortcut}
                  </Badge>
                </div>
              )}

              {/* Help Link */}
              {helpLink && (
                <a
                  href={helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HelpCircle className="h-3 w-3" />
                  المساعدة
                </a>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EnhancedTooltip;
