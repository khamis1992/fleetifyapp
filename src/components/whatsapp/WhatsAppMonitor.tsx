/**
 * WhatsApp Reminders Monitor Component
 * ====================================
 * Purpose: Monitor and manage WhatsApp reminders system
 * Features: Statistics, test messaging, queue management
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Play,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppStats {
  total_queued: number;
  total_sent: number;
  total_failed: number;
  success_rate: number;
  avg_send_time: number;
  last_updated: string;
}

export const WhatsAppMonitor: React.FC = () => {
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('رسالة تجريبية من نظام التنبيهات ✅');
  const queryClient = useQueryClient();

  // Fetch statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_whatsapp_stats');
      if (error) throw error;
      return data as WhatsAppStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-reminders', {
        body: {
          test: true,
          phone,
          message,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('تم إرسال الرسالة التجريبية بنجاح!');
        setTestPhone('');
      } else {
        toast.error('فشل إرسال الرسالة: ' + (data.error || 'خطأ غير معروف'));
      }
    },
    onError: (error: any) => {
      toast.error('فشل إرسال الرسالة: ' + error.message);
    },
  });

  // Process queue manually mutation
  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-reminders');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`تم معالجة ${data.sent || 0} تنبيه بنجاح`);
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['reminder-schedules'] });
    },
    onError: (error: any) => {
      toast.error('فشل معالجة التنبيهات: ' + error.message);
    },
  });

  const handleSendTest = () => {
    if (!testPhone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }

    sendTestMutation.mutate({ phone: testPhone, message: testMessage });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-purple-600" />
            نظام تنبيهات واتساب
          </h2>
          <p className="text-gray-600 mt-1">
            مراقبة وإدارة إرسال التنبيهات عبر واتساب
          </p>
        </div>
        <Button
          onClick={() => refetchStats()}
          variant="outline"
          size="sm"
          disabled={statsLoading}
        >
          {statsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="mr-2">تحديث</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {stats?.total_queued || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">في الانتظار</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {stats?.total_sent || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">تم الإرسال (24 ساعة)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {stats?.total_failed || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">فشل (24 ساعة)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {stats?.success_rate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">معدل النجاح</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Send className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {stats?.avg_send_time?.toFixed(1) || 0}s
              </div>
              <div className="text-sm text-gray-600 mt-1">متوسط وقت الإرسال</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert if queue is building up */}
      {stats && stats.total_queued > 10 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>تنبيه:</strong> يوجد {stats.total_queued} تنبيه في قائمة الانتظار. 
            قد يكون هناك مشكلة في الإرسال.
            <Button
              variant="link"
              className="text-yellow-900 underline p-0 h-auto mr-2"
              onClick={() => processQueueMutation.mutate()}
              disabled={processQueueMutation.isPending}
            >
              معالجة الآن
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Success rate alert */}
      {stats && stats.success_rate < 90 && stats.total_sent + stats.total_failed > 10 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>تحذير:</strong> معدل النجاح منخفض ({stats.success_rate.toFixed(1)}%). 
            يرجى مراجعة إعدادات Ultramsg وأرقام الهواتف.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Message Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              إرسال رسالة تجريبية
            </CardTitle>
            <CardDescription>
              اختبر الإرسال عبر واتساب برسالة تجريبية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                رقم الهاتف
              </label>
              <Input
                type="text"
                placeholder="97412345678"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="text-left"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">
                مثال: 97412345678 (بدون + أو 00)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                الرسالة
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="اكتب رسالتك هنا..."
              />
            </div>

            <Button
              onClick={handleSendTest}
              disabled={sendTestMutation.isPending || !testPhone.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {sendTestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  إرسال رسالة تجريبية
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Queue Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              إدارة قائمة الانتظار
            </CardTitle>
            <CardDescription>
              معالجة التنبيهات المنتظرة يدوياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">التنبيهات المنتظرة:</span>
                <Badge variant="outline" className="text-lg font-bold">
                  {stats?.total_queued || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">آخر تحديث:</span>
                <span className="text-xs text-gray-500">
                  {stats?.last_updated 
                    ? new Date(stats.last_updated).toLocaleTimeString('ar-QA')
                    : 'غير متوفر'}
                </span>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                النظام يعالج التنبيهات تلقائياً كل 5 دقائق. 
                يمكنك المعالجة يدوياً الآن إذا لزم الأمر.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => processQueueMutation.mutate()}
              disabled={processQueueMutation.isPending || stats?.total_queued === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {processQueueMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 ml-2" />
                  معالجة التنبيهات الآن
                </>
              )}
            </Button>

            {stats?.total_queued === 0 && (
              <p className="text-sm text-gray-500 text-center">
                لا توجد تنبيهات في قائمة الانتظار
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <RecentReminders />
    </div>
  );
};

/**
 * Recent Reminders Table Component
 */
const RecentReminders: React.FC = () => {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['recent-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_schedules')
        .select(`
          id,
          customer_name,
          phone_number,
          reminder_type,
          status,
          created_at,
          sent_at,
          last_error
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: { color: 'bg-green-100 text-green-800', label: 'تم الإرسال' },
      queued: { color: 'bg-yellow-100 text-yellow-800', label: 'في الانتظار' },
      failed: { color: 'bg-red-100 text-red-800', label: 'فشل' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'ملغي' },
      pending: { color: 'bg-blue-100 text-blue-800', label: 'معلق' },
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;
    
    return (
      <Badge className={variant.color}>
        {variant.label}
      </Badge>
    );
  };

  const getReminderTypeLabel = (type: string) => {
    const labels = {
      general: 'تذكير عام',
      pre_due: 'تذكير مسبق',
      due_date: 'يوم الاستحقاق',
      overdue: 'متأخر',
      escalation: 'إنذار نهائي',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>آخر التنبيهات</CardTitle>
        <CardDescription>آخر 10 تنبيهات تم معالجتها</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !reminders || reminders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد تنبيهات حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    العميل
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    رقم الهاتف
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    النوع
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reminders.map((reminder: any) => (
                  <tr key={reminder.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reminder.customer_name || 'غير محدد'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono" dir="ltr">
                      {reminder.phone_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-600">
                        {getReminderTypeLabel(reminder.reminder_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(reminder.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(reminder.created_at).toLocaleDateString('ar-QA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppMonitor;

