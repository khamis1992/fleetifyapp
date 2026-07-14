import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle,
  Eye,
  FileWarning,
  MessageCircle,
  Phone,
  Send,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TrafficViolation } from '@/hooks/useTrafficViolations';
import { sendWhatsAppMessage } from '@/utils/whatsappWebSender';

const DEFAULT_TEST_PHONE = '66707063';
const UNKNOWN_VALUE = 'غير محدد';

interface TrafficViolationReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: TrafficViolation[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  contractNumber?: string;
  contractDate?: string;
  onSuccess?: () => void;
}

interface CustomerViolationsGroup {
  customerId: string;
  customerName: string;
  customerPhone: string;
  violations: TrafficViolation[];
  totalAmount: number;
  vehiclePlate: string;
  vehicleModel: string;
  contractNumber: string;
  contractDate: string;
}

interface SendProgress {
  current: number;
  total: number;
  results: Array<{ name: string; success: boolean }>;
}

const formatDate = (value?: string) => {
  if (!value) return UNKNOWN_VALUE;
  const date = new Date(value);
  return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: ar }) : UNKNOWN_VALUE;
};

const getCustomerName = (violation: TrafficViolation) => {
  const customer = violation.customers || violation.contracts?.customers;
  if (!customer) return UNKNOWN_VALUE;
  const individualName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  return individualName || customer.company_name || UNKNOWN_VALUE;
};

const getCustomerPhone = (violation: TrafficViolation) =>
  violation.customers?.phone || violation.contracts?.customers?.phone || '';

