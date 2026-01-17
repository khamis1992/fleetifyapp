import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'warning',
  loading = false
}) => {
  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  const icons = {
    danger: <AlertTriangle className="h-6 w-6 text-destructive" />,
    warning: <AlertCircle className="h-6 w-6 text-orange-600" />,
    info: <Info className="h-6 w-6 text-blue-600" />
  };

  const buttonVariants = {
    danger: 'destructive' as const,
    warning: 'default' as const,
    info: 'default' as const
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icons[variant]}
            <DialogTitle className="text-right">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-right">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            variant={buttonVariants[variant]}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'جاري التنفيذ...' : confirmText}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook to manage confirmation dialog state
 */
export const useConfirmDialog = () => {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'warning'
  });

  const confirm = (params: Omit<typeof state, 'open'>) => {
    setState({ ...params, open: true });
  };

  const handleConfirm = () => {
    state.onConfirm();
    setState((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    setState((prev) => ({ ...prev, open: false }));
  };

  return {
    state,
    confirm,
    handleConfirm,
    handleCancel
  };
};
