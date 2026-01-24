/**
 * نافذة إرسال مهمة فتح بلاغ لموظف
 * يمكن إرسال ملف PDF مع تحديد نوع البلاغ (سرقة أو تحويل مخالفات)
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, 
  FileText,
  AlertCircle,
  MessageCircle,
  Upload,
  X,
  FileWarning,
  Car,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { sendWhatsAppMessage } from '@/utils/whatsappWebSender';

type ReportType = 'theft_report' | 'violations_transfer';

interface SendReportTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId?: string;
  contractNumber?: string;
  customerName?: string;
  vehiclePlate?: string;
  onSuccess?: () => void;
}

export const SendReportTaskDialog: React.FC<SendReportTaskDialogProps> = ({
  open,
  onOpenChange,
  contractId,
  contractNumber,
  customerName,
  vehiclePlate,
  onSuccess,
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('theft_report');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // جلب معرف البروفايل للمستخدم الحالي
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name_ar, last_name_ar, first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // جلب قائمة الموظفين
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['company-employees-for-report', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, position, position_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name_ar');
      
      if (profilesError) throw profilesError;

      const { data: hrEmployees } = await supabase
        .from('employees')
        .select('user_id, phone')
        .eq('company_id', companyId)
        .not('user_id', 'is', null);

      const hrPhoneMap = new Map();
      if (hrEmployees) {
        hrEmployees.forEach(emp => {
          if (emp.user_id && emp.phone) {
            hrPhoneMap.set(emp.user_id, emp.phone);
          }
        });
      }
      
      return (profiles || []).map(emp => ({
        ...emp,
        phone: emp.phone || hrPhoneMap.get(emp.user_id) || null,
        full_name: emp.first_name_ar && emp.last_name_ar 
          ? `${emp.first_name_ar} ${emp.last_name_ar}`.trim()
          : emp.first_name && emp.last_name
            ? `${emp.first_name} ${emp.last_name}`.trim()
            : emp.email,
        role: emp.position_ar || emp.position || null,
      }));
    },
    enabled: !!companyId && open,
  });

  // معالجة رفع الملف
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
      } else {
        toast.error('يرجى اختيار ملف PDF أو صورة');
      }
    }
  }, []);

  // معالجة السحب والإفلات
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
      } else {
        toast.error('يرجى اختيار ملف PDF أو صورة');
      }
    }
  }, []);

  // إرسال مهمة البلاغ
  const sendTaskMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !currentUserProfile?.id || !selectedEmployee) {
        throw new Error('بيانات غير مكتملة');
      }

      const employee = employees.find(emp => emp.id === selectedEmployee);
      if (!employee?.user_id) {
        throw new Error('الموظف غير صالح');
      }

      // رفع الملف إذا كان موجوداً
      let fileUrl: string | null = null;
      if (file) {
        const fileName = `report-tasks/${companyId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('legal-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('legal-documents')
          .getPublicUrl(fileName);
        
        fileUrl = urlData.publicUrl;
      }

      const reportTypeLabel = reportType === 'theft_report' ? 'بلاغ سرقة المركبة' : 'تحويل المخالفات المرورية';
      const senderName = currentUserProfile.first_name_ar && currentUserProfile.last_name_ar
        ? `${currentUserProfile.first_name_ar} ${currentUserProfile.last_name_ar}`.trim()
        : 'مستخدم النظام';

      // إنشاء التنبيه
      const notification = {
        company_id: companyId,
        user_id: employee.user_id,
        title: `مهمة جديدة: ${reportTypeLabel}`,
        message: message || `مطلوب فتح ${reportTypeLabel} للعميل: ${customerName || 'غير محدد'}`,
        notification_type: 'warning',
        is_read: false,
        related_id: contractId || null,
        related_type: 'report_task',
        metadata: {
          report_type: reportType,
          contract_id: contractId,
          contract_number: contractNumber,
          customer_name: customerName,
          vehicle_plate: vehiclePlate,
          file_url: fileUrl,
          sender_name: senderName,
          sender_id: currentUserProfile.id,
          custom_message: message,
        },
        created_at: new Date().toISOString(),
      };

      const { error: notificationError } = await supabase
        .from('user_notifications')
        .insert(notification);

      if (notificationError) throw notificationError;

      // إرسال رسالة واتساب
      let whatsappSent = false;
      if (employee.phone) {
        const employeeName = employee.full_name || employee.email;
        const whatsappMessage = `السلام عليكم ${employeeName}،

📋 *مهمة جديدة: ${reportTypeLabel}*

${message ? `📝 الرسالة:\n${message}\n` : ''}
👤 العميل: ${customerName || 'غير محدد'}
📄 العقد: ${contractNumber || 'غير محدد'}
🚗 المركبة: ${vehiclePlate || 'غير محدد'}
${fileUrl ? `\n📎 مرفق: ${fileUrl}` : ''}

المطلوب: فتح ${reportTypeLabel} بناءً على المستند المرفق.

تم الإرسال بواسطة: ${senderName}

يرجى الدخول للنظام لمراجعة التفاصيل.

شكراً لتعاونكم 🙏`;

        try {
          const result = await sendWhatsAppMessage({
            phone: employee.phone,
            message: whatsappMessage,
            customerName: employeeName,
          });
          whatsappSent = result.success;
        } catch (error) {
          console.error('WhatsApp send error:', error);
        }
      }

      return { whatsappSent };
    },
    onSuccess: (result) => {
      let successMessage = 'تم إرسال المهمة بنجاح';
      if (result.whatsappSent) {
        successMessage += ' ✅ تم إرسال رسالة واتساب';
      }
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // إعادة تعيين الحالة
      setSelectedEmployee(null);
      setMessage('');
      setFile(null);
      setReportType('theft_report');
      
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Error sending report task:', error);
      toast.error('فشل إرسال المهمة: ' + (error.message || 'خطأ غير معروف'));
    },
  });

  const handleSubmit = () => {
    if (!selectedEmployee) {
      toast.error('يرجى اختيار موظف');
      return;
    }
    sendTaskMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            إرسال مهمة فتح بلاغ
          </DialogTitle>
          <DialogDescription>
            إرسال ملف لموظف لفتح بلاغ سرقة أو طلب تحويل مخالفات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* معلومات العقد */}
          {(customerName || contractNumber) && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-3 flex-wrap">
                {customerName && (
                  <Badge variant="secondary" className="gap-1">
                    👤 {customerName}
                  </Badge>
                )}
                {contractNumber && (
                  <Badge variant="outline" className="gap-1">
                    📄 {contractNumber}
                  </Badge>
                )}
                {vehiclePlate && (
                  <Badge variant="outline" className="gap-1">
                    🚗 {vehiclePlate}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* نوع البلاغ */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              نوع البلاغ المطلوب
            </Label>
            <RadioGroup
              value={reportType}
              onValueChange={(value) => setReportType(value as ReportType)}
              className="grid grid-cols-2 gap-3"
            >
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  reportType === 'theft_report'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                    : 'border-muted hover:border-red-200'
                }`}
              >
                <RadioGroupItem value="theft_report" className="sr-only" />
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  reportType === 'theft_report' ? 'bg-red-500 text-white' : 'bg-muted'
                }`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">بلاغ سرقة المركبة</p>
                  <p className="text-xs text-muted-foreground">للنيابة العامة</p>
                </div>
                {reportType === 'theft_report' && (
                  <CheckCircle2 className="h-5 w-5 text-red-500 mr-auto" />
                )}
              </label>
              
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  reportType === 'violations_transfer'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-muted hover:border-amber-200'
                }`}
              >
                <RadioGroupItem value="violations_transfer" className="sr-only" />
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  reportType === 'violations_transfer' ? 'bg-amber-500 text-white' : 'bg-muted'
                }`}>
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">تحويل المخالفات</p>
                  <p className="text-xs text-muted-foreground">لإدارة المرور</p>
                </div>
                {reportType === 'violations_transfer' && (
                  <CheckCircle2 className="h-5 w-5 text-amber-500 mr-auto" />
                )}
              </label>
            </RadioGroup>
          </div>

          {/* رفع الملف */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              الملف المرفق (PDF أو صورة)
            </Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-emerald-600" />
                  <div className="text-right">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    اسحب الملف هنا أو{' '}
                    <label className="text-primary cursor-pointer hover:underline">
                      اختر ملف
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF أو صورة (حد أقصى 10MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* اختيار الموظف */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                الموظف المكلف
              </span>
            </Label>
            {loadingEmployees ? (
              <div className="flex items-center justify-center p-4">
                <LoadingSpinner />
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                لا يوجد موظفين
              </div>
            ) : (
              <ScrollArea className="h-[150px] rounded-lg border p-2">
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedEmployee === employee.id
                          ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                      onClick={() => setSelectedEmployee(employee.id)}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedEmployee === employee.id
                          ? 'border-teal-600 bg-teal-600'
                          : 'border-muted-foreground'
                      }`}>
                        {selectedEmployee === employee.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {employee.full_name || employee.email}
                          </p>
                          {employee.phone && (
                            <MessageCircle className="h-3.5 w-3.5 text-green-500" title="سيتم إرسال واتساب" />
                          )}
                        </div>
                        {employee.role && (
                          <p className="text-xs text-muted-foreground">{employee.role}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* رسالة للموظف */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              رسالة للموظف (اختياري)
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="أي تعليمات أو تفاصيل إضافية..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* تنبيه */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">ما سيحدث:</p>
                <ul className="text-xs mt-1 space-y-0.5 text-blue-700 dark:text-blue-300">
                  <li>• سيتم إرسال تنبيه للموظف في النظام</li>
                  <li>• سيتم إرسال رسالة واتساب مع رابط الملف</li>
                  <li>• الموظف سيقوم بفتح البلاغ المطلوب</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendTaskMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEmployee || !currentUserProfile?.id || sendTaskMutation.isPending}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            {sendTaskMutation.isPending ? (
              <>
                <LoadingSpinner className="h-4 w-4" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال المهمة
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendReportTaskDialog;
