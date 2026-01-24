/**
 * نافذة إرسال تذكير بالمخالفات المرورية للعملاء
 * يتم إرسال رسالة واتساب للعملاء بتفاصيل المخالفات المستحقة
 * يدعم الإرسال الفردي والجماعي
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { 
  Send, 
  FileWarning,
  AlertCircle,
  MessageCircle,
  Car,
  Calendar,
  User,
  Phone,
  Edit,
  Eye,
  CheckCircle,
  Users,
  XCircle,
} from 'lucide-react';
import { sendWhatsAppMessage } from '@/utils/whatsappWebSender';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { TrafficViolation } from '@/hooks/useTrafficViolations';

// رقم الاختبار
const TEST_PHONE_NUMBER = '66707063';

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

// قالب الرسالة الافتراضي
const DEFAULT_MESSAGE_TEMPLATE = `السلام عليكم ورحمة الله وبركاته،

السيد / السيدة {{customer_name}} المحترم(ة)،

تحية طيبة وبعد،

نود إفادتكم بأنه وبالرجوع إلى *عقد إيجار المركبة المبرم بينكم وبين شركة العراف لتأجير السيارات*، والمتضمن التزام الطرف الثاني بسداد *كافة المخالفات المرورية والقانونية المترتبة على استخدام المركبة طوال مدة العقد*، فقد تبين وجود *مخالفات مرورية مسجلة على المركبة المؤجرة ولم يتم سدادها حتى تاريخه*، وذلك وفق التفاصيل الموضحة أدناه:

🚗 *بيانات المركبة:*
• رقم المركبة: {{vehicle_number}}
• نوع / موديل المركبة: {{vehicle_model}}
• رقم العقد: {{contract_number}}
• تاريخ العقد: {{contract_date}}

📄 *تفاصيل المخالفات المرورية المستحقة:*
{{violations_list}}

💰 *إجمالي قيمة المخالفات المستحقة:* {{total_violations_amount}} ر.ق

وعليه، نرجو منكم *المبادرة بسداد كامل قيمة المخالفات المرورية المستحقة فورًا*، وذلك خلال مهلة أقصاها *({{due_days}}) أيام عمل من تاريخ هذا الإشعار*، تفاديًا لاتخاذ الإجراءات النظامية المنصوص عليها في العقد، والتي تشمل – دون حصر – *تحميلكم كافة المبالغ والغرامات، واعتبار ذلك إخلالًا بشروط العقد، واتخاذ ما يلزم من إجراءات قانونية*.

نؤكد أن عدم الالتزام بالسداد خلال المهلة المحددة سيترتب عليه *اتخاذ الإجراءات القانونية والإدارية اللازمة دون أي إشعار آخر*، وذلك حفاظًا على حقوق الشركة.

للاستفسار أو السداد، يرجى التواصل معنا عبر قنوات التواصل المعتمدة.

وتفضلوا بقبول فائق الاحترام،

شركة العراف لتأجير السيارات – ذ.م.م
إدارة الشركة
📞 رقم التواصل: 31151919`;

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

export const TrafficViolationReminderDialog: React.FC<TrafficViolationReminderDialogProps> = ({
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
  const { companyId } = useUnifiedCompanyAccess();
  
  const [dueDays, setDueDays] = useState(7);
  const [isTestMode, setIsTestMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; results: { name: string; success: boolean }[] } | null>(null);

  // تجميع المخالفات حسب العميل
  const customerGroups = useMemo(() => {
    if (!violations || violations.length === 0) return [];

    const groupsMap = new Map<string, CustomerViolationsGroup>();

    violations.forEach(v => {
      const customer = v.customers || v.contracts?.customers;
      const vehicle = v.vehicles;
      const contract = v.contracts;

      // Use customer_id or generate a key from customer data
      const customerId = v.customer_id || customer?.id || `unknown-${v.id}`;
      
      const customerName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || 'غير محدد'
        : 'غير محدد';
      
      const customerPhone = customer?.phone || customer?.mobile || '';

      if (!groupsMap.has(customerId)) {
        groupsMap.set(customerId, {
          customerId,
          customerName,
          customerPhone,
          violations: [],
          totalAmount: 0,
          vehiclePlate: vehicle?.plate_number || v.vehicle_plate || 'غير محدد',
          vehicleModel: vehicle ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() : 'غير محدد',
          contractNumber: contract?.contract_number || 'غير محدد',
          contractDate: contract?.start_date 
            ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ar })
            : 'غير محدد',
        });
      }

      const group = groupsMap.get(customerId)!;
      group.violations.push(v);
      group.totalAmount += Number(v.amount) || Number(v.fine_amount) || 0;
    });

    // Filter out groups without phone numbers (except in test mode)
    return Array.from(groupsMap.values()).filter(g => g.customerPhone || isTestMode);
  }, [violations, isTestMode]);

  // If props are provided (single customer mode), use them
  const isSingleCustomerMode = !!propCustomerId || !!propCustomerName;
  
  const singleCustomerData = useMemo(() => {
    if (!isSingleCustomerMode || !violations || violations.length === 0) return null;

    const firstViolation = violations[0];
    const customer = firstViolation.customers || firstViolation.contracts?.customers;
    const vehicle = firstViolation.vehicles;
    const contract = firstViolation.contracts;

    const totalAmount = violations.reduce((sum, v) => sum + (Number(v.amount) || Number(v.fine_amount) || 0), 0);

    const violationsList = violations.map(v => {
      const vDate = v.violation_date 
        ? format(new Date(v.violation_date), 'dd/MM/yyyy', { locale: ar })
        : 'غير محدد';
      const vAmount = Number(v.amount) || Number(v.fine_amount) || 0;
      return `• رقم المخالفة: ${v.violation_number || v.penalty_number || 'غير محدد'}
  - تاريخ المخالفة: ${vDate}
  - الجهة المختصة: ${v.issuing_authority || 'إدارة المرور'}
  - قيمة المخالفة: ${vAmount.toLocaleString('ar-QA')} ر.ق`;
    }).join('\n\n');

    return {
      customerName: propCustomerName || (customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || 'غير محدد'
        : 'غير محدد'),
      customerPhone: propCustomerPhone || customer?.phone || customer?.mobile || '',
      vehiclePlate: propVehiclePlate || vehicle?.plate_number || firstViolation.vehicle_plate || 'غير محدد',
      vehicleModel: propVehicleModel || (vehicle 
        ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
        : 'غير محدد'),
      contractNumber: propContractNumber || contract?.contract_number || 'غير محدد',
      contractDate: propContractDate || (contract?.start_date 
        ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ar })
        : 'غير محدد'),
      totalAmount,
      violationsList,
      violationsCount: violations.length,
    };
  }, [violations, isSingleCustomerMode, propCustomerName, propCustomerPhone, propVehiclePlate, propVehicleModel, propContractNumber, propContractDate]);

  // Build message for a customer group
  const buildMessageForCustomer = (group: CustomerViolationsGroup) => {
    const violationsList = group.violations.map(v => {
      const vDate = v.violation_date 
        ? format(new Date(v.violation_date), 'dd/MM/yyyy', { locale: ar })
        : 'غير محدد';
      const vAmount = Number(v.amount) || Number(v.fine_amount) || 0;
      return `• رقم المخالفة: ${v.violation_number || v.penalty_number || 'غير محدد'}
  - تاريخ المخالفة: ${vDate}
  - الجهة المختصة: ${v.issuing_authority || 'إدارة المرور'}
  - قيمة المخالفة: ${vAmount.toLocaleString('ar-QA')} ر.ق`;
    }).join('\n\n');

    return DEFAULT_MESSAGE_TEMPLATE
      .replace(/\{\{customer_name\}\}/g, group.customerName)
      .replace('{{vehicle_number}}', group.vehiclePlate)
      .replace('{{vehicle_model}}', group.vehicleModel)
      .replace('{{contract_number}}', group.contractNumber)
      .replace('{{contract_date}}', group.contractDate)
      .replace('{{violations_list}}', violationsList)
      .replace('{{total_violations_amount}}', group.totalAmount.toLocaleString('ar-QA'))
      .replace('{{due_days}}', dueDays.toString());
  };

  // Preview message (for first selected customer or single customer)
  const previewMessage = useMemo(() => {
    if (singleCustomerData) {
      return DEFAULT_MESSAGE_TEMPLATE
        .replace(/\{\{customer_name\}\}/g, singleCustomerData.customerName)
        .replace('{{vehicle_number}}', singleCustomerData.vehiclePlate)
        .replace('{{vehicle_model}}', singleCustomerData.vehicleModel)
        .replace('{{contract_number}}', singleCustomerData.contractNumber)
        .replace('{{contract_date}}', singleCustomerData.contractDate)
        .replace('{{violations_list}}', singleCustomerData.violationsList)
        .replace('{{total_violations_amount}}', singleCustomerData.totalAmount.toLocaleString('ar-QA'))
        .replace('{{due_days}}', dueDays.toString());
    }
    
    if (customerGroups.length > 0) {
      const firstGroup = customerGroups[0];
      return buildMessageForCustomer(firstGroup);
    }
    
    return '';
  }, [singleCustomerData, customerGroups, dueDays]);

  // Toggle customer selection
  const toggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedCustomers.size === customerGroups.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customerGroups.map(g => g.customerId)));
    }
  };

  // Customers with phone numbers
  const customersWithPhone = useMemo(() => 
    customerGroups.filter(g => g.customerPhone), 
    [customerGroups]
  );

  // Send reminders mutation
  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      if (isSingleCustomerMode && singleCustomerData) {
        // Single customer mode
        const targetPhone = isTestMode ? TEST_PHONE_NUMBER : singleCustomerData.customerPhone;
        
        if (!targetPhone) {
          throw new Error('رقم الهاتف غير متوفر');
        }

        const message = previewMessage;
        const result = await sendWhatsAppMessage({
          phone: targetPhone,
          message,
          customerName: isTestMode ? 'اختبار' : singleCustomerData.customerName,
        });

        if (!result.success) {
          throw new Error(result.error || 'فشل إرسال الرسالة');
        }

        return { sent: 1, failed: 0, isTest: isTestMode };
      }

      // Bulk mode
      const customersToSend = isTestMode 
        ? customerGroups.slice(0, 1) // In test mode, only send one message
        : customerGroups.filter(g => selectedCustomers.has(g.customerId) && g.customerPhone);

      if (customersToSend.length === 0) {
        throw new Error('لا يوجد عملاء محددين للإرسال');
      }

      setSendProgress({ current: 0, total: customersToSend.length, results: [] });

      let sent = 0;
      let failed = 0;
      const results: { name: string; success: boolean }[] = [];

      for (let i = 0; i < customersToSend.length; i++) {
        const group = customersToSend[i];
        const targetPhone = isTestMode ? TEST_PHONE_NUMBER : group.customerPhone;
        const message = buildMessageForCustomer(group);

        try {
          const result = await sendWhatsAppMessage({
            phone: targetPhone,
            message,
            customerName: isTestMode ? 'اختبار' : group.customerName,
          });

          if (result.success) {
            sent++;
            results.push({ name: group.customerName, success: true });

            // Log communication (only in live mode)
            if (!isTestMode && companyId) {
              await supabase.from('communication_logs').insert({
                company_id: companyId,
                customer_id: group.customerId !== `unknown-${group.violations[0]?.id}` ? group.customerId : null,
                communication_type: 'whatsapp',
                subject: 'تذكير بالمخالفات المرورية',
                message,
                phone_number: targetPhone,
                status: 'sent',
                metadata: {
                  violations_count: group.violations.length,
                  total_amount: group.totalAmount,
                  due_days: dueDays,
                },
              }).catch(err => console.error('Failed to log communication:', err));
            }
          } else {
            failed++;
            results.push({ name: group.customerName, success: false });
          }
        } catch (error) {
          failed++;
          results.push({ name: group.customerName, success: false });
        }

        setSendProgress({ current: i + 1, total: customersToSend.length, results });

        // Small delay between messages to avoid rate limiting
        if (i < customersToSend.length - 1 && !isTestMode) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      return { sent, failed, isTest: isTestMode };
    },
    onSuccess: (result) => {
      if (result.isTest) {
        toast.success(`✅ تم إرسال رسالة اختبار للرقم ${TEST_PHONE_NUMBER}`, { duration: 5000 });
      } else {
        toast.success(`✅ تم إرسال ${result.sent} رسالة بنجاح${result.failed > 0 ? ` (${result.failed} فشل)` : ''}`);
        onOpenChange(false);
        onSuccess?.();
      }
      setSendProgress(null);
    },
    onError: (error: any) => {
      console.error('Error sending reminders:', error);
      toast.error('فشل الإرسال: ' + (error.message || 'خطأ غير معروف'));
      setSendProgress(null);
    },
  });

  const handleSend = () => {
    sendRemindersMutation.mutate();
  };

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSendProgress(null);
      setSelectedCustomers(new Set());
    }
  }, [open]);

  // Auto-select all customers with phone when opening
  React.useEffect(() => {
    if (open && customerGroups.length > 0 && !isSingleCustomerMode) {
      setSelectedCustomers(new Set(customersWithPhone.map(g => g.customerId)));
    }
  }, [open, customerGroups, isSingleCustomerMode, customersWithPhone]);

  if (!violations || violations.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>لا توجد مخالفات</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            لم يتم تحديد أي مخالفات للإرسال
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            إرسال تذكيرات المخالفات المرورية
          </DialogTitle>
          <DialogDescription>
            {isSingleCustomerMode 
              ? 'إرسال رسالة واتساب للعميل بتفاصيل المخالفات المستحقة'
              : `إرسال رسائل واتساب لـ ${customerGroups.length} عميل بتفاصيل المخالفات المستحقة`
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-4">
            {/* Single Customer Mode Summary */}
            {isSingleCustomerMode && singleCustomerData && (
              <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">{singleCustomerData.customerName}</span>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    {singleCustomerData.violationsCount} مخالفة
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>{singleCustomerData.vehiclePlate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span dir="ltr">{singleCustomerData.customerPhone || 'غير متوفر'}</span>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">إجمالي المخالفات:</span>
                  <span className="text-lg font-bold text-amber-700">
                    {singleCustomerData.totalAmount.toLocaleString('ar-QA')} ر.ق
                  </span>
                </div>
              </div>
            )}

            {/* Bulk Mode - Customer List */}
            {!isSingleCustomerMode && customerGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    العملاء ({customerGroups.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-xs"
                  >
                    {selectedCustomers.size === customerGroups.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </Button>
                </div>

                <div className="rounded-xl border bg-muted/30 max-h-[200px] overflow-y-auto">
                  {customerGroups.map((group) => (
                    <div 
                      key={group.customerId}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedCustomers.has(group.customerId)}
                        onCheckedChange={() => toggleCustomer(group.customerId)}
                        disabled={!group.customerPhone && !isTestMode}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{group.customerName}</span>
                          {!group.customerPhone && (
                            <Badge variant="destructive" className="text-[10px] px-1">
                              بدون هاتف
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{group.violations.length} مخالفة</span>
                          <span>{group.vehiclePlate}</span>
                          {group.customerPhone && (
                            <span dir="ltr">{group.customerPhone}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-700">
                        {group.totalAmount.toLocaleString('ar-QA')} ر.ق
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    محدد: {selectedCustomers.size} من {customerGroups.length}
                  </span>
                  <span className="font-bold text-amber-700">
                    إجمالي: {customerGroups
                      .filter(g => selectedCustomers.has(g.customerId))
                      .reduce((sum, g) => sum + g.totalAmount, 0)
                      .toLocaleString('ar-QA')} ر.ق
                  </span>
                </div>
              </div>
            )}

            {/* Send Options */}
            <div className="space-y-4">
              {/* Due Days */}
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 min-w-[120px]">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  مهلة السداد:
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={dueDays}
                    onChange={(e) => setDueDays(Number(e.target.value) || 7)}
                    className="w-20"
                    min={1}
                    max={30}
                  />
                  <span className="text-sm text-muted-foreground">يوم عمل</span>
                </div>
              </div>

              {/* Test Mode Alert */}
              <Alert className={isTestMode ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}>
                <AlertCircle className={`h-4 w-4 ${isTestMode ? 'text-blue-600' : 'text-green-600'}`} />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    {isTestMode ? (
                      <span>
                        <strong>وضع الاختبار:</strong> سيتم الإرسال للرقم <span dir="ltr" className="font-mono">{TEST_PHONE_NUMBER}</span> فقط
                      </span>
                    ) : (
                      <span>
                        <strong>وضع الإرسال الحقيقي:</strong> سيتم الإرسال للعملاء مباشرة
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTestMode(!isTestMode)}
                    className={isTestMode ? 'border-blue-300' : 'border-green-300'}
                  >
                    {isTestMode ? 'تفعيل الإرسال الحقيقي' : 'العودة لوضع الاختبار'}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>

            {/* Message Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  معاينة الرسالة
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-1"
                >
                  {showPreview ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {showPreview ? 'إخفاء' : 'عرض'}
                </Button>
              </div>
              
              {showPreview && (
                <div className="rounded-xl border bg-muted/30 p-4 max-h-[250px] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                    {previewMessage}
                  </pre>
                </div>
              )}
            </div>

            {/* Progress */}
            {sendProgress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>جاري الإرسال...</span>
                  <span>{sendProgress.current} / {sendProgress.total}</span>
                </div>
                <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
                <div className="max-h-[100px] overflow-y-auto space-y-1">
                  {sendProgress.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.success ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span>{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning for missing phone */}
            {!isTestMode && isSingleCustomerMode && singleCustomerData && !singleCustomerData.customerPhone && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لا يوجد رقم هاتف مسجل للعميل. يرجى تحديث بيانات العميل أولاً.
                </AlertDescription>
              </Alert>
            )}

            {!isTestMode && !isSingleCustomerMode && selectedCustomers.size === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  يرجى تحديد عميل واحد على الأقل للإرسال.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendRemindersMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sendRemindersMutation.isPending || 
              (!isTestMode && isSingleCustomerMode && singleCustomerData && !singleCustomerData.customerPhone) ||
              (!isTestMode && !isSingleCustomerMode && selectedCustomers.size === 0)
            }
            className={`gap-2 ${isTestMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {sendRemindersMutation.isPending ? (
              <>
                <LoadingSpinner className="h-4 w-4" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isTestMode 
                  ? 'إرسال للاختبار' 
                  : isSingleCustomerMode 
                    ? 'إرسال للعميل'
                    : `إرسال لـ ${selectedCustomers.size} عميل`
                }
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrafficViolationReminderDialog;
