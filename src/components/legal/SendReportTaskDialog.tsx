import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  ShieldAlert, 
  FileText, 
  User, 
  Car, 
  FileCheck, 
  Send, 
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  MessageCircle,
  Phone,
  IdCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/api/useEmployeesApi';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { sendWhatsAppMessage, sendWhatsAppDocument } from '@/utils/whatsappWebSender';

interface SendReportTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId?: string;
  contractNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerNationalId?: string;
  vehiclePlate?: string;
  criminalComplaintHtml?: string | null;
  violationsTransferHtml?: string | null;
}

type TaskType = 'police_report' | 'traffic_transfer' | 'generic';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

export function SendReportTaskDialog({
  open,
  onOpenChange,
  contractId,
  contractNumber,
  customerName,
  customerPhone,
  customerNationalId,
  vehiclePlate,
  criminalComplaintHtml,
  violationsTransferHtml
}: SendReportTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // جلب الموظفين من قاعدة البيانات
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ limit: 100 });
  
  // جلب أرقام الهواتف من profiles أيضاً لأن بعض الموظفين أرقامهم مسجلة هناك
  const [profilePhones, setProfilePhones] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchProfilePhones = async () => {
      const employeesList = employeesData?.employees || [];
      const userIds = employeesList
        .filter((emp: any) => emp.user_id)
        .map((emp: any) => emp.user_id);
      
      if (userIds.length === 0) return;
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, phone')
        .in('user_id', userIds);
      
      if (profiles) {
        const phoneMap: Record<string, string> = {};
        profiles.forEach((p: any) => {
          if (p.phone) {
            phoneMap[p.user_id] = p.phone;
          }
        });
        setProfilePhones(phoneMap);
      }
    };
    
    if (employeesData?.employees?.length) {
      fetchProfilePhones();
    }
  }, [employeesData]);
  
  // فلترة الموظفين النشطين وإضافة رقم الهاتف من profiles إذا لم يكن موجوداً
  const employees = useMemo(() => {
    return (employeesData?.employees || [])
      .filter((emp: any) => emp.is_active !== false)
      .map((emp: any) => ({
        ...emp,
        // استخدام الهاتف من الموظف أو من profiles
        phone: emp.phone || (emp.user_id ? profilePhones[emp.user_id] : null)
      }));
  }, [employeesData, profilePhones]);
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskType>('police_report');
  const [priority, setPriority] = useState<Priority>('high');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
  const [attachDocument, setAttachDocument] = useState(true);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // التحقق من توفر المستند حسب نوع المهمة
  const isDocumentAvailable = useMemo(() => {
    if (taskType === 'police_report') {
      return !!criminalComplaintHtml;
    } else if (taskType === 'traffic_transfer') {
      return !!violationsTransferHtml;
    }
    return false;
  }, [taskType, criminalComplaintHtml, violationsTransferHtml]);

  // الحصول على بيانات الموظف المحدد
  const selectedEmployeeData = useMemo(() => {
    return employees.find((emp: any) => emp.id === selectedEmployee);
  }, [employees, selectedEmployee]);

  // تحديث الملاحظات التلقائية بناءً على نوع المهمة
  useEffect(() => {
    if (taskType === 'police_report') {
      setNotes(`يرجى التوجه لمركز الشرطة وفتح بلاغ سرقة مركبة/خيانة أمانة ضد العميل.
المركبة: ${vehiclePlate || ''}
العقد: ${contractNumber || ''}
المطلوب: صورة من البلاغ + الرقم الجنائي`);
    } else if (taskType === 'traffic_transfer') {
      setNotes(`يرجى مراجعة المرور لتحويل المخالفات المرورية المسجلة على المركبة إلى المستأجر.
المركبة: ${vehiclePlate || ''}
الفترة: كامل مدة العقد (${contractNumber || ''})
المرفقات: كشف المخالفات + العقد + طلب التحويل`);
    } else {
      setNotes('');
    }
  }, [taskType, contractNumber, vehiclePlate]);

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast({
        title: "مطلوب اختيار موظف",
        description: "يرجى اختيار الموظف المسؤول عن تنفيذ المهمة",
        variant: "destructive"
      });
      return;
    }

    // التحقق من رقم هاتف الموظف إذا كان إرسال واتساب مفعل
    if (sendViaWhatsApp && !selectedEmployeeData?.phone) {
      toast({
        title: "لا يوجد رقم هاتف",
        description: "الموظف المحدد ليس لديه رقم هاتف مسجل. يرجى إضافة رقم الهاتف أو إلغاء خيار الإرسال عبر واتساب.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const employeeName = `${selectedEmployeeData?.first_name || ''} ${selectedEmployeeData?.last_name || ''}`.trim();
      const taskTitle = taskType === 'police_report' ? 'فتح بلاغ سرقة/خيانة أمانة' : 'تحويل مخالفات مرورية';

      // إرسال عبر واتساب إذا مفعل
      if (sendViaWhatsApp && selectedEmployeeData?.phone) {
        setIsSendingWhatsApp(true);
        
        // إعداد رسالة واتساب
        const whatsappMessage = `📋 *مهمة جديدة: ${taskTitle}*

مرحباً ${employeeName}،

تم تكليفك بالمهمة التالية:

━━━━━━━━━━━━━━━━━━
📌 *نوع المهمة:* ${taskTitle}
👤 *العميل:* ${customerName || 'غير محدد'}
🪪 *رقم الهوية:* ${customerNationalId || 'غير محدد'}
📱 *جوال العميل:* ${customerPhone || 'غير محدد'}
🚗 *المركبة:* ${vehiclePlate || 'غير محدد'}
📄 *رقم العقد:* ${contractNumber || 'غير محدد'}
🎯 *الأولوية:* ${getPriorityLabel(priority)}
━━━━━━━━━━━━━━━━━━

📝 *التعليمات:*
${notes}

━━━━━━━━━━━━━━━━━━

⚠️ يرجى متابعة المهمة وإفادتنا بالنتيجة.
${attachDocument && isDocumentAvailable ? '📎 *مرفق:* ملف PDF' : ''}

مع تحياتنا،
*شركة العراف لتأجير السيارات*`;

        try {
          // إرسال الرسالة النصية أولاً
          const messageResult = await sendWhatsAppMessage({
            phone: selectedEmployeeData.phone,
            message: whatsappMessage,
            customerName: employeeName
          });

          if (messageResult.success) {
            toast({
              title: "✅ تم إرسال الرسالة",
              description: `تم إرسال تفاصيل المهمة إلى ${employeeName}`,
            });
          }

          // إرسال ملف PDF مباشرة عبر واتساب
          console.log('[PDF] Checking conditions:', {
            attachDocument,
            isDocumentAvailable,
            taskType,
            hasCriminalHtml: !!criminalComplaintHtml,
            hasViolationsHtml: !!violationsTransferHtml
          });

          if (attachDocument && isDocumentAvailable) {
            const htmlContent = taskType === 'police_report'
              ? criminalComplaintHtml
              : violationsTransferHtml;

            console.log('[PDF] HTML content available:', !!htmlContent, 'Length:', htmlContent?.length || 0);

            if (htmlContent) {
              try {
                toast({
                  title: "⏳ جاري إنشاء PDF...",
                  description: "يتم تحويل المستند إلى PDF وإرساله",
                });

                const filename = taskType === 'police_report'
                  ? `police_report_${contractNumber?.replace(/\s+/g, '_') || 'document'}.pdf`
                  : `violation_transfer_${contractNumber?.replace(/\s+/g, '_') || 'document'}.pdf`;

                console.log('[PDF] Starting PDF generation for WhatsApp...');

                // إنشاء PDF مباشرة كـ base64 للإرسال عبر واتساب
                const { default: html2canvas } = await import('html2canvas');
                const { jsPDF } = await import('jspdf');

                // أبعاد A4 بالبكسل
                const A4_WIDTH = 794;
                const A4_HEIGHT = 1123;

                // إنشاء iframe للتحويل
                const iframe = document.createElement('iframe');
                iframe.style.position = 'absolute';
                iframe.style.left = '-9999px';
                iframe.style.width = `${A4_WIDTH}px`;
                iframe.style.height = 'auto';
                iframe.style.border = 'none';
                document.body.appendChild(iframe);

                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!iframeDoc) {
                  document.body.removeChild(iframe);
                  throw new Error('Failed to create iframe');
                }

                const printStyles = `
                  <style>
                    @page { size: A4; margin: 0; }
                    body {
                      margin: 0;
                      padding: 20px;
                      font-family: 'Arial', 'Tahoma', sans-serif;
                      direction: rtl;
                      background: white;
                    }
                    * { box-sizing: border-box; }
                  </style>
                `;

                iframeDoc.open();
                iframeDoc.write(printStyles + htmlContent);
                iframeDoc.close();

                // انتظار تحميل المحتوى
                await new Promise(r => setTimeout(r, 600));

                const body = iframeDoc.body;

                // تحويل إلى صورة
                const canvas = await html2canvas(body, {
                  scale: 1.5,
                  useCORS: true,
                  allowTaint: true,
                  logging: false,
                  backgroundColor: '#ffffff',
                  width: A4_WIDTH,
                });

                console.log('[PDF] Canvas created, size:', canvas.width, 'x', canvas.height);

                // إنشاء PDF
                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: 'a4',
                  compress: true,
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                console.log('[PDF] JPEG image size:', Math.round(imgData.length / 1024), 'KB');

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;

                const ratio = pdfWidth / imgWidth;
                const contentHeight = imgHeight * ratio;

                let heightLeft = contentHeight;
                let position = 0;
                let pageCount = 0;

                while (heightLeft > 0) {
                  if (pageCount > 0) {
                    pdf.addPage();
                  }

                  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');

                  heightLeft -= pdfHeight;
                  position -= pdfHeight;
                  pageCount++;

                  if (pageCount >= 10) break;
                }

                document.body.removeChild(iframe);

                // تحويل PDF إلى base64 للإرسال عبر واتساب
                const pdfBase64 = pdf.output('datauristring');
                const pdfSizeKB = Math.round(pdfBase64.length / 1024);
                console.log('[PDF] PDF base64 size:', pdfSizeKB, 'KB');

                // التحقق من حجم الملف (Ultramsg حد أقصى 10 ميجابايت للـ base64)
                if (pdfBase64.length > 10000000) {
                  console.error('[PDF] File too large for WhatsApp:', pdfSizeKB, 'KB');
                  toast({
                    title: "تنبيه",
                    description: "حجم ملف PDF كبير جداً للإرسال عبر واتساب (الحد الأقصى 10 ميجابايت)",
                    variant: "destructive"
                  });
                } else {
                  // إرسال ملف PDF مباشرة عبر واتساب
                  const documentType = taskType === 'police_report'
                    ? 'بلاغ سرقة/خيانة أمانة'
                    : 'طلب تحويل مخالفات مرورية';

                  const caption = `📎 *${documentType}*

━━━━━━━━━━━━━━━━━━
📋 العقد: ${contractNumber || '-'}
👤 العميل: ${customerName || '-'}
━━━━━━━━━━━━━━━━━━`;

                  console.log('[PDF] Sending PDF via WhatsApp...');

                  const pdfResult = await sendWhatsAppDocument({
                    phone: selectedEmployeeData.phone,
                    documentBase64: pdfBase64,
                    filename: filename,
                    caption: caption,
                    customerName: employeeName
                  });

                  if (pdfResult.success) {
                    toast({
                      title: "✅ تم إرسال ملف PDF",
                      description: `تم إرسال ملف PDF مباشرة إلى ${employeeName}`,
                    });
                  } else {
                    console.error('PDF send failed:', pdfResult.error);
                    toast({
                      title: "تنبيه",
                      description: `فشل إرسال PDF: ${pdfResult.error}`,
                      variant: "destructive"
                    });
                  }
                }
              } catch (pdfError) {
                console.error('PDF error:', pdfError);
                toast({
                  title: "تنبيه",
                  description: "تم إرسال الرسالة لكن فشل إنشاء/إرسال ملف PDF",
                  variant: "destructive"
                });
              }
            }
          }
        } catch (whatsappError) {
          console.error('WhatsApp error:', whatsappError);
          toast({
            title: "خطأ",
            description: "فشل إرسال واتساب",
            variant: "destructive"
          });
        }
        
        setIsSendingWhatsApp(false);
      }

      // حفظ المهمة في قاعدة البيانات
      const companyId = user?.profile?.company_id;
      if (companyId) {
        const { error } = await supabase.from('tasks').insert({
          title: taskTitle,
          description: notes,
          assigned_to: selectedEmployeeData?.user_id || null,
          priority: priority,
          related_entity_type: 'contract',
          related_entity_id: contractId,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          created_by: user?.id,
          company_id: companyId,
        });

        if (error) {
          console.error('Task save error:', error);
        }
      }

      toast({
        title: "تم إرسال المهمة بنجاح",
        description: sendViaWhatsApp 
          ? `تم تكليف ${employeeName} بالمهمة وإرسال إشعار واتساب` 
          : `تم تكليف ${employeeName} بالمهمة`,
      });
      
      onOpenChange(false);
      // Reset form
      setNotes('');
      setSelectedEmployee('');
      setPriority('high');
      setSendViaWhatsApp(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال المهمة",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsSendingWhatsApp(false);
    }
  };

  const getPriorityColor = (p: Priority) => {
    switch(p) {
      case 'urgent': return 'bg-red-500 text-white hover:bg-red-600';
      case 'high': return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'medium': return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'low': return 'bg-slate-500 text-white hover:bg-slate-600';
      default: return 'bg-slate-100 text-slate-900';
    }
  };

  const getPriorityLabel = (p: Priority) => {
    switch(p) {
      case 'urgent': return 'طارئ جداً';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[950px] p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm shadow-xl">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">إسناد مهمة قانونية</DialogTitle>
                <DialogDescription className="text-slate-300 text-sm">
                  تكليف موظف بمتابعة إجراء رسمي
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Context Info Card - 5 columns */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {/* العميل */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-full">
                <User className="w-3.5 h-3.5 text-blue-300" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] text-slate-400">العميل</p>
                <p className="text-xs font-medium truncate text-white" title={customerName}>{customerName || '-'}</p>
              </div>
            </div>
            
            {/* رقم الهوية */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 rounded-full">
                <IdCard className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] text-slate-400">رقم الهوية</p>
                <p className="text-xs font-medium text-white font-mono truncate" dir="ltr">{customerNationalId || '-'}</p>
              </div>
            </div>

            {/* رقم الجوال */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-full">
                <Phone className="w-3.5 h-3.5 text-green-300" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] text-slate-400">الجوال</p>
                <p className="text-xs font-medium text-white font-mono truncate" dir="ltr">{customerPhone || '-'}</p>
              </div>
            </div>
            
            {/* المركبة */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-full">
                <Car className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] text-slate-400">المركبة</p>
                <p className="text-xs font-medium text-white truncate">{vehiclePlate || '-'}</p>
              </div>
            </div>

            {/* رقم العقد */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 rounded-full">
                <FileCheck className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] text-slate-400">العقد</p>
                <p className="text-xs font-medium text-white truncate">{contractNumber || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          
          {/* Top Row: Task Type + Employee + Priority */}
          <div className="grid grid-cols-3 gap-4">
            {/* Task Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">نوع المهمة</Label>
              <div className="space-y-2">
                <div 
                  className={cn(
                    "relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-amber-500/50",
                    taskType === 'police_report' 
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                      : "border-muted bg-white dark:bg-slate-900"
                  )}
                  onClick={() => setTaskType('police_report')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg", taskType === 'police_report' ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500")}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs">بلاغ سرقة/خيانة أمانة</h3>
                    </div>
                    {taskType === 'police_report' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                  </div>
                </div>

                <div 
                  className={cn(
                    "relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-blue-500/50",
                    taskType === 'traffic_transfer' 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" 
                      : "border-muted bg-white dark:bg-slate-900"
                  )}
                  onClick={() => setTaskType('traffic_transfer')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg", taskType === 'traffic_transfer' ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500")}>
                      <FileWarning className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs">تحويل مخالفات مرورية</h3>
                    </div>
                    {taskType === 'traffic_transfer' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">الموظف المسؤول</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={employeesLoading}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-muted-300 shadow-sm">
                  {employeesLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner className="h-3 w-3" />
                      <span className="text-muted-foreground text-xs">جاري التحميل...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="اختر الموظف..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 && !employeesLoading ? (
                    <div className="py-3 text-center text-xs text-muted-foreground">
                      لا يوجد موظفين
                    </div>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="cursor-pointer py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border">
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-medium text-xs">
                              {`${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() || '؟'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-xs truncate">{`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'بدون اسم'}</p>
                              {emp.phone && <Phone className="h-3 w-3 text-green-500 flex-shrink-0" />}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">الأولوية</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <div
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "h-9 flex items-center justify-center rounded-lg border-2 cursor-pointer transition-all text-xs font-bold",
                      priority === p 
                        ? getPriorityColor(p) + " border-transparent shadow-sm" 
                        : "bg-white dark:bg-slate-900 border-muted text-muted-foreground hover:bg-slate-50"
                    )}
                  >
                    {getPriorityLabel(p)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instructions + WhatsApp Options Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Instructions */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" />
                تعليمات المهمة
              </Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[100px] bg-white dark:bg-slate-900 border-muted-300 shadow-sm resize-none p-3 text-xs leading-relaxed"
                placeholder="اكتب أي تعليمات إضافية للموظف هنا..."
              />
            </div>

            {/* WhatsApp Options */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">خيارات الإرسال</Label>
              
              {/* WhatsApp Option */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                sendViaWhatsApp 
                  ? "bg-green-50 border-green-300 dark:bg-green-950/20" 
                  : "bg-white border-muted dark:bg-slate-900"
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    sendViaWhatsApp ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">إرسال عبر واتساب</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedEmployeeData?.phone 
                        ? selectedEmployeeData.phone
                        : selectedEmployee 
                          ? '⚠️ لا يوجد رقم'
                          : 'اختر موظف'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendViaWhatsApp}
                  onCheckedChange={setSendViaWhatsApp}
                  disabled={!selectedEmployee || !selectedEmployeeData?.phone}
                />
              </div>

              {/* PDF Attachment Option */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                attachDocument && isDocumentAvailable && sendViaWhatsApp
                  ? "bg-blue-50 border-blue-300 dark:bg-blue-950/20" 
                  : "bg-white border-muted dark:bg-slate-900",
                !sendViaWhatsApp && "opacity-50"
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    attachDocument && isDocumentAvailable && sendViaWhatsApp ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">إرفاق ملف PDF</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isDocumentAvailable 
                        ? '✅ الملف جاهز'
                        : '⚠️ يجب توليد الملف أولاً'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={attachDocument && isDocumentAvailable}
                  onCheckedChange={setAttachDocument}
                  disabled={!isDocumentAvailable || !sendViaWhatsApp}
                />
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="p-6 bg-white dark:bg-slate-900 border-t gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6">
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedEmployee || employeesLoading}
            className={cn(
              "h-11 px-8 gap-2 transition-all",
              sendViaWhatsApp
                ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                : taskType === 'police_report' 
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
            )}
          >
            {isSubmitting ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : sendViaWhatsApp ? (
              <MessageCircle className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSendingWhatsApp 
              ? 'جاري إرسال واتساب...' 
              : isSubmitting 
                ? 'جاري الإرسال...' 
                : sendViaWhatsApp 
                  ? 'إرسال المهمة + واتساب' 
                  : 'إرسال المهمة الآن'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
