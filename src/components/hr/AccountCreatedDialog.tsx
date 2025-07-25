import React, { useState } from 'react';
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
import { Copy, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AccountCreatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountData: {
    employee_name: string;
    employee_email: string;
    temporary_password: string;
    password_expires_at: string;
  } | null;
}

export default function AccountCreatedDialog({
  open,
  onOpenChange,
  accountData
}: AccountCreatedDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "تم النسخ",
        description: `تم نسخ ${label} إلى الحافظة`
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ في النسخ",
        description: "فشل في نسخ النص إلى الحافظة"
      });
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-KW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add null check to prevent errors
  if (!accountData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            تم إنشاء الحساب بنجاح
          </DialogTitle>
          <DialogDescription>
            تم إنشاء حساب المستخدم بنجاح. يرجى حفظ المعلومات التالية وإرسالها للموظف.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Name */}
          <div className="space-y-2">
            <Label>اسم الموظف</Label>
            <div className="flex items-center gap-2">
              <Input
                value={accountData.employee_name}
                readOnly
                className="text-right"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(accountData.employee_name, 'اسم الموظف')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <div className="flex items-center gap-2">
              <Input
                value={accountData.employee_email}
                readOnly
                className="text-left"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(accountData.employee_email, 'البريد الإلكتروني')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Temporary Password */}
          <div className="space-y-2">
            <Label>كلمة المرور المؤقتة</Label>
            <div className="flex items-center gap-2">
              <Input
                type={showPassword ? "text" : "password"}
                value={accountData.temporary_password}
                readOnly
                className="text-left font-mono"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(accountData.temporary_password, 'كلمة المرور')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Password Expiry */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">
                  تنتهي صلاحية كلمة المرور في:
                </p>
                <p className="text-amber-700">
                  {formatExpiryDate(accountData.password_expires_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">تعليمات للموظف:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• استخدم البريد الإلكتروني وكلمة المرور المؤقتة لتسجيل الدخول</li>
              <li>• سيُطلب منك تغيير كلمة المرور عند أول تسجيل دخول</li>
              <li>• يجب تغيير كلمة المرور قبل انتهاء صلاحيتها</li>
              <li>• تواصل مع الإدارة إذا واجهت أي مشاكل</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => copyToClipboard(
                `البريد الإلكتروني: ${accountData.employee_email}\nكلمة المرور المؤقتة: ${accountData.temporary_password}\nتنتهي الصلاحية: ${formatExpiryDate(accountData.password_expires_at)}`,
                'جميع بيانات الحساب'
              )}
              className="flex-1"
            >
              <Copy className="h-4 w-4 ml-2" />
              نسخ جميع البيانات
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}