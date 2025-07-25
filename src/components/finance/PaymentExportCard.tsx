import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayments } from "@/hooks/usePayments";
import { usePaymentAnalytics } from "@/hooks/usePaymentAnalytics";
import { useState } from "react";
import { Download, FileText, BarChart3, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentExportCardProps {
  startDate?: string;
  endDate?: string;
}

export const PaymentExportCard = ({ startDate, endDate }: PaymentExportCardProps) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [exportType, setExportType] = useState<'payments' | 'analytics'>('payments');
  const { data: payments } = usePayments();
  const { data: analytics } = usePaymentAnalytics(startDate, endDate);
  const { toast } = useToast();

  const handleExport = () => {
    if (!payments && !analytics) {
      toast({
        title: "لا توجد بيانات للتصدير",
        description: "لا توجد بيانات متاحة في الفترة المحددة.",
        variant: "destructive",
      });
      return;
    }

    if (exportType === 'payments') {
      exportPayments();
    } else {
      exportAnalytics();
    }
  };

  const exportPayments = () => {
    if (!payments) return;

    // فلترة المدفوعات حسب التاريخ إذا تم تحديدها
    let filteredPayments = payments;
    if (startDate || endDate) {
      filteredPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && paymentDate < start) return false;
        if (end && paymentDate > end) return false;
        return true;
      });
    }

    if (exportFormat === 'csv') {
      exportToCSV(filteredPayments);
    } else if (exportFormat === 'excel') {
      exportToExcel(filteredPayments);
    } else {
      exportToPDF(filteredPayments);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const analyticsData = {
      summary: {
        total_receipts: analytics.total_receipts,
        total_payments: analytics.total_payments,
        net_cash_flow: analytics.net_cash_flow,
      },
      by_cost_center: analytics.by_cost_center || [],
      by_payment_method: analytics.by_payment_method || [],
      by_bank: analytics.by_bank || [],
    };

    if (exportFormat === 'csv') {
      exportAnalyticsToCSV(analyticsData);
    } else {
      exportAnalyticsToPDF(analyticsData);
    }
  };

  const exportToCSV = (data: any[]) => {
    const headers = [
      'رقم الدفع',
      'النوع',
      'التاريخ',
      'المبلغ',
      'العملة',
      'طريقة الدفع',
      'الحالة',
      'رقم المرجع',
      'الملاحظات'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(payment => [
        payment.payment_number,
        payment.payment_type === 'receipt' ? 'قبض' : 'صرف',
        new Date(payment.payment_date).toLocaleDateString('ar-KW'),
        payment.amount,
        payment.currency,
        getPaymentMethodLabel(payment.payment_method),
        getStatusLabel(payment.status),
        payment.reference_number || '',
        payment.notes || ''
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, `payments-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

    toast({
      title: "تم تصدير البيانات بنجاح",
      description: "تم تصدير قائمة المدفوعات إلى ملف CSV.",
    });
  };

  const exportAnalyticsToCSV = (data: any) => {
    const summaryHeaders = ['النوع', 'المبلغ'];
    const summaryRows = [
      ['إجمالي المقبوضات', data.summary.total_receipts],
      ['إجمالي المدفوعات', data.summary.total_payments],
      ['صافي التدفق النقدي', data.summary.net_cash_flow]
    ];

    const costCenterHeaders = ['مركز التكلفة', 'المبلغ', 'عدد المعاملات'];
    const costCenterRows = data.by_cost_center.map((center: any) => [
      center.cost_center_name,
      center.total_amount,
      center.transaction_count
    ]);

    const csvContent = [
      '# ملخص المدفوعات',
      summaryHeaders.join(','),
      ...summaryRows.map(row => row.join(',')),
      '',
      '# التحليل حسب مركز التكلفة',
      costCenterHeaders.join(','),
      ...costCenterRows.map(row => row.join(','))
    ].join('\n');

    downloadFile(csvContent, `payment-analytics-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

    toast({
      title: "تم تصدير التحليلات بنجاح",
      description: "تم تصدير تحليلات المدفوعات إلى ملف CSV.",
    });
  };

  const exportToExcel = (data: any[]) => {
    // سيتم تطوير هذه الوظيفة لاحقاً باستخدام مكتبة xlsx
    toast({
      title: "قريباً",
      description: "سيتم إضافة التصدير إلى Excel قريباً.",
      variant: "destructive",
    });
  };

  const exportToPDF = (data: any[]) => {
    // سيتم تطوير هذه الوظيفة لاحقاً باستخدام مكتبة jsPDF
    toast({
      title: "قريباً",
      description: "سيتم إضافة التصدير إلى PDF قريباً.",
      variant: "destructive",
    });
  };

  const exportAnalyticsToPDF = (data: any) => {
    toast({
      title: "قريباً",
      description: "سيتم إضافة تصدير التحليلات إلى PDF قريباً.",
      variant: "destructive",
    });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'check': return 'شيك';
      case 'bank_transfer': return 'حوالة بنكية';
      case 'card': return 'بطاقة';
      default: return method;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتملة';
      case 'pending': return 'معلقة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          تصدير البيانات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">نوع البيانات</label>
            <Select value={exportType} onValueChange={(value: 'payments' | 'analytics') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payments">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    قائمة المدفوعات
                  </div>
                </SelectItem>
                <SelectItem value="analytics">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    التحليلات والتقارير
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">صيغة التصدير</label>
            <Select value={exportFormat} onValueChange={(value: 'csv' | 'excel' | 'pdf') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Excel (قريباً)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF (قريباً)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleExport} 
          className="w-full"
          disabled={!payments && !analytics}
        >
          <Download className="h-4 w-4 mr-2" />
          تصدير البيانات
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>• سيتم تصدير البيانات حسب الفترة المحددة في الفلاتر</p>
          <p>• التصدير إلى Excel و PDF سيتم إضافتهما قريباً</p>
        </div>
      </CardContent>
    </Card>
  );
};