const getVehicleModel = (violation: TrafficViolation) => {
  const vehicle = violation.vehicles;
  if (!vehicle) return UNKNOWN_VALUE;
  return `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() || UNKNOWN_VALUE;
};

const getViolationAmount = (violation: TrafficViolation) => {
  const amount = Number(violation.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const buildReminderMessage = (group: CustomerViolationsGroup, dueDays: number) => {
  const violationsList = group.violations
    .map((violation) => {
      const plate = violation.vehicles?.plate_number || violation.vehicle_plate || UNKNOWN_VALUE;
      return [
        `• رقم المخالفة: ${violation.penalty_number || UNKNOWN_VALUE}`,
        `  التاريخ: ${formatDate(violation.penalty_date)}`,
        `  المركبة: ${plate}`,
        `  النوع: ${violation.violation_type || violation.reason || UNKNOWN_VALUE}`,
        `  القيمة: ${getViolationAmount(violation).toLocaleString('ar-QA')} ر.ق`,
      ].join('\n');
    })
    .join('\n\n');

  return `السلام عليكم ورحمة الله وبركاته،

السيد/السيدة ${group.customerName} المحترم/ة،

نود تذكيركم بوجود مخالفات مرورية مستحقة مرتبطة بعقد إيجار المركبة الموضح أدناه:

رقم المركبة: ${group.vehiclePlate}
نوع المركبة: ${group.vehicleModel}
رقم العقد: ${group.contractNumber}
تاريخ العقد: ${group.contractDate}

تفاصيل المخالفات:
${violationsList}

إجمالي المبلغ المستحق: ${group.totalAmount.toLocaleString('ar-QA')} ر.ق

يرجى سداد المبلغ خلال ${dueDays} أيام عمل، أو التواصل معنا عند وجود أي استفسار.

شركة العراف لتأجير السيارات
رقم التواصل: 31151919`;
};

const buildGroups = (violations: TrafficViolation[]) => {
  const groups = new Map<string, CustomerViolationsGroup>();

  violations.forEach((violation) => {
    const customerId =
      violation.customer_id ||
      violation.contracts?.customer_id ||
      violation.contracts?.customers?.id;
    if (!customerId) return;

    const customerName = getCustomerName(violation);
    if (customerName === UNKNOWN_VALUE) return;

    if (!groups.has(customerId)) {
      const vehicle = violation.vehicles;
      groups.set(customerId, {
        customerId,
        customerName,
        customerPhone: getCustomerPhone(violation),
        violations: [],
        totalAmount: 0,
        vehiclePlate: vehicle?.plate_number || violation.vehicle_plate || UNKNOWN_VALUE,
        vehicleModel: getVehicleModel(violation),
        contractNumber: violation.contracts?.contract_number || UNKNOWN_VALUE,
        contractDate: formatDate(violation.contracts?.start_date),
      });
    }

    const group = groups.get(customerId);
    if (!group) return;
    group.violations.push(violation);
    group.totalAmount += getViolationAmount(violation);
    if (!group.customerPhone) group.customerPhone = getCustomerPhone(violation);
  });

  return Array.from(groups.values());
};

export const TrafficViolationReminderDialog: React.FC<
  TrafficViolationReminderDialogProps
> = ({
  open,
  onOpenChange,
  violations,
  customerId: propCustomerId,
  customerName: propCustomerName,
  customerPhone: propCustomerPhone,
  vehiclePlate: propVehiclePlate,
  vehicleModel: propVehicleModel,
  contractNumber: propContractNumber,
  contractDate: propContractDate,
  onSuccess,
}) => {
  const [dueDays, setDueDays] = useState(7);
  const [isTestMode, setIsTestMode] = useState(true);
  const [testPhone, setTestPhone] = useState(DEFAULT_TEST_PHONE);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);

  const customerGroups = useMemo(() => buildGroups(violations || []), [violations]);
  const isSingleCustomerMode = Boolean(propCustomerId || propCustomerName);

  const singleCustomerGroup = useMemo<CustomerViolationsGroup | null>(() => {
    if (!isSingleCustomerMode || !violations?.length) return null;
    const firstViolation = violations[0];
    const generatedGroup = buildGroups(violations)[0];
    const vehicle = firstViolation.vehicles;

    return {
      customerId:
        propCustomerId ||
        generatedGroup?.customerId ||
        firstViolation.customer_id ||
        `single-${firstViolation.id}`,
      customerName: propCustomerName || generatedGroup?.customerName || UNKNOWN_VALUE,
      customerPhone: propCustomerPhone || generatedGroup?.customerPhone || '',
      violations,
      totalAmount: violations.reduce(
        (total, violation) => total + getViolationAmount(violation),
        0
      ),
      vehiclePlate:
        propVehiclePlate || vehicle?.plate_number || firstViolation.vehicle_plate || UNKNOWN_VALUE,
      vehicleModel: propVehicleModel || getVehicleModel(firstViolation),
      contractNumber:
        propContractNumber || firstViolation.contracts?.contract_number || UNKNOWN_VALUE,
      contractDate:
        propContractDate || formatDate(firstViolation.contracts?.start_date),
    };
  }, [
    isSingleCustomerMode,
    propContractDate,
    propContractNumber,
    propCustomerId,
    propCustomerName,
    propCustomerPhone,
    propVehicleModel,
    propVehiclePlate,
    violations,
  ]);

  const selectedGroups = useMemo(
    () => customerGroups.filter((group) => selectedCustomers.has(group.customerId)),
    [customerGroups, selectedCustomers]
  );
  const previewGroup = singleCustomerGroup || selectedGroups[0] || customerGroups[0] || null;
  const previewMessage = previewGroup ? buildReminderMessage(previewGroup, dueDays) : '';

  useEffect(() => {
    if (!open) {
      setSendProgress(null);
      setSelectedCustomers(new Set());
      return;
    }

    if (!isSingleCustomerMode) {
      setSelectedCustomers(
        new Set(
          customerGroups
            .filter((group) => Boolean(group.customerPhone))
            .map((group) => group.customerId)
        )
      );
    }
  }, [customerGroups, isSingleCustomerMode, open]);

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const groupsToSend = isSingleCustomerMode
        ? singleCustomerGroup
          ? [singleCustomerGroup]
          : []
        : selectedGroups;
      const targets = isTestMode ? (previewGroup ? [previewGroup] : []) : groupsToSend;

      if (!targets.length) throw new Error('لا توجد مخالفات صالحة للإرسال.');
      if (isTestMode && !testPhone.trim()) throw new Error('أدخل رقم هاتف الاختبار.');
      if (!isTestMode && targets.some((group) => !group.customerPhone)) {
        throw new Error('يوجد عميل محدد دون رقم هاتف.');
      }

      const results: SendProgress['results'] = [];
      let sent = 0;
      let failed = 0;
      setSendProgress({ current: 0, total: targets.length, results: [] });

      for (const [index, group] of targets.entries()) {
        const phone = isTestMode ? testPhone.trim() : group.customerPhone;
        try {
          const result = await sendWhatsAppMessage({
            phone,
            message: buildReminderMessage(group, dueDays),
            customerName: isTestMode ? 'اختبار تذكير المخالفات' : group.customerName,
          });
          if (!result.success) throw new Error(result.error || 'فشل إرسال الرسالة.');
          sent += 1;
          results.push({ name: group.customerName, success: true });
        } catch (error) {
          console.error('Error sending traffic violation reminder:', error);
          failed += 1;
          results.push({ name: group.customerName, success: false });
        }

        setSendProgress({ current: index + 1, total: targets.length, results: [...results] });
        if (!isTestMode && index < targets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (sent === 0) throw new Error('لم يتم إرسال أي رسالة بنجاح.');
      return { sent, failed, isTest: isTestMode };
    },
    onSuccess: (result) => {
      if (result.isTest) {
        toast.success(`تم إرسال رسالة الاختبار إلى ${testPhone.trim()}`);
      } else {
        toast.success(
          `تم إرسال ${result.sent} رسالة${result.failed ? `، وتعذر إرسال ${result.failed}` : ''}`
        );
        onOpenChange(false);
        onSuccess?.();
      }
      setSendProgress(null);
    },
    onError: (error: unknown) => {
      console.error('Error sending traffic violation reminders:', error);
      toast.error(error instanceof Error ? error.message : 'فشل إرسال التذكيرات.');
      setSendProgress(null);
    },
  });

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers((current) => {
      const next = new Set(current);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const selectableGroups = customerGroups.filter((group) => Boolean(group.customerPhone));
  const allSelected =
    selectableGroups.length > 0 &&
    selectableGroups.every((group) => selectedCustomers.has(group.customerId));

  const toggleSelectAll = () => {
    setSelectedCustomers(
      allSelected ? new Set() : new Set(selectableGroups.map((group) => group.customerId))
    );
  };

  if (!violations?.length) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>لا توجد مخالفات</DialogTitle>
            <DialogDescription>لم يتم تحديد مخالفات لإرسال تذكير عنها.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const liveSendDisabled = isSingleCustomerMode
    ? !singleCustomerGroup?.customerPhone
    : selectedGroups.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[700px]"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100">
              <FileWarning className="h-5 w-5 text-amber-700" />
            </span>
            إرسال تذكير بالمخالفات المرورية
          </DialogTitle>
          <DialogDescription>
            راجع المستلمين والرسالة قبل الانتقال من وضع الاختبار إلى الإرسال الفعلي.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-5 py-4">
            {isSingleCustomerMode && singleCustomerGroup && (
              <div className="rounded-md border bg-amber-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-700" />
                    <span className="font-medium">{singleCustomerGroup.customerName}</span>
                  </div>
                  <Badge variant="secondary">
                    {singleCustomerGroup.violations.length} مخالفة
                  </Badge>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>{singleCustomerGroup.vehiclePlate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span dir="ltr">{singleCustomerGroup.customerPhone || 'لا يوجد هاتف'}</span>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">الإجمالي</span>
                  <span className="font-bold text-amber-800">
                    {singleCustomerGroup.totalAmount.toLocaleString('ar-QA')} ر.ق
                  </span>
                </div>
              </div>
            )}

            {!isSingleCustomerMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> العملاء ({customerGroups.length})
                  </Label>
                  <Button type="button" variant="ghost" size="sm" onClick={toggleSelectAll}>
                    {allSelected ? 'إلغاء تحديد الكل' : 'تحديد أصحاب أرقام الهاتف'}
                  </Button>
                </div>
                <div className="max-h-[210px] overflow-y-auto rounded-md border">
                  {customerGroups.map((group) => (
                    <div
                      key={group.customerId}
                      className="flex items-center gap-3 border-b p-3 last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedCustomers.has(group.customerId)}
                        disabled={!group.customerPhone}
                        onCheckedChange={() => toggleCustomer(group.customerId)}
                        aria-label={`تحديد ${group.customerName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{group.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.violations.length} مخالفة · {group.customerPhone || 'لا يوجد هاتف'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-amber-800">
                        {group.totalAmount.toLocaleString('ar-QA')} ر.ق
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="violation-due-days" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> مهلة السداد بالأيام
                </Label>
                <Input
                  id="violation-due-days"
                  type="number"
                  min={1}
                  max={30}
                  value={dueDays}
                  onChange={(event) =>
                    setDueDays(Math.min(30, Math.max(1, Number(event.target.value) || 1)))
                  }
                />
              </div>
              {isTestMode && (
                <div className="space-y-2">
                  <Label htmlFor="violation-test-phone">رقم هاتف الاختبار</Label>
                  <Input
                    id="violation-test-phone"
                    dir="ltr"
                    inputMode="tel"
                    value={testPhone}
                    onChange={(event) => setTestPhone(event.target.value)}
                  />
                </div>
              )}
            </div>

            <Alert className={isTestMode ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {isTestMode
                    ? 'وضع الاختبار: ستُرسل رسالة واحدة إلى رقم الاختبار.'
                    : 'الإرسال الفعلي: ستُرسل الرسائل مباشرة إلى العملاء المحددين.'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTestMode((current) => !current)}
                >
                  {isTestMode ? 'تفعيل الإرسال الفعلي' : 'العودة إلى الاختبار'}
                </Button>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> معاينة الرسالة
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview((current) => !current)}
                  title={showPreview ? 'إخفاء المعاينة' : 'عرض المعاينة'}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              {showPreview && (
                <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 font-sans text-sm leading-7">
                  {previewMessage}
                </pre>
              )}
            </div>

            {!isTestMode && liveSendDisabled && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  اختر عميلًا لديه رقم هاتف، أو حدّث هاتف العميل قبل الإرسال.
                </AlertDescription>
              </Alert>
            )}

            {sendProgress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>جاري الإرسال</span>
                  <span>{sendProgress.current} / {sendProgress.total}</span>
                </div>
                <Progress value={(sendProgress.current / sendProgress.total) * 100} />
                {sendProgress.results.map((result, index) => (
                  <div key={`${result.name}-${index}`} className="flex items-center gap-2 text-xs">
                    {result.success ? (
                      <CheckCircle className="h-3 w-3 text-green-700" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-700" />
                    )}
                    <span>{result.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendRemindersMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => sendRemindersMutation.mutate()}
            disabled={
              sendRemindersMutation.isPending ||
              (isTestMode ? !testPhone.trim() || !previewGroup : liveSendDisabled)
            }
            className={isTestMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-green-700 hover:bg-green-800'}
          >
            {sendRemindersMutation.isPending ? (
              <LoadingSpinner className="ml-2 h-4 w-4" />
            ) : (
              <Send className="ml-2 h-4 w-4" />
            )}
            {isTestMode ? 'إرسال اختبار' : 'إرسال التذكيرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrafficViolationReminderDialog;
