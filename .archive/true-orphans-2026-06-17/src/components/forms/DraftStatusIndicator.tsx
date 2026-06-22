import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { SaveStatus, getRelativeTime } from '@/hooks/useFormDraft';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DraftStatusIndicatorProps {
  /** Current save status */
  saveStatus: SaveStatus;
  /** Whether a draft exists */
  hasDraft: boolean;
  /** Timestamp of last save */
  draftTimestamp: Date | null;
  /** Callback to restore draft */
  onRestoreDraft?: () => void;
  /** Callback to delete draft */
  onDeleteDraft?: () => void;
  /** Optional className */
  className?: string;
  /** Show restore button (default: true) */
  showRestoreButton?: boolean;
}

/**
 * DraftStatusIndicator - Visual indicator for form draft status
 *
 * Shows:
 * - Saving indicator when auto-saving
 * - Saved checkmark after successful save
 * - Draft timestamp
 * - Restore draft button
 * - Delete draft button
 *
 * Usage:
 * ```tsx
 * const { saveStatus, hasDraft, draftTimestamp, loadDraft, clearDraft } = useFormDraft({
 *   formId: 'customer-form'
 * });
 *
 * <DraftStatusIndicator
 *   saveStatus={saveStatus}
 *   hasDraft={hasDraft}
 *   draftTimestamp={draftTimestamp}
 *   onRestoreDraft={loadDraft}
 *   onDeleteDraft={clearDraft}
 * />
 * ```
 *
 * Part of K1 Fix #009 - Auto-save UI
 */
export const DraftStatusIndicator: React.FC<DraftStatusIndicatorProps> = ({
  saveStatus,
  hasDraft,
  draftTimestamp,
  onRestoreDraft,
  onDeleteDraft,
  className = '',
  showRestoreButton = true,
}) => {
  const getStatusContent = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'جاري الحفظ...',
          variant: 'secondary' as const,
          tooltip: 'يتم حفظ التغييرات الآن',
        };
      case 'saved':
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          text: 'تم الحفظ',
          variant: 'outline' as const,
          tooltip: draftTimestamp ? `آخر حفظ: ${getRelativeTime(draftTimestamp)}` : 'تم حفظ التغييرات',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'خطأ في الحفظ',
          variant: 'destructive' as const,
          tooltip: 'فشل الحفظ التلقائي',
        };
      default:
        if (hasDraft && draftTimestamp) {
          return {
            icon: <Clock className="h-3 w-3" />,
            text: 'مسودة متاحة',
            variant: 'secondary' as const,
            tooltip: `آخر حفظ: ${getRelativeTime(draftTimestamp)}`,
          };
        }
        return null;
    }
  };

  const statusContent = getStatusContent();

  if (!statusContent && !hasDraft) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Badge */}
      {statusContent && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={statusContent.variant} className="gap-1.5 text-xs">
              {statusContent.icon}
              {statusContent.text}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{statusContent.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Restore Draft Button */}
      {hasDraft && showRestoreButton && onRestoreDraft && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={onRestoreDraft}
            >
              <Clock className="h-3 w-3" />
              استعادة المسودة
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              استعادة البيانات المحفوظة
              {draftTimestamp && (
                <> ({getRelativeTime(draftTimestamp)})</>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Delete Draft Button */}
      {hasDraft && onDeleteDraft && (
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">حذف المسودة</p>
            </TooltipContent>
          </Tooltip>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المسودة؟</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف المسودة المحفوظة؟ لن تتمكن من استعادة هذه البيانات.
                {draftTimestamp && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    آخر حفظ: {draftTimestamp.toLocaleString('en-US')}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeleteDraft(true)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف المسودة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

/**
 * Compact version for space-constrained UIs
 */
export const DraftStatusBadge: React.FC<{
  saveStatus: SaveStatus;
  draftTimestamp?: Date | null;
}> = ({ saveStatus, draftTimestamp }) => {
  if (saveStatus === 'idle') return null;

  const content = {
    saving: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: 'حفظ...' },
    saved: { icon: <CheckCircle2 className="h-3 w-3" />, text: 'تم' },
    error: { icon: <AlertCircle className="h-3 w-3" />, text: 'خطأ' },
  }[saveStatus];

  if (!content) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={saveStatus === 'error' ? 'destructive' : 'outline'}
          className="gap-1 text-xs h-6"
        >
          {content.icon}
          {content.text}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {saveStatus === 'saved' && draftTimestamp
            ? `تم الحفظ ${getRelativeTime(draftTimestamp)}`
            : saveStatus === 'saving'
            ? 'جاري الحفظ التلقائي'
            : 'فشل الحفظ التلقائي'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
