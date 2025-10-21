import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button text */
  actionText?: string;
  /** Primary action handler */
  onAction?: () => void;
  /** Secondary action button text */
  secondaryActionText?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Custom illustration (overrides icon) */
  illustration?: React.ReactNode;
  /** Show in card */
  showCard?: boolean;
  /** Custom icon color */
  iconColor?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  illustration,
  showCard = true,
  iconColor = 'text-muted-foreground',
}) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-center p-8 space-y-4"
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="w-48 h-48 mb-4">{illustration}</div>
      ) : Icon ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className={`p-4 rounded-full bg-muted/30 ${iconColor}`}
        >
          <Icon className="h-16 w-16" strokeWidth={1.5} />
        </motion.div>
      ) : null}

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-foreground"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground max-w-md"
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(actionText || secondaryActionText) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-3 pt-4"
        >
          {actionText && onAction && (
            <Button
              onClick={onAction}
              size="lg"
              className="min-w-[160px]"
            >
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              size="lg"
              className="min-w-[160px]"
            >
              {secondaryActionText}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );

  if (showCard) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return content;
};

export default EmptyState;
