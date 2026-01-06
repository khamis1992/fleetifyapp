/**
 * InspectionReminders Component
 *
 * Purpose: Automatic reminders for vehicle inspections
 * - Check-in reminder during contract activation
 * - Check-out reminder when contract ends
 * - Smart notifications based on contract status
 *
 * Impact: Ensures no contract goes without proper vehicle inspection
 *
 * @module components/contracts/InspectionReminders
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, CheckCircle, ClipboardCheck, Calendar, Bell } from 'lucide-react';
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { IntegratedVehicleInspection } from '@/components/vehicles/IntegratedVehicleInspection';
import { differenceInDays, isBefore, isAfter, parseISO } from 'date-fns';
import { toast } from 'sonner';

/**
 * InspectionReminder Props
 */
interface InspectionReminderProps {
  /** Contract data */
  contract: {
    id: string;
    contract_number: string;
    vehicle_id: string;
    status: string;
    start_date: string;
    end_date: string;
    customer_name?: string;
  };
  /** Vehicle data */
  vehicle?: {
    plate_number: string;
    make: string;
    model: string;
    year?: number;
  };
  /** Callback when check-in completed */
  onCheckInComplete?: () => void;
  /** Callback when check-out completed */
  onCheckOutComplete?: () => void;
  /** Show as persistent notification */
  persistent?: boolean;
}

/**
 * InspectionReminder Component
 *
 * @example
 * <InspectionReminder
 *   contract={contract}
 *   vehicle={vehicle}
 *   onCheckInComplete={() => activateContract()}
 * />
 */
