import { usePermissionCheck } from "./usePermissionCheck";

export interface JournalEntryPermissions {
  canCreateDraft: boolean;
  canSubmitForReview: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPost: boolean;
  canReverse: boolean;
  canCancel: boolean;
  canViewAllStatuses: boolean;
  isLoading: boolean;
}

/**
 * Hook للتحقق من صلاحيات workflow القيود المحاسبية
 */
export function useJournalEntryPermissions(): JournalEntryPermissions {
  const { data: createDraftData, isLoading: loadingCreate } = usePermissionCheck('finance.journal.create_draft');
  const { data: submitData, isLoading: loadingSubmit } = usePermissionCheck('finance.journal.submit_for_review');
  const { data: reviewData, isLoading: loadingReview } = usePermissionCheck('finance.journal.review');
  const { data: approveData, isLoading: loadingApprove } = usePermissionCheck('finance.journal.approve');
  const { data: postData, isLoading: loadingPost } = usePermissionCheck('finance.journal.post');
  const { data: reverseData, isLoading: loadingReverse } = usePermissionCheck('finance.journal.reverse');
  const { data: cancelData, isLoading: loadingCancel } = usePermissionCheck('finance.journal.cancel');
  const { data: viewAllData, isLoading: loadingViewAll } = usePermissionCheck('finance.journal.view_all_statuses');

  const isLoading = loadingCreate || loadingSubmit || loadingReview || loadingApprove || 
                    loadingPost || loadingReverse || loadingCancel || loadingViewAll;

  return {
    canCreateDraft: createDraftData?.hasPermission || false,
    canSubmitForReview: submitData?.hasPermission || false,
    canReview: reviewData?.hasPermission || false,
    canApprove: approveData?.hasPermission || false,
    canPost: postData?.hasPermission || false,
    canReverse: reverseData?.hasPermission || false,
    canCancel: cancelData?.hasPermission || false,
    canViewAllStatuses: viewAllData?.hasPermission || false,
    isLoading
  };
}

/**
 * Hook للتحقق من إمكانية تغيير حالة قيد معين
 */
export function useCanChangeJournalEntryStatus(
  currentStatus: string,
  targetStatus: string
): { canChange: boolean; reason?: string } {
  const permissions = useJournalEntryPermissions();

  if (permissions.isLoading) {
    return { canChange: false, reason: 'جاري التحميل...' };
  }

  // Define valid transitions and required permissions
  const transitions: Record<string, Record<string, { permission: keyof JournalEntryPermissions; label: string }>> = {
    draft: {
      under_review: { permission: 'canSubmitForReview', label: 'تقديم للمراجعة' },
      cancelled: { permission: 'canCancel', label: 'إلغاء' }
    },
    under_review: {
      approved: { permission: 'canApprove', label: 'اعتماد' },
      draft: { permission: 'canReview', label: 'إرجاع لمسودة' },
      cancelled: { permission: 'canCancel', label: 'إلغاء' }
    },
    approved: {
      posted: { permission: 'canPost', label: 'ترحيل' },
      under_review: { permission: 'canReview', label: 'إرجاع للمراجعة' },
      cancelled: { permission: 'canCancel', label: 'إلغاء' }
    },
    posted: {
      reversed: { permission: 'canReverse', label: 'عكس' }
    }
  };

  const transition = transitions[currentStatus]?.[targetStatus];
  
  if (!transition) {
    return { 
      canChange: false, 
      reason: `لا يمكن الانتقال من ${currentStatus} إلى ${targetStatus}` 
    };
  }

  const hasPermission = permissions[transition.permission];
  
  if (!hasPermission) {
    return { 
      canChange: false, 
      reason: `ليس لديك صلاحية ${transition.label}` 
    };
  }

  return { canChange: true };
}

