/**
 * Accounts Receivable Aging Report Component
 * 
 * Features:
 * - 5 aging categories: Current, 1-30, 31-60, 61-90, 90+ days
 * - Customer-wise breakdown
 * - Collections priority list
 * - Export to Excel
 * - Visual charts and statistics
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import {
  DollarSign,
  Download,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Phone,
  Mail,
  Brain,
  MessageSquare,
  Scale,
  Handshake,
  Sparkles,
  Copy,
  Send
} from 'lucide-react';
interface ARSummary {
  total_customers_with_ar: number;
  total_outstanding_invoices: number;
  total_ar_amount: number;
  current_total: number;
  days_1_30_total: number;
  days_31_60_total: number;
  days_61_90_total: number;
  days_90_plus_total: number;
  current_percentage: number;
  days_1_30_percentage: number;
  days_31_60_percentage: number;
  days_61_90_percentage: number;
  days_90_plus_percentage: number;
  avg_days_overdue: number;
  high_priority_count: number;
  high_priority_amount: number;
}

interface CustomerAging {
  customer_id: string;
  customer_name_ar: string;
  customer_name_en: string;
  customer_phone: string;
  customer_email: string;
  total_invoices: number;
  total_outstanding: number;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  max_days_overdue: number;
  last_payment_date: string;
}

interface PriorityItem {
  customer_id: string;
  customer_name_ar: string;
  customer_name_en: string;
  customer_phone: string;
  customer_email: string;
  total_outstanding: number;
  total_invoices: number;
  max_days_overdue: number;
  critical_amount: number;
  high_risk_amount: number;
  priority_score: number;
  risk_category: string;
  recommended_action: string;
  last_payment_date: string;
  avg_dso: number;
}

type CollectionRiskLevel = 'high' | 'medium' | 'low';
type CollectionPath = 'settlement' | 'legal' | 'reminder';

interface CollectionAIInsight {
  item: PriorityItem;
  riskLevel: CollectionRiskLevel;
  riskLabel: string;
  riskClassName: string;
  paymentProbability: number;
  collectionPath: CollectionPath;
  collectionPathLabel: string;
  collectionPathClassName: string;
  nextAction: string;
  reason: string;
  whatsappMessage: string;
  priorityRank: number;
  score: number;
}

const formatQar = (amount: number) => `${Number(amount || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})} ر.ق`;

const getCustomerDisplayName = (item: PriorityItem) =>
  item.customer_name_ar || item.customer_name_en || 'العميل';

const getDaysSincePayment = (lastPaymentDate?: string | null) => {
  if (!lastPaymentDate) return null;
  const date = new Date(lastPaymentDate);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
};

const normalizePhoneForWhatsApp = (phone?: string | null) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('974')) return digits;
  if (digits.length === 8) return `974${digits}`;
  return digits;
};

const buildCollectionAIInsights = (items: PriorityItem[] = []): CollectionAIInsight[] => {
  return items
    .map((item) => {
      const days = Number(item.max_days_overdue || 0);
      const outstanding = Number(item.total_outstanding || 0);
      const criticalAmount = Number(item.critical_amount || 0);
      const highRiskAmount = Number(item.high_risk_amount || 0);
      const lastPaymentAge = getDaysSincePayment(item.last_payment_date);
      const hasRecentPayment = lastPaymentAge !== null && lastPaymentAge <= 45;
      const hasPaymentHistory = lastPaymentAge !== null;

      const score =
        Number(item.priority_score || 0) +
        Math.min(days, 120) * 0.9 +
        Math.min(outstanding / 1000, 60) +
        (criticalAmount > 0 ? 35 : 0) +
        (highRiskAmount > 0 ? 18 : 0) -
        (hasRecentPayment ? 18 : 0);

      const riskLevel: CollectionRiskLevel =
        days >= 61 || criticalAmount > 0 || score >= 120
          ? 'high'
          : days >= 31 || highRiskAmount > 0 || score >= 70
          ? 'medium'
          : 'low';

      const paymentProbability = Math.max(
        12,
        Math.min(
          92,
          82 -
            Math.min(days, 120) * 0.42 -
            Math.min(outstanding / 1000, 35) +
            (hasRecentPayment ? 16 : 0) +
            (hasPaymentHistory ? 8 : -6) -
            (criticalAmount > 0 ? 10 : 0)
        )
      );

      const collectionPath: CollectionPath =
        days >= 90 || (criticalAmount > 0 && paymentProbability < 45)
          ? 'legal'
          : days >= 31 || outstanding >= 5000
          ? 'settlement'
          : 'reminder';

      const customerName = getCustomerDisplayName(item);
      const riskLabel = riskLevel === 'high' ? 'خطر عالي' : riskLevel === 'medium' ? 'خطر متوسط' : 'خطر منخفض';
      const collectionPathLabel =
        collectionPath === 'legal'
          ? 'مرشح للإجراء القانوني'
          : collectionPath === 'settlement'
          ? 'مرشح للتسوية'
          : 'تذكير ودي أولًا';

      const paymentPattern =
        hasRecentPayment
          ? `ولديه سداد سابق قريب قبل ${lastPaymentAge} يوم`
          : hasPaymentHistory
          ? `آخر سداد قبل ${lastPaymentAge} يوم`
          : 'ولا يوجد سداد حديث مسجل';

      const nextAction =
        collectionPath === 'legal'
          ? 'أرسل إنذار واتساب نهائي اليوم، ثم جهز ملف التصعيد إذا لم يتم الرد.'
          : collectionPath === 'settlement'
          ? 'ابدأ بعرض تسوية قصيرة الأجل مع موعد دفع واضح.'
          : 'أرسل تذكير واتساب لطيف قبل أي تصعيد.';

      const reason = `هذا العميل متأخر ${days} يومًا بمبلغ ${formatQar(outstanding)}، ${paymentPattern}. الأفضل ${nextAction}`;

      const whatsappMessage =
        collectionPath === 'legal'
          ? `مرحبًا ${customerName}، نود تذكيركم بوجود مبلغ متأخر قدره ${formatQar(outstanding)} لمدة ${days} يومًا. يرجى السداد أو التواصل معنا اليوم لتجنب اتخاذ إجراءات قانونية.`
          : collectionPath === 'settlement'
          ? `مرحبًا ${customerName}، يوجد مبلغ مستحق قدره ${formatQar(outstanding)}. يمكننا ترتيب تسوية مناسبة إذا تم تأكيد موعد السداد اليوم. يرجى التواصل معنا.`
          : `مرحبًا ${customerName}، تذكير ودي بوجود مبلغ مستحق قدره ${formatQar(outstanding)}. نرجو السداد أو إعلامنا بموعد الدفع المناسب.`;

      return {
        item,
        riskLevel,
        riskLabel,
        riskClassName:
          riskLevel === 'high'
            ? 'border-red-200 bg-red-50 text-red-700'
            : riskLevel === 'medium'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        paymentProbability: Math.round(paymentProbability),
        collectionPath,
        collectionPathLabel,
        collectionPathClassName:
          collectionPath === 'legal'
            ? 'border-red-200 bg-white text-red-700'
            : collectionPath === 'settlement'
            ? 'border-blue-200 bg-white text-blue-700'
            : 'border-emerald-200 bg-white text-emerald-700',
        nextAction,
        reason,
        whatsappMessage,
        priorityRank: 0,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((insight, index) => ({ ...insight, priorityRank: index + 1 }));
};

export const ARAgingReport: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('summary');

  // Fetch AR summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['ar-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_ar_aging_summary')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as ARSummary;
    }
  });

  // Fetch customer aging
  const { data: customerAging, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-ar-aging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_ar_aging_summary')
        .select('*')
        .order('total_outstanding', { ascending: false });
      
      if (error) throw error;
      return data as CustomerAging[];
    }
  });

  // Fetch priority list
  const { data: priorityList, isLoading: priorityLoading } = useQuery({
    queryKey: ['collections-priority'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections_priority_list')
        .select('*')
        .limit(50);
      
      if (error) throw error;
      return data as PriorityItem[];
    }
  });

  const collectionAIInsights = useMemo(
    () => buildCollectionAIInsights(priorityList || []),
    [priorityList]
  );

  const topCollectionInsight = collectionAIInsights[0];
  const highRiskAI = collectionAIInsights.filter((insight) => insight.riskLevel === 'high').length;
  const settlementAI = collectionAIInsights.filter((insight) => insight.collectionPath === 'settlement').length;
  const legalAI = collectionAIInsights.filter((insight) => insight.collectionPath === 'legal').length;
  const avgPaymentProbability = collectionAIInsights.length
    ? Math.round(collectionAIInsights.reduce((sum, insight) => sum + insight.paymentProbability, 0) / collectionAIInsights.length)
    : 0;

  const copyWhatsAppMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'تم نسخ رسالة واتساب',
        description: 'يمكنك لصق الرسالة وإرسالها للعميل مباشرة.',
      });
    } catch (error) {
      console.error('Copy WhatsApp message error:', error);
      toast({
        title: 'تعذر نسخ الرسالة',
        description: 'انسخ النص يدويًا من بطاقة التحليل.',
        variant: 'destructive',
      });
    }
  };

  const openWhatsAppMessage = (insight: CollectionAIInsight) => {
    const phone = normalizePhoneForWhatsApp(insight.item.customer_phone);
    if (!phone) {
      toast({
        title: 'لا يوجد رقم واتساب',
        description: 'لم يتم العثور على رقم هاتف صالح لهذا العميل.',
        variant: 'destructive',
      });
      return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(insight.whatsappMessage)}`, '_blank', 'noopener,noreferrer');
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      // Lazy load xlsx (300KB) only when exporting
      const XLSX = (await import('xlsx')).default;

      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Accounts Receivable Aging Report'],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Total Customers with AR:', summary?.total_customers_with_ar || 0],
        ['Total Outstanding Invoices:', summary?.total_outstanding_invoices || 0],
         ['Total AR Amount:', formatQar(summary?.total_ar_amount || 0)],
        ['Average Days Overdue:', Math.round(summary?.avg_days_overdue || 0)],
        [],
         ['Aging Category', 'Amount (QAR)', 'Percentage'],
         ['Current', formatQar(summary?.current_total || 0), `${summary?.current_percentage || 0}%`],
         ['1-30 Days', formatQar(summary?.days_1_30_total || 0), `${summary?.days_1_30_percentage || 0}%`],
         ['31-60 Days', formatQar(summary?.days_31_60_total || 0), `${summary?.days_31_60_percentage || 0}%`],
         ['61-90 Days', formatQar(summary?.days_61_90_total || 0), `${summary?.days_61_90_percentage || 0}%`],
         ['90+ Days', formatQar(summary?.days_90_plus_total || 0), `${summary?.days_90_plus_percentage || 0}%`],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Customer aging sheet
      if (customerAging && customerAging.length > 0) {
        const customerData = [
          ['Customer Name (AR)', 'Customer Name (EN)', 'Phone', 'Email', 'Total Outstanding', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Max Days Overdue', 'Total Invoices']
        ];
        
        customerAging.forEach(c => {
          customerData.push([
            c.customer_name_ar,
            c.customer_name_en,
            c.customer_phone,
            c.customer_email,
             formatQar(c.total_outstanding || 0),
             formatQar(c.current_amount || 0),
             formatQar(c.days_1_30 || 0),
             formatQar(c.days_31_60 || 0),
             formatQar(c.days_61_90 || 0),
             formatQar(c.days_90_plus || 0),
            c.max_days_overdue || 0,
            c.total_invoices || 0
          ]);
        });
        
        const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
        XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Breakdown');
      }

      // Priority list sheet
      if (priorityList && priorityList.length > 0) {
        const priorityData = [
          ['Customer Name (AR)', 'Phone', 'Email', 'Total Outstanding', 'Risk Category', 'Recommended Action', 'Critical (90+)', 'High Risk (61-90)', 'Max Days Overdue', 'Priority Score']
        ];
        
        priorityList.forEach(p => {
          priorityData.push([
            p.customer_name_ar,
            p.customer_phone,
            p.customer_email,
             formatQar(p.total_outstanding || 0),
            p.risk_category,
            p.recommended_action,
             formatQar(p.critical_amount || 0),
             formatQar(p.high_risk_amount || 0),
            p.max_days_overdue || 0,
            (p.priority_score || 0).toFixed(2)
          ]);
        });
        
        const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData);
        XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Collections Priority');
      }

      // Export
      const fileName = `AR_Aging_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: '✅ تم التصدير بنجاح',
        description: `تم تصدير التقرير إلى ${fileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: '❌ فشل التصدير',
        description: 'حدث خطأ أثناء تصدير التقرير',
        variant: 'destructive',
      });
    }
  };

  // Get risk badge color
  const getRiskBadge = (category: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      critical: { label: 'حرج', color: 'bg-red-600' },
      high: { label: 'مخاطرة عالية', color: 'bg-orange-500' },
      medium: { label: 'متوسط', color: 'bg-yellow-500' },
      low: { label: 'منخفض', color: 'bg-blue-500' },
      watch: { label: 'مراقبة', color: 'bg-slate-500' }
    };
    
    const badge = badges[category] || badges.watch;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  // Get action label
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      legal_action: 'إجراء قانوني',
      final_notice: 'إنذار نهائي',
      follow_up_call: 'مكالمة متابعة',
      reminder_email: 'بريد تذكير',
      monitor: 'مراقبة'
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">تقرير تقادم الذمم المدينة</h2>
          <p className="text-sm text-muted-foreground">
            تحليل الفواتير المستحقة حسب الفترات الزمنية
          </p>
        </div>
        <Button onClick={exportToExcel} disabled={!summary}>
          <Download className="h-4 w-4 mr-2" />
          تصدير إلى Excel
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستحقات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">
               {formatQar(summary?.total_ar_amount || 0)}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">عدد العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.total_customers_with_ar || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.total_outstanding_invoices || 0} فاتورة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أولوية عالية</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-red-600">
               {formatQar(summary?.high_priority_amount || 0)}
             </div>
            <p className="text-xs text-muted-foreground">
              {summary?.high_priority_count || 0} فاتورة (+60 يوم)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط التأخير</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(summary?.avg_days_overdue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">يوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع التقادم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <AgingBar
              label="حالي"
              amount={summary?.current_total || 0}
              percentage={summary?.current_percentage || 0}
              color="bg-green-500"
            />
            <AgingBar
              label="1-30 يوم"
              amount={summary?.days_1_30_total || 0}
              percentage={summary?.days_1_30_percentage || 0}
              color="bg-blue-500"
            />
            <AgingBar
              label="31-60 يوم"
              amount={summary?.days_31_60_total || 0}
              percentage={summary?.days_31_60_percentage || 0}
              color="bg-yellow-500"
            />
            <AgingBar
              label="61-90 يوم"
              amount={summary?.days_61_90_total || 0}
              percentage={summary?.days_61_90_percentage || 0}
              color="bg-orange-500"
            />
            <AgingBar
              label="+90 يوم"
              amount={summary?.days_90_plus_total || 0}
              percentage={summary?.days_90_plus_percentage || 0}
              color="bg-red-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                  AI للتحصيل والمتأخرات
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  ترتيب العملاء حسب أولوية المتابعة مع رسالة واتساب وتوصية تسوية أو إجراء قانوني.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <div className="rounded-lg border border-red-100 bg-white px-3 py-2">
                <span className="block text-xs font-bold text-slate-500">خطر عالي</span>
                <strong className="text-lg text-red-600">{highRiskAI}</strong>
              </div>
              <div className="rounded-lg border border-blue-100 bg-white px-3 py-2">
                <span className="block text-xs font-bold text-slate-500">قابل للتسوية</span>
                <strong className="text-lg text-blue-600">{settlementAI}</strong>
              </div>
              <div className="rounded-lg border border-red-100 bg-white px-3 py-2">
                <span className="block text-xs font-bold text-slate-500">قانوني</span>
                <strong className="text-lg text-red-700">{legalAI}</strong>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
                <span className="block text-xs font-bold text-slate-500">احتمال السداد</span>
                <strong className="text-lg text-emerald-600">{avgPaymentProbability}%</strong>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {priorityLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              جاري تحليل أولويات التحصيل...
            </div>
          ) : topCollectionInsight ? (
            <>
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-950 p-4 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-white text-slate-950 hover:bg-white">الأولوية الأولى</Badge>
                    <Badge className="bg-red-500 hover:bg-red-500">{topCollectionInsight.riskLabel}</Badge>
                  </div>
                  <h3 className="mt-3 text-xl font-black">{getCustomerDisplayName(topCollectionInsight.item)}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">{topCollectionInsight.reason}</p>
                </div>
                <div className="rounded-lg bg-white px-5 py-4 text-center text-slate-950">
                  <span className="block text-xs font-bold text-slate-500">احتمال السداد</span>
                  <strong className="text-3xl font-black">{topCollectionInsight.paymentProbability}%</strong>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {collectionAIInsights.slice(0, 6).map((insight) => {
                  const PathIcon = insight.collectionPath === 'legal' ? Scale : insight.collectionPath === 'settlement' ? Handshake : MessageSquare;
                  return (
                    <div key={insight.item.customer_id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">#{insight.priorityRank}</Badge>
                            <Badge variant="outline" className={insight.riskClassName}>{insight.riskLabel}</Badge>
                            <Badge variant="outline" className={insight.collectionPathClassName}>
                              <PathIcon className="ml-1 h-3 w-3" />
                              {insight.collectionPathLabel}
                            </Badge>
                          </div>
                          <h4 className="mt-3 font-black text-slate-950">{getCustomerDisplayName(insight.item)}</h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatQar(insight.item.total_outstanding)} · متأخر {insight.item.max_days_overdue || 0} يوم · {insight.item.total_invoices || 0} فواتير
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
                          <span className="block text-xs font-bold text-emerald-700">سداد متوقع</span>
                          <strong className="text-xl text-emerald-700">{insight.paymentProbability}%</strong>
                        </div>
                      </div>

                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-7 text-slate-700">
                        {insight.reason}
                      </p>

                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                          <MessageSquare className="h-4 w-4 text-emerald-600" />
                          رسالة واتساب مقترحة
                        </div>
                        <p className="text-sm leading-7 text-slate-600">{insight.whatsappMessage}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => copyWhatsAppMessage(insight.whatsappMessage)}>
                          <Copy className="h-4 w-4" />
                          نسخ الرسالة
                        </Button>
                        <Button type="button" size="sm" onClick={() => openWhatsAppMessage(insight)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                          <Send className="h-4 w-4" />
                          فتح واتساب
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                لا توجد متأخرات كافية لإنشاء توصيات تحصيل ذكية حاليًا.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">تفصيل العملاء</TabsTrigger>
          <TabsTrigger value="priority">قائمة الأولويات</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفصيل المستحقات حسب العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              {customerLoading ? (
                <p>جاري التحميل...</p>
              ) : customerAging && customerAging.length > 0 ? (
                <ResponsiveTable>
<Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="text-right">حالي</TableHead>
                      <TableHead className="text-right">1-30</TableHead>
                      <TableHead className="text-right">31-60</TableHead>
                      <TableHead className="text-right">61-90</TableHead>
                      <TableHead className="text-right">+90</TableHead>
                      <TableHead className="text-right">الفواتير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAging.map((customer) => (
                      <TableRow key={customer.customer_id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{customer.customer_name_ar}</div>
                            <div className="text-xs text-muted-foreground">
                              {customer.customer_name_en}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.customer_phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {customer.customer_phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {customer.total_outstanding.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {customer.current_amount.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {customer.days_1_30.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600">
                          {customer.days_31_60.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {customer.days_61_90.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {customer.days_90_plus.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.total_invoices}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
</ResponsiveTable>
              ) : (
                <Alert>
                  <AlertDescription>
                    لا توجد مستحقات حالياً
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قائمة أولويات التحصيل</CardTitle>
            </CardHeader>
            <CardContent>
              {priorityLoading ? (
                <p>جاري التحميل...</p>
              ) : priorityList && priorityList.length > 0 ? (
                <ResponsiveTable>
<Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead>الاتصال</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead>المخاطر</TableHead>
                      <TableHead>الإجراء</TableHead>
                      <TableHead className="text-right">حرج (+90)</TableHead>
                      <TableHead className="text-right">أيام</TableHead>
                      <TableHead className="text-right">الأولوية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priorityList.map((item) => (
                      <TableRow key={item.customer_id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{item.customer_name_ar}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.customer_name_en}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.customer_phone && (
                              <div className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3" />
                                {item.customer_phone}
                              </div>
                            )}
                            {item.customer_email && (
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3" />
                                {item.customer_email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.total_outstanding.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          {getRiskBadge(item.risk_category)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getActionLabel(item.recommended_action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {item.critical_amount.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.max_days_overdue}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge>{item.priority_score.toFixed(0)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
</ResponsiveTable>
              ) : (
                <Alert>
                  <AlertDescription>
                    لا توجد أولويات تحصيل
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Aging bar component
const AgingBar: React.FC<{
  label: string;
  amount: number;
  percentage: number;
  color: string;
}> = ({ label, amount, percentage }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-4">
          <span className="font-bold">{formatQar(amount)}</span>
          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage > 0 ? 'bg-primary' : 'bg-slate-300'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default ARAgingReport;
