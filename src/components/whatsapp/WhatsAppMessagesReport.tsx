import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  Users,
  Calendar,
  Phone,
  FileText,
  DollarSign,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ReminderStats {
  total_reminders: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  cancelled_count: number;
  unique_customers: number;
  unique_invoices: number;
}

interface SentMessage {
  id: string;
  sent_at: string;
  customer_name: string;
  phone_number: string;
  reminder_type: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  scheduled_date: string;
  delivery_status: string;
  message_preview: string;
}

interface PendingMessage {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  customer_name: string;
  phone_number: string;
  reminder_type: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  days_until_send: number;
}

interface FailedMessage {
  id: string;
  customer_name: string;
  phone_number: string;
  reminder_type: string;
  scheduled_date: string;
  retry_count: number;
  last_error: string;
  next_retry_at: string;
}

export const WhatsAppMessagesReport = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_whatsapp_statistics');
      
      if (!statsError && statsData) {
        setStats(statsData[0]);
      }

      // Load sent messages
      const { data: sentData, error: sentError } = await supabase
        .from('reminder_schedules')
        .select(`
          id,
          sent_at,
          customer_name,
          phone_number,
          reminder_type,
          scheduled_date,
          delivery_status,
          message_template,
          invoices (
            invoice_number,
            total_amount,
            due_date
          )
        `)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (!sentError && sentData) {
        setSentMessages(
          sentData.map((msg: any) => ({
            id: msg.id,
            sent_at: msg.sent_at,
            customer_name: msg.customer_name,
            phone_number: msg.phone_number,
            reminder_type: msg.reminder_type,
            invoice_number: msg.invoices?.invoice_number || 'N/A',
            amount: msg.invoices?.total_amount || 0,
            due_date: msg.invoices?.due_date || '',
            scheduled_date: msg.scheduled_date,
            delivery_status: msg.delivery_status,
            message_preview: msg.message_template?.substring(0, 100) + '...'
          }))
        );
      }

      // Load pending messages
      const { data: pendingData, error: pendingError } = await supabase
        .from('reminder_schedules')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          customer_name,
          phone_number,
          reminder_type,
          invoices (
            invoice_number,
            total_amount,
            due_date
          )
        `)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (!pendingError && pendingData) {
        setPendingMessages(
          pendingData.map((msg: any) => ({
            id: msg.id,
            scheduled_date: msg.scheduled_date,
            scheduled_time: msg.scheduled_time,
            customer_name: msg.customer_name,
            phone_number: msg.phone_number,
            reminder_type: msg.reminder_type,
            invoice_number: msg.invoices?.invoice_number || 'N/A',
            amount: msg.invoices?.total_amount || 0,
            due_date: msg.invoices?.due_date || '',
            days_until_send: calculateDaysUntil(msg.scheduled_date)
          }))
        );
      }

      // Load failed messages
      const { data: failedData, error: failedError } = await supabase
        .from('reminder_schedules')
        .select('*')
        .eq('status', 'failed')
        .order('updated_at', { ascending: false });

      if (!failedError && failedData) {
        setFailedMessages(failedData);
      }

    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntil = (date: string) => {
    const targetDate = new Date(date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'pre_due': 'تذكير مبكر (30 يوم)',
      'due_date': 'يوم الاستحقاق',
      'overdue': 'متأخر (3 أيام)',
      'escalation': 'تصعيد (10 أيام)'
    };
    return labels[type] || type;
  };

  const getReminderTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      'pre_due': 'default',
      'due_date': 'secondary',
      'overdue': 'destructive',
      'escalation': 'destructive'
    };
    return variants[type] || 'default';
  };

  const exportToCSV = () => {
    const headers = ['التاريخ', 'العميل', 'الهاتف', 'نوع التذكير', 'رقم الفاتورة', 'المبلغ', 'تاريخ الاستحقاق'];
    const rows = sentMessages.map(msg => [
      format(new Date(msg.sent_at), 'yyyy-MM-dd HH:mm', { locale: ar }),
      msg.customer_name,
      msg.phone_number,
      getReminderTypeLabel(msg.reminder_type),
      msg.invoice_number,
      msg.amount.toFixed(3),
      format(new Date(msg.due_date), 'yyyy-MM-dd', { locale: ar })
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `whatsapp_messages_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">تقرير رسائل WhatsApp</h2>
          <p className="text-sm text-slate-500 mt-1">سجل شامل لجميع الرسائل المرسلة والمعلقة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReportData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">إجمالي التذكيرات</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_reminders}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">تم الإرسال</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.sent_count}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">معلق</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending_count}</p>
                </div>
                <Clock className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">عملاء فريدين</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{stats.unique_customers}</p>
                </div>
                <Users className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <CheckCircle2 className="h-4 w-4 ml-2" />
            الرسائل المرسلة ({sentMessages.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 ml-2" />
            الرسائل المعلقة ({pendingMessages.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            <XCircle className="h-4 w-4 ml-2" />
            الرسائل الفاشلة ({failedMessages.length})
          </TabsTrigger>
        </TabsList>

        {/* Sent Messages Tab */}
        <TabsContent value="overview" className="space-y-4">
          {sentMessages.map((msg) => (
            <Card key={msg.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-semibold text-slate-900">{msg.customer_name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {msg.phone_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Badge variant={getReminderTypeBadge(msg.reminder_type)}>
                      {getReminderTypeLabel(msg.reminder_type)}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{msg.invoice_number}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      الاستحقاق: {format(new Date(msg.due_date), 'dd/MM/yyyy', { locale: ar })}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-bold text-green-600">{msg.amount.toFixed(3)} د.ك</span>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      {msg.delivery_status === 'sent' ? 'تم الإرسال' : msg.delivery_status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 whitespace-pre-line">{msg.message_preview}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {sentMessages.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">لا توجد رسائل مرسلة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pending Messages Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingMessages.map((msg) => (
            <Card key={msg.id} className="hover:shadow-lg transition-shadow border-r-4 border-orange-400">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-semibold text-slate-900">{msg.customer_name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {msg.phone_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <Badge variant={getReminderTypeBadge(msg.reminder_type)}>
                      {getReminderTypeLabel(msg.reminder_type)}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      المجدول: {format(new Date(msg.scheduled_date), 'dd/MM/yyyy', { locale: ar })} - {msg.scheduled_time}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{msg.invoice_number}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      الاستحقاق: {format(new Date(msg.due_date), 'dd/MM/yyyy', { locale: ar })}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-bold text-green-600">{msg.amount.toFixed(3)} د.ك</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                      <Clock className="h-3 w-3 ml-1" />
                      خلال {msg.days_until_send} يوم
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pendingMessages.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">لا توجد رسائل معلقة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Failed Messages Tab */}
        <TabsContent value="failed" className="space-y-4">
          {failedMessages.map((msg) => (
            <Card key={msg.id} className="hover:shadow-lg transition-shadow border-r-4 border-red-400">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-semibold text-slate-900">{msg.customer_name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {msg.phone_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <Badge variant="destructive">
                      {getReminderTypeLabel(msg.reminder_type)}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      محاولات: {msg.retry_count}
                    </p>
                  </div>

                  <div className="md:col-span-5">
                    <div className="bg-red-50 p-2 rounded">
                      <p className="text-xs font-medium text-red-800">سبب الفشل:</p>
                      <p className="text-xs text-red-600 mt-1">{msg.last_error || 'غير محدد'}</p>
                      {msg.next_retry_at && (
                        <p className="text-xs text-slate-600 mt-1">
                          المحاولة التالية: {format(new Date(msg.next_retry_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {failedMessages.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
                <p className="text-slate-500">رائع! لا توجد رسائل فاشلة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

