import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Clock, DollarSign } from 'lucide-react';

export default function HRSettings() {
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">إعدادات الموارد البشرية</h1>
          <p className="text-muted-foreground">إدارة إعدادات النظام والرواتب</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* إعدادات الحضور */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>إعدادات الحضور والانصراف</CardTitle>
            </div>
            <CardDescription>تكوين أوقات العمل وسياسات الحضور</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="working-hours">ساعات العمل اليومية</Label>
                <Input id="working-hours" type="number" defaultValue="8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="working-days">أيام العمل الشهرية</Label>
                <Input id="working-days" type="number" defaultValue="26" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">وقت بداية العمل</Label>
                <Input id="start-time" type="time" defaultValue="08:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">وقت نهاية العمل</Label>
                <Input id="end-time" type="time" defaultValue="17:00" />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>حساب الإضافي تلقائياً</Label>
                  <p className="text-sm text-muted-foreground">
                    حساب ساعات العمل الإضافية تلقائياً بعد انتهاء وقت العمل الرسمي
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>السماح بالأرصدة السالبة</Label>
                  <p className="text-sm text-muted-foreground">
                    السماح للموظفين بالحصول على راتب سالب في حالة الخصومات الكبيرة
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات الرواتب */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>إعدادات الرواتب</CardTitle>
            </div>
            <CardDescription>تكوين حسابات الرواتب والخصومات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="overtime-rate">معدل الساعات الإضافية</Label>
                <Input id="overtime-rate" type="number" step="0.1" defaultValue="1.5" />
                <p className="text-xs text-muted-foreground">مضاعف الساعة العادية للساعات الإضافية</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="late-penalty">غرامة التأخير (للساعة)</Label>
                <Input id="late-penalty" type="number" step="0.01" defaultValue="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="social-security">نسبة التأمينات الاجتماعية (%)</Label>
                <Input id="social-security" type="number" step="0.01" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">نسبة الضريبة (%)</Label>
                <Input id="tax-rate" type="number" step="0.01" defaultValue="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-frequency">دورية الرواتب</Label>
                <select 
                  id="payroll-frequency" 
                  className="w-full p-2 border border-input rounded-md bg-background"
                  defaultValue="monthly"
                >
                  <option value="monthly">شهري</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="bi-weekly">كل أسبوعين</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">يوم الدفع (من كل شهر)</Label>
                <Input id="pay-date" type="number" min="1" max="31" defaultValue="1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أزرار الحفظ */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">إلغاء</Button>
          <Button>
            <Save className="h-4 w-4 ml-2" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>
    </div>
  );
}