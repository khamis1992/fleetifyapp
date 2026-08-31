/* eslint-disable react-refresh/only-export-components -- provider and its context hook form one public API */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Car, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  checkRentalEligibility,
  type RentalGuardResult,
} from '@/services/rentalEligibilityGuard';

export interface RentalEligibilityConfirmation {
  result: RentalGuardResult;
  acceptedUnpaidViolations: boolean;
}

interface RentalEligibilityRequest {
  companyId: string;
  vehicleId: string | null | undefined;
  customerId?: string | null;
}

interface RentalViolationOverrideContextValue {
  confirmRentalEligibility: (
    request: RentalEligibilityRequest,
  ) => Promise<RentalEligibilityConfirmation | null>;
}

const RentalViolationOverrideContext = createContext<RentalViolationOverrideContextValue | null>(null);

const formatQar = (amount: number) => new Intl.NumberFormat('ar-QA', {
  maximumFractionDigits: 2,
}).format(amount);

export function RentalViolationOverrideProvider({ children }: { children: React.ReactNode }) {
  const [pendingResult, setPendingResult] = useState<RentalGuardResult | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const resolverRef = useRef<((value: RentalEligibilityConfirmation | null) => void) | null>(null);

  const finish = useCallback((value: RentalEligibilityConfirmation | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setPendingResult(null);
    setAcknowledged(false);
    resolver?.(value);
  }, []);

  useEffect(() => () => resolverRef.current?.(null), []);

  const confirmRentalEligibility = useCallback(async (
    request: RentalEligibilityRequest,
  ): Promise<RentalEligibilityConfirmation | null> => {
    const result = await checkRentalEligibility(request);

    if (result.hardBlockMessages.length > 0) {
      throw new Error(result.message);
    }

    const hasUnpaidViolations = result.vehiclePenalties.count > 0
      || result.customerPenalties.count > 0;
    if (!hasUnpaidViolations) {
      if (result.level === 'warn' && result.message) toast.warning(result.message);
      return { result, acceptedUnpaidViolations: false };
    }

    resolverRef.current?.(null);
    setAcknowledged(false);
    setPendingResult(result);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  return (
    <RentalViolationOverrideContext.Provider value={{ confirmRentalEligibility }}>
      {children}
      <AlertDialog
        open={Boolean(pendingResult)}
        onOpenChange={(open) => {
          if (!open) finish(null);
        }}
      >
        <AlertDialogContent dir="rtl" className="max-w-lg rounded-2xl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              توجد مخالفات غير مسددة
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-right text-sm text-slate-600">
                <p>
                  يمكن إنشاء العقد، لكن يجب الاطلاع على المخالفات وتأكيد الموافقة الصريحة قبل المتابعة.
                </p>
                {pendingResult && pendingResult.vehiclePenalties.count > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <Car className="h-4 w-4" /> مخالفات المركبة
                    </span>
                    <span className="font-bold text-amber-800">
                      {pendingResult.vehiclePenalties.count} مخالفة — {formatQar(pendingResult.vehiclePenalties.total)} ر.ق
                    </span>
                  </div>
                )}
                {pendingResult && pendingResult.customerPenalties.count > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <UserRound className="h-4 w-4" /> مخالفات العميل
                    </span>
                    <span className="font-bold text-amber-800">
                      {pendingResult.customerPenalties.count} مخالفة — {formatQar(pendingResult.customerPenalties.total)} ر.ق
                    </span>
                  </div>
                )}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-slate-800">
                  <Checkbox
                    checked={acknowledged}
                    onCheckedChange={(checked) => setAcknowledged(checked === true)}
                    aria-label="الموافقة على إنشاء العقد رغم المخالفات"
                  />
                  <span className="leading-6">
                    اطلعت على المخالفات وأوافق على إنشاء العقد رغم وجودها.
                  </span>
                </label>
                <p className="text-xs text-slate-500">
                  ستُسجّل هذه الموافقة باسم الموظف وفي سجل تدقيق العقد.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel onClick={() => finish(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={!acknowledged || !pendingResult}
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (!pendingResult || !acknowledged) return;
                finish({ result: pendingResult, acceptedUnpaidViolations: true });
              }}
            >
              تأكيد وإنشاء العقد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RentalViolationOverrideContext.Provider>
  );
}

export function useRentalViolationOverride() {
  const context = useContext(RentalViolationOverrideContext);
  if (!context) {
    throw new Error('useRentalViolationOverride must be used within RentalViolationOverrideProvider');
  }
  return context;
}
