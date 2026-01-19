import { useState } from 'react';
import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  TrendingUp, 
  BarChart3,
  Download,
  Printer
} from 'lucide-react';
import { HelpIcon } from '@/components/help/HelpIcon';
import { BalanceSheet } from '@/components/finance/reports/BalanceSheet';
import { IncomeStatement } from '@/components/finance/reports/IncomeStatement';
import { CashFlowStatement } from '@/components/finance/reports/CashFlowStatement';
import { FinancialRatios } from '@/components/finance/reports/FinancialRatios';
import { InvoiceJournalLinkingReport } from '@/components/finance/InvoiceJournalLinkingReport';

const UnifiedReports = () => {
  const [activeTab, setActiveTab] = useState('balance-sheet');

  return (
    <ProtectedFinanceRoute 
      permission="finance.view"
      title="التقارير المالية"
    >
      <FinanceErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
        title="خطأ في التقارير المالية"
        context="التقارير المالية"
      >
        <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
                <FileText className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-3xl font-bold">التقارير المالية</h1>
                  <HelpIcon topic="financialReports" />
                </div>
                <p className="text-sm text-muted-foreground">التقارير المالية الأساسية والتحليلات المتقدمة</p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">طباعة</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">تصدير PDF</span>
              </Button>
            </div>
          </div>

          {/* Main Reports Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full overflow-x-auto pb-1 md:grid md:grid-cols-5">
              <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                الميزانية العمومية
              </TabsTrigger>
              <TabsTrigger value="income-statement" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                قائمة الدخل
              </TabsTrigger>
              <TabsTrigger value="cash-flow" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                التدفقات النقدية
              </TabsTrigger>
              <TabsTrigger value="ratios" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                النسب المالية
              </TabsTrigger>
              <TabsTrigger value="invoice-journal" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ربط الفواتير
              </TabsTrigger>
            </TabsList>

            {/* Balance Sheet */}
            <TabsContent value="balance-sheet" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    الميزانية العمومية
                    <HelpIcon topic="balanceSheet" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BalanceSheet />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Income Statement */}
            <TabsContent value="income-statement" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    قائمة الدخل
                    <HelpIcon topic="incomeStatement" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IncomeStatement />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cash Flow Statement */}
            <TabsContent value="cash-flow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    قائمة التدفقات النقدية
                    <HelpIcon topic="cashFlow" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CashFlowStatement />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Ratios */}
            <TabsContent value="ratios" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    النسب المالية
                    <HelpIcon topic="financialRatios" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FinancialRatios />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoice-Journal Linking */}
            <TabsContent value="invoice-journal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    ربط الفواتير بالقيود
                    <HelpIcon topic="invoiceJournal" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InvoiceJournalLinkingReport />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </FinanceErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default UnifiedReports;
