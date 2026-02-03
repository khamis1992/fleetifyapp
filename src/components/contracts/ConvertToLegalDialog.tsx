/**
 * Dialog لتحويل العقد إلى الشؤون القانونية
 * يعرض ملخص المبالغ المستحقة ويسمح بإضافة ملاحظات
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Scale,
  AlertTriangle,
  User,
  Car,
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Gavel,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { useConvertToLegal, useExistingLegalCase, useCalculateCaseValue, ContractForLegal, useCloseLegalCase } from '@/hooks/useConvertToLegal';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ConvertToLegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractForLegal | null;
  onSuccess?: () => void;
}

export const ConvertToLegalDialog: React.FC<ConvertToLegalDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [caseType, setCaseType] = useState<'payment_collection' | 'contract_breach' | 'vehicle_damage' | 'other'>('payment_collection');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const convertMutation = useConvertToLegal();
  const closeCaseMutation = useCloseLegalCase();
  
  // التحقق من وجود قضية سابقة
  const { data: existingCase, isLoading: isLoadingExisting } = useExistingLegalCase(contract?.id || '');
  
  // حساب قيمة القضية
  const { data: caseValue, isLoading: isLoadingValue } = useCalculateCaseValue(
    contract?.id || '',
    contract?.company_id
  );

  // حساب الإحصائيات
  const stats = useMemo(() => {
    if (!contract) return null;
    
    const balanceDue = contract.balance_due || 0;
    const lateFines = contract.late_fine_amount || 0;
    const trafficViolations = caseValue?.breakdown?.trafficViolations || 0;
    const totalClaim = balanceDue + lateFines + trafficViolations;

    return {
      balanceDue,
      lateFines,
      trafficViolations,
      totalClaim,
    };
  }, [contract, caseValue]);

  // اسم العميل
  const customerName = useMemo(() => {
    if (!contract?.customer) return 'غير محدد';
    const c = contract.customer;
    if (c.customer_type === 'corporate') {
      return c.company_name_ar || c.company_name || 'شركة';
    }
    return formatCustomerName(c);
  }, [contract]);

  // معلومات المركبة
  const vehicleInfo = useMemo(() => {
    if (!contract?.vehicle) return 'غير محددة';
    const v = contract.vehicle;
    return `${v.make || ''} ${v.model || ''} ${v.year || ''} - ${v.plate_number || ''}`.trim();
  }, [contract]);

  const handleConfirm = () => {
    setShowConfirmDialog(true);
  };

  const handleConvert = async () => {
    if (!contract) return;

    try {
      await convertMutation.mutateAsync({
        contractId: contract.id,
        contract,
        notes,
        priority,
        caseType,
      });

      setShowConfirmDialog(false);
      onOpenChange(false);
      setNotes('');
      onSuccess?.();
    } catch (error) {
      console.error('Convert error:', error);
    }
  };

  const handleViewExistingCase = () => {
    if (existingCase) {
      navigate(`/legal/cases?view=dashboard&case=${existingCase.id}`);
      onOpenChange(false);
    }
  };

  const handleCloseGhostCase = async () => {
    if (!existingCase) return;
    try {
      await closeCaseMutation.mutateAsync({
        caseId: existingCase.id,
        reason: 'إغلاق قضية غير متزامنة (العقد نشط)',
      });
      // The query invalidation in hook will refresh the existingCase data
    } catch (error) {
      console.error('Error closing ghost case:', error);
    }
  };

  if (!contract) return null;

  const isLoading = isLoadingExisting || isLoadingValue;
  const hasExistingActiveCase = existingCase && ['active', 'pending', 'on_hold'].includes(existingCase.case_status);
  const isStateInconsistent = hasExistingActiveCase && contract.status === 'active';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Scale className="h-6 w-6 text-red-600" />
              تحويل العقد للشؤون القانونية
            </DialogTitle>
            <DialogDescription>
              سيتم إنشاء قضية قانونية جديدة وتحديث حالة العقد والمركبة
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* تحذير قضية موجودة */}
              {hasExistingActiveCase && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full">
                      <span>
                        يوجد قضية مفتوحة سابقاً لهذا العقد: <strong>{existingCase.case_number}</strong>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewExistingCase}
                        className="bg-white/50 hover:bg-white"
                      >
                        <ExternalLink className="h-4 w-4 ml-1" />
                        عرض القضية
                      </Button>
                    </div>
                    
                    {isStateInconsistent && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <p className="text-sm mb-2 font-medium">
                          تنبيه: حالة العقد "نشط" ولكن توجد قضية مفتوحة. هذا تعارض في البيانات.
                        </p>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="w-full bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
                          onClick={handleCloseGhostCase}
                          disabled={closeCaseMutation.isPending}
                        >
                          {closeCaseMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin ml-2" />
                          ) : (
                            <XCircle className="h-3 w-3 ml-2" />
                          )}
                          إغلاق القضية السابقة والمتابعة
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* قضية مغلقة سابقة */}
              {existingCase && !hasExistingActiveCase && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    يوجد قضية سابقة مغلقة لهذا العقد: <strong>{existingCase.case_number}</strong>
                    <br />
                    <span className="text-sm">يمكنك إنشاء قضية جديدة إذا لزم الأمر.</span>
                  </AlertDescription>
                </Alert>
              )}

              {/* معلومات العقد */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    معلومات العقد
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">رقم العقد:</span>
                    <span className="font-semibold mr-2">{contract.contract_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحالة:</span>
                    <Badge variant="outline" className="mr-2">{contract.status}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ البداية:</span>
                    <span className="mr-2">{format(new Date(contract.start_date), 'dd MMM yyyy', { locale: ar })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ النهاية:</span>
                    <span className="mr-2">{format(new Date(contract.end_date), 'dd MMM yyyy', { locale: ar })}</span>
                  </div>
                </CardContent>
              </Card>

              {/* معلومات العميل والمركبة */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">العميل</p>
                        <p className="font-semibold">{customerName}</p>
                        {contract.customer?.phone && (
                          <p className="text-xs text-muted-foreground" dir="ltr">{contract.customer.phone}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المركبة</p>
                        <p className="font-semibold">{vehicleInfo}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          ستصبح متوفرة
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* تفاصيل المطالبة المالية */}
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <DollarSign className="h-4 w-4" />
                    تفاصيل المطالبة المالية
                  </CardTitle>
                  <CardDescription>
                    قيمة القضية المحسوبة تلقائياً من بيانات العقد
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-red-200">
                    <span className="text-sm">المبلغ المتبقي من العقد</span>
                    <span className="font-semibold">{formatCurrency(stats?.balanceDue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-red-200">
                    <span className="text-sm">غرامات التأخير</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(stats?.lateFines || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-red-200">
                    <span className="text-sm">المخالفات المرورية غير المدفوعة</span>
                    <span className="font-semibold text-red-600">{formatCurrency(stats?.trafficViolations || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-red-100 rounded-lg px-3 -mx-3">
                    <span className="font-bold text-red-800">إجمالي المطالبة</span>
                    <span className="text-2xl font-bold text-red-700">{formatCurrency(stats?.totalClaim || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* خيارات القضية */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع القضية</Label>
                  <Select value={caseType} onValueChange={(v: any) => setCaseType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment_collection">تحصيل مستحقات</SelectItem>
                      <SelectItem value="contract_breach">خرق عقد</SelectItem>
                      <SelectItem value="vehicle_damage">أضرار مركبة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ملاحظات */}
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات إضافية</Label>
                <Textarea
                  id="notes"
                  placeholder="أضف أي ملاحظات أو تفاصيل إضافية حول القضية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* ما سيحدث */}
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>عند التأكيد:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>سيتم إنشاء قضية قانونية جديدة بحالة "تحت الإجراء"</li>
                    <li>ستتغير حالة العقد إلى "تحت الإجراء القانوني"</li>
                    <li>ستصبح المركبة "متوفرة" للتأجير</li>
                    <li>سيتم تسجيل العملية في سجل العقد</li>
                    <li>يمكنك لاحقاً تغيير حالة القضية إلى "نشطة" عند فتحها في المحكمة</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || hasExistingActiveCase || convertMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحويل...
                </>
              ) : (
                <>
                  <Gavel className="h-4 w-4 ml-2" />
                  تحويل للشؤون القانونية
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog التأكيد النهائي */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              تأكيد التحويل للشؤون القانونية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              أنت على وشك تحويل العقد رقم <strong>{contract.contract_number}</strong> إلى الشؤون القانونية.
              <br /><br />
              هذا الإجراء سيؤدي إلى:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>إنشاء قضية قانونية بقيمة <strong>{formatCurrency(stats?.totalClaim || 0)}</strong></li>
                <li>تغيير حالة العقد إلى "تحت الإجراء القانوني"</li>
                <li>تحرير المركبة وجعلها متوفرة</li>
              </ul>
              <br />
              <strong>هل أنت متأكد من المتابعة؟</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvert}
              className="bg-red-600 hover:bg-red-700"
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? 'جاري التحويل...' : 'تأكيد التحويل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ConvertToLegalDialog;

