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
      // Step 1: Create account creation request
      const { data: requestData, error: requestError } = await supabase
        .from('account_creation_requests')
        .insert({
          employee_id: employee.id,
          company_id: employee.company_id,
          requested_by: user?.id,
          requested_roles: data.selectedRoles,
          notes: data.notes
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Step 2: Update employee status to pending
      const { error: employeeError } = await supabase
        .from('employees')
        .update({
          account_status: 'pending'
        })
        .eq('id', employee.id);

      if (employeeError) throw employeeError;

      // Step 3: Send invitation email if requested
      if (data.sendWelcomeEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-account-invitation', {
          body: {
            employee_id: employee.id,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            employee_email: data.email,
            requester_name: `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim(),
            roles: data.selectedRoles,
            invitation_url: `${window.location.origin}/auth?invitation=true&email=${encodeURIComponent(data.email)}`
          }
        });

        if (emailError) {
          console.warn('Failed to send invitation email:', emailError);
          // Don't fail the whole process if email fails
        }
      }

      return { request: requestData, employee_email: data.email };
    },
    onSuccess: (result) => {
      toast({
        title: "تم إرسال دعوة الحساب بنجاح",
        description: `تم إرسال دعوة لإنشاء حساب للموظف ${employee.first_name} ${employee.last_name} على البريد الإلكتروني ${result.employee_email}`
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في إرسال الدعوة",
        description: error.message || "حدث خطأ أثناء إرسال دعوة الحساب"
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
            إرسال دعوة حساب مستخدم
          </DialogTitle>
          <DialogDescription>
            إرسال دعوة لإنشاء حساب نظام للموظف {employee.first_name} {employee.last_name}
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
                <p className="text-sm text-muted-foreground">
                  ملاحظة: سيتم إرسال دعوة للموظف لإنشاء كلمة المرور الخاصة به عند أول تسجيل دخول
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
                  إرسال دعوة بالبريد الإلكتروني لإنشاء الحساب
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
                سيتم إرسال دعوة للموظف لإنشاء حساب في النظام. سيتمكن من الوصول فقط بعد قبول الدعوة وإنشاء كلمة المرور.
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
              {createAccountMutation.isPending ? 'جاري الإرسال...' : 'إرسال الدعوة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}