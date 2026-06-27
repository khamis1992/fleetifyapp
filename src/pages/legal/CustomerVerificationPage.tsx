/**
 * صفحة تدقيق بيانات العميل
 * يستخدمها الموظف للتحقق من بيانات العميل وتسجيل الدفعات قبل رفع الدعوى
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  User,
  Phone,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  Gavel,
  DollarSign,
  Calendar,
  Edit3,
  Plus,
  Receipt,
  BadgeCheck,
  Car,
  Hash,
  XCircle,
  Upload,
  FileUp,
  X,
  Globe,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { sendWhatsAppMessage } from '@/utils/whatsappWebSender';
import { ContractDocuments } from '@/components/contracts/ContractDocuments';
import '@/styles/legal-system.css';

export default function CustomerVerificationPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const { createPayment } = usePaymentOperations({
    autoCreateJournalEntry: true,
    autoUpdateBankBalance: true,
    enableNotifications: false,
  });

  // حالات التعديل
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    customer_name: '',
    national_id: '',
    nationality: '',
    phone: '',
    monthly_rent: 0,
  });
  
  // حالة تسجيل دفعة
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // حالة رفع العقد الموقع
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  
  // حالة حذف العقد
  const [showDeleteContractDialog, setShowDeleteContractDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // جلب بيانات المهمة
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['verification-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_verification_tasks')
        .select(`
          *,
          customer:customers(
            id,
            first_name,
            last_name,
            national_id,
            nationality,
            phone,
            email
          ),
          contract:contracts(
            id,
            contract_number,
            monthly_amount,
            start_date,
            end_date,
            status,
            vehicle:vehicles(
              id,
              make,
              model,
              year,
              plate_number
            )
          ),
          assigned_by_user:profiles!customer_verification_tasks_assigned_by_fkey(
            first_name_ar,
            last_name_ar
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });

  // جلب الفواتير غير المدفوعة
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['unpaid-invoices', task?.contract_id],
    queryFn: async () => {
      if (!task?.contract_id) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', task.contract_id)
        .neq('status', 'cancelled') // استثناء الفواتير الملغاة
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      // تصفية الفواتير غير المدفوعة بالكامل
      return (data || []).filter(inv => 
        (inv.total_amount || 0) - (inv.paid_amount || 0) > 0
      );
    },
    enabled: !!task?.contract_id,
  });

  // جلب العقد الموقع إن وجد
  const { data: signedContract, isLoading: signedContractLoading, refetch: refetchSignedContract } = useQuery({
    queryKey: ['signed-contract', task?.contract_id],
    queryFn: async () => {
      if (!task?.contract_id) return null;

      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', task.contract_id)
        .eq('document_type', 'signed_contract')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!task?.contract_id,
  });

  // جلب المخالفات المرورية للعقد
  const { data: trafficViolations = [] } = useQuery({
    queryKey: ['contract-violations', task?.contract_id],
    queryFn: async () => {
      if (!task?.contract_id) return [];

      const { data, error } = await supabase
        .from('penalties')
        .select('id, penalty_number, violation_type, amount, status, payment_status')
        .eq('contract_id', task.contract_id)
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled');

      if (error) throw error;
      return (data || []).map((violation) => ({
        ...violation,
        violation_number: violation.penalty_number,
        fine_amount: violation.amount,
      }));
    },
    enabled: !!task?.contract_id,
  });

  // رفع العقد الموقع
  const uploadContractMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!task?.contract_id || !companyId || !user?.id) {
        throw new Error('بيانات غير مكتملة');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${task.contract_id}/signed_contract_${Date.now()}.${fileExt}`;
      
      // رفع الملف إلى التخزين
      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // إنشاء سجل المستند
      const { data: document, error } = await supabase
        .from('contract_documents')
        .insert({
          company_id: companyId,
          contract_id: task.contract_id,
          document_type: 'signed_contract',
          document_name: 'العقد الموقع',
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          notes: 'تم الرفع أثناء التدقيق',
          is_required: true,
        })
        .select()
        .single();

      if (error) throw error;
      return document;
    },
    onSuccess: () => {
      toast.success('تم رفع العقد الموقع بنجاح');
      setContractFile(null);
      refetchSignedContract();
    },
    onError: (error: any) => {
      toast.error('فشل رفع العقد: ' + error.message);
    },
  });

  // تحديث بيانات التعديل عند تحميل البيانات
  useEffect(() => {
    if (task?.customer && task?.contract) {
      const customer = task.customer as any;
      setEditedData({
        customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        national_id: customer.national_id || '',
        nationality: customer.nationality || '',
        phone: customer.phone || '',
        monthly_rent: Number(task.contract.monthly_amount) || 0,
      });
    }
  }, [task]);

  // حفظ التعديلات
  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      if (!task?.customer?.id || !task?.contract?.id) throw new Error('بيانات غير مكتملة');

      const nameParts = editedData.customer_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // تحديث بيانات العميل
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          first_name: firstName,
          last_name: lastName,
          national_id: editedData.national_id,
          nationality: editedData.nationality,
          phone: editedData.phone,
        })
        .eq('id', task.customer.id);

      if (customerError) throw customerError;

      // تحديث قيمة الإيجار في العقد
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          monthly_amount: editedData.monthly_rent,
        })
        .eq('id', task.contract.id);

      if (contractError) throw contractError;
    },
    onSuccess: () => {
      toast.success('تم حفظ التغييرات بنجاح');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['verification-task', taskId] });
    },
    onError: (error: any) => {
      toast.error('فشل حفظ التغييرات: ' + error.message);
    },
  });

  // تسجيل دفعة
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice || !paymentAmount || !companyId || !user?.id) {
        throw new Error('بيانات غير مكتملة');
      }

      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('مبلغ غير صالح');
      }

      await createPayment.mutateAsync({
        contract_id: task?.contract_id,
        customer_id: task?.customer_id,
        invoice_id: selectedInvoice.id,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        notes: paymentNote || `???? ????? ????? ??????? ?????? ${user.email}`,
        type: 'receipt',
        transaction_type: 'invoice_payment',
        payment_status: 'completed',
        currency: 'QAR',
      });
    },
    onSuccess: () => {
      toast.success('تم تسجيل الدفعة بنجاح');
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      setPaymentNote('');
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices'] });
    },
    onError: (error: any) => {
      toast.error('فشل تسجيل الدفعة: ' + error.message);
    },
  });

  // إلغاء المهمة
  // حذف العقد نهائياً
  const deleteContractMutation = useMutation({
    mutationFn: async () => {
      if (!task?.contract_id || !companyId) {
        throw new Error('بيانات العقد غير مكتملة');
      }

      const contractId = task.contract_id;

      const { count: existingPaymentsCount, error: paymentsCountError } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contractId);

      if (paymentsCountError) throw paymentsCountError;

      if ((existingPaymentsCount || 0) > 0) {
        throw new Error('لا يمكن حذف عقد لديه مدفوعات مسجلة. قم بإلغاء العقد أو أرشفته للحفاظ على السجل المالي.');
      }

      // 1. حذف البيانات المرتبطة
      await supabase.from('delinquent_customers').delete().eq('contract_id', contractId);
      await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          balance_due: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('contract_id', contractId)
        .or('paid_amount.eq.0,paid_amount.is.null');
      await supabase.from('contract_payment_schedules').delete().eq('contract_id', contractId);
      await supabase.from('penalties').update({ contract_id: null, customer_id: null }).eq('contract_id', contractId);
      await supabase.from('contract_documents').delete().eq('contract_id', contractId);

      // 2. حذف العقد
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (deleteError) throw deleteError;

      // 3. حذف مهمة التدقيق
      await supabase
        .from('customer_verification_tasks')
        .delete()
        .eq('id', taskId);
    },
    onSuccess: () => {
      toast.success('تم حذف العقد نهائياً من النظام');
      queryClient.invalidateQueries({ queryKey: ['verification-task'] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      navigate('/legal/delinquency');
    },
    onError: (error: any) => {
      console.error('Error deleting contract:', error);
      toast.error('فشل حذف العقد: ' + (error.message || 'خطأ غير معروف'));
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error('معرف المهمة غير موجود');

      // تحديث حالة المهمة إلى ملغاة
      const { error } = await supabase
        .from('customer_verification_tasks')
        .update({
          status: 'cancelled',
        })
        .eq('id', taskId);

      if (error) throw error;

      // وضع علامة مقروء على التنبيه المرتبط
      await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('related_id', taskId)
        .eq('related_type', 'verification_task');
    },
    onSuccess: () => {
      toast.success('تم إلغاء المهمة بنجاح - سيعود العميل لصفحة المتعثرات');
      queryClient.invalidateQueries({ queryKey: ['verification-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['my-verification-tasks'] });
      navigate('/legal/cases');
    },
    onError: (error: any) => {
      toast.error('فشل إلغاء المهمة: ' + error.message);
    },
  });

  // تأكيد جاهزية رفع الدعوى
  const confirmReadyMutation = useMutation({
    mutationFn: async () => {
      if (!taskId || !user?.id) throw new Error('بيانات غير مكتملة');

      // جلب بيانات البروفايل (id و الاسم)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name_ar, last_name_ar')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('لم يتم العثور على بيانات المستخدم');

      const verifierFullName = `${profile.first_name_ar || ''} ${profile.last_name_ar || ''}`.trim() || user.email;

      const { error } = await supabase
        .from('customer_verification_tasks')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: profile.id,
          verifier_name: verifierFullName,
        })
        .eq('id', taskId);

      if (error) throw error;

      // وضع علامة مقروء على التنبيه المرتبط بهذه المهمة
      await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('related_id', taskId)
        .eq('related_type', 'verification_task');

      // إرسال رسالة واتساب لمنشئ المهمة
      if (task?.assigned_by) {
        try {
          // جلب بيانات منشئ المهمة
          const { data: assignerProfile } = await supabase
            .from('profiles')
            .select('first_name_ar, last_name_ar, phone, user_id')
            .eq('id', task.assigned_by)
            .single();

          // جلب رقم الهاتف من جدول employees إذا لم يكن موجوداً في profiles
          let assignerPhone = assignerProfile?.phone;
          if (!assignerPhone && assignerProfile?.user_id) {
            const { data: empData } = await supabase
              .from('employees')
              .select('phone')
              .eq('user_id', assignerProfile.user_id)
              .maybeSingle();
            assignerPhone = empData?.phone;
          }

          if (assignerPhone) {
            const assignerName = `${assignerProfile?.first_name_ar || ''} ${assignerProfile?.last_name_ar || ''}`.trim() || 'المسؤول';
            const customerName = editedData.customer_name || 'العميل';
            
            const message = `السلام عليكم ${assignerName}،

✅ *تم إتمام مهمة التدقيق*

تم الانتهاء من تدقيق بيانات العميل:
👤 *${customerName}*

📋 تفاصيل المهمة:
• تم التدقيق بواسطة: ${verifierFullName}
• التاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}

العميل جاهز الآن لرفع الدعوى القانونية.

شكراً لتعاونكم 🙏`;

            await sendWhatsAppMessage({
              phone: assignerPhone,
              message,
              customerName: assignerName,
            });
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification error:', whatsappError);
          // لا نوقف العملية إذا فشل إرسال الواتساب
        }
      }

      return { verifierFullName };
    },
    onSuccess: () => {
      toast.success('تم تأكيد جاهزية العميل لرفع الدعوى', {
        description: '✅ تم تحديث حالة العميل وسيظهر ضمن المتعثرين',
        action: {
          label: 'فتح صفحة المتعثرات',
          onClick: () => navigate('/legal/delinquency')
        }
      });
      queryClient.invalidateQueries({ queryKey: ['verification-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['my-verification-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lawsuit_templates'] });
      
      // بعد إنهاء التدقيق انتقل مباشرة لصفحة المتعثرات
      setTimeout(() => {
        navigate('/legal/delinquency');
      }, 300);
    },
    onError: (error: any) => {
      toast.error('فشل التأكيد: ' + error.message);
    },
  });

  // حساب الإجماليات
  const totalDue = invoices.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <span className="mr-2 text-muted-foreground">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="legal-system container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لم يتم العثور على المهمة</AlertDescription>
        </Alert>
      </div>
    );
  }

  const customer = task.customer as any;
  const contract = task.contract as any;
  const vehicle = contract?.vehicle as any;
  const isVerified = task.status === 'verified';
  const formatDateOrDash = (date?: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ar });
    } catch {
      return '-';
    }
  };

  return (
    <div className="legal-system container mx-auto max-w-4xl p-4" dir="rtl">
      {/* زر الرجوع */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 ml-2" />
        رجوع
      </Button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="legal-panel">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <BadgeCheck className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">تدقيق بيانات العميل</h1>
                  <p className="text-sm text-white/70 mt-1">
                    مهمة من: {(task.assigned_by_user as any)?.first_name_ar} {(task.assigned_by_user as any)?.last_name_ar || 'غير معروف'}
                  </p>
                </div>
              </div>
              {isVerified ? (
                <Badge className="bg-green-500 text-white text-sm px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                  تم التدقيق
                </Badge>
              ) : (
                <Badge className="bg-amber-500 text-white text-sm px-4 py-2">
                  <AlertCircle className="h-4 w-4 ml-1" />
                  قيد التدقيق
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* بطاقة بيانات العميل */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                بيانات العميل
              </CardTitle>
              {!isVerified && (
                <Button
                  variant={isEditing ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      saveChangesMutation.mutate();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  disabled={saveChangesMutation.isPending}
                >
                  {saveChangesMutation.isPending ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : isEditing ? (
                    <>
                      <Save className="h-4 w-4 ml-1" />
                      حفظ
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 ml-1" />
                      تعديل
                    </>
                  )}
                </Button>
              )}
            </div>
            <CardDescription>
              {isEditing ? 'قم بتعديل البيانات ثم اضغط حفظ' : 'بيانات العميل الأساسية'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* الاسم */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  اسم العميل
                </Label>
                {isEditing ? (
                  <Input
                    value={editedData.customer_name}
                    onChange={(e) => setEditedData({ ...editedData, customer_name: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-semibold">{editedData.customer_name || '-'}</p>
                )}
              </div>

              {/* الرقم الشخصي */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  الرقم الشخصي (الهوية)
                </Label>
                {isEditing ? (
                  <Input
                    value={editedData.national_id}
                    onChange={(e) => setEditedData({ ...editedData, national_id: e.target.value })}
                    dir="ltr"
                  />
                ) : (
                  <p className="text-lg font-semibold" dir="ltr">{editedData.national_id || '-'}</p>
                )}
              </div>

              {/* الجنسية */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  الجنسية
                </Label>
                {isEditing ? (
                  <Input
                    value={editedData.nationality}
                    onChange={(e) => setEditedData({ ...editedData, nationality: e.target.value })}
                    placeholder="أدخل الجنسية"
                  />
                ) : (
                  <p className="text-lg font-semibold">{editedData.nationality || '-'}</p>
                )}
              </div>

              {/* رقم الجوال */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  رقم الجوال
                </Label>
                {isEditing ? (
                  <Input
                    value={editedData.phone}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    dir="ltr"
                  />
                ) : (
                  <p className="text-lg font-semibold" dir="ltr">{editedData.phone || '-'}</p>
                )}
              </div>

              {/* قيمة الإيجار الشهري */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  قيمة الإيجار الشهري
                </Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedData.monthly_rent}
                    onChange={(e) => setEditedData({ ...editedData, monthly_rent: Number(e.target.value) })}
                    dir="ltr"
                  />
                ) : (
                  <p className="text-lg font-semibold text-teal-600">
                    {formatCurrency(editedData.monthly_rent)} / شهر
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* بيانات العقد والمركبة */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => contract?.contract_number && navigate(`/contracts/${contract.contract_number}`)}
              >
                <FileText className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">رقم العقد</p>
                  <p className="font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                    {contract?.contract_number || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">بداية العقد</p>
                  <p className="font-semibold" dir="ltr">{formatDateOrDash(contract?.start_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">نهاية العقد</p>
                  <p className="font-semibold" dir="ltr">{formatDateOrDash(contract?.end_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Car className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">المركبة</p>
                  <p className="font-semibold">{vehicle ? `${vehicle.make} ${vehicle.model}` : '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Hash className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">لوحة المركبة</p>
                  <p className="font-semibold" dir="ltr">{vehicle?.plate_number || '-'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* بطاقة رفع العقد الموقع - تظهر فقط إذا لم يوجد عقد موقع */}
      {!signedContractLoading && !signedContract && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  العقد الموقع
                </CardTitle>
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  مطلوب
                </Badge>
              </div>
              <CardDescription>
                لا توجد نسخة موقعة من العقد - يرجى رفع نسخة قبل إتمام التدقيق
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging 
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                    : 'border-amber-300 hover:border-teal-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const file = files[0];
                    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
                      setContractFile(file);
                    } else {
                      toast.error('يرجى رفع ملف PDF أو صورة فقط');
                    }
                  }
                }}
              >
                {contractFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-3 bg-teal-100 rounded-lg">
                        <FileUp className="h-6 w-6 text-teal-600" />
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-teal-800">{contractFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(contractFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setContractFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={() => uploadContractMutation.mutate(contractFile)}
                      disabled={uploadContractMutation.isPending}
                      className="gap-2 bg-teal-600 hover:bg-teal-700"
                    >
                      {uploadContractMutation.isPending ? (
                        <>
                          <LoadingSpinner className="h-4 w-4" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          رفع العقد
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        اسحب وأفلت العقد الموقع هنا
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        أو
                      </p>
                    </div>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
                              setContractFile(file);
                            } else {
                              toast.error('يرجى رفع ملف PDF أو صورة فقط');
                            }
                          }
                        }}
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg cursor-pointer hover:bg-amber-600 transition-colors">
                        <FileUp className="h-4 w-4" />
                        اختر ملف
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      PDF أو صورة (JPG, PNG)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* مستندات العقد */}
      {task?.contract_id && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-6"
        >
          <ContractDocuments
            contractId={task.contract_id}
            customerId={task.customer_id}
            vehicleId={task?.contract?.vehicle?.id}
          />
        </motion.div>
      )}

      {/* قائمة الفواتير */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-600" />
                الفواتير غير المدفوعة
              </CardTitle>
              <Badge variant="destructive" className="text-sm">
                {invoices.length} فاتورة | {formatCurrency(totalDue)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>لا توجد فواتير غير مدفوعة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>المبلغ الكلي</TableHead>
                    <TableHead>المدفوع</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const remaining = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                        <TableCell>
                          {invoice.due_date 
                            ? format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.total_amount || 0)}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(invoice.paid_amount || 0)}
                        </TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell className="text-center">
                          {!isVerified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentAmount(remaining.toString());
                                setPaymentDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              تسجيل دفعة
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* أزرار الإجراءات */}
      {!isVerified && task.status !== 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* زر التأكيد */}
          <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Gavel className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-200">
                      تأكيد جاهزية رفع الدعوى
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      بعد التأكد من صحة جميع البيانات، اضغط لتأكيد الجاهزية
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => confirmReadyMutation.mutate()}
                  disabled={confirmReadyMutation.isPending || cancelTaskMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                >
                  {confirmReadyMutation.isPending ? (
                    <>
                      <LoadingSpinner className="h-5 w-5" />
                      جاري التأكيد...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      جاهز لرفع دعوى
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* زر إلغاء المهمة */}
          <Card className="border border-red-200 bg-red-50/50 dark:bg-red-950/10">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-red-800 dark:text-red-200">
                      إلغاء المهمة
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      سيعود العميل لصفحة إدارة المتعثرات
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelTaskMutation.mutate()}
                  disabled={cancelTaskMutation.isPending || confirmReadyMutation.isPending}
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-100"
                >
                  {cancelTaskMutation.isPending ? (
                    <>
                      <LoadingSpinner className="h-4 w-4" />
                      جاري الإلغاء...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      إلغاء المهمة
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* زر حذف العقد نهائياً */}
          <Card className="border border-slate-300 bg-slate-50/50 dark:bg-slate-950/10">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Trash2 className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">
                      حذف العقد نهائياً
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      حذف العقد والبيانات المرتبطة من النظام بشكل نهائي
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteContractDialog(true)}
                  disabled={isDeleting}
                  className="gap-2 border-slate-400 text-slate-700 hover:bg-slate-200"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف العقد
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* حالة التدقيق للمهام المكتملة */}
      {isVerified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-green-300 bg-green-100 dark:bg-green-950/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200">
                    تم التدقيق بنجاح
                  </h3>
                  <p className="text-green-600 dark:text-green-400">
                    تم التدقيق من قبل: <strong>{task.verifier_name}</strong>
                  </p>
                  <p className="text-sm text-green-500">
                    {task.verified_at && format(new Date(task.verified_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* نافذة تسجيل الدفعة */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-600" />
              تسجيل دفعة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">الفاتورة</p>
              <p className="font-semibold">{selectedInvoice?.invoice_number}</p>
              <p className="text-sm text-red-600">
                المتبقي: {formatCurrency((selectedInvoice?.total_amount || 0) - (selectedInvoice?.paid_amount || 0))}
              </p>
            </div>
            <div className="space-y-2">
              <Label>مبلغ الدفعة</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="أي ملاحظات عن الدفعة..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => recordPaymentMutation.mutate()}
              disabled={recordPaymentMutation.isPending || !paymentAmount}
              className="gap-2"
            >
              {recordPaymentMutation.isPending ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              تسجيل الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog تأكيد حذف العقد */}
      <Dialog open={showDeleteContractDialog} onOpenChange={setShowDeleteContractDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف العقد نهائياً
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* تحذير المخالفات المرورية */}
            {trafficViolations.length > 0 && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>تنبيه:</strong> يوجد {trafficViolations.length} مخالفة مرورية معلقة على هذا العقد.
                  سيتم فك ارتباط المخالفات بالعقد (ستبقى في النظام مرتبطة بالمركبة فقط).
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه!
                <br />
                سيتم حذف:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>العقد رقم: <strong>{task?.contract?.contract_number}</strong></li>
                  <li>جميع الفواتير المرتبطة ({invoices.length})</li>
                  <li>جميع الدفعات المسجلة</li>
                  <li>مهمة التدقيق الحالية</li>
                  <li>المستندات المرفقة</li>
                </ul>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-slate-600">
              استخدم هذا الخيار فقط للعقود التي تم تسويتها بالكامل وليس عليها أي مطالبات.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteContractDialog(false)}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleting(true);
                deleteContractMutation.mutate();
              }}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner className="h-4 w-4" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  تأكيد الحذف النهائي
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