export function InspectionReminder({
  contract,
  vehicle,
  onCheckInComplete,
  onCheckOutComplete,
  persistent = false,
}: InspectionReminderProps) {
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Fetch existing inspections
  const { data: inspections } = useVehicleInspections({
    contractId: contract.id,
  });

  const hasCheckIn = inspections?.some((i) => i.inspection_type === 'check_in');
  const hasCheckOut = inspections?.some((i) => i.inspection_type === 'check_out');

  // Calculate days until end
  const daysUntilEnd = differenceInDays(parseISO(contract.end_date), new Date());
  const isEnding = daysUntilEnd <= 7 && daysUntilEnd >= 0;
  const hasEnded = isBefore(parseISO(contract.end_date), new Date());

  // Check if check-in is needed (contract is active but no check-in)
  const needsCheckIn = contract.status === 'active' && !hasCheckIn;

  // Check if check-out is needed (contract ending soon or ended, no check-out)
  const needsCheckOut = (isEnding || hasEnded) && hasCheckIn && !hasCheckOut;

  // Auto-show dialog on mount if needed and persistent
  useEffect(() => {
    if (persistent && needsCheckIn && !dismissed) {
      toast.warning('يرجى إجراء فحص استلام المركبة', {
        description: `العقد ${contract.contract_number} نشط ولكن لم يتم فحص الاستلام`,
        action: {
          label: 'فحص الآن',
          onClick: () => setShowCheckInDialog(true),
        },
        duration: 10000,
      });
    }

    if (persistent && needsCheckOut && !dismissed) {
      toast.warning('يرجى إجراء فحص تسليم المركبة', {
        description: hasEnded
          ? `العقد ${contract.contract_number} انتهى - يجب فحص التسليم`
          : `العقد ${contract.contract_number} سينتهي خلال ${daysUntilEnd} أيام`,
        action: {
          label: 'فحص الآن',
          onClick: () => setShowCheckOutDialog(true),
        },
        duration: 10000,
      });
    }
  }, [persistent, needsCheckIn, needsCheckOut, dismissed]);

  // Don't show if dismissed and not persistent
  if (dismissed && !persistent) {
    return null;
  }

  // Don't show if no reminders needed
  if (!needsCheckIn && !needsCheckOut) {
    return null;
  }

  return (
    <>
      {/* Check-In Reminder */}
      {needsCheckIn && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            تنبيه: فحص الاستلام مطلوب
            <Badge variant="destructive" className="animate-pulse">
              عاجل
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <p>
                العقد <strong>{contract.contract_number}</strong> نشط ولكن لم يتم إجراء فحص استلام المركبة.
              </p>
              <p className="text-sm">
                يرجى إجراء الفحص لتوثيق حالة المركبة قبل تسليمها للعميل وحماية الشركة من أي نزاعات مستقبلية.
              </p>
              <div className="flex gap-2 mt-3">
                <Button onClick={() => setShowCheckInDialog(true)} size="sm">
                  <ClipboardCheck className="h-4 w-4 ml-2" />
                  إجراء الفحص الآن
                </Button>
                {!persistent && (
                  <Button onClick={() => setDismissed(true)} variant="outline" size="sm">
                    تجاهل
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Check-Out Reminder */}
      {needsCheckOut && (
        <Alert variant={hasEnded ? 'destructive' : 'default'} className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {hasEnded ? 'تنبيه: فحص التسليم متأخر' : 'تذكير: فحص التسليم قريباً'}
            {hasEnded && (
              <Badge variant="destructive" className="animate-pulse">
                متأخر
              </Badge>
            )}
            {!hasEnded && (
              <Badge variant="outline">
                <Calendar className="h-3 w-3 ml-1" />
                {daysUntilEnd} أيام متبقية
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <p>
                العقد <strong>{contract.contract_number}</strong>{' '}
                {hasEnded ? 'انتهى' : `سينتهي خلال ${daysUntilEnd} أيام`}.
              </p>
              <p className="text-sm">
                يرجى إجراء فحص تسليم المركبة لتوثيق حالتها عند الاستلام من العميل والتأكد من عدم وجود أضرار جديدة.
              </p>
              <div className="flex gap-2 mt-3">
                <Button onClick={() => setShowCheckOutDialog(true)} size="sm" variant={hasEnded ? 'destructive' : 'default'}>
                  <ClipboardCheck className="h-4 w-4 ml-2" />
                  إجراء الفحص الآن
                </Button>
                {!persistent && (
                  <Button onClick={() => setDismissed(true)} variant="outline" size="sm">
                    تذكير لاحقاً
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Check-In Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <IntegratedVehicleInspection
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_in"
            vehicle={vehicle}
            contract={{
              contract_number: contract.contract_number,
              start_date: contract.start_date,
              end_date: contract.end_date,
              customer_name: contract.customer_name,
            }}
            onComplete={() => {
              setShowCheckInDialog(false);
              toast.success('تم توثيق استلام المركبة بنجاح');
              onCheckInComplete?.();
            }}
            onCancel={() => setShowCheckInDialog(false)}
            isReminder={true}
          />
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <IntegratedVehicleInspection
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_out"
            vehicle={vehicle}
            contract={{
              contract_number: contract.contract_number,
              start_date: contract.start_date,
              end_date: contract.end_date,
              customer_name: contract.customer_name,
            }}
            onComplete={() => {
              setShowCheckOutDialog(false);
              toast.success('تم توثيق تسليم المركبة بنجاح');
              onCheckOutComplete?.();
            }}
            onCancel={() => setShowCheckOutDialog(false)}
            isReminder={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * InspectionStatusBadge Component
 * Shows inspection status for a contract
 */
interface InspectionStatusBadgeProps {
  contractId: string;
  compact?: boolean;
}

export function InspectionStatusBadge({ contractId, compact = false }: InspectionStatusBadgeProps) {
  const { data: inspections } = useVehicleInspections({ contractId });

  const hasCheckIn = inspections?.some((i) => i.inspection_type === 'check_in');
  const hasCheckOut = inspections?.some((i) => i.inspection_type === 'check_out');

  if (compact) {
    return (
      <div className="flex gap-1">
        {hasCheckIn && (
          <Badge variant="default" className="h-5 px-1.5">
            <CheckCircle className="h-3 w-3" />
          </Badge>
        )}
        {hasCheckOut && (
          <Badge variant="secondary" className="h-5 px-1.5">
            <CheckCircle className="h-3 w-3" />
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Badge variant={hasCheckIn ? 'default' : 'outline'}>
        {hasCheckIn ? (
          <>
            <CheckCircle className="h-3 w-3 ml-1" />
            تم الاستلام
          </>
        ) : (
          <>
            <Clock className="h-3 w-3 ml-1" />
            لم يتم الاستلام
          </>
        )}
      </Badge>
      <Badge variant={hasCheckOut ? 'secondary' : 'outline'}>
        {hasCheckOut ? (
          <>
            <CheckCircle className="h-3 w-3 ml-1" />
            تم التسليم
          </>
        ) : (
          <>
            <Clock className="h-3 w-3 ml-1" />
            لم يتم التسليم
          </>
        )}
      </Badge>
    </div>
  );
}

/**
 * PendingInspectionsList Component
 * Shows all contracts that need inspections
 */
interface PendingInspectionsListProps {
  contracts: Array<{
    id: string;
    contract_number: string;
    vehicle_id: string;
    status: string;
    start_date: string;
    end_date: string;
    customer_name?: string;
    vehicle?: {
      plate_number: string;
      make: string;
      model: string;
    };
  }>;
}

export function PendingInspectionsList({ contracts }: PendingInspectionsListProps) {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  // Fetch all inspections at once using a map, then filter
  const contractInspections = contracts.map((c) => ({
    contract: c,
    inspections: useVehicleInspections({ contractId: c.id }).data,
  }));

  // Filter contracts that need inspections
  const contractsNeedingCheckIn = contractInspections
    .filter(({ inspections }) => {
      return !inspections?.some((i) => i.inspection_type === 'check_in');
    })
    .map(({ contract }) => contract)
    .filter((c) => c.status === 'active');

  const contractsNeedingCheckOut = contractInspections
    .filter(({ inspections, contract }) => {
      const hasCheckIn = inspections?.some((i) => i.inspection_type === 'check_in');
      const hasCheckOut = inspections?.some((i) => i.inspection_type === 'check_out');
      const daysUntilEnd = differenceInDays(parseISO(contract.end_date), new Date());
      return hasCheckIn && !hasCheckOut && daysUntilEnd <= 7;
    })
    .map(({ contract }) => contract);

  const totalPending = contractsNeedingCheckIn.length + contractsNeedingCheckOut.length;

  if (totalPending === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <p className="text-muted-foreground">لا توجد فحوصات معلقة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            الفحوصات المعلقة
            <Badge variant="destructive">{totalPending}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Check-Ins Needed */}
          {contractsNeedingCheckIn.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">فحوصات الاستلام ({contractsNeedingCheckIn.length})</h4>
              {contractsNeedingCheckIn.map((contract) => (
                <Alert key={contract.id}>
                  <ClipboardCheck className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{contract.contract_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.vehicle?.plate_number} - {contract.customer_name}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setSelectedContract(contract.id)}>
                      فحص الآن
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Check-Outs Needed */}
          {contractsNeedingCheckOut.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">فحوصات التسليم ({contractsNeedingCheckOut.length})</h4>
              {contractsNeedingCheckOut.map((contract) => {
                const daysLeft = differenceInDays(parseISO(contract.end_date), new Date());
                return (
                  <Alert key={contract.id} variant={daysLeft <= 3 ? 'destructive' : 'default'}>
                    <Clock className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{contract.contract_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {contract.vehicle?.plate_number} - {daysLeft} أيام متبقية
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setSelectedContract(contract.id)} variant={daysLeft <= 3 ? 'destructive' : 'default'}>
                        فحص الآن
                      </Button>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
