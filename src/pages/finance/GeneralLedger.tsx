/**
 * صفحة دفتر الأستاذ العام - تصميم جديد متوافق مع الداشبورد
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountMovementsDialog } from "@/components/finance/AccountMovementsDialog";
import { EnhancedJournalEntriesTab } from "@/components/finance/EnhancedJournalEntriesTab";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
import { StatCard } from "@/components/ui/StatCard";
import { 
  Plus, 
  Calculator, 
  ArrowLeft,
  RefreshCw,
  FileText,
  Layers,
  Scale,
  Building2,
  BarChart3,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
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
import { useChartOfAccounts } from "@/hooks/useFinance";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AuthChecker } from "@/components/auth/AuthChecker";
import { SessionValidator } from "@/components/auth/SessionValidator";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "entries", label: "القيود المحاسبية", icon: FileText },
  { id: "balances", label: "أرصدة الحسابات", icon: Scale },
  { id: "trial", label: "ميزان المراجعة", icon: BarChart3 },
  { id: "costcenters", label: "مراكز التكلفة", icon: Building2 },
  { id: "analysis", label: "التحليل المالي", icon: Activity },
];

export default function GeneralLedger() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { isMobile } = useSimpleBreakpoint();
  
  const [filters, setFilters] = useState<LedgerFilters>({
    status: 'all'
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("entries");
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);

  const { data: journalEntries, isLoading: entriesLoading, refetch: refetchEntries } = useEnhancedJournalEntries(filters);
  const { data: accountBalances, isLoading: balancesLoading } = useAccountBalances();
  const { data: trialBalance, isLoading: trialLoading } = useTrialBalance();
  const { data: financialSummary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: costCenterAnalysis, isLoading: costCenterLoading } = useCostCenterAnalysis(filters);
  
  const { data: accounts } = useChartOfAccounts();
  const { data: costCenters } = useCostCenters();
  
  const postEntry = usePostJournalEntry();
  const reverseEntry = useReverseJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const exportData = useExportLedgerData();

  const stats = useMemo(() => {
    return {
      totalEntries: journalEntries?.length || 0,
      postedEntries: journalEntries?.filter(e => e.status === 'posted').length || 0,
      draftEntries: journalEntries?.filter(e => e.status === 'draft').length || 0,
      reversedEntries: journalEntries?.filter(e => e.status === 'reversed').length || 0,
      totalAccounts: accounts?.length || 0,
      totalCostCenters: costCenters?.length || 0,
    };
  }, [journalEntries, accounts, costCenters]);

  const updateFilters = (newFilters: Partial<LedgerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
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
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
          <p className="text-neutral-500">جاري تحميل دفتر الأستاذ...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionValidator>
      <AuthChecker>
        <div className="p-6" dir="rtl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">دفتر الأستاذ العام</h1>
                <p className="text-sm text-slate-500 mt-1">
                  عرض وإدارة جميع القيود المحاسبية والتقارير المالية
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  قيد جديد
                </Button>
                <Button
                  onClick={() => refetchEntries()}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
                <Button
                  onClick={() => navigate('/finance/accounting')}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  العودة
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="إجمالي القيود"
                value={stats.totalEntries}
                subtitle="All Entries"
                icon={FileText}
                variant="coral"
                delay={0.1}
              />
              <StatCard
                title="القيود المرحّلة"
                value={stats.postedEntries}
                subtitle="Posted Entries"
                icon={CheckCircle}
                variant="emerald"
                trend="up"
                change={`${stats.totalEntries > 0 ? ((stats.postedEntries / stats.totalEntries) * 100).toFixed(0) : 0}%`}
                delay={0.15}
              />
              <StatCard
                title="المسودات"
                value={stats.draftEntries}
                subtitle="Draft Entries"
                icon={Clock}
                variant="amber"
                delay={0.2}
              />
              <StatCard
                title="عدد الحسابات"
                value={stats.totalAccounts}
                subtitle={`${stats.totalCostCenters} مركز تكلفة`}
                icon={Layers}
                variant="violet"
                delay={0.25}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <TabsList className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg px-4 py-2 gap-2 transition-all"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className={isMobile ? "hidden" : ""}>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </motion.div>

              <TabsContent value="entries">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <EnhancedJournalEntriesTab
                    entries={journalEntries || []}
                    filters={filters}
                    isLoading={entriesLoading}
                    onFiltersChange={updateFilters}
                    onPostEntry={handlePostEntry}
                    onReverseEntry={handleReverseEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onExport={(format) => handleExport(format)}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="balances">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-sky-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">أرصدة الحسابات</h3>
                        <p className="text-sm text-slate-500">عرض أرصدة جميع الحسابات مع الحركات المدينة والدائنة</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {balancesLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-4 md:mx-0">
                        <Table className="min-w-[600px]">
                          <TableHeader>
                            <TableRow className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                              <TableHead className="text-right">رمز الحساب</TableHead>
                              <TableHead className="text-right">اسم الحساب</TableHead>
                              <TableHead className="text-center">نوع الحساب</TableHead>
                              <TableHead className="text-center">الرصيد الافتتاحي</TableHead>
                              <TableHead className="text-center text-emerald-700">إجمالي المدين</TableHead>
                              <TableHead className="text-center text-red-700">إجمالي الدائن</TableHead>
                              <TableHead className="text-center font-bold">الرصيد الختامي</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {accountBalances?.map((balance, index) => (
                                <motion.tr
                                  key={balance.account_id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: index * 0.02 }}
                                  className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                                  onClick={() => setSelectedAccount({
                                    id: balance.account_id,
                                    code: balance.account_code,
                                    name: balance.account_name
                                  })}
                                >
                                  <TableCell className="font-mono font-medium">{balance.account_code}</TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{balance.account_name}</div>
                                      {balance.account_name_ar && (
                                        <div className="text-sm text-slate-500">{balance.account_name_ar}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{balance.account_type}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">{formatCurrency(balance.opening_balance)}</TableCell>
                                  <TableCell className="text-center text-emerald-600 font-medium">{formatCurrency(balance.total_debits)}</TableCell>
                                  <TableCell className="text-center text-red-600 font-medium">{formatCurrency(balance.total_credits)}</TableCell>
                                  <TableCell className="text-center font-bold">{formatCurrency(balance.closing_balance)}</TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="trial">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-violet-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">ميزان المراجعة</h3>
                        <p className="text-sm text-slate-500">عرض ميزان المراجعة لجميع الحسابات</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {trialLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-4 md:mx-0">
                        <Table className="min-w-[600px]">
                          <TableHeader>
                            <TableRow className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                              <TableHead className="text-right">رمز الحساب</TableHead>
                              <TableHead className="text-right">اسم الحساب</TableHead>
                              <TableHead className="text-center">نوع الحساب</TableHead>
                              <TableHead className="text-center">المستوى</TableHead>
                              <TableHead className="text-center text-emerald-700">الرصيد المدين</TableHead>
                              <TableHead className="text-center text-red-700">الرصيد الدائن</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {trialBalance?.map((item, index) => (
                                <motion.tr
                                  key={item.account_id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: index * 0.02 }}
                                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                  <TableCell className="font-mono font-medium">{item.account_code}</TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{item.account_name}</div>
                                      {item.account_name_ar && (
                                        <div className="text-sm text-slate-500">{item.account_name_ar}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{item.account_type}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">{item.account_level}</TableCell>
                                  <TableCell className="text-center text-emerald-600 font-medium">
                                    {item.debit_balance > 0 ? formatCurrency(item.debit_balance) : '-'}
                                  </TableCell>
                                  <TableCell className="text-center text-red-600 font-medium">
                                    {item.credit_balance > 0 ? formatCurrency(item.credit_balance) : '-'}
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="costcenters">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">تحليل مراكز التكلفة</h3>
                        <p className="text-sm text-slate-500">عرض وتحليل الأداء المالي لمراكز التكلفة</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {costCenterLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-4 md:mx-0">
                        <Table className="min-w-[600px]">
                          <TableHeader>
                            <TableRow className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                              <TableHead className="text-right">رمز المركز</TableHead>
                              <TableHead className="text-right">اسم المركز</TableHead>
                              <TableHead className="text-center text-emerald-700">إجمالي المدين</TableHead>
                              <TableHead className="text-center text-red-700">إجمالي الدائن</TableHead>
                              <TableHead className="text-center">صافي المبلغ</TableHead>
                              <TableHead className="text-center">عدد القيود</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {costCenterAnalysis?.map((center, index) => (
                                <motion.tr
                                  key={center.cost_center_id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: index * 0.02 }}
                                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                  <TableCell className="font-mono font-medium">{center.center_code}</TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{center.center_name}</div>
                                      {center.center_name_ar && (
                                        <div className="text-sm text-slate-500">{center.center_name_ar}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center text-emerald-600 font-medium">{formatCurrency(center.total_debits)}</TableCell>
                                  <TableCell className="text-center text-red-600 font-medium">{formatCurrency(center.total_credits)}</TableCell>
                                  <TableCell className={cn(
                                    "text-center font-bold",
                                    center.net_amount >= 0 ? "text-emerald-600" : "text-red-600"
                                  )}>
                                    {formatCurrency(center.net_amount)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="secondary">{center.entry_count}</Badge>
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="analysis">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-rose-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">الملخص المالي</h3>
                        <p className="text-sm text-slate-500">نظرة عامة على الوضع المالي</p>
                      </div>
                    </div>
                    
                    {summaryLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : financialSummary ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-slate-600">إجمالي الأصول</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(financialSummary.total_assets)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-slate-600">إجمالي الالتزامات</span>
                          <span className="font-bold text-red-600">{formatCurrency(financialSummary.total_liabilities)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-slate-600">حقوق الملكية</span>
                          <span className="font-bold">{formatCurrency(financialSummary.total_equity)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-slate-600">إجمالي الإيرادات</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(financialSummary.total_revenue)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-slate-600">إجمالي المصروفات</span>
                          <span className="font-bold text-red-600">{formatCurrency(financialSummary.total_expenses)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="font-medium text-slate-700">صافي الدخل</span>
                          <span className={cn(
                            "text-xl font-bold",
                            financialSummary.net_income >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {formatCurrency(financialSummary.net_income)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-sky-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">إحصائيات أخرى</h3>
                        <p className="text-sm text-slate-500">معلومات إضافية عن النظام</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-600">إجمالي القيود</span>
                        <span className="font-bold">{stats.totalEntries}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                        <span className="text-slate-600">القيود المرحّلة</span>
                        <span className="font-bold text-emerald-600">{stats.postedEntries}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
                        <span className="text-slate-600">المسودات</span>
                        <span className="font-bold text-amber-600">{stats.draftEntries}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                        <span className="text-slate-600">القيود الملغية</span>
                        <span className="font-bold text-red-600">{stats.reversedEntries}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-600">عدد الحسابات</span>
                        <span className="font-bold">{stats.totalAccounts}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-600">مراكز التكلفة</span>
                        <span className="font-bold">{stats.totalCostCenters}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>

            <JournalEntryForm 
              open={isCreateDialogOpen} 
              onOpenChange={setIsCreateDialogOpen}
              onSuccess={() => {
                setIsCreateDialogOpen(false);
              }}
            />

            <AccountMovementsDialog
              open={!!selectedAccount}
              onOpenChange={(open) => !open && setSelectedAccount(null)}
              accountId={selectedAccount?.id || ''}
              accountCode={selectedAccount?.code || ''}
              accountName={selectedAccount?.name || ''}
            />
          </div>
        </div>
      </AuthChecker>
    </SessionValidator>
  );
}