import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  LineChart as LineChartIcon 
} from "lucide-react";
import { useEnhancedFinancialReports } from "@/hooks/useEnhancedFinancialReports";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

// Extend jsPDF type
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function IncomeStatementReport() {
  const [viewMode, setViewMode] = useState<'single' | 'comparative'>('single');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch main period data
  const { data: reportData, isLoading, error } = useEnhancedFinancialReports(
    'income_statement',
    startDate,
    endDate
  );

  // Calculate comparative periods (last 6 months)
  const periods = [];
  for (let i = 0; i < 6; i++) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date).toISOString().split('T')[0];
    const end = endOfMonth(date).toISOString().split('T')[0];
    periods.push({
      month: format(date, 'MMMM yyyy', { locale: ar }),
      monthEn: format(date, 'MMM yyyy'),
      startDate: start,
      endDate: end
    });
  }
  periods.reverse();

  // Fetch data for each period
  const periodsData = periods.map(period => {
    const { data } = useEnhancedFinancialReports(
      'income_statement',
      period.startDate,
      period.endDate
    );
    return {
      ...period,
      data
    };
  });

  // Calculate totals
  const totalRevenue = reportData?.totalCredits || 0;
  const totalExpenses = reportData?.totalDebits || 0;
  const netIncome = reportData?.netIncome || 0;
  const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0;

  // Prepare chart data
  const chartData = periodsData.map((period) => ({
    month: period.monthEn,
    revenue: period.data?.totalCredits || 0,
    expenses: period.data?.totalDebits || 0,
    netIncome: period.data?.netIncome || 0
  }));

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Main Report Sheet
      const revenueData = reportData.sections[0]?.accounts?.map(acc => ({
        'رمز الحساب': acc.accountCode,
        'اسم الحساب': acc.accountNameAr || acc.accountName,
        'المبلغ': Number(acc.balance)
      })) || [];

      const expenseData = reportData.sections[1]?.accounts?.map(acc => ({
        'رمز الحساب': acc.accountCode,
        'اسم الحساب': acc.accountNameAr || acc.accountName,
        'المبلغ': Number(acc.balance)
      })) || [];

      // Add summary rows
      revenueData.push({
        'رمز الحساب': '',
        'اسم الحساب': 'إجمالي الإيرادات',
        'المبلغ': totalRevenue
      });

      const combinedData = [
        ...revenueData,
        { 'رمز الحساب': '', 'اسم الحساب': '', 'المبلغ': '' },
        ...expenseData,
        {
          'رمز الحساب': '',
          'اسم الحساب': 'إجمالي المصروفات',
          'المبلغ': totalExpenses
        },
        { 'رمز الحساب': '', 'اسم الحساب': '', 'المبلغ': '' },
        {
          'رمز الحساب': '',
          'اسم الحساب': 'صافي الدخل',
          'المبلغ': netIncome
        }
      ];

      const ws = XLSX.utils.json_to_sheet(combinedData);
      ws['!cols'] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'قائمة الدخل');

      // Comparative Analysis Sheet (if available)
      if (viewMode === 'comparative' && chartData.length > 0) {
        const compData = chartData.map(item => ({
          'الشهر': item.month,
          'الإيرادات': item.revenue,
          'المصروفات': item.expenses,
          'صافي الدخل': item.netIncome
        }));
        const wsComp = XLSX.utils.json_to_sheet(compData);
        XLSX.utils.book_append_sheet(wb, wsComp, 'التحليل المقارن');
      }

      // Metadata Sheet
      const metadata = XLSX.utils.aoa_to_sheet([
        ['قائمة الدخل - Income Statement'],
        ['من تاريخ:', startDate || 'بداية السنة'],
        ['إلى تاريخ:', endDate],
        ['تاريخ الإصدار:', new Date().toLocaleDateString('ar-EG')],
        [''],
        ['الملخص المالي'],
        ['إجمالي الإيرادات:', totalRevenue],
        ['إجمالي المصروفات:', totalExpenses],
        ['صافي الدخل:', netIncome],
        ['هامش الربح:', `${profitMargin.toFixed(2)}%`]
      ]);
      XLSX.utils.book_append_sheet(wb, metadata, 'معلومات التقرير');

      const fileName = `income_statement_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFont('helvetica');
      doc.setFontSize(18);
      doc.text('Income Statement', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text('قائمة الدخل', 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      const periodText = startDate 
        ? `Period: ${startDate} to ${endDate}`
        : `As of: ${endDate}`;
      doc.text(periodText, 105, 32, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 105, 38, { align: 'center' });

      let currentY = 50;

      // Revenue Section
      doc.setFontSize(12);
      doc.setFillColor(34, 197, 94);
      doc.rect(14, currentY - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Revenue / الإيرادات', 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      const revenueData = reportData.sections[0]?.accounts?.map(acc => [
        acc.accountCode,
        acc.accountNameAr || acc.accountName,
        formatCurrency(Number(acc.balance))
      ]) || [];

      doc.autoTable({
        startY: currentY,
        head: [['Code', 'Account Name', 'Amount']],
        body: revenueData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 2;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 20, currentY);
      currentY += 10;

      // Expenses Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(239, 68, 68);
      doc.rect(14, currentY - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Expenses / المصروفات', 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      const expenseData = reportData.sections[1]?.accounts?.map(acc => [
        acc.accountCode,
        acc.accountNameAr || acc.accountName,
        formatCurrency(Number(acc.balance))
      ]) || [];

      doc.autoTable({
        startY: currentY,
        head: [['Code', 'Account Name', 'Amount']],
        body: expenseData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [239, 68, 68], textColor: 255 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 2;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Expenses: ${formatCurrency(totalExpenses)}`, 20, currentY);
      currentY += 10;

      // Net Income
      doc.setFillColor(netIncome >= 0 ? 34 : 239, netIncome >= 0 ? 197 : 68, netIncome >= 0 ? 94 : 68);
      doc.rect(14, currentY - 5, 182, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`Net Income / صافي الدخل: ${formatCurrency(netIncome)}`, 20, currentY + 3);
      doc.setTextColor(0, 0, 0);
      currentY += 12;

      // Profit Margin
      doc.setFontSize(10);
      doc.text(`Profit Margin / هامش الربح: ${profitMargin.toFixed(2)}%`, 20, currentY + 5);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        'Generated by FleetifyApp - نظام FleetifyApp',
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );

      const fileName = `income_statement_${endDate}.pdf`;
      doc.save(fileName);
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      let csvContent = 'قائمة الدخل - Income Statement\n';
      csvContent += `من تاريخ - From,${startDate || 'بداية السنة'}\n`;
      csvContent += `إلى تاريخ - To,${endDate}\n`;
      csvContent += `تاريخ الإصدار - Generated,${new Date().toLocaleDateString('ar-EG')}\n\n`;

      csvContent += 'الإيرادات - Revenue\n';
      csvContent += 'رمز الحساب,اسم الحساب,المبلغ\n';
      reportData.sections[0]?.accounts?.forEach(acc => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,إجمالي الإيرادات,${totalRevenue}\n\n`;

      csvContent += 'المصروفات - Expenses\n';
      csvContent += 'رمز الحساب,اسم الحساب,المبلغ\n';
      reportData.sections[1]?.accounts?.forEach(acc => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,إجمالي المصروفات,${totalExpenses}\n\n`;

      csvContent += `,,صافي الدخل - Net Income,${netIncome}\n`;
      csvContent += `,,هامش الربح - Profit Margin,${profitMargin.toFixed(2)}%\n`;

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `income_statement_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <TrendingDown className="h-5 w-5" />
            <p>حدث خطأ في تحميل البيانات</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                قائمة الدخل (Income Statement)
              </CardTitle>
              <CardDescription>
                عرض الإيرادات والمصروفات وصافي الربح للفترة المحددة
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                disabled={isLoading || !reportData}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={isLoading || !reportData}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={isLoading || !reportData}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">من تاريخ</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>نوع العرض</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={viewMode === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('single')}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    فترة واحدة
                  </Button>
                  <Button
                    variant={viewMode === 'comparative' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('comparative')}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    مقارن
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="statement" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="statement">قائمة الدخل</TabsTrigger>
                <TabsTrigger value="analysis">التحليل البياني</TabsTrigger>
              </TabsList>

              {/* Income Statement Tab */}
              <TabsContent value="statement" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                  </div>
                ) : reportData && reportData.sections && reportData.sections.length > 0 ? (
                  <div>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalRevenue)}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                              <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalExpenses)}
                              </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">صافي الدخل</p>
                              <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(netIncome)}
                              </p>
                            </div>
                            <Badge variant={netIncome >= 0 ? "default" : "destructive"}>
                              {netIncome >= 0 ? 'ربح' : 'خسارة'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">هامش الربح</p>
                              <p className="text-2xl font-bold">
                                {profitMargin.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="w-[120px]">رمز الحساب</TableHead>
                            <TableHead>اسم الحساب</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Revenue Section */}
                          <TableRow className="bg-green-50">
                            <TableCell colSpan={3} className="font-bold text-green-700">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                الإيرادات (Revenue)
                              </div>
                            </TableCell>
                          </TableRow>
                          {reportData.sections[0]?.accounts?.map((account, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>{account.accountNameAr || account.accountName}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCurrency(Number(account.balance))}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-green-100 font-bold">
                            <TableCell colSpan={2}>إجمالي الإيرادات</TableCell>
                            <TableCell className="text-right text-green-700">
                              {formatCurrency(totalRevenue)}
                            </TableCell>
                          </TableRow>

                          {/* Spacer */}
                          <TableRow>
                            <TableCell colSpan={3} className="h-4"></TableCell>
                          </TableRow>

                          {/* Expenses Section */}
                          <TableRow className="bg-red-50">
                            <TableCell colSpan={3} className="font-bold text-red-700">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                المصروفات (Expenses)
                              </div>
                            </TableCell>
                          </TableRow>
                          {reportData.sections[1]?.accounts?.map((account, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>{account.accountNameAr || account.accountName}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {formatCurrency(Number(account.balance))}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-red-100 font-bold">
                            <TableCell colSpan={2}>إجمالي المصروفات</TableCell>
                            <TableCell className="text-right text-red-700">
                              {formatCurrency(totalExpenses)}
                            </TableCell>
                          </TableRow>

                          {/* Net Income */}
                          <TableRow className={`${netIncome >= 0 ? 'bg-blue-100' : 'bg-red-200'} font-bold text-lg`}>
                            <TableCell colSpan={2} className="py-6">
                              صافي الدخل (Net Income)
                            </TableCell>
                            <TableCell className={`text-right py-6 ${netIncome >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              {formatCurrency(netIncome)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FileText className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">لا توجد بيانات لعرضها</p>
                    <p className="text-sm">قم بإنشاء قيود محاسبية للإيرادات والمصروفات</p>
                  </div>
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                {chartData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Revenue vs Expenses Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          مقارنة الإيرادات والمصروفات (6 أشهر)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Bar dataKey="revenue" name="الإيرادات" fill="#22c55e" />
                            <Bar dataKey="expenses" name="المصروفات" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Net Income Trend */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <LineChartIcon className="h-5 w-5" />
                          اتجاه صافي الدخل (6 أشهر)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="netIncome" 
                              name="صافي الدخل" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Monthly Comparison Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>الجدول المقارن الشهري</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الشهر</TableHead>
                              <TableHead className="text-right">الإيرادات</TableHead>
                              <TableHead className="text-right">المصروفات</TableHead>
                              <TableHead className="text-right">صافي الدخل</TableHead>
                              <TableHead className="text-right">هامش الربح</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {periodsData.map((period, index) => {
                              const revenue = period.data?.totalCredits || 0;
                              const expenses = period.data?.totalDebits || 0;
                              const net = period.data?.netIncome || 0;
                              const margin = revenue > 0 ? ((net / revenue) * 100) : 0;
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{period.month}</TableCell>
                                  <TableCell className="text-right text-green-600">
                                    {formatCurrency(revenue)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600">
                                    {formatCurrency(expenses)}
                                  </TableCell>
                                  <TableCell className={`text-right font-semibold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatCurrency(net)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={margin >= 0 ? "default" : "destructive"}>
                                      {margin.toFixed(2)}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <LineChartIcon className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">لا توجد بيانات للتحليل</p>
                    <p className="text-sm">أضف المزيد من القيود المحاسبية لرؤية الاتجاهات</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

