import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileActionButtonsProps {
  onCreateContract: () => void;
  onShowMore?: () => void;
  className?: string;
}

export const MobileActionButtons: React.FC<MobileActionButtonsProps> = ({
  onCreateContract,
  onShowMore,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* More Actions Button */}
      {onShowMore && (
        <Button
          variant="outline"
          size="lg"
          onClick={onShowMore}
          className="h-12 px-4 rounded-xl shadow-sm border-2 font-medium"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      )}
      
      {/* Primary Create Button */}
      <Button
        size="lg"
        onClick={onCreateContract}
        className="flex-1 h-12 gap-3 rounded-xl shadow-lg font-medium text-base min-w-0"
      >
        <Plus className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">إنشاء عقد جديد</span>
      </Button>
    </div>
  );
};

/* Floating Action Button for Mobile */
export const FloatingCreateButton: React.FC<{ onCreateContract: () => void }> = ({
  onCreateContract
}) => {
  return (
    <Button
      size="lg"
      onClick={onCreateContract}
      className="fixed bottom-20 left-4 h-14 w-14 rounded-full shadow-2xl z-50 p-0"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};