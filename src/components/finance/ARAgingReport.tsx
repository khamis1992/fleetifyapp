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

import React, { useState } from 'react';
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
  Mail
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
        ['Total AR Amount:', `${(summary?.total_ar_amount || 0).toFixed(3)} KWD`],
        ['Average Days Overdue:', Math.round(summary?.avg_days_overdue || 0)],
        [],
        ['Aging Category', 'Amount (KWD)', 'Percentage'],
        ['Current', (summary?.current_total || 0).toFixed(3), `${summary?.current_percentage || 0}%`],
        ['1-30 Days', (summary?.days_1_30_total || 0).toFixed(3), `${summary?.days_1_30_percentage || 0}%`],
        ['31-60 Days', (summary?.days_31_60_total || 0).toFixed(3), `${summary?.days_31_60_percentage || 0}%`],
        ['61-90 Days', (summary?.days_61_90_total || 0).toFixed(3), `${summary?.days_61_90_percentage || 0}%`],
        ['90+ Days', (summary?.days_90_plus_total || 0).toFixed(3), `${summary?.days_90_plus_percentage || 0}%`],
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
            (c.total_outstanding || 0).toFixed(3),
            (c.current_amount || 0).toFixed(3),
            (c.days_1_30 || 0).toFixed(3),
            (c.days_31_60 || 0).toFixed(3),
            (c.days_61_90 || 0).toFixed(3),
            (c.days_90_plus || 0).toFixed(3),
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
            (p.total_outstanding || 0).toFixed(3),
            p.risk_category,
            p.recommended_action,
            (p.critical_amount || 0).toFixed(3),
            (p.high_risk_amount || 0).toFixed(3),
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
      watch: { label: 'مراقبة', color: 'bg-gray-500' }
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
              {(summary?.total_ar_amount || 0).toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">د.ك</p>
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
              {(summary?.high_priority_amount || 0).toFixed(3)}
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
          <span className="font-bold">{amount.toFixed(3)} د.ك</span>
          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage > 0 ? 'bg-primary' : 'bg-gray-300'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default ARAgingReport;
