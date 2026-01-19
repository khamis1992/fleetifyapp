/**
 * Create Legal Case Dialog
 * Dialog for converting a delinquent customer to a legal case with document generation
 */

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  FileText,
  Gavel,
  User,
  Car,
  CreditCard,
  Printer,
  Download,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import { generateLegalComplaintHTML, type LegalDocumentData } from '@/utils/legal-document-generator';
import { calculatePenaltyBreakdown } from '@/utils/delinquency-calculations';

interface CreateLegalCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: DelinquentCustomer | null;
  onSuccess?: () => void;
}

const CASE_TYPES = [
  { value: 'rental', label: 'تحصيل إيجارات' },
  { value: 'civil', label: 'مدنية' },
  { value: 'commercial', label: 'تجارية' },
  { value: 'recovery', label: 'استرداد مركبة' },
];

const PRIORITIES = [
  { value: 'urgent', label: 'عاجل', color: 'bg-red-500' },
  { value: 'high', label: 'عالي', color: 'bg-orange-500' },
  { value: 'medium', label: 'متوسط', color: 'bg-yellow-500' },
  { value: 'low', label: 'منخفض', color: 'bg-blue-500' },
];

const COURTS = [
  { value: 'civil_court', label: 'المحكمة المدنية' },
  { value: 'commercial_court', label: 'المحكمة التجارية' },
  { value: 'execution_court', label: 'محكمة التنفيذ' },
];

// Company info (can be fetched from settings later)
const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'Al-Araf Car Rental',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  cr_number: '146832',
};

