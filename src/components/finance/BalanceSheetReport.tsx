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
  Building,
  PieChart as PieChartIcon,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useEnhancedFinancialReports } from "@/hooks/useEnhancedFinancialReports";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Extend jsPDF type
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const COLORS = {
  assets: '#22c55e',
  liabilities: '#ef4444',
  equity: '#3b82f6',
  currentAssets: '#10b981',
  fixedAssets: '#059669',
  currentLiabilities: '#f87171',
  longTermLiabilities: '#dc2626'
};

export function BalanceSheetReport() {
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch balance sheet data
  const { data: reportData, isLoading, error } = useEnhancedFinancialReports(
    'balance_sheet',
    '',
    asOfDate
  );

  // Calculate totals and ratios
  const assetsSection = reportData?.sections?.find((s: any) => s.title === 'Assets');
  const liabilitiesSection = reportData?.sections?.find((s: any) => s.title === 'Liabilities');
  const equitySection = reportData?.sections?.find((s: any) => s.title === 'Equity');

  const totalAssets = assetsSection?.subtotal || 0;
  const totalLiabilities = liabilitiesSection?.subtotal || 0;
  const totalEquity = equitySection?.subtotal || 0;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  // Financial Ratios
  const currentAssets = assetsSection?.accounts?.filter((a: any) => 
    a.accountCode?.startsWith('11') || a.accountCode?.startsWith('12')
  ).reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0) || 0;

  const fixedAssets = totalAssets - currentAssets;

  const currentLiabilities = liabilitiesSection?.accounts?.filter((a: any) =>
    a.accountCode?.startsWith('21')
  ).reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0) || 0;

  const longTermLiabilities = totalLiabilities - currentLiabilities;

  // Financial Ratios Calculations
  const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : 0;
  const debtToEquityRatio = totalEquity > 0 ? (totalLiabilities / totalEquity) : 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0;
  const equityRatio = totalAssets > 0 ? (totalEquity / totalAssets) : 0;

  // Chart data
  const assetsDistribution = [
    { name: 'أصول متداولة', value: currentAssets, color: COLORS.currentAssets },
    { name: 'أصول ثابتة', value: fixedAssets, color: COLORS.fixedAssets }
  ].filter(item => item.value > 0);

  const liabilitiesDistribution = [
    { name: 'خصوم متداولة', value: currentLiabilities, color: COLORS.currentLiabilities },
    { name: 'خصوم طويلة الأجل', value: longTermLiabilities, color: COLORS.longTermLiabilities },
    { name: 'حقوق الملكية', value: totalEquity, color: COLORS.equity }
  ].filter(item => item.value > 0);

  const comparisonData = [
    { name: 'الأصول', value: totalAssets, color: COLORS.assets },
    { name: 'الخصوم', value: totalLiabilities, color: COLORS.liabilities },
    { name: 'حقوق الملكية', value: totalEquity, color: COLORS.equity }
  ];

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Assets Sheet
      const assetsData = assetsSection?.accounts?.map((acc: any) => ({
        'رمز الحساب': acc.accountCode,
        'اسم الحساب': acc.accountNameAr || acc.accountName,
        'المبلغ': Number(acc.balance)
      })) || [];
      assetsData.push({
        'رمز الحساب': '',
        'اسم الحساب': 'إجمالي الأصول',
        'المبلغ': totalAssets
      });

      // Liabilities Sheet
      const liabilitiesData = liabilitiesSection?.accounts?.map((acc: any) => ({
        'رمز الحساب': acc.accountCode,
        'اسم الحساب': acc.accountNameAr || acc.accountName,
        'المبلغ': Number(acc.balance)
      })) || [];
      liabilitiesData.push({
        'رمز الحساب': '',
        'اسم الحساب': 'إجمالي الخصوم',
        'المبلغ': totalLiabilities
      });

      // Equity Sheet
      const equityData = equitySection?.accounts?.map((acc: any) => ({
        'رمز الحساب': acc.accountCode,
        'اسم الحساب': acc.accountNameAr || acc.accountName,
        'المبلغ': Number(acc.balance)
      })) || [];
      equityData.push({
        'رمز الحساب': '',
        'اسم الحساب': 'إجمالي حقوق الملكية',
        'المبلغ': totalEquity
      });

      // Create sheets
      const wsAssets = XLSX.utils.json_to_sheet(assetsData);
      const wsLiabilities = XLSX.utils.json_to_sheet(liabilitiesData);
      const wsEquity = XLSX.utils.json_to_sheet(equityData);

      // Set column widths
      [wsAssets, wsLiabilities, wsEquity].forEach(ws => {
        ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 20 }];
      });

      XLSX.utils.book_append_sheet(wb, wsAssets, 'الأصول');
      XLSX.utils.book_append_sheet(wb, wsLiabilities, 'الخصوم');
      XLSX.utils.book_append_sheet(wb, wsEquity, 'حقوق الملكية');

      // Ratios Sheet
      const ratiosData = [
        ['النسب المالية', ''],
        ['', ''],
        ['نسبة التداول', currentRatio.toFixed(2)],
        ['نسبة الدين إلى حقوق الملكية', debtToEquityRatio.toFixed(2)],
        ['نسبة الدين', `${(debtRatio * 100).toFixed(2)}%`],
        ['نسبة حقوق الملكية', `${(equityRatio * 100).toFixed(2)}%`]
      ];
      const wsRatios = XLSX.utils.aoa_to_sheet(ratiosData);
      XLSX.utils.book_append_sheet(wb, wsRatios, 'النسب المالية');

      // Metadata Sheet
      const metadata = XLSX.utils.aoa_to_sheet([
        ['قائمة المركز المالي - Balance Sheet'],
        ['كما في تاريخ:', asOfDate],
        ['تاريخ الإصدار:', new Date().toLocaleDateString('ar-EG')],
        [''],
        ['الملخص المالي'],
        ['إجمالي الأصول:', totalAssets],
        ['إجمالي الخصوم:', totalLiabilities],
        ['إجمالي حقوق الملكية:', totalEquity],
        ['الحالة:', isBalanced ? 'متوازن' : 'غير متوازن']
      ]);
      XLSX.utils.book_append_sheet(wb, metadata, 'معلومات التقرير');

      const fileName = `balance_sheet_${asOfDate}.xlsx`;
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
      doc.text('Balance Sheet', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text('قائمة المركز المالي', 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`As of Date / كما في: ${asOfDate}`, 105, 32, { align: 'center' });
      doc.text(`Generated / تاريخ الإصدار: ${new Date().toLocaleDateString('en-US')}`, 105, 38, { align: 'center' });

      let currentY = 50;

      // Assets Section
      doc.setFontSize(12);
      doc.setFillColor(34, 197, 94);
      doc.rect(14, currentY - 5, 80, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Assets / الأصول', 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 10;

      const assetsData = assetsSection?.accounts?.map((acc: any) => [
        acc.accountCode,
        acc.accountNameAr || acc.accountName,
        formatCurrency(Number(acc.balance))
      ]) || [];

      doc.autoTable({
        startY: currentY,
        head: [['Code', 'Account', 'Amount']],
        body: assetsData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 70 }, 2: { cellWidth: 35, halign: 'right' } }
      });

      currentY = (doc as any).lastAutoTable.finalY + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Assets: ${formatCurrency(totalAssets)}`, 20, currentY);
      currentY += 10;

      // Liabilities Section
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(239, 68, 68);
      doc.rect(110, 50 - 5, 86, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Liabilities / الخصوم', 116, 50);
      doc.setTextColor(0, 0, 0);

      const liabilitiesData = liabilitiesSection?.accounts?.map((acc: any) => [
        acc.accountCode,
        acc.accountNameAr || acc.accountName,
        formatCurrency(Number(acc.balance))
      ]) || [];

      doc.autoTable({
        startY: 60,
        head: [['Code', 'Account', 'Amount']],
        body: liabilitiesData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 110 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30, halign: 'right' } }
      });

      let liabY = (doc as any).lastAutoTable.finalY + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${formatCurrency(totalLiabilities)}`, 116, liabY);
      liabY += 10;

      // Equity Section
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(59, 130, 246);
      doc.rect(110, liabY - 5, 86, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Equity / حقوق الملكية', 116, liabY);
      doc.setTextColor(0, 0, 0);
      liabY += 10;

      const equityData = equitySection?.accounts?.map((acc: any) => [
        acc.accountCode,
        acc.accountNameAr || acc.accountName,
        formatCurrency(Number(acc.balance))
      ]) || [];

      doc.autoTable({
        startY: liabY,
        head: [['Code', 'Account', 'Amount']],
        body: equityData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 110 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30, halign: 'right' } }
      });

      const equityY = (doc as any).lastAutoTable.finalY + 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Equity: ${formatCurrency(totalEquity)}`, 116, equityY);

      // Balance Status
      const finalY = Math.max(currentY, equityY) + 10;
      if (isBalanced) {
        doc.setTextColor(34, 197, 94);
        doc.text('✓ BALANCED / متوازن', 105, finalY, { align: 'center' });
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('✗ NOT BALANCED / غير متوازن', 105, finalY, { align: 'center' });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by FleetifyApp', 105, doc.internal.pageSize.height - 10, { align: 'center' });

      const fileName = `balance_sheet_${asOfDate}.pdf`;
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
      let csvContent = 'قائمة المركز المالي - Balance Sheet\n';
      csvContent += `كما في - As of,${asOfDate}\n`;
      csvContent += `تاريخ الإصدار - Generated,${new Date().toLocaleDateString('ar-EG')}\n\n`;

      csvContent += 'الأصول - Assets\n';
      csvContent += 'رمز الحساب,اسم الحساب,المبلغ\n';
      assetsSection?.accounts?.forEach((acc: any) => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,إجمالي الأصول,${totalAssets}\n\n`;

      csvContent += 'الخصوم - Liabilities\n';
      csvContent += 'رمز الحساب,اسم الحساب,المبلغ\n';
      liabilitiesSection?.accounts?.forEach((acc: any) => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,إجمالي الخصوم,${totalLiabilities}\n\n`;

      csvContent += 'حقوق الملكية - Equity\n';
      csvContent += 'رمز الحساب,اسم الحساب,المبلغ\n';
      equitySection?.accounts?.forEach((acc: any) => {
        csvContent += `${acc.accountCode},${acc.accountNameAr || acc.accountName},${acc.balance}\n`;
      });
      csvContent += `,,إجمالي حقوق الملكية,${totalEquity}\n\n`;

      csvContent += `الحالة - Status,${isBalanced ? 'متوازن - Balanced' : 'غير متوازن - Not Balanced'}\n`;

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `balance_sheet_${asOfDate}.csv`);
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
            <AlertCircle className="h-5 w-5" />
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
                <Building className="h-5 w-5" />
                قائمة المركز المالي (Balance Sheet)
              </CardTitle>
              <CardDescription>
                عرض الأصول والخصوم وحقوق الملكية كما في تاريخ محدد
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
            {/* Date Filter */}
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="asOfDate">كما في تاريخ</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="asOfDate"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {reportData && (
                <Badge variant={isBalanced ? "default" : "destructive"} className="h-8">
                  {isBalanced ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      متوازن
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      غير متوازن
                    </>
                  )}
                </Badge>
              )}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="statement" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="statement">قائمة المركز المالي</TabsTrigger>
                <TabsTrigger value="ratios">النسب المالية</TabsTrigger>
                <TabsTrigger value="charts">التحليل البياني</TabsTrigger>
              </TabsList>

              {/* Balance Sheet Tab */}
              <TabsContent value="statement" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                  </div>
                ) : reportData && reportData.sections && reportData.sections.length > 0 ? (
                  <div>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">إجمالي الأصول</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalAssets)}
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
                              <p className="text-sm text-muted-foreground">إجمالي الخصوم</p>
                              <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalLiabilities)}
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
                              <p className="text-sm text-muted-foreground">حقوق الملكية</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totalEquity)}
                              </p>
                            </div>
                            <Building className="h-8 w-8 text-blue-600 opacity-50" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Assets Column */}
                      <Card>
                        <CardHeader className="bg-green-50 border-b">
                          <CardTitle className="flex items-center gap-2 text-green-700">
                            <TrendingUp className="h-5 w-5" />
                            الأصول (Assets)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[100px]">الرمز</TableHead>
                                <TableHead>الحساب</TableHead>
                                <TableHead className="text-right">المبلغ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assetsSection?.accounts?.map((account: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                                  <TableCell>{account.accountNameAr || account.accountName}</TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">
                                    {formatCurrency(Number(account.balance))}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-green-100 font-bold">
                                <TableCell colSpan={2}>الإجمالي</TableCell>
                                <TableCell className="text-right text-green-700">
                                  {formatCurrency(totalAssets)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Liabilities & Equity Column */}
                      <div className="space-y-4">
                        {/* Liabilities */}
                        <Card>
                          <CardHeader className="bg-red-50 border-b">
                            <CardTitle className="flex items-center gap-2 text-red-700">
                              <TrendingDown className="h-5 w-5" />
                              الخصوم (Liabilities)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[80px]">الرمز</TableHead>
                                  <TableHead>الحساب</TableHead>
                                  <TableHead className="text-right">المبلغ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {liabilitiesSection?.accounts?.map((account: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                                    <TableCell className="text-sm">{account.accountNameAr || account.accountName}</TableCell>
                                    <TableCell className="text-right font-semibold text-red-600">
                                      {formatCurrency(Number(account.balance))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-red-100 font-bold">
                                  <TableCell colSpan={2}>الإجمالي</TableCell>
                                  <TableCell className="text-right text-red-700">
                                    {formatCurrency(totalLiabilities)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>

                        {/* Equity */}
                        <Card>
                          <CardHeader className="bg-blue-50 border-b">
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                              <Building className="h-5 w-5" />
                              حقوق الملكية (Equity)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[80px]">الرمز</TableHead>
                                  <TableHead>الحساب</TableHead>
                                  <TableHead className="text-right">المبلغ</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {equitySection?.accounts?.map((account: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                                    <TableCell className="text-sm">{account.accountNameAr || account.accountName}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600">
                                      {formatCurrency(Number(account.balance))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-blue-100 font-bold">
                                  <TableCell colSpan={2}>الإجمالي</TableCell>
                                  <TableCell className="text-right text-blue-700">
                                    {formatCurrency(totalEquity)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Balance Verification */}
                    <Card className={isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {isBalanced ? (
                            <>
                              <CheckCircle className="h-6 w-6 text-green-600" />
                              <div>
                                <p className="font-semibold text-green-900">الميزانية متوازنة ✓</p>
                                <p className="text-sm text-green-700">
                                  الأصول ({formatCurrency(totalAssets)}) = الخصوم + حقوق الملكية ({formatCurrency(totalLiabilitiesAndEquity)})
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-6 w-6 text-red-600" />
                              <div>
                                <p className="font-semibold text-red-900">الميزانية غير متوازنة ✗</p>
                                <p className="text-sm text-red-700">
                                  الفرق: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Building className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">لا توجد بيانات لعرضها</p>
                    <p className="text-sm">قم بإنشاء قيود محاسبية لرؤية قائمة المركز المالي</p>
                  </div>
                )}
              </TabsContent>

              {/* Financial Ratios Tab */}
              <TabsContent value="ratios" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Liquidity Ratios */}
                  <Card>
                    <CardHeader>
                      <CardTitle>نسب السيولة (Liquidity Ratios)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                        <span className="font-medium">نسبة التداول (Current Ratio)</span>
                        <Badge variant={currentRatio >= 2 ? "default" : currentRatio >= 1 ? "secondary" : "destructive"}>
                          {currentRatio.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        نسبة التداول = الأصول المتداولة ÷ الخصوم المتداولة
                        <br />
                        {currentRatio >= 2 ? '✓ ممتاز' : currentRatio >= 1 ? '○ مقبول' : '✗ منخفض'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Leverage Ratios */}
                  <Card>
                    <CardHeader>
                      <CardTitle>نسب الرفع المالي (Leverage Ratios)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                        <span className="font-medium">نسبة الدين إلى حقوق الملكية</span>
                        <Badge variant={debtToEquityRatio <= 1 ? "default" : debtToEquityRatio <= 2 ? "secondary" : "destructive"}>
                          {debtToEquityRatio.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        نسبة الدين = إجمالي الخصوم ÷ حقوق الملكية
                        <br />
                        {debtToEquityRatio <= 1 ? '✓ ممتاز' : debtToEquityRatio <= 2 ? '○ مقبول' : '✗ مرتفع'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Solvency Ratios */}
                  <Card>
                    <CardHeader>
                      <CardTitle>نسب الملاءة (Solvency Ratios)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                        <span className="font-medium">نسبة الدين (Debt Ratio)</span>
                        <Badge variant={debtRatio <= 0.5 ? "default" : debtRatio <= 0.7 ? "secondary" : "destructive"}>
                          {(debtRatio * 100).toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        نسبة الدين = إجمالي الخصوم ÷ إجمالي الأصول
                        <br />
                        {debtRatio <= 0.5 ? '✓ قوي' : debtRatio <= 0.7 ? '○ متوسط' : '✗ ضعيف'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Equity Ratio */}
                  <Card>
                    <CardHeader>
                      <CardTitle>نسبة حقوق الملكية (Equity Ratio)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                        <span className="font-medium">نسبة حقوق الملكية</span>
                        <Badge variant={equityRatio >= 0.5 ? "default" : equityRatio >= 0.3 ? "secondary" : "destructive"}>
                          {(equityRatio * 100).toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        نسبة حقوق الملكية = حقوق الملكية ÷ إجمالي الأصول
                        <br />
                        {equityRatio >= 0.5 ? '✓ قوي' : equityRatio >= 0.3 ? '○ متوسط' : '✗ ضعيف'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Charts Tab */}
              <TabsContent value="charts" className="space-y-6">
                {/* Assets vs Liabilities & Equity Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      مقارنة المكونات الرئيسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="value" name="المبلغ">
                          {comparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Assets Distribution */}
                  {assetsDistribution.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>توزيع الأصول</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={assetsDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${((entry.value / totalAssets) * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {assetsDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Liabilities & Equity Distribution */}
                  {liabilitiesDistribution.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>توزيع الخصوم وحقوق الملكية</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={liabilitiesDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${((entry.value / totalLiabilitiesAndEquity) * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {liabilitiesDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

