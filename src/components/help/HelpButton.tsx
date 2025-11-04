import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HelpButtonProps {
  title: string;
  content: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  title,
  content,
  size = 'md',
  variant = 'icon',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  if (variant === 'icon') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              sizeClasses[size],
              'rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors',
              className
            )}
            type="button"
          >
            <HelpCircle className={cn(
              size === 'sm' && 'h-4 w-4',
              size === 'md' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6'
            )} />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-right flex items-center justify-end gap-2">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-right space-y-4">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-2',
            className
          )}
          type="button"
        >
          <HelpCircle className="h-4 w-4" />
          مساعدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-right flex items-center justify-end gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-right space-y-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};