export function CreateLegalCaseDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CreateLegalCaseDialogProps) {
  const convertToLegalCaseMutation = useConvertToLegalCase();

  const [formData, setFormData] = useState({
    caseType: 'rental',
    priority: 'high',
    court: 'civil_court',
    damagesAmount: 0,
    additionalNotes: '',
    addToBlacklist: false,
    sendFormalNotice: false,
    generateDocument: true,
  });

  // Calculate suggested priority based on risk score
  const getSuggestedPriority = useCallback(() => {
    if (!customer) return 'medium';
    if (customer.risk_score >= 85) return 'urgent';
    if (customer.risk_score >= 70) return 'high';
    if (customer.risk_score >= 60) return 'medium';
    return 'low';
  }, [customer]);

  // Calculate penalty breakdown
  const penaltyBreakdown = customer ? calculatePenaltyBreakdown(customer.days_overdue) : null;

  // Calculate total claim
  const totalClaim = customer
    ? customer.overdue_amount + customer.late_penalty + (formData.damagesAmount || Math.round(customer.total_debt * 0.3))
    : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!customer) return;

    try {
      // Create the legal case
      await convertToLegalCaseMutation.mutateAsync({
        delinquentCustomer: customer,
        additionalNotes: formData.additionalNotes,
      });

      // Generate and print document if requested
      if (formData.generateDocument) {
        handlePrintDocument();
      }

      // Add to blacklist if requested
      if (formData.addToBlacklist) {
        // TODO: Implement blacklist functionality
        toast.info('سيتم إضافة العميل للقائمة السوداء');
      }

      // Send formal notice if requested
      if (formData.sendFormalNotice) {
        // TODO: Implement notice sending
        toast.info('سيتم إرسال إنذار رسمي للعميل');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating legal case:', error);
    }
  };

  // Handle print document
  const handlePrintDocument = () => {
    if (!customer) return;

    const documentData: LegalDocumentData = {
      customer,
      companyInfo: COMPANY_INFO,
      vehicleInfo: {
        plate: customer.vehicle_plate || 'غير محدد',
      },
      contractInfo: {
        contract_number: customer.contract_number,
        start_date: format(new Date(customer.contract_start_date), 'dd/MM/yyyy', { locale: ar }),
        monthly_rent: customer.monthly_rent,
      },
      damages: formData.damagesAmount || Math.round(customer.total_debt * 0.3),
      additionalNotes: formData.additionalNotes,
    };

    const html = generateLegalComplaintHTML(documentData);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      toast.error('تعذر فتح نافذة الطباعة');
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scale className="w-6 h-6 text-blue-600" />
            إنشاء قضية قانونية
          </DialogTitle>
          <DialogDescription>
            إنشاء قضية قانونية لتحصيل المستحقات من العميل مع توليد المذكرة الشارحة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info Card */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{customer.customer_name}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      العقد: {customer.contract_number}
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="w-4 h-4" />
                      المركبة: {customer.vehicle_plate || 'غير محدد'}
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      الهاتف: {customer.phone || 'غير محدد'}
                    </div>
                    <div>
                      <Badge
                        variant={customer.risk_score >= 70 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        درجة المخاطر: {customer.risk_score}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ملخص المطالبات المالية
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>الإيجارات المتأخرة ({customer.months_unpaid} شهر):</span>
                  <span className="font-semibold">{formatCurrency(customer.overdue_amount)} ر.ق</span>
                </div>
                <div className="flex justify-between">
                  <span>غرامات التأخير ({customer.days_overdue} يوم × 120 ر.ق):</span>
                  <span className="font-semibold">{formatCurrency(customer.late_penalty)} ر.ق</span>
                </div>
                {penaltyBreakdown && penaltyBreakdown.rawPenalty > penaltyBreakdown.finalPenalty && (
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    <AlertTriangle className="w-3 h-3 inline ml-1" />
                    تم تطبيق الحد الأقصى: {penaltyBreakdown.monthsOverdue} شهر × 3,000 ر.ق = {formatCurrency(penaltyBreakdown.maxPenalty)} ر.ق
                  </div>
                )}
                {customer.violations_count > 0 && (
                  <div className="flex justify-between text-orange-700">
                    <span>المخالفات المرورية ({customer.violations_count} مخالفة):</span>
                    <span className="font-semibold">{formatCurrency(customer.violations_amount)} ر.ق *</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span>التعويضات والأضرار:</span>
                  <Input
                    type="number"
                    value={formData.damagesAmount || Math.round(customer.total_debt * 0.3)}
                    onChange={(e) => setFormData({ ...formData, damagesAmount: parseFloat(e.target.value) || 0 })}
                    className="w-32 h-8 text-left"
                    placeholder="0"
                  />
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold text-red-700">
                  <span>إجمالي المطالبة:</span>
                  <span>{formatCurrency(totalClaim)} ر.ق</span>
                </div>
                {customer.violations_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    * المخالفات المرورية سيتم طلب تحويلها للرقم الشخصي للمستأجر (غير مشمولة في المطالبة المالية)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Case Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="case-type">نوع القضية</Label>
              <Select
                value={formData.caseType}
                onValueChange={(value) => setFormData({ ...formData, caseType: value })}
              >
                <SelectTrigger id="case-type">
                  <SelectValue placeholder="اختر نوع القضية" />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">
                الأولوية
                <Badge variant="outline" className="mr-2 text-xs">
                  مقترح: {PRIORITIES.find((p) => p.value === getSuggestedPriority())?.label}
                </Badge>
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="اختر الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${priority.color}`} />
                        {priority.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="court">المحكمة المختصة</Label>
              <Select
                value={formData.court}
                onValueChange={(value) => setFormData({ ...formData, court: value })}
              >
                <SelectTrigger id="court">
                  <SelectValue placeholder="اختر المحكمة" />
                </SelectTrigger>
                <SelectContent>
                  {COURTS.map((court) => (
                    <SelectItem key={court.value} value={court.value}>
                      {court.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات إضافية</Label>
            <Textarea
              id="notes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="أضف أي ملاحظات إضافية تريد تضمينها في القضية والمذكرة الشارحة..."
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800">خيارات إضافية</h4>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="generate-document"
                checked={formData.generateDocument}
                onCheckedChange={(checked) => setFormData({ ...formData, generateDocument: !!checked })}
              />
              <Label htmlFor="generate-document" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-blue-600" />
                توليد وطباعة المذكرة الشارحة تلقائياً
              </Label>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="add-to-blacklist"
                checked={formData.addToBlacklist}
                onCheckedChange={(checked) => setFormData({ ...formData, addToBlacklist: !!checked })}
              />
              <Label htmlFor="add-to-blacklist" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                إضافة العميل للقائمة السوداء
              </Label>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="send-formal-notice"
                checked={formData.sendFormalNotice}
                onCheckedChange={(checked) => setFormData({ ...formData, sendFormalNotice: !!checked })}
              />
              <Label htmlFor="send-formal-notice" className="flex items-center gap-2 cursor-pointer">
                <Gavel className="w-4 h-4 text-orange-600" />
                إرسال إنذار قانوني رسمي (واتساب)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintDocument}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            معاينة المذكرة
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={convertToLegalCaseMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {convertToLegalCaseMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                إنشاء القضية
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

