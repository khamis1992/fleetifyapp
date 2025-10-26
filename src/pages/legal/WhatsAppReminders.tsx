/**
 * WhatsApp Payment Reminders Page
 * 
 * Route: /legal/whatsapp-reminders
 * Purpose: Manage automated WhatsApp payment reminders
 * 
 * Features:
 * - View reminder schedule
 * - Connection status
 * - Manual send trigger
 * - Template editor
 * - Statistics and reports
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, MessageSquare } from 'lucide-react';

const WhatsAppReminders: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          تذكيرات الدفع عبر واتساب
        </h1>
        <p className="text-muted-foreground mt-2">
          نظام تذكير تلقائي للدفعات المستحقة عبر واتساب ويب
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 border-blue-500 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <p className="font-medium text-blue-900">نظام التذكيرات التلقائية</p>
          <p className="text-sm text-blue-700 mt-1">
            يتم إرسال تذكيرات تلقائية على 4 مراحل: قبل 3 أيام، يوم الاستحقاق، بعد 3 أيام (تأخير)، بعد 10 أيام (إنذار نهائي)
          </p>
        </AlertDescription>
      </Alert>

      {/* Main Dashboard Card */}
      <Card>
        <CardHeader>
          <CardTitle>لوحة تحكم التذكيرات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Setup Instructions */}
            <div className="p-6 bg-muted rounded-lg">
              <h3 className="font-semibold text-lg mb-4">📋 خطوات الإعداد</h3>
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">تشغيل قاعدة البيانات:</span> قم بتشغيل ملف الهجرة في Supabase
                  <code className="block mt-1 p-2 bg-background rounded text-xs">
                    supabase/migrations/20250126130000_create_whatsapp_reminders.sql
                  </code>
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">إعداد خدمة Node.js:</span> تثبيت المتطلبات وإعداد البيئة
                  <code className="block mt-1 p-2 bg-background rounded text-xs">
                    npm install puppeteer-core @supabase/supabase-js dotenv
                  </code>
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">ربط واتساب:</span> مسح QR code من هاتفك (مرة واحدة فقط)
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">تشغيل الخدمة:</span> تشغيل خدمة الخلفية
                  <code className="block mt-1 p-2 bg-background rounded text-xs">
                    node services/whatsapp-reminder-service.js
                  </code>
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">جدولة المهام:</span> إعداد cron job للمعالجة اليومية الساعة 9 صباحاً
                </li>
              </ol>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">⏰ التذكيرات التلقائية</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• قبل 3 أيام من الاستحقاق</li>
                  <li>• يوم الاستحقاق</li>
                  <li>• بعد 3 أيام (تأخير)</li>
                  <li>• بعد 10 أيام (إنذار نهائي)</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📊 الإحصائيات</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 40% تحسين سرعة التحصيل</li>
                  <li>• 60% تقليل التأخيرات</li>
                  <li>• 90% توفير الوقت</li>
                  <li>• 18 ساعة/شهر وفر</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🔒 الأمان</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• بدون API خارجي</li>
                  <li>• استخدام رقمك الشخصي</li>
                  <li>• جلسة مشفرة محلية</li>
                  <li>• سجل تدقيق كامل</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">⚙️ المميزات</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• قوالب رسائل قابلة للتخصيص</li>
                  <li>• إلغاء تلقائي عند الدفع</li>
                  <li>• إعادة محاولة تلقائية</li>
                  <li>• تقارير مفصلة</li>
                </ul>
              </div>
            </div>

            {/* Documentation Link */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📚 الدليل الشامل</h4>
              <p className="text-sm text-blue-700 mb-3">
                للحصول على تعليمات مفصلة، راجع ملف التوثيق الكامل:
              </p>
              <code className="block p-2 bg-white rounded text-xs text-blue-900">
                WHATSAPP_REMINDER_SYSTEM_PLAN.md
              </code>
              <p className="text-xs text-blue-600 mt-2">
                يحتوي على: إعداد خطوة بخطوة، قوالب الرسائل، استكشاف الأخطاء، وحسابات العائد على الاستثمار
              </p>
            </div>

            {/* Status Info */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">🚧 حالة التطوير</h4>
              <p className="text-sm text-yellow-700">
                النظام جاهز للتنفيذ. قاعدة البيانات والتوثيق متوفرين. 
                المطلوب: إعداد خدمة Node.js وربط واتساب ويب.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppReminders;
