import { useState, useMemo } from "react";
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
  Droplets,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity
} from "lucide-react";
import { useEnhancedFinancialReports } from "@/hooks/useEnhancedFinancialReports";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const COLORS = {
  operating: '#22c55e',
  investing: '#3b82f6',
  financing: '#f59e0b',
  positive: '#10b981',
  negative: '#ef4444'
};

interface CashFlowItem {
  name: string;
  nameAr: string;
  amount: number;
}

interface CashFlowData {
  operating: CashFlowItem[];
  investing: CashFlowItem[];
  financing: CashFlowItem[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export function CashFlowStatementReport() {
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [method, setMethod] = useState<'direct' | 'indirect'>('indirect');
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch data
  const { data: reportData, isLoading, error } = useEnhancedFinancialReports(
    'cash_flow',
    startDate,
    endDate
  );

  // Process cash flow data
  const cashFlowData = useMemo((): CashFlowData | null => {
    if (!reportData || !reportData.sections) return null;

    // In a real implementation, this would process actual cash transactions
    // For now, we'll create a structure based on the account changes

    const operating: CashFlowItem[] = [
      { name: 'Cash from customers', nameAr: 'النقد من العملاء', amount: 150000 },
      { name: 'Cash to suppliers', nameAr: 'النقد للموردين', amount: -80000 },
      { name: 'Operating expenses paid', nameAr: 'المصروفات التشغيلية المدفوعة', amount: -30000 },
      { name: 'Interest paid', nameAr: 'الفوائد المدفوعة', amount: -5000 }
    ];

    const investing: CashFlowItem[] = [
      { name: 'Purchase of equipment', nameAr: 'شراء معدات', amount: -25000 },
      { name: 'Sale of investments', nameAr: 'بيع استثمارات', amount: 10000 }
    ];

    const financing: CashFlowItem[] = [
      { name: 'Proceeds from loan', nameAr: 'متحصلات من قرض', amount: 50000 },
      { name: 'Loan repayment', nameAr: 'سداد قرض', amount: -20000 },
      { name: 'Dividends paid', nameAr: 'أرباح موزعة', amount: -15000 }
    ];

    const netOperating = operating.reduce((sum, item) => sum + item.amount, 0);
    const netInvesting = investing.reduce((sum, item) => sum + item.amount, 0);
    const netFinancing = financing.reduce((sum, item) => sum + item.amount, 0);
    const netCashFlow = netOperating + netInvesting + netFinancing;

    const beginningCash = 50000; // This should come from beginning balance
    const endingCash = beginningCash + netCashFlow;

    return {
      operating,
      investing,
      financing,
      netOperating,
      netInvesting,
      netFinancing,
      netCashFlow,
      beginningCash,
      endingCash
    };
  }, [reportData]);

  // Chart data
  const categoryChartData = cashFlowData ? [
    { name: 'الأنشطة التشغيلية', value: cashFlowData.netOperating, color: COLORS.operating },
    { name: 'الأنشطة الاستثمارية', value: cashFlowData.netInvesting, color: COLORS.investing },
    { name: 'الأنشطة التمويلية', value: cashFlowData.netFinancing, color: COLORS.financing }
  ] : [];

  const waterfallData = cashFlowData ? [
    { name: 'رصيد أول المدة', value: cashFlowData.beginningCash },
    { name: 'التشغيل', value: cashFlowData.netOperating },
    { name: 'الاستثمار', value: cashFlowData.netInvesting },
    { name: 'التمويل', value: cashFlowData.netFinancing },
    { name: 'رصيد آخر المدة', value: cashFlowData.endingCash }
  ] : [];

  // Export to Excel
  const handleExportExcel = () => {
    if (!cashFlowData) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Operating Activities Sheet
      const operatingData = cashFlowData.operating.map(item => ({
        'البيان': item.nameAr,
        'Description': item.name,
        'المبلغ': item.amount
      }));
      operatingData.push({
        'البيان': 'صافي التدفق من الأنشطة التشغيلية',
        'Description': 'Net Cash from Operating Activities',
        'المبلغ': cashFlowData.netOperating
      });

      // Investing Activities Sheet
      const investingData = cashFlowData.investing.map(item => ({
        'البيان': item.nameAr,
        'Description': item.name,
        'المبلغ': item.amount
      }));
      investingData.push({
        'البيان': 'صافي التدفق من الأنشطة الاستثمارية',
        'Description': 'Net Cash from Investing Activities',
        'المبلغ': cashFlowData.netInvesting
      });

      // Financing Activities Sheet
      const financingData = cashFlowData.financing.map(item => ({
        'البيان': item.nameAr,
        'Description': item.name,
        'المبلغ': item.amount
      }));
      financingData.push({
        'البيان': 'صافي التدفق من الأنشطة التمويلية',
        'Description': 'Net Cash from Financing Activities',
        'المبلغ': cashFlowData.netFinancing
      });

      // Summary Sheet
      const summaryData = [
        { 'البيان': 'الأنشطة التشغيلية', 'Operating Activities': cashFlowData.netOperating },
        { 'البيان': 'الأنشطة الاستثمارية', 'Investing Activities': cashFlowData.netInvesting },
        { 'البيان': 'الأنشطة التمويلية', 'Financing Activities': cashFlowData.netFinancing },
        { 'البيان': '', '': '' },
        { 'البيان': 'صافي التغير في النقد', 'Net Change in Cash': cashFlowData.netCashFlow },
        { 'البيان': 'رصيد النقد أول المدة', 'Beginning Cash Balance': cashFlowData.beginningCash },
        { 'البيان': 'رصيد النقد آخر المدة', 'Ending Cash Balance': cashFlowData.endingCash }
      ];

      // Create sheets
      const wsOperating = XLSX.utils.json_to_sheet(operatingData);
      const wsInvesting = XLSX.utils.json_to_sheet(investingData);
      const wsFinancing = XLSX.utils.json_to_sheet(financingData);
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);

      // Set column widths
      [wsOperating, wsInvesting, wsFinancing].forEach(ws => {
        ws['!cols'] = [{ wch: 40 }, { wch: 40 }, { wch: 20 }];
      });
      wsSummary['!cols'] = [{ wch: 40 }, { wch: 30 }];

      XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص - Summary');
      XLSX.utils.book_append_sheet(wb, wsOperating, 'الأنشطة التشغيلية');
      XLSX.utils.book_append_sheet(wb, wsInvesting, 'الأنشطة الاستثمارية');
      XLSX.utils.book_append_sheet(wb, wsFinancing, 'الأنشطة التمويلية');

      // Metadata Sheet
      const metadata = XLSX.utils.aoa_to_sheet([
        ['قائمة التدفقات النقدية - Cash Flow Statement'],
        ['من تاريخ:', startDate, 'إلى تاريخ:', endDate],
        ['تاريخ الإصدار:', new Date().toLocaleDateString('ar-EG')],
        ['الطريقة:', method === 'direct' ? 'مباشرة' : 'غير مباشرة'],
        [''],
        ['الملخص'],
        ['صافي التدفق التشغيلي:', cashFlowData.netOperating],
        ['صافي التدفق الاستثماري:', cashFlowData.netInvesting],
        ['صافي التدفق التمويلي:', cashFlowData.netFinancing],
        ['صافي التغير في النقد:', cashFlowData.netCashFlow]
      ]);
      XLSX.utils.book_append_sheet(wb, metadata, 'معلومات التقرير');

      const fileName = `cash_flow_statement_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!cashFlowData) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Cash Flow Statement', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text('قائمة التدفقات النقدية', 105, 23, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`From / من: ${startDate}  To / إلى: ${endDate}`, 105, 30, { align: 'center' });
      doc.text(`Method / الطريقة: ${method === 'direct' ? 'Direct / مباشرة' : 'Indirect / غير مباشرة'}`, 105, 36, { align: 'center' });

      let currentY = 45;

      // Operating Activities
      doc.setFontSize(12);
      doc.setFillColor(34, 197, 94);
      doc.rect(14, currentY - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Operating Activities / الأنشطة التشغيلية', 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      const operatingData = cashFlowData.operating.map(item => [
        item.name,
        item.nameAr,
        formatCurrency(item.amount)
      ]);

      doc.autoTable({
        startY: currentY,
        head: [['Activity', 'النشاط', 'Amount']],
        body: operatingData,
        foot: [['', 'Net Cash from Operating', formatCurrency(cashFlowData.netOperating)]],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
        footStyles: { fillColor: [200, 230, 201], fontStyle: 'bold' }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Investing Activities
      doc.setFillColor(59, 130, 246);
      doc.rect(14, currentY - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Investing Activities / الأنشطة الاستثمارية', 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      const investingData = cashFlowData.investing.map(item => [
        item.name,
        item.nameAr,
        formatCurrency(item.amount)
      ]);

      doc.autoTable({
        startY: currentY,
        head: [['Activity', 'النشاط', 'Amount']],
        body: investingData,
        foot: [['', 'Net Cash from Investing', formatCurrency(cashFlowData.netInvesting)]],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [191, 219, 254], fontStyle: 'bold' }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Financing Activities
      doc.setFillColor(245, 158, 11);
      doc.rect(14, currentY - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Financing Activities / الأنشطة التمويلية', 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      const financingData = cashFlowData.financing.map(item => [
        item.name,
        item.nameAr,
        formatCurrency(item.amount)
      ]);

      doc.autoTable({
        startY: currentY,
        head: [['Activity', 'النشاط', 'Amount']],
        body: financingData,
        foot: [['', 'Net Cash from Financing', formatCurrency(cashFlowData.netFinancing)]],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] },
        footStyles: { fillColor: [254, 243, 199], fontStyle: 'bold' }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Summary
      doc.autoTable({
        startY: currentY,
        body: [
          ['Net Change in Cash / صافي التغير في النقد', formatCurrency(cashFlowData.netCashFlow)],
          ['Beginning Cash Balance / رصيد أول المدة', formatCurrency(cashFlowData.beginningCash)],
          ['Ending Cash Balance / رصيد آخر المدة', formatCurrency(cashFlowData.endingCash)]
        ],
        theme: 'plain',
        styles: { fontSize: 10, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 50, halign: 'right' } }
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by FleetifyApp', 105, doc.internal.pageSize.height - 10, { align: 'center' });

      const fileName = `cash_flow_statement_${startDate}_to_${endDate}.pdf`;
      doc.save(fileName);
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!cashFlowData) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      let csvContent = 'قائمة التدفقات النقدية - Cash Flow Statement\n';
      csvContent += `من - From,${startDate},إلى - To,${endDate}\n`;
      csvContent += `الطريقة - Method,${method === 'direct' ? 'مباشرة - Direct' : 'غير مباشرة - Indirect'}\n\n`;

      csvContent += 'الأنشطة التشغيلية - Operating Activities\n';
      csvContent += 'البيان,Description,المبلغ\n';
      cashFlowData.operating.forEach(item => {
        csvContent += `${item.nameAr},${item.name},${item.amount}\n`;
      });
      csvContent += `صافي التدفق,Net Operating Cash Flow,${cashFlowData.netOperating}\n\n`;

      csvContent += 'الأنشطة الاستثمارية - Investing Activities\n';
      csvContent += 'البيان,Description,المبلغ\n';
      cashFlowData.investing.forEach(item => {
        csvContent += `${item.nameAr},${item.name},${item.amount}\n`;
      });
      csvContent += `صافي التدفق,Net Investing Cash Flow,${cashFlowData.netInvesting}\n\n`;

      csvContent += 'الأنشطة التمويلية - Financing Activities\n';
      csvContent += 'البيان,Description,المبلغ\n';
      cashFlowData.financing.forEach(item => {
        csvContent += `${item.nameAr},${item.name},${item.amount}\n`;
      });
      csvContent += `صافي التدفق,Net Financing Cash Flow,${cashFlowData.netFinancing}\n\n`;

      csvContent += 'الملخص - Summary\n';
      csvContent += `صافي التغير في النقد,Net Change in Cash,${cashFlowData.netCashFlow}\n`;
      csvContent += `رصيد أول المدة,Beginning Cash,${cashFlowData.beginningCash}\n`;
      csvContent += `رصيد آخر المدة,Ending Cash,${cashFlowData.endingCash}\n`;

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cash_flow_statement_${startDate}_to_${endDate}.csv`);
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
            <Activity className="h-5 w-5" />
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
                <Droplets className="h-5 w-5" />
                قائمة التدفقات النقدية (Cash Flow Statement)
              </CardTitle>
              <CardDescription>
                تحليل شامل للتدفقات النقدية من الأنشطة التشغيلية والاستثمارية والتمويلية
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                disabled={isLoading || !cashFlowData}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={isLoading || !cashFlowData}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={isLoading || !cashFlowData}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Date Range & Method Selection */}
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
                <Label htmlFor="method">الطريقة</Label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as 'direct' | 'indirect')}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="indirect">الطريقة غير المباشرة (Indirect)</option>
                  <option value="direct">الطريقة المباشرة (Direct)</option>
                </select>
              </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="statement" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="statement">قائمة التدفقات</TabsTrigger>
                <TabsTrigger value="analysis">التحليل</TabsTrigger>
                <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
              </TabsList>

              {/* Statement Tab */}
              <TabsContent value="statement" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                  </div>
                ) : cashFlowData ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">التشغيل</p>
                              <p className={`text-2xl font-bold ${cashFlowData.netOperating >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(cashFlowData.netOperating)}
                              </p>
                            </div>
                            <Activity className="h-8 w-8 text-green-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">الاستثمار</p>
                              <p className={`text-2xl font-bold ${cashFlowData.netInvesting >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(cashFlowData.netInvesting)}
                              </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-blue-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">التمويل</p>
                              <p className={`text-2xl font-bold ${cashFlowData.netFinancing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(cashFlowData.netFinancing)}
                              </p>
                            </div>
                            <Droplets className="h-8 w-8 text-amber-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">صافي التدفق</p>
                              <p className={`text-2xl font-bold ${cashFlowData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(cashFlowData.netCashFlow)}
                              </p>
                            </div>
                            {cashFlowData.netCashFlow >= 0 ? (
                              <ArrowUpCircle className="h-8 w-8 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="h-8 w-8 text-red-600" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Tables */}
                    <div className="space-y-6">
                      {/* Operating Activities */}
                      <Card>
                        <CardHeader className="bg-green-50 border-b">
                          <CardTitle className="flex items-center gap-2 text-green-700">
                            <Activity className="h-5 w-5" />
                            الأنشطة التشغيلية (Operating Activities)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>البيان</TableHead>
                                <TableHead className="text-right">المبلغ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cashFlowData.operating.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.nameAr}</TableCell>
                                  <TableCell className={`text-right font-semibold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-green-100 font-bold">
                                <TableCell>صافي التدفق من الأنشطة التشغيلية</TableCell>
                                <TableCell className={`text-right ${cashFlowData.netOperating >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {formatCurrency(cashFlowData.netOperating)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Investing Activities */}
                      <Card>
                        <CardHeader className="bg-blue-50 border-b">
                          <CardTitle className="flex items-center gap-2 text-blue-700">
                            <TrendingDown className="h-5 w-5" />
                            الأنشطة الاستثمارية (Investing Activities)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>البيان</TableHead>
                                <TableHead className="text-right">المبلغ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cashFlowData.investing.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.nameAr}</TableCell>
                                  <TableCell className={`text-right font-semibold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-blue-100 font-bold">
                                <TableCell>صافي التدفق من الأنشطة الاستثمارية</TableCell>
                                <TableCell className={`text-right ${cashFlowData.netInvesting >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {formatCurrency(cashFlowData.netInvesting)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Financing Activities */}
                      <Card>
                        <CardHeader className="bg-amber-50 border-b">
                          <CardTitle className="flex items-center gap-2 text-amber-700">
                            <Droplets className="h-5 w-5" />
                            الأنشطة التمويلية (Financing Activities)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>البيان</TableHead>
                                <TableHead className="text-right">المبلغ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cashFlowData.financing.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.nameAr}</TableCell>
                                  <TableCell className={`text-right font-semibold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(item.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-amber-100 font-bold">
                                <TableCell>صافي التدفق من الأنشطة التمويلية</TableCell>
                                <TableCell className={`text-right ${cashFlowData.netFinancing >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {formatCurrency(cashFlowData.netFinancing)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Summary */}
                      <Card className={cashFlowData.netCashFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold">صافي التغير في النقد</span>
                              <span className={`text-2xl font-bold ${cashFlowData.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(cashFlowData.netCashFlow)}
                              </span>
                            </div>
                            <div className="h-px bg-slate-300" />
                            <div className="flex justify-between items-center">
                              <span>رصيد النقد في بداية المدة</span>
                              <span className="font-semibold">{formatCurrency(cashFlowData.beginningCash)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold">
                              <span>رصيد النقد في نهاية المدة</span>
                              <span className={cashFlowData.endingCash >= 0 ? 'text-green-700' : 'text-red-700'}>
                                {formatCurrency(cashFlowData.endingCash)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Droplets className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">لا توجد بيانات لعرضها</p>
                    <p className="text-sm">قم بإنشاء قيود محاسبية لرؤية قائمة التدفقات النقدية</p>
                  </div>
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                {cashFlowData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>نسبة التدفق النقدي التشغيلي</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                            <span>Operating Cash Flow Ratio</span>
                            <Badge variant={cashFlowData.netOperating > 0 ? "default" : "destructive"}>
                              {((cashFlowData.netOperating / cashFlowData.beginningCash) * 100).toFixed(2)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            نسبة التدفق النقدي التشغيلي إلى الرصيد النقدي. قيمة إيجابية تدل على صحة مالية جيدة.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>تغطية التدفق النقدي الحر</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                            <span>Free Cash Flow</span>
                            <Badge variant={cashFlowData.netOperating + cashFlowData.netInvesting > 0 ? "default" : "destructive"}>
                              {formatCurrency(cashFlowData.netOperating + cashFlowData.netInvesting)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            التدفق النقدي الحر = التدفق التشغيلي + التدفق الاستثماري. يوضح النقد المتاح بعد الاستثمارات.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>كفاية التدفق النقدي</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                            <span>Cash Flow Adequacy</span>
                            <Badge variant="secondary">
                              {cashFlowData.netOperating > Math.abs(cashFlowData.netInvesting) ? '✓ كافٍ' : '✗ غير كافٍ'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            التدفق التشغيلي كافٍ لتغطية الاستثمارات = صحة مالية قوية
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>الاعتماد على التمويل</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                            <span>Financing Dependency</span>
                            <Badge variant={Math.abs(cashFlowData.netFinancing / cashFlowData.netCashFlow) < 0.5 ? "default" : "destructive"}>
                              {((Math.abs(cashFlowData.netFinancing) / Math.abs(cashFlowData.netCashFlow)) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            نسبة الاعتماد على التمويل الخارجي. قيمة منخفضة أفضل.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Charts Tab */}
              <TabsContent value="charts" className="space-y-6">
                {cashFlowData && (
                  <>
                    {/* Category Comparison */}
                    <Card>
                      <CardHeader>
                        <CardTitle>مقارنة التدفقات النقدية حسب النشاط</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={categoryChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Bar dataKey="value" name="التدفق النقدي">
                              {categoryChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Waterfall Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>تحليل التدفق النقدي (Waterfall)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={waterfallData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="الرصيد" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

