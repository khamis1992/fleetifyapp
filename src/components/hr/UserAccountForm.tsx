import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Mail, Lock, Shield, User, UserPlus, Send } from 'lucide-react';
import AccountCreatedDialog from './AccountCreatedDialog';

interface UserAccountFormProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const availableRoles = [
  { value: 'company_admin', label: 'مدير الشركة', description: 'صلاحيات كاملة لإدارة الشركة' },
  { value: 'manager', label: 'مدير', description: 'صلاحيات إدارية محدودة' },
  { value: 'sales_agent', label: 'مندوب مبيعات', description: 'إدارة العملاء والمبيعات' },
  { value: 'employee', label: 'موظف', description: 'صلاحيات محدودة للاستعلام' },
];

export default function UserAccountForm({ employee, open, onOpenChange, onSuccess }: UserAccountFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creationMethod, setCreationMethod] = useState<'email' | 'direct'>('direct');
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: employee.email || '',
    selectedRoles: ['employee'],
    sendWelcomeEmail: true,
    notes: '',
    setCustomPassword: false,
    password: '',
    confirmPassword: ''
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (creationMethod === 'direct') {
        // Direct account creation
        const { data: result, error } = await supabase.functions.invoke('create-user-account', {
          body: {
            employee_id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: data.email,
            roles: data.selectedRoles,
            temporary_password: data.setCustomPassword ? data.password : undefined,
            requester_name: `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim(),
            notes: data.notes,
            user_id: user?.id,
            company_id: employee.company_id
          }
        });

        if (error) throw error;
        if (!result?.success) throw new Error(result?.error || 'فشل في إنشاء الحساب');

        return {
          method: 'direct',
          success: true,
          linked_existing_user: result.linked_existing_user,
          accountData: {
            employee_name: `${employee.first_name} ${employee.last_name}`,
            employee_email: data.email,
            temporary_password: data.setCustomPassword ? data.password : result.temporary_password,
            password_expires_at: result.password_expires_at,
            employee_phone: employee.phone,
            employee_id: employee.id,
          }
        };
      } else {
        // Email invitation method (existing logic)
        const { data: requestData, error: requestError } = await supabase
          .from('account_creation_requests')
          .insert({
            employee_id: employee.id,
            company_id: employee.company_id,
            requested_by: user?.id,
            requested_roles: data.selectedRoles,
            notes: data.notes,
            direct_creation: false
          })
          .select()
          .single();

        if (requestError) throw requestError;

        const { error: employeeError } = await supabase
          .from('employees')
          .update({ account_status: 'pending' })
          .eq('id', employee.id);

        if (employeeError) throw employeeError;

        let emailSent = false;
        let emailError = null;
        
        if (data.sendWelcomeEmail) {
          try {
            const { data: emailData, error: emailErr } = await supabase.functions.invoke('send-account-invitation', {
              body: {
                employee_id: employee.id,
                employee_name: `${employee.first_name} ${employee.last_name}`,
                employee_email: data.email,
                requester_name: `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim(),
                roles: data.selectedRoles,
                invitation_url: `${window.location.origin}/auth?invitation=true&email=${encodeURIComponent(data.email)}`
              }
            });

            if (emailErr) {
              emailError = emailErr;
            } else {
              emailSent = true;
            }
          } catch (err) {
            emailError = err;
          }
        }

        return { 
          method: 'email',
          request: requestData, 
          employee_email: data.email, 
          emailSent, 
          emailError,
          sendWelcomeEmail: data.sendWelcomeEmail 
        };
      }
    },
    onSuccess: (result) => {
      const employeeName = `${employee.first_name} ${employee.last_name}`;
      
      if (result.method === 'direct') {
        setAccountData(result.accountData);
        setShowAccountDialog(true);
        onOpenChange(false);
        
        // Show success toast with appropriate message
        const message = result.linked_existing_user 
          ? 'تم ربط المستخدم الموجود بحساب الموظف وتحديث كلمة المرور'
          : 'تم إنشاء حساب المستخدم بنجاح';
          
        toast({
          title: 'تم إنجاز العملية بنجاح',
          description: message,
        });
      } else {
        if (result.sendWelcomeEmail) {
          if (result.emailSent) {
            toast({
              title: "تم إرسال دعوة الحساب بنجاح",
              description: `تم إرسال دعوة لإنشاء حساب للموظف ${employeeName} على البريد الإلكتروني ${result.employee_email}`
            });
          } else {
            toast({
              variant: "destructive",
              title: "تم إنشاء طلب الحساب مع خطأ في الإيميل",
              description: `تم إنشاء طلب حساب للموظف ${employeeName} ولكن فشل إرسال دعوة الإيميل. يرجى إرسال الدعوة يدوياً أو المحاولة مرة أخرى.`
            });
          }
        } else {
          toast({
            title: "تم إنشاء طلب الحساب بنجاح",
            description: `تم إنشاء طلب حساب للموظف ${employeeName} بدون إرسال دعوة إيميل`
          });
        }
        onOpenChange(false);
      }
      
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الحساب",
        description: error.message || "حدث خطأ أثناء إنشاء الحساب"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى ملء البريد الإلكتروني"
      });
      return;
    }

    if (formData.selectedRoles.length === 0) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى اختيار دور واحد على الأقل"
      });
      return;
    }

    if (creationMethod === 'direct' && formData.setCustomPassword) {
      if (!formData.password || formData.password.length < 8) {
        toast({
          variant: 'destructive',
          title: 'كلمة المرور غير صالحة',
          description: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          variant: 'destructive',
          title: 'تأكيد كلمة المرور غير مطابق',
          description: 'يرجى التأكد من تطابق كلمة المرور وتأكيدها'
        });
        return;
      }
    }

    createAccountMutation.mutate(formData);
  };

  const handleRoleToggle = (roleValue: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: checked
        ? [...prev.selectedRoles, roleValue]
        : prev.selectedRoles.filter(r => r !== roleValue)
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              إنشاء حساب مستخدم
            </DialogTitle>
            <DialogDescription>
              إنشاء حساب نظام للموظف {employee.first_name} {employee.last_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">معلومات الموظف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>الاسم</Label>
                    <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                  </div>
                  <div>
                    <Label>رقم الموظف</Label>
                    <p className="font-medium">{employee.employee_number}</p>
                  </div>
                  <div>
                    <Label>المنصب</Label>
                    <p className="font-medium">{employee.position || 'غير محدد'}</p>
                  </div>
                  <div>
                    <Label>القسم</Label>
                    <p className="font-medium">{employee.department || 'غير محدد'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creation Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">طريقة إنشاء الحساب</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={creationMethod}
                  onValueChange={(value: 'email' | 'direct') => setCreationMethod(value)}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <RadioGroupItem value="direct" id="direct" className="mt-1" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="direct" className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        إنشاء حساب مباشر (موصى به)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        إنشاء الحساب فوراً مع كلمة مرور مؤقتة. سيتم عرض بيانات الحساب لنسخها وإرسالها للموظف.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <RadioGroupItem value="email" id="email" className="mt-1" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        إرسال دعوة بالإيميل
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        سيتم إرسال رسالة ترحيبية للموظف. لتسجيل الدخول لأول مرة، سيزوَّد الموظف بكلمة مرور مؤقتة من الإدارة (قد تتأخر الإيميلات).
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  تفاصيل الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="employee@company.com"
                    required
                    dir="ltr"
                  />
                </div>

                {creationMethod === 'direct' && (
                  <>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="setCustomPassword"
                        checked={formData.setCustomPassword}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, setCustomPassword: checked as boolean }))}
                      />
                      <Label htmlFor="setCustomPassword">تعيين كلمة المرور يدوياً</Label>
                    </div>

                    {formData.setCustomPassword ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="password">كلمة المرور</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="••••••••"
                            dir="ltr"
                          />
                          <p className="text-xs text-muted-foreground mt-1">الحد الأدنى 8 أحرف</p>
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="••••••••"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                        <p className="text-sm text-blue-700">
                          <Lock className="w-4 h-4 inline mr-1" />
                          سيتم إنشاء كلمة مرور مؤقتة تلقائياً وعرضها لك لنسخها وإرسالها للموظف.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {creationMethod === 'email' && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      ملاحظة: يتم إرسال رسالة ترحيبية فقط، وسيتم تزويد الموظف بكلمة مرور مؤقتة من الإدارة للدخول لأول مرة.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Roles & Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  الأدوار والصلاحيات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableRoles.map((role) => (
                  <div key={role.value} className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox
                      id={role.value}
                      checked={formData.selectedRoles.includes(role.value)}
                      onCheckedChange={(checked) => handleRoleToggle(role.value, checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor={role.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {role.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Email Options - Only show for email method */}
            {creationMethod === 'email' && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="sendWelcome"
                      checked={formData.sendWelcomeEmail}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendWelcomeEmail: checked as boolean }))}
                    />
                    <Label htmlFor="sendWelcome">
                      إرسال دعوة بالبريد الإلكتروني لإنشاء الحساب
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أي ملاحظات إضافية حول إنشاء الحساب..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Warning */}
            <div className="flex items-start space-x-2 space-x-reverse p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">تنبيه مهم:</p>
                <p className="text-amber-700 mt-1">
                  {creationMethod === 'direct' 
                    ? 'سيتم إنشاء الحساب مباشرة وعرض كلمة مرور مؤقتة. تأكد من إرسال البيانات للموظف بطريقة آمنة.'
                    : 'سيتم إرسال رسالة ترحيبية للموظف. يجب تزويده بكلمة مرور مؤقتة من الإدارة للدخول لأول مرة.'
                  }
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createAccountMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createAccountMutation.isPending}
              >
                {createAccountMutation.isPending 
                  ? 'جاري الإنشاء...' 
                  : creationMethod === 'direct' 
                    ? 'إنشاء الحساب' 
                    : 'إرسال الدعوة'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Created Dialog */}
      {accountData && (
        <AccountCreatedDialog
          open={showAccountDialog}
          onOpenChange={setShowAccountDialog}
          accountData={accountData}
        />
      )}
    </>
  );
}