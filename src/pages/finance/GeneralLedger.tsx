import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountMovementsDialog } from "@/components/finance/AccountMovementsDialog";
import { DetailedJournalEntryView } from "@/components/finance/DetailedJournalEntryView";
import { BookOpen, Search, Filter, Download, Eye, FileText, TrendingUp, TrendingDown, Plus, Calculator, BarChart3, Target, Users, Calendar, AlertCircle } from "lucide-react";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { 
  useEnhancedJournalEntries, 
  useAccountBalances, 
  useTrialBalance, 
  useFinancialSummary, 
  useCostCenterAnalysis,
  usePostJournalEntry,
  useReverseJournalEntry,
  useDeleteJournalEntry,
  useExportLedgerData,
  type LedgerFilters 
} from "@/hooks/useGeneralLedger";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinance";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { JournalVoucherDisplay } from "@/components/finance/JournalVoucherDisplay";
import { ChartOfAccountsErrorBoundary } from "@/components/finance/ChartOfAccountsErrorBoundary";
import { AuthChecker } from "@/components/auth/AuthChecker";
import { SessionValidator } from "@/components/auth/SessionValidator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Ledger() {
  const { isMobile } = useSimpleBreakpoint();
  const layout = useAdaptiveLayout({
    mobileViewMode: 'stack',
    touchTargetSize: 'large'
  });
  
  const [filters, setFilters] = useState<LedgerFilters>({
    status: 'all'
  });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("entries");
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);

  // Enhanced hooks
  const { data: journalEntries, isLoading: entriesLoading, error: entriesError, refetch: refetchEntries } = useEnhancedJournalEntries(filters);
  const { data: accountBalances, isLoading: balancesLoading } = useAccountBalances();
  const { data: trialBalance, isLoading: trialLoading } = useTrialBalance();
  const { data: financialSummary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: costCenterAnalysis, isLoading: costCenterLoading } = useCostCenterAnalysis(filters);
  
  // Reference data
  const { data: accounts, error: accountsError, refetch: refetchAccounts } = useChartOfAccounts();
  const { data: costCenters } = useCostCenters();
  
  // Actions
  const postEntry = usePostJournalEntry();
  const reverseEntry = useReverseJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const exportData = useExportLedgerData();

  const updateFilters = (newFilters: Partial<LedgerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'posted': return 'default';
      case 'draft': return 'secondary';
      case 'reversed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted': return 'مرحل';
      case 'draft': return 'مسودة';
      case 'reversed': return 'ملغي';
      default: return status;
    }
  };

  const handlePostEntry = async (entryId: string) => {
    try {
      await postEntry.mutateAsync(entryId);
    } catch (error) {
      console.error('Error posting entry:', error);
    }
  };

  const handleReverseEntry = async (entryId: string) => {
    try {
      await reverseEntry.mutateAsync({ entryId, reason: 'Manual reversal' });
    } catch (error) {
      console.error('Error reversing entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry.mutateAsync(entryId);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      await exportData.mutateAsync({ format, filters });
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (entriesLoading && summaryLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <SessionValidator>
      <AuthChecker>
        <div className={`space-y-6 ${layout.containerPadding}`} dir="rtl">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>دفتر الأستاذ العام</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-start'}`}>
        <div className={isMobile ? 'text-center' : ''}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>دفتر الأستاذ العام</h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            عرض وإدارة جميع القيود المحاسبية والتقارير المالية المتقدمة
          </p>
        </div>
        <div className={`flex ${isMobile ? 'justify-center' : 'space-x-2'}`}>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            size={isMobile ? "lg" : "default"}
            className={isMobile ? "h-12 px-6 text-base" : ""}
          >
            <Plus className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
            قيد جديد
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      {financialSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الأصول</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {financialSummary.total_assets.toFixed(3)} د.ك
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الالتزامات</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {financialSummary.total_liabilities.toFixed(3)} د.ك
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">صافي الدخل</CardTitle>
              <Calculator className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {financialSummary.net_income.toFixed(3)} د.ك
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">القيود غير المتوازنة</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {financialSummary.unbalanced_entries_count}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-1 h-auto p-1' : 'grid-cols-5'}`}>
          {isMobile ? (
            <>
              <TabsTrigger value="entries" className="text-xs p-2">القيود</TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs p-2">التحليل</TabsTrigger>
              <TabsTrigger value="costcenters" className="text-xs p-2">المراكز</TabsTrigger>
              <TabsTrigger value="trial" className="text-xs p-2">الميزان</TabsTrigger>
              <TabsTrigger value="balances" className="text-xs p-2">الأرصدة</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="entries">القيود المحاسبية</TabsTrigger>
              <TabsTrigger value="analysis">التحليل المالي</TabsTrigger>
              <TabsTrigger value="costcenters">مراكز التكلفة</TabsTrigger>
              <TabsTrigger value="trial">ميزان المراجعة</TabsTrigger>
              <TabsTrigger value="balances">أرصدة الحسابات</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Journal Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className={`flex flex-col ${isMobile ? 'space-y-4' : 'items-end space-y-4'}`}>
                <div className={isMobile ? 'text-center' : 'text-right'}>
                  <CardTitle className={isMobile ? 'text-lg' : ''}>القيود المحاسبية</CardTitle>
                  <CardDescription className={isMobile ? 'text-sm' : ''}>قائمة جميع القيود المحاسبية مع إمكانيات البحث والتصفية المتقدمة</CardDescription>
                </div>
                <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center space-x-2'}`}>
                  <div className={`relative flex items-center ${isMobile ? 'w-full' : ''}`}>
                    <Search className="absolute right-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في القيود..."
                      value={filters.searchTerm || ''}
                      onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                      className={`${isMobile ? 'w-full pl-3 pr-10 h-11' : 'w-64'}`}
                    />
                  </div>
                  <div className={`flex ${isMobile ? 'grid grid-cols-2 gap-2' : 'space-x-2'}`}>
                    <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value })}>
                      <SelectTrigger className={isMobile ? 'h-11' : 'w-40'}>
                        <SelectValue placeholder="تصفية بالحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="posted">مرحل</SelectItem>
                        <SelectItem value="reversed">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      placeholder="من تاريخ"
                      value={filters.dateFrom || ''}
                      onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                      className={isMobile ? 'h-11' : 'w-40'}
                    />
                  </div>
                  {isMobile && (
                    <Input
                      type="date"
                      placeholder="إلى تاريخ"
                      value={filters.dateTo || ''}
                      onChange={(e) => updateFilters({ dateTo: e.target.value })}
                      className="h-11"
                    />
                  )}
                  {!isMobile && (
                    <Input
                      type="date"
                      placeholder="إلى تاريخ"
                      value={filters.dateTo || ''}
                      onChange={(e) => updateFilters({ dateTo: e.target.value })}
                      className="w-40"
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartOfAccountsErrorBoundary
                error={entriesError}
                isLoading={entriesLoading}
                onRetry={() => refetchEntries()}
              >
                {entriesLoading ? (
                  <LoadingSpinner />
                ) : (
                <div className="space-y-6">
                  {journalEntries?.map((entry) => (
                    <Card key={entry.id} className="border-l-4 border-l-primary">
                      {/* Header */}
                      <CardHeader className="bg-muted/30 pb-3">
                        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-start'}`}>
                          <div className={`flex ${isMobile ? 'flex-wrap gap-2 justify-center' : 'space-x-1'}`}>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size={isMobile ? "default" : "sm"}
                                  className={isMobile ? "h-10 px-4 text-sm" : ""}
                                >
                                  <Eye className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                                  {isMobile ? '' : 'معاينة'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-6xl max-h-[90vh]'} overflow-y-auto`}>
                                <DialogHeader>
                                  <DialogTitle className={isMobile ? 'text-base' : ''}>عرض القيد المحاسبي - النمط التقليدي</DialogTitle>
                                </DialogHeader>
                                <DetailedJournalEntryView entry={entry} />
                              </DialogContent>
                            </Dialog>
                            {entry.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size={isMobile ? "default" : "sm"}
                                onClick={() => handlePostEntry(entry.id)}
                                disabled={postEntry.isPending}
                                className={isMobile ? "h-10 px-4 text-sm" : ""}
                              >
                                ترحيل
                              </Button>
                            )}
                            {entry.status === 'posted' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size={isMobile ? "default" : "sm"}
                                    className={isMobile ? "h-10 px-4 text-sm" : ""}
                                  >
                                    عكس
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className={isMobile ? 'max-w-[95vw]' : ''}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className={isMobile ? 'text-base' : ''}>تأكيد عكس القيد</AlertDialogTitle>
                                    <AlertDialogDescription className={isMobile ? 'text-sm' : ''}>
                                      هل أنت متأكد من رغبتك في عكس هذا القيد؟ هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                                    <AlertDialogCancel className={isMobile ? 'w-full' : ''}>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleReverseEntry(entry.id)}
                                      disabled={reverseEntry.isPending}
                                      className={isMobile ? 'w-full' : ''}
                                    >
                                      تأكيد العكس
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {entry.status === 'draft' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size={isMobile ? "default" : "sm"} 
                                    className={`text-red-600 hover:text-red-700 ${isMobile ? 'h-10 px-4 text-sm' : ''}`}
                                  >
                                    حذف
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className={isMobile ? 'max-w-[95vw]' : ''}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className={isMobile ? 'text-base' : ''}>تأكيد حذف القيد</AlertDialogTitle>
                                    <AlertDialogDescription className={isMobile ? 'text-sm' : ''}>
                                      هل أنت متأكد من رغبتك في حذف هذا القيد نهائياً؟ هذا الإجراء لا يمكن التراجع عنه. يمكن حذف المسودات فقط.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                                    <AlertDialogCancel className={isMobile ? 'w-full' : ''}>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      disabled={deleteEntry.isPending}
                                      className={`bg-red-600 hover:bg-red-700 ${isMobile ? 'w-full' : ''}`}
                                    >
                                      تأكيد الحذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor(entry.status)}>
                                  {getStatusLabel(entry.status)}
                                </Badge>
                                {entry.reference_type && (
                                  <Badge variant="outline">{entry.reference_type}</Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-lg font-semibold">{entry.entry_number}</span>
                                <h3 className="text-lg font-semibold">سند قيد رقم</h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>التاريخ: {new Date(entry.entry_date).toLocaleDateString('en-GB')}</span>
                              </div>
                              <div>إجمالي الدائن: {entry.total_credit.toFixed(3)} د.ك</div>
                              <div>إجمالي المدين: {entry.total_debit.toFixed(3)} د.ك</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      {/* الوصف */}
                      {entry.description && (
                        <div className="px-6 py-3 bg-slate-50 border-b">
                          <div className="text-sm text-muted-foreground mb-1">البيان:</div>
                          <div className="text-sm">{entry.description}</div>
                        </div>
                      )}

                      {/* جدول القيود */}
                      <CardContent className="p-0">
                        {isMobile ? (
                          <div className="space-y-3 p-4">
                            {entry.journal_entry_lines?.map((line, index) => (
                              <div key={index} className="border rounded-lg p-3 bg-slate-50">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-sm font-mono">{line.chart_of_accounts?.account_code || '-'}</div>
                                  <div className="text-right">
                                    <div className="font-medium text-sm">
                                      {line.chart_of_accounts?.account_name_ar || line.chart_of_accounts?.account_name}
                                    </div>
                                  </div>
                                </div>
                                {line.line_description && (
                                  <div className="text-sm text-muted-foreground mb-2 text-right">
                                    {line.line_description}
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <div className="flex gap-4">
                                    <div className="text-center">
                                      <div className="text-xs text-green-700 font-medium">مدين</div>
                                      <div className="text-sm font-semibold text-green-700">
                                        {line.debit_amount > 0 ? line.debit_amount.toFixed(3) : '-'}
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-red-700 font-medium">دائن</div>
                                      <div className="text-sm font-semibold text-red-700">
                                        {line.credit_amount > 0 ? line.credit_amount.toFixed(3) : '-'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="border-t-2 pt-3 mt-4 bg-slate-100 p-3 rounded-lg">
                              <div className="flex justify-between items-center font-bold">
                                <div className="flex gap-6">
                                  <div className="text-center">
                                    <div className="text-xs text-green-700">إجمالي المدين</div>
                                    <div className="text-green-700">{entry.total_debit.toFixed(3)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-red-700">إجمالي الدائن</div>
                                    <div className="text-red-700">{entry.total_credit.toFixed(3)}</div>
                                  </div>
                                </div>
                                <div className="text-sm">المجموع</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-100">
                                <TableHead className="text-center font-semibold text-red-700">دائن</TableHead>
                                <TableHead className="text-center font-semibold text-green-700">مدين</TableHead>
                                <TableHead className="text-center font-semibold">البيان</TableHead>
                                <TableHead className="text-center font-semibold">اسم الحساب</TableHead>
                                <TableHead className="text-center font-semibold">رمز الحساب</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.journal_entry_lines?.map((line, index) => (
                                <TableRow key={index} className="hover:bg-slate-50">
                                  <TableCell className="text-center">
                                    {line.credit_amount > 0 ? (
                                      <span className="text-red-700 font-semibold">
                                        {line.credit_amount.toFixed(3)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {line.debit_amount > 0 ? (
                                      <span className="text-green-700 font-semibold">
                                        {line.debit_amount.toFixed(3)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {line.line_description || '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {line.chart_of_accounts?.account_name_ar || line.chart_of_accounts?.account_name}
                                  </TableCell>
                                  <TableCell className="text-center font-mono text-sm">
                                    {line.chart_of_accounts?.account_code || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableHeader>
                              <TableRow className="bg-slate-200 border-t-2 border-slate-300">
                                <TableHead className="text-center font-bold text-red-700">
                                  {entry.total_credit.toFixed(3)}
                                </TableHead>
                                <TableHead className="text-center font-bold text-green-700">
                                  {entry.total_debit.toFixed(3)}
                                </TableHead>
                                <TableHead colSpan={3} className="text-center font-bold">
                                  المجموع
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                )}
              </ChartOfAccountsErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Balances Tab */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>أرصدة الحسابات</CardTitle>
              <CardDescription>عرض أرصدة جميع الحسابات مع الحركات المدينة والدائنة</CardDescription>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <LoadingSpinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرصيد الختامي</TableHead>
                      <TableHead>إجمالي الدائن</TableHead>
                      <TableHead>إجمالي المدين</TableHead>
                      <TableHead>الرصيد الافتتاحي</TableHead>
                      <TableHead>نوع الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead>رمز الحساب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountBalances?.map((balance) => (
                      <TableRow 
                        key={balance.account_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAccount({
                          id: balance.account_id,
                          code: balance.account_code,
                          name: balance.account_name
                        })}
                      >
                        <TableCell className="font-medium">{balance.closing_balance.toFixed(3)} د.ك</TableCell>
                        <TableCell className="text-red-600">{balance.total_credits.toFixed(3)} د.ك</TableCell>
                        <TableCell className="text-green-600">{balance.total_debits.toFixed(3)} د.ك</TableCell>
                        <TableCell>{balance.opening_balance.toFixed(3)} د.ك</TableCell>
                        <TableCell>
                          <Badge variant="outline">{balance.account_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{balance.account_name}</div>
                            {balance.account_name_ar && (
                              <div className="text-sm text-muted-foreground">{balance.account_name_ar}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{balance.account_code}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance Tab */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <CardTitle>ميزان المراجعة</CardTitle>
              <CardDescription>عرض ميزان المراجعة لجميع الحسابات</CardDescription>
            </CardHeader>
            <CardContent>
              {trialLoading ? (
                <LoadingSpinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرصيد الدائن</TableHead>
                      <TableHead>الرصيد المدين</TableHead>
                      <TableHead>المستوى</TableHead>
                      <TableHead>نوع الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead>رمز الحساب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance?.map((item) => (
                      <TableRow key={item.account_id}>
                        <TableCell className="text-red-600 font-medium">
                          {item.credit_balance > 0 ? `${item.credit_balance.toFixed(3)} د.ك` : '-'}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {item.debit_balance > 0 ? `${item.debit_balance.toFixed(3)} د.ك` : '-'}
                        </TableCell>
                        <TableCell>{item.account_level}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.account_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{item.account_name}</div>
                            {item.account_name_ar && (
                              <div className="text-sm text-muted-foreground">{item.account_name_ar}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.account_code}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="costcenters">
          <Card>
            <CardHeader>
              <CardTitle>تحليل مراكز التكلفة</CardTitle>
              <CardDescription>عرض وتحليل الأداء المالي لمراكز التكلفة</CardDescription>
            </CardHeader>
            <CardContent>
              {costCenterLoading ? (
                <LoadingSpinner />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عدد القيود</TableHead>
                      <TableHead>صافي المبلغ</TableHead>
                      <TableHead>إجمالي الدائن</TableHead>
                      <TableHead>إجمالي المدين</TableHead>
                      <TableHead>اسم المركز</TableHead>
                      <TableHead>رمز المركز</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterAnalysis?.map((center) => (
                      <TableRow key={center.cost_center_id}>
                        <TableCell>{center.entry_count}</TableCell>
                        <TableCell className={center.net_amount >= 0 ? "text-green-600" : "text-red-600"}>
                          {center.net_amount.toFixed(3)} د.ك
                        </TableCell>
                        <TableCell className="text-red-600">{center.total_credits.toFixed(3)} د.ك</TableCell>
                        <TableCell className="text-green-600">{center.total_debits.toFixed(3)} د.ك</TableCell>
                        <TableCell>
                          <div>
                            <div>{center.center_name}</div>
                            {center.center_name_ar && (
                              <div className="text-sm text-muted-foreground">{center.center_name_ar}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{center.center_code}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>الملخص المالي</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <LoadingSpinner />
                ) : financialSummary ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>إجمالي الأصول:</span>
                      <span className="font-medium">{financialSummary.total_assets.toFixed(3)} د.ك</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الالتزامات:</span>
                      <span className="font-medium">{financialSummary.total_liabilities.toFixed(3)} د.ك</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي حقوق الملكية:</span>
                      <span className="font-medium">{financialSummary.total_equity.toFixed(3)} د.ك</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الإيرادات:</span>
                      <span className="font-medium text-green-600">{financialSummary.total_revenue.toFixed(3)} د.ك</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي المصروفات:</span>
                      <span className="font-medium text-red-600">{financialSummary.total_expenses.toFixed(3)} د.ك</span>
                    </div>
                    <div className="flex justify-between border-t pt-4">
                      <span className="font-bold">صافي الدخل:</span>
                      <span className={`font-bold ${financialSummary.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {financialSummary.net_income.toFixed(3)} د.ك
                      </span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إحصائيات أخرى</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>إجمالي القيود:</span>
                    <span className="font-medium">{journalEntries?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>القيود المرحلة:</span>
                    <span className="font-medium text-green-600">
                      {journalEntries?.filter(e => e.status === 'posted').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>المسودات:</span>
                    <span className="font-medium text-yellow-600">
                      {journalEntries?.filter(e => e.status === 'draft').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>القيود الملغية:</span>
                    <span className="font-medium text-red-600">
                      {journalEntries?.filter(e => e.status === 'reversed').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>عدد الحسابات:</span>
                    <span className="font-medium">{accounts?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>عدد مراكز التكلفة:</span>
                    <span className="font-medium">{costCenters?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Entry Details Dialog */}
      {selectedEntryId && (
        <Dialog open={!!selectedEntryId} onOpenChange={() => setSelectedEntryId(null)}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>تفاصيل القيد المحاسبي</DialogTitle>
              <DialogDescription>
                عرض تفاصيل بنود القيد المحاسبي المحدد بالتفصيل
              </DialogDescription>
            </DialogHeader>
            {journalEntries?.find(e => e.id === selectedEntryId) && (
              <DetailedJournalEntryView 
                entry={journalEntries.find(e => e.id === selectedEntryId)!} 
                showAsCard={false}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Journal Entry Form with built-in dialog */}
      <JournalEntryForm 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          // The data will be refreshed automatically by the query hooks
        }}
      />

      {/* Account Movements Dialog */}
      <AccountMovementsDialog
        open={!!selectedAccount}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
        accountId={selectedAccount?.id || ''}
        accountCode={selectedAccount?.code || ''}
        accountName={selectedAccount?.name || ''}
      />
        </div>
      </AuthChecker>
    </SessionValidator>
  );
}
