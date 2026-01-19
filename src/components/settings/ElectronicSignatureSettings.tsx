import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Settings, FileSignature, Shield } from 'lucide-react';
import { useSignatureSettings, useUpdateSignatureSettings } from '@/hooks/useSignatureSettings';
import { useToast } from '@/hooks/use-toast';

export const ElectronicSignatureSettings = () => {
  const { data: settings, isLoading } = useSignatureSettings();
  const updateSettings = useUpdateSignatureSettings();
  const { toast } = useToast();

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await updateSettings.mutateAsync({
        [field]: value
      });
    } catch (error) {
      console.error('Error updating signature settings:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            إعدادات التوقيع الإلكتروني
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          إعدادات التوقيع الإلكتروني
        </CardTitle>
        <CardDescription>
          تحكم في إعدادات التوقيع الإلكتروني للعقود والمستندات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* التوقيع الإلكتروني الرئيسي */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">تفعيل التوقيع الإلكتروني</Label>
            <div className="text-sm text-muted-foreground">
              تمكين أو تعطيل استخدام التوقيع الإلكتروني في النظام
            </div>
          </div>
          <Switch
            checked={settings?.electronic_signature_enabled ?? true}
            onCheckedChange={(checked) => handleToggle('electronic_signature_enabled', checked)}
            disabled={updateSettings.isPending}
          />
        </div>

        <Separator />

        {/* إعدادات فرعية للتوقيع */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Shield className="h-4 w-4" />
            إعدادات التوقيع المتقدمة
          </div>

          <div className="space-y-4 pl-6">
            {/* توقيع العميل */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">مطالبة العميل بالتوقيع</Label>
                <div className="text-xs text-muted-foreground">
                  إجبار العملاء على التوقيع الإلكتروني قبل إتمام العقد
                </div>
              </div>
              <Switch
                checked={settings?.require_customer_signature ?? true}
                onCheckedChange={(checked) => handleToggle('require_customer_signature', checked)}
                disabled={updateSettings.isPending || !settings?.electronic_signature_enabled}
              />
            </div>

            {/* توقيع الشركة */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">مطالبة الشركة بالتوقيع</Label>
                <div className="text-xs text-muted-foreground">
                  إجبار ممثل الشركة على التوقيع الإلكتروني قبل إتمام العقد
                </div>
              </div>
              <Switch
                checked={settings?.require_company_signature ?? true}
                onCheckedChange={(checked) => handleToggle('require_company_signature', checked)}
                disabled={updateSettings.isPending || !settings?.electronic_signature_enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* معلومات إضافية */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings className="h-4 w-4" />
            ملاحظات مهمة
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• عند إلغاء تفعيل التوقيع الإلكتروني، ستتمكن من إنشاء العقود بدون مطالبة بالتوقيع</p>
            <p>• سيظهر في العقود تنبيه بأن التوقيع معطل ويمكن التوقيع يدوياً</p>
            <p>• يمكن تغيير هذه الإعدادات في أي وقت من قبل مدير الشركة</p>
            <p>• العقود المكتملة مسبقاً لن تتأثر بهذه التغييرات</p>
            <p>• عند تعطيل التوقيع، ستختفي حقول التوقيع من واجهة إنشاء العقود</p>
          </div>
        </div>

        {/* حالة التحديث */}
        {updateSettings.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري حفظ الإعدادات...
          </div>
        )}
      </CardContent>
    </Card>
  );
};