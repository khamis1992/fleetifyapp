import { LegalPageHeader } from '@/components/legal/workspace/LegalPageHeader';
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
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, MessageSquare, ExternalLink, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WhatsAppMonitor from '@/components/whatsapp/WhatsAppMonitor';
import { WhatsAppMessagesReport } from '@/components/whatsapp/WhatsAppMessagesReport';


import '@/styles/legal-system.css';
const WhatsAppReminders: React.FC = () => {

  return (
    <div className="legal-system min-h-screen p-4 md:p-6">
      <LegalPageHeader title="تذكيرات الدفع" description="تابع الرسائل وحالة إرسالها وسجل التواصل مع العملاء عبر واتساب." />

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
            دليل الاستخدام
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
          <div className="lw-guide-grid">
            <Card><CardHeader><CardTitle>١. ربط قناة التواصل</CardTitle></CardHeader><CardContent><p>راجع اتصال حساب واتساب وإعدادات الشركة قبل تشغيل التذكيرات.</p><Button asChild variant="outline" className="mt-5"><Link to="/settings/whatsapp">إعدادات واتساب <ExternalLink size={15} /></Link></Button></CardContent></Card>
            <Card><CardHeader><CardTitle>٢. مراجعة الرسائل</CardTitle></CardHeader><CardContent><p>من المراقبة والإدارة، تابع الرسائل المنتظرة وحالة المعالجة. راجع رقم العميل ومحتوى الرسالة قبل إرسال أي اختبار.</p></CardContent></Card>
            <Card><CardHeader><CardTitle>٣. متابعة نتيجة الإرسال</CardTitle></CardHeader><CardContent><p>استخدم تقرير الرسائل للبحث في السجل ومراجعة حالات النجاح والفشل. ظهور رسالة في قائمة الانتظار لا يعني وصولها إلى العميل.</p></CardContent></Card>
          </div>
          <Alert className="mt-5"><Info className="h-4 w-4" /><AlertDescription>مواعيد التذكير وسياسة الإرسال تعتمد على الإعدادات المعتمدة للشركة. راجع حالة القناة والسجل عند توقف الرسائل.</AlertDescription></Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppReminders;
