import React, { useEffect, useMemo, useState } from 'react';
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
import { Copy, Eye, EyeOff, CheckCircle, AlertTriangle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';
import { formatPhoneForWhatsApp, normalizeDigits } from '@/lib/phone';

interface AccountCreatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountData: {
    employee_name: string;
    employee_email: string;
    temporary_password: string;
    password_expires_at: string;
    employee_id?: string;
    employee_phone?: string;
  } | null;
}

export default function AccountCreatedDialog({
  open,
  onOpenChange,
  accountData
}: AccountCreatedDialogProps) {
const [showPassword, setShowPassword] = useState(false);
const { toast } = useToast();
const [companyCountry, setCompanyCountry] = useState<string | undefined>(undefined);
const companyFilter = useCompanyFilter();
const [resolvedPhone, setResolvedPhone] = useState<string>('');

useEffect(() => {
  const v = accountData?.employee_phone || '';
  setResolvedPhone(v);
  console.log('[ACCOUNT_CREATED_WHATSAPP] init resolvedPhone from props:', v);
}, [accountData?.employee_phone, open]);

useEffect(() => {
  const fetchPhone = async () => {
    if (!open) return;
    const current = resolvedPhone?.trim();
    const digitsLen = normalizeDigits(current || '').replace(/\D/g, '').length;
    if (current && digitsLen >= 6) return;
    if (!accountData?.employee_id) return;
    console.log('[ACCOUNT_CREATED_WHATSAPP] fetching phone for employee:', accountData.employee_id);
    const { data, error } = await supabase
      .from('employees')
      .select('phone, emergency_contact_phone')
      .eq('id', accountData.employee_id)
      .maybeSingle();
    if (error) {
      console.log('[ACCOUNT_CREATED_WHATSAPP] fetchPhone error:', error);
      return;
    }
    const phone = (data as any)?.phone || (data as any)?.emergency_contact_phone || '';
    console.log('[ACCOUNT_CREATED_WHATSAPP] fetched phone:', phone);
    if (phone) setResolvedPhone(phone);
  };
  fetchPhone();
}, [open, accountData?.employee_id, resolvedPhone]);

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
    return date.toLocaleDateString('en-US', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // Fetch company country when dialog opens
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        if (!open || !companyFilter?.company_id) return;
        const { data, error } = await supabase
          .from('companies')
          .select('country')
          .eq('id', companyFilter.company_id)
          .single();
        if (!error) setCompanyCountry(data?.country);
      } catch (e) {
        // silent fail
      }
    };
    fetchCompany();
  }, [open, companyFilter?.company_id]);

  const whatsappMessage = useMemo(() => {
    if (!accountData) return '';

    const lines = [
      `مرحباً ${accountData.employee_name} 👋`,
      `تم إنشاء حسابك في نظام الشركة.`,
      `البريد الإلكتروني: ${accountData.employee_email}`,
      `كلمة المرور المؤقتة: ${accountData.temporary_password}`,
      `تنتهي صلاحية كلمة المرور: ${formatExpiryDate(accountData.password_expires_at)}`,
      `رابط الدخول: ${window.location.origin}`,
      `يرجى تغيير كلمة المرور عند أول تسجيل دخول.`
    ];
    return encodeURIComponent(lines.join('\n'));
  }, [accountData]);

  if (!accountData) return null;

const handleSendWhatsApp = async () => {
  let phoneRaw = (resolvedPhone || '').trim();
  let digits = normalizeDigits(phoneRaw).replace(/\D/g, '');
  console.log('[ACCOUNT_CREATED_WHATSAPP] sending, initial phone:', phoneRaw, 'digits:', digits);
  if (!digits || digits.length < 6) {
    if (accountData.employee_id) {
      console.log('[ACCOUNT_CREATED_WHATSAPP] trying fetch fallback...');
      const { data, error } = await supabase
        .from('employees')
        .select('phone, emergency_contact_phone')
        .eq('id', accountData.employee_id)
        .maybeSingle();
      if (!error) {
        const fetched = (data as any)?.phone || (data as any)?.emergency_contact_phone || '';
        console.log('[ACCOUNT_CREATED_WHATSAPP] fallback fetched phone:', fetched);
        if (fetched) {
          setResolvedPhone(fetched);
          phoneRaw = fetched.trim();
          digits = normalizeDigits(phoneRaw).replace(/\D/g, '');
        }
      }
    }
  }
  if (!digits || digits.length < 6) {
    toast({
      variant: 'destructive',
      title: 'رقم الجوال غير متوفر',
      description: 'لا يوجد رقم جوال في ملف الموظف لإرسال الرسالة عبر واتساب'
    });
    return;
  }
  const { waNumber } = formatPhoneForWhatsApp(phoneRaw, companyCountry);
  if (!waNumber) {
    toast({
      variant: 'destructive',
      title: 'رقم غير صالح',
      description: 'تعذر تنسيق رقم الجوال لإرسال الرسالة'
    });
    return;
  }
  const url = `https://wa.me/${waNumber}?text=${whatsappMessage}`;
  window.open(url, '_blank');
};
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

          {/* Phone (editable) */}
          <div className="space-y-2">
            <Label>رقم الجوال</Label>
            <div className="flex items-center gap-2">
              <Input
                value={resolvedPhone}
                onChange={(e) => setResolvedPhone(e.target.value)}
                placeholder="أدخل رقم الجوال"
                className="text-left"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(normalizeDigits(resolvedPhone || ''), 'رقم الجوال')}
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


          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSendWhatsApp}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 ml-2" />
              إرسال عبر واتساب
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
