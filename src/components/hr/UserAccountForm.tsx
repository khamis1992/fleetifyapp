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
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Mail, Lock, Shield, User } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    email: employee.email || '',
    temporaryPassword: '',
    selectedRoles: ['employee'],
    sendWelcomeEmail: true,
    notes: ''
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Step 1: Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.temporaryPassword,
        email_confirm: true,
        user_metadata: {
          first_name: employee.first_name,
          last_name: employee.last_name,
          employee_id: employee.id,
          employee_number: employee.employee_number
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Step 2: Update employee record with user_id and system access
      const { error: employeeError } = await supabase
        .from('employees')
        .update({
          user_id: authData.user.id,
          has_system_access: true,
          account_status: 'active'
        })
        .eq('id', employee.id);

      if (employeeError) throw employeeError;

      // Step 3: Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: data.email,
          company_id: employee.company_id
        });

      if (profileError) throw profileError;

      // Step 4: Assign roles
      const roleInserts = data.selectedRoles.map(role => ({
        user_id: authData.user.id,
        role: role as "super_admin" | "company_admin" | "manager" | "accountant" | "fleet_manager" | "sales_agent" | "employee"
      }));

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) throw rolesError;

      // Step 5: Log the action
      const { error: logError } = await supabase
        .rpc('log_user_account_action', {
          employee_id_param: employee.id,
          action_type_param: 'account_created',
          performed_by_param: user?.id,
          details_param: {
            roles: data.selectedRoles,
            email: data.email,
            notes: data.notes
          }
        });

      if (logError) console.warn('Failed to log action:', logError);

      return authData.user;
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: `تم إنشاء حساب للموظف ${employee.first_name} ${employee.last_name}`
      });
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
    
    if (!formData.email || !formData.temporaryPassword) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة"
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

    createAccountMutation.mutate(formData);
  };

  const generateTemporaryPassword = () => {
    const password = Math.random().toString(36).slice(-12);
    setFormData(prev => ({ ...prev, temporaryPassword: password }));
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            إنشاء حساب مستخدم جديد
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

              <div>
                <Label htmlFor="password">كلمة المرور المؤقتة *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    value={formData.temporaryPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, temporaryPassword: e.target.value }))}
                    placeholder="كلمة مرور قوية"
                    required
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateTemporaryPassword}
                    className="shrink-0"
                  >
                    <Lock className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  سيتم إرسال كلمة المرور للموظف ويجب تغييرها عند أول تسجيل دخول
                </p>
              </div>
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

          {/* Options */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="sendWelcome"
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendWelcomeEmail: checked as boolean }))}
                />
                <Label htmlFor="sendWelcome">
                  إرسال بريد إلكتروني ترحيبي مع تفاصيل الحساب
                </Label>
              </div>

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
          <div className="flex items-start space-x-2 space-x-reverse p-4 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">تنبيه مهم:</p>
              <p className="text-muted-foreground mt-1">
                سيتمكن الموظف من الوصول إلى النظام فور إنشاء الحساب. تأكد من مراجعة الصلاحيات المختارة.
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
              {createAccountMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}