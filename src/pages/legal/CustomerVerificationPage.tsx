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
} from 'lucide-react';

export default function CustomerVerificationPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  // حالات التعديل
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    customer_name: '',
    national_id: '',
    phone: '',
    monthly_rent: 0,
  });
  
  // حالة تسجيل دفعة
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

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
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      // تصفية الفواتير غير المدفوعة بالكامل
      return (data || []).filter(inv => 
        (inv.total_amount || 0) - (inv.paid_amount || 0) > 0
      );
    },
    enabled: !!task?.contract_id,
  });

  // تحديث بيانات التعديل عند تحميل البيانات
  useEffect(() => {
    if (task?.customer && task?.contract) {
      const customer = task.customer as any;
      setEditedData({
        customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        national_id: customer.national_id || '',
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

      // إنشاء سجل الدفعة
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          contract_id: task?.contract_id,
          customer_id: task?.customer_id,
          invoice_id: selectedInvoice.id,
          amount: amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
          notes: paymentNote || `دفعة مسجلة أثناء التدقيق بواسطة ${user.email}`,
          created_by: user.id,
        });

      if (paymentError) throw paymentError;

      // تحديث المبلغ المدفوع في الفاتورة
      const newPaidAmount = (selectedInvoice.paid_amount || 0) + amount;
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newPaidAmount >= selectedInvoice.total_amount ? 'paid' : 'partial',
        })
        .eq('id', selectedInvoice.id);

      if (invoiceError) throw invoiceError;
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
    },
    onSuccess: () => {
      toast.success('تم تأكيد جاهزية العميل لرفع الدعوى');
      queryClient.invalidateQueries({ queryKey: ['verification-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['my-verification-tasks'] });
      navigate('/legal/cases');
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
      <div className="container mx-auto p-4">
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

  return (
    <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
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
        <Card className="bg-gradient-to-r from-teal-600 to-teal-700 text-white border-0 shadow-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">رقم العقد</p>
                  <p className="font-semibold">{contract?.contract_number || '-'}</p>
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
    </div>
  );
}
