import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Link2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { DuplicateContract } from '@/hooks/useContractDuplicateCheck';

interface InlineDuplicateSuggestionProps {
  /** Duplicate contracts found */
  duplicates: DuplicateContract[];

  /** Whether this is an exact match (exact contract number) */
  isExactMatch?: boolean;

  /** Callback when user clicks to view full details */
  onViewDetails?: () => void;

  /** Callback when user dismisses the suggestion */
  onDismiss?: () => void;

  /** Callback when user selects a contract (e.g., to navigate to it) */
  onSelectDuplicate?: (duplicate: DuplicateContract) => void;

  /** Show action to link to existing contract */
  showLinkAction?: boolean;

  /** Callback when user decides to link to existing contract */
  onLinkToExisting?: (duplicate: DuplicateContract) => void;
}

/**
 * Inline Duplicate Suggestion Component
 * 
 * Displays a non-disruptive inline suggestion for potential duplicate contracts
 * instead of a blocking modal. Allows users to continue typing while seeing suggestions.
 * 
 * Features:
 * - Expandable list of similar contracts
 * - Shows top 3 suggestions inline, with option to expand
 * - Different styling for exact matches vs similar matches
 * - Dismissible suggestion
 * - Links to view more details
 * - Quick link action to existing contracts
 * - Smooth animations and transitions
 */
export const InlineDuplicateSuggestion: React.FC<InlineDuplicateSuggestionProps> = ({
  duplicates,
  isExactMatch = false,
  onViewDetails,
  onDismiss,
  onSelectDuplicate,
  showLinkAction = false,
  onLinkToExisting,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  if (isDismissed || !duplicates || duplicates.length === 0) {
    return null;
  }

  const displayedDuplicates = isExpanded ? duplicates : duplicates.slice(0, 3);
  const hiddenCount = duplicates.length - 3;
  const showExpandButton = duplicates.length > 3;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ar });
    } catch {
      return dateString;
    }
  };

  const getContractTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      daily_rental: 'إيجار يومي',
      weekly_rental: 'إيجار أسبوعي',
      monthly_rental: 'إيجار شهري',
      yearly_rental: 'إيجار سنوي',
    };
    return typeMap[type] || type;
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-slate-100 text-slate-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      sent: 'bg-purple-100 text-purple-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-slate-200 text-slate-700',
    };
    return statusMap[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'نشط',
      draft: 'مسودة',
      pending_approval: 'قيد المراجعة',
      approved: 'موافق عليه',
      sent: 'مرسل',
      expired: 'منتهي الصلاحية',
      cancelled: 'ملغى',
    };
    return statusMap[status] || status;
  };

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 overflow-hidden transition-all duration-200',
        isExactMatch
          ? 'border-l-destructive bg-destructive/5 border border-destructive/20'
          : 'border-l-warning bg-warning/5 border border-warning/20'
      )}
      role="region"
      aria-label="Duplicate contract suggestions"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div
              className={cn(
                'mt-0.5 flex-shrink-0',
                isExactMatch ? 'text-destructive' : 'text-warning'
              )}
            >
              <AlertCircle className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isExactMatch ? (
                <p className="text-sm font-semibold text-foreground">
                  العقد رقم <span className="font-mono">{duplicates[0].contract_number}</span> موجود بالفعل في النظام
                </p>
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  هل تقصد{' '}
                  {duplicates.length === 1
                    ? `العقد "${duplicates[0].contract_number}"؟`
                    : `أحد هذه العقود؟`}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {isExactMatch
                  ? 'يمكنك متابعة الإنشاء على أي حال، أو مراجعة العقد الموجود'
                  : 'تحقق من القائمة أدناه قبل المتابعة'}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
            aria-label="Close duplicate suggestion"
            type="button"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Duplicate Items List */}
        <div className="space-y-2 mt-3">
          {displayedDuplicates.map((duplicate, index) => (
            <div
              key={`${duplicate.id}-${index}`}
              className="rounded-md border bg-card/50 p-3 hover:bg-card/80 transition-colors group"
            >
              {/* Contract Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      رقم: {duplicate.contract_number}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getStatusColor(duplicate.status))}
                    >
                      {getStatusLabel(duplicate.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    العميل: {duplicate.customer_name}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {showLinkAction && onLinkToExisting && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onLinkToExisting(duplicate)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Link to this contract"
                      type="button"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onSelectDuplicate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectDuplicate(duplicate)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="View contract"
                      type="button"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Contract Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>النوع: {getContractTypeLabel(duplicate.contract_type)}</div>
                <div>المبلغ: {duplicate.contract_amount.toLocaleString()} د.ك</div>
                <div>من: {formatDate(duplicate.start_date)}</div>
                <div>إلى: {formatDate(duplicate.end_date)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {showExpandButton && (
          <button
            onClick={handleToggleExpand}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1 mt-2"
            type="button"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                إخفاء {hiddenCount} عقود إضافية
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                عرض {hiddenCount} عقود إضافية
              </>
            )}
          </button>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border/50">
          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewDetails}
              className="text-xs h-7"
              type="button"
            >
              عرض التفاصيل الكاملة
            </Button>
          )}

          {isExactMatch && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
              type="button"
            >
              متابعة على أي حال
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineDuplicateSuggestion;
