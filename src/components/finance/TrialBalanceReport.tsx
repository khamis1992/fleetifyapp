import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { useTrialBalance } from "@/hooks/useGeneralLedger";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function TrialBalanceReport() {
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { data: trialBalanceData, isLoading, error } = useTrialBalance(asOfDate);
  const { formatCurrency } = useCurrencyFormatter();

  // Calculate totals
  const totalDebits = trialBalanceData?.reduce((sum, item) => sum + Number(item.debit_balance || 0), 0) || 0;
  const totalCredits = trialBalanceData?.reduce((sum, item) => sum + Number(item.credit_balance || 0), 0) || 0;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // Export to Excel
  const handleExportExcel = () => {
    if (!trialBalanceData || trialBalanceData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = trialBalanceData.map(item => ({
        'رمز الحساب': item.account_code,
        'اسم الحساب': item.account_name,
        'المستوى': item.account_level,
        'المدين': Number(item.debit_balance || 0),
        'الدائن': Number(item.credit_balance || 0)
      }));

      // Add totals row
      excelData.push({
        'رمز الحساب': '',
        'اسم الحساب': 'الإجمالي',
        'المستوى': '',
        'المدين': totalDebits,
        'الدائن': totalCredits
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // رمز الحساب
        { wch: 40 }, // اسم الحساب
        { wch: 10 }, // المستوى
        { wch: 15 }, // المدين
        { wch: 15 }  // الدائن
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة');

      // Add metadata
      const metadata = XLSX.utils.aoa_to_sheet([
        ['تقرير ميزان المراجعة'],
        ['التاريخ:', asOfDate],
        ['تاريخ الإصدار:', new Date().toLocaleDateString('ar-EG')],
        [''], // Empty row
      ]);
      XLSX.utils.book_append_sheet(wb, metadata, 'معلومات التقرير');

      // Save file
      const fileName = `ميزان_المراجعة_${asOfDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!trialBalanceData || trialBalanceData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Add Arabic font support (using default for now, can be enhanced)
      doc.setFont('helvetica');
      doc.setFontSize(18);

      // Header
      doc.text('Trial Balance Report', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text('ميزان المراجعة', 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`As of Date / كما في: ${asOfDate}`, 105, 32, { align: 'center' });
      doc.text(`Generated / تاريخ الإصدار: ${new Date().toLocaleDateString('en-US')}`, 105, 38, { align: 'center' });

      // Prepare table data
      const tableData = trialBalanceData.map(item => [
        item.account_code,
        item.account_name,
        item.account_level?.toString() || '-',
        formatCurrency(Number(item.debit_balance || 0)),
        formatCurrency(Number(item.credit_balance || 0))
      ]);

      // Add totals row
      tableData.push([
        '',
        'Total / الإجمالي',
        '',
        formatCurrency(totalDebits),
        formatCurrency(totalCredits)
      ]);

      // Generate table
      doc.autoTable({
        startY: 45,
        head: [[
          'Account Code\nرمز الحساب',
          'Account Name\nاسم الحساب',
          'Level\nالمستوى',
          'Debit\nالمدين',
          'Credit\nالدائن'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 70 },
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'right', cellWidth: 35 },
          4: { halign: 'right', cellWidth: 35 }
        },
        footStyles: {
          fillColor: [52, 152, 219],
          textColor: 255,
          fontStyle: 'bold'
        },
        didParseCell: (data: any) => {
          // Highlight totals row
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [46, 204, 113];
            data.cell.styles.textColor = 255;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      // Add balance status
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      
      if (isBalanced) {
        doc.setTextColor(46, 204, 113); // Green
        doc.text('✓ Trial Balance is BALANCED / الميزان متوازن', 105, finalY, { align: 'center' });
      } else {
        doc.setTextColor(231, 76, 60); // Red
        doc.text('✗ Trial Balance is NOT BALANCED / الميزان غير متوازن', 105, finalY, { align: 'center' });
        const difference = Math.abs(totalDebits - totalCredits);
        doc.text(`Difference / الفرق: ${formatCurrency(difference)}`, 105, finalY + 7, { align: 'center' });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        'Generated by FleetifyApp - نظام FleetifyApp',
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );

      // Save PDF
      const fileName = `trial_balance_${asOfDate}.pdf`;
      doc.save(fileName);

      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("حدث خطأ أثناء تصدير التقرير");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!trialBalanceData || trialBalanceData.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      let csvContent = 'ميزان المراجعة - Trial Balance\n';
      csvContent += `كما في - As of Date,${asOfDate}\n`;
      csvContent += `تاريخ الإصدار - Generated,${new Date().toLocaleDateString('ar-EG')}\n\n`;
      
      csvContent += 'رمز الحساب,اسم الحساب,المستوى,المدين,الدائن\n';
      csvContent += 'Account Code,Account Name,Level,Debit,Credit\n';
      
      trialBalanceData.forEach(item => {
        csvContent += `${item.account_code},${item.account_name},${item.account_level || ''},${item.debit_balance || 0},${item.credit_balance || 0}\n`;
      });
      
      csvContent += `\n,,الإجمالي - Total,${totalDebits},${totalCredits}\n`;
      csvContent += `\nالفرق - Difference,${Math.abs(totalDebits - totalCredits)}\n`;
      csvContent += `الحالة - Status,${isBalanced ? 'متوازن - Balanced' : 'غير متوازن - Not Balanced'}\n`;

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `trial_balance_${asOfDate}.csv`);
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
                <FileText className="h-5 w-5" />
                ميزان المراجعة (Trial Balance)
              </CardTitle>
              <CardDescription>
                قائمة بجميع الحسابات وأرصدتها المدينة والدائنة
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                disabled={isLoading || !trialBalanceData || trialBalanceData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={isLoading || !trialBalanceData || trialBalanceData.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={isLoading || !trialBalanceData || trialBalanceData.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
              {trialBalanceData && trialBalanceData.length > 0 && (
                <Badge
                  variant={isBalanced ? "default" : "destructive"}
                  className="h-8"
                >
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

            {/* Trial Balance Table */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : trialBalanceData && trialBalanceData.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-center w-[120px]">رمز الحساب</TableHead>
                      <TableHead className="w-[350px]">اسم الحساب</TableHead>
                      <TableHead className="text-center w-[100px]">المستوى</TableHead>
                      <TableHead className="text-right w-[150px]">المدين</TableHead>
                      <TableHead className="text-right w-[150px]">الدائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalanceData.map((item, index) => (
                      <TableRow 
                        key={index}
                        className={item.account_level && item.account_level <= 2 ? 'font-semibold bg-accent/30' : ''}
                      >
                        <TableCell className="text-center font-mono">
                          {item.account_code}
                        </TableCell>
                        <TableCell className={item.account_level && item.account_level <= 2 ? 'font-bold' : ''}>
                          {item.account_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {item.account_level || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(item.debit_balance || 0) > 0 ? (
                            <span className="text-blue-600">
                              {formatCurrency(Number(item.debit_balance))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(item.credit_balance || 0) > 0 ? (
                            <span className="text-green-600">
                              {formatCurrency(Number(item.credit_balance))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Totals Row */}
                    <TableRow className="bg-primary text-primary-foreground font-bold border-t-2">
                      <TableCell colSpan={3} className="text-center text-lg">
                        الإجمالي (Total)
                      </TableCell>
                      <TableCell className="text-right text-lg">
                        {formatCurrency(totalDebits)}
                      </TableCell>
                      <TableCell className="text-right text-lg">
                        {formatCurrency(totalCredits)}
                      </TableCell>
                    </TableRow>
                    
                    {/* Difference Row (if not balanced) */}
                    {!isBalanced && (
                      <TableRow className="bg-destructive/10 text-destructive font-semibold">
                        <TableCell colSpan={3} className="text-center">
                          الفرق (Difference)
                        </TableCell>
                        <TableCell colSpan={2} className="text-right">
                          {formatCurrency(Math.abs(totalDebits - totalCredits))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg">لا توجد بيانات لعرضها</p>
                <p className="text-sm">قم بإنشاء قيود محاسبية لرؤية ميزان المراجعة</p>
              </div>
            )}

            {/* Balance Status Card */}
            {trialBalanceData && trialBalanceData.length > 0 && (
              <Card className={isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {isBalanced ? (
                      <>
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">الميزان متوازن ✓</p>
                          <p className="text-sm text-green-700">
                            إجمالي المدين ({formatCurrency(totalDebits)}) = إجمالي الدائن ({formatCurrency(totalCredits)})
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="font-semibold text-red-900">الميزان غير متوازن ✗</p>
                          <p className="text-sm text-red-700">
                            الفرق: {formatCurrency(Math.abs(totalDebits - totalCredits))}
                            {' '}(المدين: {formatCurrency(totalDebits)} - الدائن: {formatCurrency(totalCredits)})
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

