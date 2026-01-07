/**
 * Collapsible Section Component
 * Progressive Disclosure pattern for hiding advanced/optional fields
 * Remembers user preference in localStorage
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Settings, Info, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Storage key for remembering preference */
  storageKey?: string;
  /** Icon to display */
  icon?: React.ElementType;
  /** Badge text (e.g., "اختياري") */
  badge?: string;
  /** Badge variant */
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  /** Show field count */
  fieldCount?: number;
  /** Filled field count */
  filledCount?: number;
  /** Custom trigger button */
  customTrigger?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** On toggle callback */
  onToggle?: (isExpanded: boolean) => void;
  /** Custom class name */
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  children,
  defaultExpanded = false,
  storageKey,
  icon: Icon = Settings,
  badge,
  badgeVariant = 'secondary',
  fieldCount,
  filledCount,
  customTrigger,
  disabled = false,
  onToggle,
  className,
}) => {
  // Initialize state from localStorage or default
  const [isExpanded, setIsExpanded] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`collapsible_${storageKey}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultExpanded;
  });

  // Save preference to localStorage
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`collapsible_${storageKey}`, String(isExpanded));
    }
  }, [isExpanded, storageKey]);

  const handleToggle = () => {
    if (disabled) return;
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        isExpanded ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-50/50',
        disabled && 'opacity-50',
        className
      )}
    >
      {/* Header / Trigger */}
      {customTrigger || (
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between p-4 text-right transition-colors',
            !disabled && 'hover:bg-neutral-100',
            isExpanded && 'border-b border-neutral-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                isExpanded ? 'bg-rose-100 text-coral-600' : 'bg-neutral-200 text-neutral-500'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900">{title}</span>
                {badge && (
                  <Badge variant={badgeVariant} className="text-xs">
                    {badge}
                  </Badge>
                )}
                {fieldCount !== undefined && filledCount !== undefined && filledCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    {filledCount}/{fieldCount} معبأ
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExpanded ? (
              <EyeOff className="h-4 w-4 text-neutral-400" />
            ) : (
              <Eye className="h-4 w-4 text-neutral-400" />
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-neutral-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-neutral-400" />
            )}
          </div>
        </button>
      )}

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Preset variants for common use cases
interface AdvancedOptionsProps {
  children: React.ReactNode;
  title?: string;
  storageKey?: string;
  fieldCount?: number;
  filledCount?: number;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  children,
  title = 'خيارات متقدمة',
  storageKey = 'advanced_options',
  fieldCount,
  filledCount,
}) => (
  <CollapsibleSection
    title={title}
    description="إعدادات إضافية اختيارية"
    badge="اختياري"
    badgeVariant="secondary"
    icon={Settings}
    storageKey={storageKey}
    fieldCount={fieldCount}
    filledCount={filledCount}
  >
    {children}
  </CollapsibleSection>
);

export const OptionalFields: React.FC<AdvancedOptionsProps> = ({
  children,
  title = 'حقول إضافية',
  storageKey = 'optional_fields',
  fieldCount,
  filledCount,
}) => (
  <CollapsibleSection
    title={title}
    description="معلومات إضافية غير مطلوبة"
    badge="اختياري"
    badgeVariant="outline"
    icon={Info}
    storageKey={storageKey}
    fieldCount={fieldCount}
    filledCount={filledCount}
  >
    {children}
  </CollapsibleSection>
);

export default CollapsibleSection;

