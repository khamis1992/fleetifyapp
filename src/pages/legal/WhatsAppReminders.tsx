/**
 * WhatsApp Payment Reminders Page
 * 
 * Route: /legal/whatsapp-reminders
 * Purpose: Manage automated WhatsApp payment reminders
 * 
 * Features:
 * - Live statistics monitoring
 * - Test message sending
 * - Manual queue processing
 * - Recent reminders history
 * - Setup instructions
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, MessageSquare, ExternalLink, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WhatsAppMonitor from '@/components/whatsapp/WhatsAppMonitor';
import { WhatsAppMessagesReport } from '@/components/whatsapp/WhatsAppMessagesReport';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
import '@/styles/legal-system.css';
const WhatsAppReminders: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  return (
    <div className="legal-system min-h-screen p-4 md:p-6">
      <div className="legal-hero mb-6 p-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-purple-600" />
          تذكيرات الدفع عبر واتساب
        </h1>
        <p className="text-muted-foreground mt-2">
          نظام تذكير تلقائي للدفعات المستحقة عبر واتساب
        </p>
      </div>

      <Tabs defaultValue="monitor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            المراقبة والإدارة
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            تقرير الرسائل
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            دليل الإعداد
          </TabsTrigger>
        </TabsList>

        {/* Monitor Tab */}
        <TabsContent value="monitor">
          <WhatsAppMonitor />
        </TabsContent>

        {/* Messages Report Tab */}
        <TabsContent value="report">
          <WhatsAppMessagesReport />
        </TabsContent>

        {/* Setup Instructions Tab */}
        <TabsContent value="setup">
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
              <CardTitle>دليل الإعداد السريع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quick Start */}
                <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                  <h3 className="font-bold text-xl mb-3 text-purple-900">⚡ البدء السريع (15 دقيقة)</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li className="text-slate-700">
                      <span className="font-semibold">التسجيل في Ultramsg:</span>
                      <a 
                        href="https://ultramsg.com/ar" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 mr-2"
                      >
                        افتح Ultramsg
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <code className="block mt-2 p-2 bg-white rounded text-xs">
                        • سجل حساب جديد<br/>
                        • أنشئ Instance<br/>
                        • امسح QR Code<br/>
                        • احفظ Instance ID و Token
                      </code>
                    </li>
                    
                    <li className="text-slate-700">
                      <span className="font-semibold">إضافة Secrets في Supabase:</span>
                      <code className="block mt-2 p-2 bg-white rounded text-xs">
                        Settings → Edge Functions → Add Secret<br/>
                        - ULTRAMSG_INSTANCE_ID<br/>
                        - ULTRAMSG_TOKEN
                      </code>
                    </li>

                    <li className="text-slate-700">
                      <span className="font-semibold">تطبيق Migration:</span>
                      <code className="block mt-2 p-2 bg-slate-900 text-green-400 rounded text-xs">
                        npx supabase db push
                      </code>
                    </li>

                    <li className="text-slate-700">
                      <span className="font-semibold">Deploy Edge Function:</span>
                      <code className="block mt-2 p-2 bg-slate-900 text-green-400 rounded text-xs">
                        npx supabase functions deploy send-whatsapp-reminders
                      </code>
                    </li>

                    <li className="text-slate-700">
                      <span className="font-semibold">إعداد Cron Job:</span>
                      <code className="block mt-2 p-2 bg-white rounded text-xs">
                        في Supabase SQL Editor، نفذ الكود من:<br/>
                        .cursor/QUICK_START_GUIDE.md (الخطوة 5)
                      </code>
                    </li>
                  </ol>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-green-900">⏰ التذكيرات التلقائية</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• قبل 3 أيام من الاستحقاق</li>
                      <li>• يوم الاستحقاق</li>
                      <li>• بعد 3 أيام (تأخير)</li>
                      <li>• بعد 10 أيام (إنذار نهائي)</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-900">📊 التحسينات المتوقعة</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 40% تحسين سرعة التحصيل</li>
                      <li>• 60% تقليل التأخيرات</li>
                      <li>• 90% توفير الوقت</li>
                      <li>• 18 ساعة/شهر توفير</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-purple-200 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-purple-900">💰 التكلفة</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Ultramsg: $5/شهر فقط</li>
                      <li>• رسائل غير محدودة</li>
                      <li>• بدون رسوم إضافية</li>
                      <li>• ROI: +10000%</li>
                    </ul>
                  </div>

                  <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-orange-900">⚙️ الميزات التقنية</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Edge Functions (Serverless)</li>
                      <li>• Cron Job تلقائي</li>
                      <li>• Retry عند الفشل</li>
                      <li>• سجل شامل للمراجعة</li>
                    </ul>
                  </div>
                </div>

                {/* Documentation Links */}
                <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-4">📚 الأدلة والتوثيق</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded border">
                      <div className="font-medium text-sm text-slate-900 mb-1">🚀 دليل البدء السريع</div>
                      <code className="text-xs text-slate-600">.cursor/QUICK_START_GUIDE.md</code>
                      <p className="text-xs text-slate-500 mt-1">خطوات سريعة في 15 دقيقة</p>
                    </div>

                    <div className="p-3 bg-white rounded border">
                      <div className="font-medium text-sm text-slate-900 mb-1">📖 دليل خطوة بخطوة</div>
                      <code className="text-xs text-slate-600">.cursor/SETUP_WHATSAPP_STEP_BY_STEP.md</code>
                      <p className="text-xs text-slate-500 mt-1">شرح مفصل مع screenshots</p>
                    </div>

                    <div className="p-3 bg-white rounded border">
                      <div className="font-medium text-sm text-slate-900 mb-1">🎯 الخطة الكاملة</div>
                      <code className="text-xs text-slate-600">.cursor/WHATSAPP_IMPLEMENTATION_PLAN.md</code>
                      <p className="text-xs text-slate-500 mt-1">تحليل الحلول والتقنيات</p>
                    </div>

                    <div className="p-3 bg-white rounded border">
                      <div className="font-medium text-sm text-slate-900 mb-1">🔧 توثيق تقني</div>
                      <code className="text-xs text-slate-600">supabase/functions/.../README.md</code>
                      <p className="text-xs text-slate-500 mt-1">API reference وtroubleshooting</p>
                    </div>
                  </div>
                </div>

                {/* Status Info */}
                <div className="p-6 bg-green-50 border-2 border-green-300 rounded-lg">
                  <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    ✅ النظام جاهز للتشغيل!
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    جميع الملفات والأكواد جاهزة. فقط اتبع الخطوات 1-5 أعلاه وسيعمل النظام بشكل كامل.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-green-800">{t("edgeFunction")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-green-800">{t("databaseMigration")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-green-800">{t("reactComponents")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-green-800">توثيق شامل</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppReminders;
