/**
 * نافذة إرسال مهمة تدقيق بيانات العميل لموظف
 */

import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserCheck, 
  Send, 
  Users, 
  FileCheck,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { sendWhatsAppMessage } from '@/utils/whatsappWebSender';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';

interface SendVerificationTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomers: DelinquentCustomer[];
  onSuccess?: () => void;
}

export const SendVerificationTaskDialog: React.FC<SendVerificationTaskDialogProps> = ({
  open,
  onOpenChange,
  selectedCustomers,
  onSuccess,
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // جلب معرف البروفايل للمستخدم الحالي
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // جلب قائمة الموظفين مع user_id للتنبيهات
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['company-employees', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // 1. Fetch profiles (users)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, position, position_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name_ar');
      
      if (profilesError) throw profilesError;

      // 2. Fetch employees (HR records) to get phone numbers if missing in profile
      const { data: hrEmployees, error: hrError } = await supabase
        .from('employees')
        .select('user_id, phone')
        .eq('company_id', companyId)
        .not('user_id', 'is', null);

      if (hrError) console.error('Error fetching HR employees:', hrError);
      
      // Map HR phones by user_id
      const hrPhoneMap = new Map();
      if (hrEmployees) {
        hrEmployees.forEach(emp => {
          if (emp.user_id && emp.phone) {
            hrPhoneMap.set(emp.user_id, emp.phone);
          }
        });
      }
      
      // 3. Merge data
      return (profiles || []).map(emp => {
        // Use profile phone, fallback to HR employee phone
        const finalPhone = emp.phone || hrPhoneMap.get(emp.user_id) || null;

        return {
          ...emp,
          phone: finalPhone, // Override phone
          full_name: emp.first_name_ar && emp.last_name_ar 
            ? `${emp.first_name_ar} ${emp.last_name_ar}`.trim()
            : emp.first_name && emp.last_name
              ? `${emp.first_name} ${emp.last_name}`.trim()
              : emp.email,
          role: emp.position_ar || emp.position || null,
        };
      });
    },
    enabled: !!companyId && open,
  });

  // إرسال مهمة التدقيق
  const sendTaskMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !currentUserProfile?.id || selectedEmployees.length === 0) {
        throw new Error('بيانات غير مكتملة');
      }

      // إنشاء مهمة لكل عميل ولكل موظف
      const tasks: any[] = [];
      for (const customer of selectedCustomers) {
        for (const employeeId of selectedEmployees) {
          tasks.push({
            company_id: companyId,
            customer_id: customer.customer_id,
            contract_id: customer.contract_id,
            assigned_to: employeeId,
            assigned_by: currentUserProfile.id,
            status: 'pending',
            notes: notes || null,
          });
        }
      }

      const { data: insertedTasks, error } = await supabase
        .from('customer_verification_tasks')
        .insert(tasks)
        .select('id, assigned_to');

      if (error) throw error;

      // إرسال تنبيهات للموظفين المكلفين
      const notifications: any[] = [];
      const customerNames = selectedCustomers.slice(0, 3).map(c => c.customer_name).join('، ');
      const moreText = selectedCustomers.length > 3 ? ` و${selectedCustomers.length - 3} آخرين` : '';
      
      for (const employeeId of selectedEmployees) {
        // جلب user_id من قائمة الموظفين
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee?.user_id) continue;

        // جلب المهمة الأولى لهذا الموظف للرابط
        const employeeTask = insertedTasks?.find(t => t.assigned_to === employeeId);
        
        notifications.push({
          company_id: companyId,
          user_id: employee.user_id,
          title: 'مهمة تدقيق جديدة',
          message: `تم تكليفك بمهمة تدقيق بيانات العملاء: ${customerNames}${moreText}`,
          notification_type: 'info',
          is_read: false,
          related_id: employeeTask?.id || null,
          related_type: 'verification_task',
          created_at: new Date().toISOString(),
        });
      }

      if (notifications.length > 0) {
        await supabase.from('user_notifications').insert(notifications);
      }

      // إرسال رسائل واتساب للموظفين
      const whatsappResults: { sent: number; failed: number } = { sent: 0, failed: 0 };
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee?.phone) continue;

        const employeeName = employee.full_name || employee.email;
        const message = `السلام عليكم ${employeeName}،

📋 *مهمة تدقيق جديدة*

تم تكليفك بمهمة تدقيق بيانات العملاء التالية:
${customerNames}${moreText}

📌 المطلوب:
• مراجعة بيانات العميل والتأكد من صحتها
• التحقق من الفواتير المستحقة
• تسجيل أي دفعات غير مسجلة
• الضغط على "جاهز لرفع دعوى" عند الانتهاء

يرجى الدخول للنظام لإكمال المهمة.

شكراً لتعاونكم 🙏`;

        try {
          const result = await sendWhatsAppMessage({
            phone: employee.phone,
            message,
            customerName: employeeName,
            companyId,
            purpose: 'verification_task',
            entityType: 'employee',
            entityId: employee.id,
          });
          if (result.success) {
            whatsappResults.sent++;
          } else {
            whatsappResults.failed++;
          }
        } catch (error) {
          console.error('WhatsApp send error:', error);
          whatsappResults.failed++;
        }
      }

      return { taskCount: tasks.length, whatsapp: whatsappResults };
    },
    onSuccess: (result) => {
      // رسالة نجاح المهام
      let message = `تم إرسال ${result.taskCount} مهمة تدقيق بنجاح`;
      
      // إضافة معلومات الواتساب
      if (result.whatsapp.sent > 0) {
        message += ` ✅ تم إرسال ${result.whatsapp.sent} رسالة واتساب`;
      }
      if (result.whatsapp.failed > 0) {
        message += ` ⚠️ فشل ${result.whatsapp.failed} رسالة`;
      }
      
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['verification-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-verification-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedEmployees([]);
      setNotes('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Error sending verification task:', error);
      toast.error('فشل إرسال مهمة التدقيق: ' + (error.message || 'خطأ غير معروف'));
    },
  });

  const handleSubmit = () => {
    if (selectedEmployees.length === 0) {
      toast.error('يرجى اختيار موظف واحد على الأقل');
      return;
    }
    sendTaskMutation.mutate();
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/30">
              <UserCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            إرسال مهمة تدقيق
          </DialogTitle>
          <DialogDescription>
            إرسال ملفات العملاء المحددين لموظف للتدقيق على البيانات قبل رفع الدعوى
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* العملاء المحددون */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              العملاء المحددون
            </Label>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-wrap gap-2">
                {selectedCustomers.slice(0, 5).map((customer) => (
                  <Badge key={customer.customer_id} variant="secondary" className="gap-1">
                    {customer.customer_name}
                  </Badge>
                ))}
                {selectedCustomers.length > 5 && (
                  <Badge variant="outline">
                    +{selectedCustomers.length - 5} آخرين
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                إجمالي: {selectedCustomers.length} عميل
              </p>
            </div>
          </div>

          {/* اختيار الموظفين */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                الموظفين المكلفين بالتدقيق
              </span>
              {selectedEmployees.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedEmployees.length} موظف
                </Badge>
              )}
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
              <ScrollArea className="h-[180px] rounded-lg border p-2">
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedEmployees.includes(employee.id)
                          ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                      onClick={() => toggleEmployee(employee.id)}
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => toggleEmployee(employee.id)}
                        className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {employee.full_name || employee.email}
                          </p>
                          {employee.phone && (
                            <MessageCircle className="h-3.5 w-3.5 text-green-500" aria-label="سيتم إرسال واتساب" />
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

          {/* ملاحظات */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              ملاحظات للموظف (اختياري)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تعليمات أو ملاحظات خاصة..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* تنبيه */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">ما سيراه الموظف:</p>
                <ul className="text-xs mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                  <li>• بطاقة بيانات العميل (قابلة للتعديل)</li>
                  <li>• قائمة الفواتير المستحقة مع إمكانية تسجيل دفعات</li>
                  <li>• زر "جاهز لرفع دعوى" للتأكيد</li>
                </ul>
                <p className="text-xs mt-2 flex items-center gap-1 text-green-700 dark:text-green-400">
                  <MessageCircle className="h-3.5 w-3.5" />
                  سيتم إرسال رسالة واتساب للموظفين الذين لديهم رقم هاتف
                </p>
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
            disabled={selectedEmployees.length === 0 || !currentUserProfile?.id || sendTaskMutation.isPending}
            className="gap-2 bg-teal-600 hover:bg-teal-700"
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

export default SendVerificationTaskDialog;
