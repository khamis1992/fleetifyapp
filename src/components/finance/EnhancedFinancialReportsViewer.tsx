import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useEnhancedFinancialReports } from "@/hooks/useEnhancedFinancialReports";
import { AccountLevelBadge } from "@/components/finance/AccountLevelBadge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export function EnhancedFinancialReportsViewer() {
  const [reportType, setReportType] = useState<string>('income_statement');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const { data: reportData, isLoading, error } = useEnhancedFinancialReports(
    reportType,
    startDate,
    endDate
  );

  const { formatCurrency } = useCurrencyFormatter();

  const handleExportReport = () => {
    if (!reportData) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    // Create CSV content
    let csvContent = `${reportData.titleAr} - ${reportData.title}\n`;
    csvContent += `التاريخ,Date,${endDate}\n\n`;

    reportData.sections.forEach(section => {
      csvContent += `${section.titleAr},${section.title}\n`;
      csvContent += `رمز الحساب,اسم الحساب,المستوى,النوع,الرصيد\n`;
      
      section.accounts.forEach(account => {
        csvContent += `${account.accountCode},${account.accountNameAr || account.accountName},${account.accountLevel},${account.isHeader ? 'رئيسي' : 'فرعي'},${account.balance}\n`;
      });
      
      csvContent += `الإجمالي الفرعي,${section.subtotal}\n\n`;
    });

    // Add totals
    if (reportData.totalDebits !== undefined && reportData.totalCredits !== undefined) {
      csvContent += `إجمالي المدين,${reportData.totalDebits}\n`;
      csvContent += `إجمالي الدائن,${reportData.totalCredits}\n`;
    }
    if (reportData.netIncome !== undefined) {
      csvContent += `صافي الدخل,${reportData.netIncome}\n`;
    }

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportData.titleAr}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("تم تصدير التقرير بنجاح");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ في تحميل التقرير: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            التقارير المالية المحسّنة
          </CardTitle>
          <CardDescription>
            تقارير مالية شاملة مع تطبيق قواعد المحاسبة والهيكل الصحيح للحسابات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">نوع التقرير</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income_statement">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      قائمة الدخل
                    </div>
                  </SelectItem>
                  <SelectItem value="balance_sheet">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      الميزانية العمومية
                    </div>
                  </SelectItem>
                  <SelectItem value="trial_balance">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      ميزان المراجعة
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">من تاريخ</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">إلى تاريخ</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleExportReport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                تصدير CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {reportData.titleAr}
            </CardTitle>
            <div className="text-center text-sm text-muted-foreground">
              كما في تاريخ: {endDate}
            </div>
            
            {/* Accounting Rules Notice */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>قواعد المحاسبة المطبقة:</strong>
                <br />
                • الحسابات الإجمالية (المستوى 1-4) تظهر في التقارير فقط
                <br />
                • الحسابات الفرعية (المستوى 5-6) مسموحة للقيود المحاسبية
                <br />
                • التقرير يعرض الهيكل الصحيح حسب مستويات الحسابات
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent className="space-y-6">
            {reportData.sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-right">
                    {section.titleAr}
                  </h3>
                  <Badge variant="outline">
                    {formatCurrency(section.subtotal)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {section.accounts.map((account, accountIndex) => (
                    <div
                      key={accountIndex}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        account.isHeader 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-sm font-mono text-muted-foreground">
                          {account.accountCode}
                        </div>
                        <div className="flex-1 text-right">
                          <div className="font-medium">
                            {account.accountNameAr || account.accountName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            المستوى {account.accountLevel}
                          </div>
                        </div>
                        <AccountLevelBadge 
                          accountLevel={account.accountLevel} 
                          isHeader={account.isHeader} 
                        />
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(account.balance)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {account.balanceType === 'debit' ? 'مدين' : 'دائن'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <span className="font-semibold">
                    إجمالي {section.titleAr}
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(section.subtotal)}
                  </span>
                </div>
              </div>
            ))}

            {/* Report Totals */}
            <Separator className="my-6" />
            <div className="space-y-3">
              {reportData.totalDebits !== undefined && reportData.totalCredits !== undefined && (
                <>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-green-800">إجمالي المدين</span>
                    <span className="font-bold text-lg text-green-800">
                      {formatCurrency(reportData.totalDebits)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-semibold text-blue-800">إجمالي الدائن</span>
                    <span className="font-bold text-lg text-blue-800">
                      {formatCurrency(reportData.totalCredits)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                    <span className="font-semibold">الفرق</span>
                    <span className={`font-bold text-lg ${
                      Math.abs(reportData.totalDebits - reportData.totalCredits) < 0.001 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(reportData.totalDebits - reportData.totalCredits)}
                    </span>
                  </div>
                </>
              )}

              {reportData.netIncome !== undefined && (
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                  <span className="font-bold text-lg">صافي الدخل</span>
                  <span className={`font-bold text-xl ${
                    reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData.netIncome)}
                  </span>
                </div>
              )}

              {reportData.totalAssets !== undefined && (
                <>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-semibold text-blue-800">إجمالي الأصول</span>
                    <span className="font-bold text-lg text-blue-800">
                      {formatCurrency(reportData.totalAssets)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-semibold text-orange-800">إجمالي الخصوم</span>
                    <span className="font-bold text-lg text-orange-800">
                      {formatCurrency(reportData.totalLiabilities || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-green-800">إجمالي حقوق الملكية</span>
                    <span className="font-bold text-lg text-green-800">
                      {formatCurrency(reportData.totalEquity || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}