import { type CSSProperties, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountMovementsDialog } from "@/components/finance/AccountMovementsDialog";
import { EnhancedJournalEntriesTab } from "@/components/finance/EnhancedJournalEntriesTab";
import { JournalEntryForm } from "@/components/finance/JournalEntryForm";
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
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";

const ledgerTheme = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const ledgerStyle = {
  "--gl-text": ledgerTheme.text,
  "--gl-surface": ledgerTheme.surface,
  "--gl-inner": ledgerTheme.inner,
  "--gl-muted": ledgerTheme.muted,
  "--gl-border": ledgerTheme.border,
  "--gl-info": ledgerTheme.info,
  "--gl-alert": ledgerTheme.alert,
  "--gl-focus": ledgerTheme.focus,
  "--gl-success": ledgerTheme.success,
} as CSSProperties;

const TABS = [
  { id: "entries", label: "القيود", helper: "Journal", icon: FileText, accent: ledgerTheme.alert },
  { id: "balances", label: "أرصدة الحسابات", helper: "Balances", icon: Scale, accent: ledgerTheme.success },
  { id: "trial", label: "ميزان المراجعة", helper: "Trial", icon: BarChart3, accent: ledgerTheme.focus },
  { id: "costcenters", label: "مراكز التكلفة", helper: "Cost centers", icon: Building2, accent: ledgerTheme.info },
  { id: "analysis", label: "التحليل المالي", helper: "Analysis", icon: Activity, accent: ledgerTheme.success },
];

interface LedgerMetricProps {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  accent: string;
}

const LedgerMetric = ({ label, value, helper, icon: Icon, accent }: LedgerMetricProps) => (
  <div className="general-ledger-metric">
    <div className="flex items-start justify-between gap-3">
      <span className="general-ledger-metric-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-black" style={{ color: ledgerTheme.muted }}>
        {helper}
      </span>
    </div>
    <p>{label}</p>
    <strong>{value}</strong>
  </div>
);

const getAccountTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    assets: "الأصول",
    asset: "الأصول",
    liabilities: "الخصوم",
    liability: "الخصوم",
    equity: "حقوق الملكية",
    revenue: "الإيرادات",
    expenses: "المصروفات",
    expense: "المصروفات",
  };
  return labels[type || ""] || type || "-";
};

const accountTypeTone = (type?: string) => {
  if (type === "assets" || type === "asset") return "tone-success";
  if (type === "liabilities" || type === "liability" || type === "expenses" || type === "expense") return "tone-alert";
  if (type === "equity") return "tone-info";
  if (type === "revenue") return "tone-focus";
  return "tone-muted";
};

export default function GeneralLedger() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const formatQar = (amount: number) => formatCurrency(amount || 0, { currency: "QAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const trialItems = trialBalance || [];
    const totalDebitBalance = trialItems.reduce((sum, item) => sum + (item.debit_balance || 0), 0);
    const totalCreditBalance = trialItems.reduce((sum, item) => sum + (item.credit_balance || 0), 0);

    return {
      totalEntries: journalEntries?.length || 0,
      postedEntries: journalEntries?.filter(e => e.status === 'posted').length || 0,
      draftEntries: journalEntries?.filter(e => e.status === 'draft').length || 0,
      reversedEntries: journalEntries?.filter(e => e.status === 'reversed').length || 0,
      totalAccounts: accounts?.length || 0,
      totalCostCenters: costCenters?.length || 0,
      trialDifference: Math.abs(totalDebitBalance - totalCreditBalance),
      totalDebitBalance,
      totalCreditBalance,
    };
  }, [journalEntries, accounts, costCenters, trialBalance]);

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
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-[#22C7A1]" />
          <p className="text-[#94A3B8]">جاري تحميل دفتر الأستاذ...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionValidator>
      <AuthChecker>
        <div className="general-ledger-page" dir="rtl" style={ledgerStyle}>
          <div className="space-y-5">
            <motion.section
              className="general-ledger-command"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-3">
                  <span className="general-ledger-command-icon">
                    <Calculator className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-normal" style={{ color: ledgerTheme.success }}>
                      General ledger
                    </p>
                    <h1 className="mt-1 text-2xl font-black tracking-normal" style={{ color: ledgerTheme.text }}>
                      دفتر الأستاذ العام
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: ledgerTheme.muted }}>
                      مركز متابعة القيود، أرصدة الحسابات، ميزان المراجعة، ومراكز التكلفة من شاشة واحدة قابلة للمراجعة السريعة.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="general-ledger-primary">
                    <Plus className="h-4 w-4 ml-2" aria-hidden="true" />
                    قيد جديد
                  </Button>
                  <Button onClick={() => refetchEntries()} variant="outline" size="sm" className="general-ledger-outline">
                    <RefreshCw className="h-4 w-4 ml-2" aria-hidden="true" />
                    تحديث
                  </Button>
                  <Button onClick={() => navigate('/finance/accounting')} variant="outline" size="sm" className="general-ledger-outline">
                    <ArrowLeft className="h-4 w-4 ml-2" aria-hidden="true" />
                    العودة
                  </Button>
                </div>
              </div>

              <div className="general-ledger-metrics">
                <LedgerMetric
                  label="إجمالي القيود"
                  value={stats.totalEntries}
                  helper="All entries"
                  icon={FileText}
                  accent={ledgerTheme.alert}
                />
                <LedgerMetric
                  label="القيود المرحّلة"
                  value={stats.postedEntries}
                  helper={`${stats.draftEntries} مسودة`}
                  icon={CheckCircle}
                  accent={ledgerTheme.success}
                />
                <LedgerMetric
                  label="عدد الحسابات"
                  value={stats.totalAccounts}
                  helper={`${stats.totalCostCenters} مركز تكلفة`}
                  icon={Layers}
                  accent={ledgerTheme.info}
                />
                <LedgerMetric
                  label="فرق ميزان المراجعة"
                  value={formatQar(stats.trialDifference)}
                  helper={stats.trialDifference === 0 ? "متوازن" : "تحتاج مراجعة"}
                  icon={Scale}
                  accent={stats.trialDifference === 0 ? ledgerTheme.success : ledgerTheme.alert}
                />
              </div>
            </motion.section>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="general-ledger-workspace">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <TabsList className="general-ledger-tabs">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      style={{ "--tab-accent": tab.accent } as CSSProperties}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className={isMobile ? "hidden" : ""}>{tab.label}</span>
                      {!isMobile && <small>{tab.helper}</small>}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </motion.div>

              <TabsContent value="entries">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="general-ledger-panel"
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
                  className="general-ledger-panel"
                >
                  <div className="general-ledger-panel-header">
                    <span className="general-ledger-panel-icon tone-success">
                      <Scale className="h-5 w-5" />
                    </span>
                    <div>
                      <h3>أرصدة الحسابات</h3>
                      <p>عرض أرصدة جميع الحسابات مع الحركات المدينة والدائنة</p>
                    </div>
                  </div>
                  <div className="p-4">
                    {balancesLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                       <div className="overflow-x-auto">
                         <Table className="min-w-[760px]" aria-label="دفتر الأستاذ - أرصدة الحسابات">
                           <TableHeader>
                             <TableRow>
                               <TableHead className="text-right" scope="col">رمز الحساب</TableHead>
                               <TableHead className="text-right" scope="col">اسم الحساب</TableHead>
                               <TableHead className="text-center" scope="col">نوع الحساب</TableHead>
                               <TableHead className="text-center" scope="col">الرصيد الافتتاحي</TableHead>
                               <TableHead className="text-center text-[#22C7A1]" scope="col">إجمالي المدين</TableHead>
                               <TableHead className="text-center text-[#FB6B7A]" scope="col">إجمالي الدائن</TableHead>
                               <TableHead className="text-center font-bold" scope="col">الرصيد الختامي</TableHead>
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
                                  transition={{ delay: Math.min(index * 0.015, 0.18) }}
                                  className="cursor-pointer"
                                  onClick={() => setSelectedAccount({
                                    id: balance.account_id,
                                    code: balance.account_code,
                                    name: balance.account_name
                                  })}
                                >
                                  <TableCell className="font-mono font-black">{balance.account_code}</TableCell>
                                  <TableCell>
                                    <div className="font-black">{balance.account_name}</div>
                                    {balance.account_name_ar && (
                                      <div className="text-xs" style={{ color: ledgerTheme.muted }}>{balance.account_name_ar}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={`general-ledger-badge ${accountTypeTone(balance.account_type)}`}>
                                      {getAccountTypeLabel(balance.account_type)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">{formatQar(balance.opening_balance)}</TableCell>
                                  <TableCell className="text-center font-black text-[#22C7A1]">{formatQar(balance.total_debits)}</TableCell>
                                  <TableCell className="text-center font-black text-[#FB6B7A]">{formatQar(balance.total_credits)}</TableCell>
                                  <TableCell className="text-center font-black">{formatQar(balance.closing_balance)}</TableCell>
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
                  className="general-ledger-panel"
                >
                  <div className="general-ledger-panel-header">
                    <span className="general-ledger-panel-icon tone-focus">
                      <BarChart3 className="h-5 w-5" />
                    </span>
                    <div>
                      <h3>ميزان المراجعة</h3>
                      <p>مراجعة توازن أرصدة الحسابات المدينة والدائنة</p>
                    </div>
                    <Badge className={stats.trialDifference === 0 ? "general-ledger-badge tone-success" : "general-ledger-badge tone-alert"}>
                      الفرق {formatQar(stats.trialDifference)}
                    </Badge>
                  </div>
                  <div className="p-4">
                    {trialLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                       <div className="overflow-x-auto">
                         <Table className="min-w-[720px]" aria-label="دفتر الأستاذ - ميزان المراجعة">
                           <TableHeader>
                             <TableRow>
                               <TableHead className="text-right" scope="col">رمز الحساب</TableHead>
                               <TableHead className="text-right" scope="col">اسم الحساب</TableHead>
                               <TableHead className="text-center" scope="col">نوع الحساب</TableHead>
                               <TableHead className="text-center" scope="col">المستوى</TableHead>
                               <TableHead className="text-center text-[#22C7A1]" scope="col">الرصيد المدين</TableHead>
                               <TableHead className="text-center text-[#FB6B7A]" scope="col">الرصيد الدائن</TableHead>
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
                                  transition={{ delay: Math.min(index * 0.015, 0.18) }}
                                >
                                  <TableCell className="font-mono font-black">{item.account_code}</TableCell>
                                  <TableCell>
                                    <div className="font-black">{item.account_name}</div>
                                    {item.account_name_ar && (
                                      <div className="text-xs" style={{ color: ledgerTheme.muted }}>{item.account_name_ar}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={`general-ledger-badge ${accountTypeTone(item.account_type)}`}>
                                      {getAccountTypeLabel(item.account_type)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="general-ledger-badge tone-muted">مستوى {item.account_level}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center font-black text-[#22C7A1]">
                                    {item.debit_balance > 0 ? formatQar(item.debit_balance) : '-'}
                                  </TableCell>
                                  <TableCell className="text-center font-black text-[#FB6B7A]">
                                    {item.credit_balance > 0 ? formatQar(item.credit_balance) : '-'}
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
                  className="general-ledger-panel"
                >
                  <div className="general-ledger-panel-header">
                    <span className="general-ledger-panel-icon tone-info">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h3>تحليل مراكز التكلفة</h3>
                      <p>عرض وتحليل الأداء المالي لمراكز التكلفة</p>
                    </div>
                  </div>
                  <div className="p-4">
                    {costCenterLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                       <div className="overflow-x-auto">
                         <Table className="min-w-[700px]" aria-label="دفتر الأستاذ - مراكز التكلفة">
                           <TableHeader>
                             <TableRow>
                               <TableHead className="text-right" scope="col">رمز المركز</TableHead>
                               <TableHead className="text-right" scope="col">اسم المركز</TableHead>
                               <TableHead className="text-center text-[#22C7A1]" scope="col">إجمالي المدين</TableHead>
                               <TableHead className="text-center text-[#FB6B7A]" scope="col">إجمالي الدائن</TableHead>
                               <TableHead className="text-center" scope="col">صافي المبلغ</TableHead>
                               <TableHead className="text-center" scope="col">عدد القيود</TableHead>
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
                                  transition={{ delay: Math.min(index * 0.015, 0.18) }}
                                >
                                  <TableCell className="font-mono font-black">{center.center_code}</TableCell>
                                  <TableCell>
                                    <div className="font-black">{center.center_name}</div>
                                    {center.center_name_ar && (
                                      <div className="text-xs" style={{ color: ledgerTheme.muted }}>{center.center_name_ar}</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center font-black text-[#22C7A1]">{formatQar(center.total_debits)}</TableCell>
                                  <TableCell className="text-center font-black text-[#FB6B7A]">{formatQar(center.total_credits)}</TableCell>
                                  <TableCell className={cn(
                                    "text-center font-black",
                                    center.net_amount >= 0 ? "text-[#22C7A1]" : "text-[#FB6B7A]"
                                  )}>
                                    {formatQar(center.net_amount)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="general-ledger-badge tone-info">{center.entry_count}</Badge>
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
                  className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                  <div className="general-ledger-panel p-4">
                    <div className="general-ledger-panel-header -m-4 mb-4">
                      <span className="general-ledger-panel-icon tone-alert">
                        <Calculator className="h-5 w-5" />
                      </span>
                      <div>
                        <h3>الملخص المالي</h3>
                        <p>نظرة عامة على الوضع المالي</p>
                      </div>
                    </div>
                    
                    {summaryLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : financialSummary ? (
                      <div className="general-ledger-analysis-list">
                        {[
                          ["إجمالي الأصول", financialSummary.total_assets, "tone-success"],
                          ["إجمالي الالتزامات", financialSummary.total_liabilities, "tone-alert"],
                          ["حقوق الملكية", financialSummary.total_equity, "tone-info"],
                          ["إجمالي الإيرادات", financialSummary.total_revenue, "tone-focus"],
                          ["إجمالي المصروفات", financialSummary.total_expenses, "tone-alert"],
                        ].map(([label, value, tone]) => (
                          <div className="general-ledger-analysis-row" key={label as string}>
                            <span>{label}</span>
                            <strong className={tone as string}>{formatQar(value as number)}</strong>
                          </div>
                        ))}
                        <div className="general-ledger-analysis-row is-total">
                          <span>صافي الدخل</span>
                          <strong className={financialSummary.net_income >= 0 ? "tone-success" : "tone-alert"}>
                            {formatQar(financialSummary.net_income)}
                          </strong>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="general-ledger-panel p-4">
                    <div className="general-ledger-panel-header -m-4 mb-4">
                      <span className="general-ledger-panel-icon tone-info">
                        <Activity className="h-5 w-5" />
                      </span>
                      <div>
                        <h3>إحصائيات التشغيل</h3>
                        <p>قياس جاهزية دفتر الأستاذ للمراجعة</p>
                      </div>
                    </div>
                    
                    <div className="general-ledger-analysis-list">
                      {[
                        ["إجمالي القيود", stats.totalEntries, "tone-muted"],
                        ["القيود المرحّلة", stats.postedEntries, "tone-success"],
                        ["المسودات", stats.draftEntries, "tone-focus"],
                        ["القيود المعكوسة", stats.reversedEntries, "tone-alert"],
                        ["عدد الحسابات", stats.totalAccounts, "tone-info"],
                        ["مراكز التكلفة", stats.totalCostCenters, "tone-info"],
                      ].map(([label, value, tone]) => (
                        <div className="general-ledger-analysis-row" key={label as string}>
                          <span>{label}</span>
                          <strong className={tone as string}>{value}</strong>
                        </div>
                      ))}
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

          <style>{`
            .general-ledger-page {
              color: var(--gl-text);
            }
            .general-ledger-command,
            .general-ledger-panel,
            .general-ledger-tabs {
              border: 1px solid var(--gl-border);
              background: var(--gl-surface);
              box-shadow: 0 14px 32px rgba(2, 6, 23, 0.055);
            }
            .general-ledger-command {
              position: relative;
              overflow: hidden;
              border-radius: 12px;
              padding: 20px;
            }
            .general-ledger-command::before {
              content: "";
              position: absolute;
              inset-block: 0;
              inset-inline-start: 0;
              width: 5px;
              background: linear-gradient(180deg, var(--gl-success), var(--gl-info), var(--gl-focus), var(--gl-alert));
            }
            .general-ledger-command-icon,
            .general-ledger-metric-icon,
            .general-ledger-panel-icon {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex: 0 0 auto;
              border-radius: 10px;
            }
            .general-ledger-command-icon {
              width: 44px;
              height: 44px;
              color: var(--gl-success);
              background: color-mix(in srgb, var(--gl-success) 14%, white);
              border: 1px solid color-mix(in srgb, var(--gl-success) 24%, white);
            }
            .general-ledger-primary {
              background: var(--gl-success) !important;
              color: white !important;
              border-radius: 10px !important;
              box-shadow: 0 10px 20px rgba(34, 199, 161, 0.18);
            }
            .general-ledger-outline {
              border-color: var(--gl-border) !important;
              background: white !important;
              color: var(--gl-text) !important;
              border-radius: 10px !important;
            }
            .general-ledger-metrics {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-top: 18px;
            }
            .general-ledger-metric {
              min-height: 116px;
              border: 1px solid var(--gl-border);
              background: var(--gl-inner);
              border-radius: 10px;
              padding: 14px;
            }
            .general-ledger-metric-icon {
              width: 36px;
              height: 36px;
            }
            .general-ledger-metric p {
              margin-top: 14px;
              color: var(--gl-muted);
              font-size: 12px;
              font-weight: 900;
            }
            .general-ledger-metric strong {
              display: block;
              margin-top: 6px;
              color: var(--gl-text);
              font-size: 22px;
              font-weight: 950;
              line-height: 1.2;
            }
            .general-ledger-workspace {
              display: grid;
              gap: 14px;
            }
            .general-ledger-tabs {
              display: grid !important;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              height: auto !important;
              gap: 8px;
              border-radius: 12px;
              background: var(--gl-inner) !important;
              padding: 8px !important;
            }
            .general-ledger-tabs [role="tab"] {
              display: flex;
              min-height: 48px;
              gap: 8px;
              border-radius: 9px !important;
              color: var(--gl-muted) !important;
              font-weight: 900;
            }
            .general-ledger-tabs [role="tab"] small {
              color: inherit;
              font-size: 10px;
              font-weight: 900;
              opacity: 0.8;
            }
            .general-ledger-tabs [role="tab"][data-state="active"] {
              background: var(--tab-accent) !important;
              color: white !important;
              box-shadow: 0 10px 20px rgba(2, 6, 23, 0.08);
            }
            .general-ledger-panel {
              overflow: hidden;
              border-radius: 12px;
            }
            .general-ledger-panel-header {
              display: flex;
              align-items: center;
              gap: 12px;
              border-bottom: 1px solid var(--gl-border);
              background: color-mix(in srgb, var(--gl-inner) 72%, white);
              padding: 14px 16px;
            }
            .general-ledger-panel-header h3 {
              color: var(--gl-text);
              font-size: 15px;
              font-weight: 950;
            }
            .general-ledger-panel-header p {
              margin-top: 3px;
              color: var(--gl-muted);
              font-size: 12px;
              font-weight: 700;
            }
            .general-ledger-panel-icon {
              width: 40px;
              height: 40px;
              --icon-tone: var(--gl-muted);
              color: var(--icon-tone);
              background: color-mix(in srgb, var(--icon-tone) 12%, white);
              border: 1px solid color-mix(in srgb, var(--icon-tone) 22%, white);
            }
            .general-ledger-panel-icon.tone-success { --icon-tone: var(--gl-success); }
            .general-ledger-panel-icon.tone-alert { --icon-tone: var(--gl-alert); }
            .general-ledger-panel-icon.tone-info { --icon-tone: var(--gl-info); }
            .general-ledger-panel-icon.tone-focus { --icon-tone: var(--gl-focus); }
            .general-ledger-badge {
              --badge-tone: var(--gl-muted);
              border: 1px solid color-mix(in srgb, var(--badge-tone) 32%, white) !important;
              background: color-mix(in srgb, var(--badge-tone) 10%, white) !important;
              color: var(--badge-tone) !important;
              font-weight: 900;
            }
            .general-ledger-badge.tone-success { --badge-tone: var(--gl-success); }
            .general-ledger-badge.tone-alert { --badge-tone: var(--gl-alert); }
            .general-ledger-badge.tone-info { --badge-tone: var(--gl-info); }
            .general-ledger-badge.tone-focus { --badge-tone: var(--gl-focus); }
            .general-ledger-badge.tone-muted { --badge-tone: var(--gl-muted); }
            .general-ledger-page table thead tr {
              background: var(--gl-inner) !important;
            }
            .general-ledger-page table th {
              color: var(--gl-muted) !important;
              font-size: 12px;
              font-weight: 950;
              border-color: var(--gl-border) !important;
            }
            .general-ledger-page table td {
              color: var(--gl-text);
              border-color: var(--gl-border) !important;
            }
            .general-ledger-page table tbody tr:hover {
              background: color-mix(in srgb, var(--gl-info) 6%, white) !important;
            }
            .general-ledger-analysis-list {
              display: grid;
              gap: 10px;
            }
            .general-ledger-analysis-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              min-height: 48px;
              border: 1px solid var(--gl-border);
              border-radius: 10px;
              background: var(--gl-inner);
              padding: 10px 12px;
            }
            .general-ledger-analysis-row span {
              color: var(--gl-muted);
              font-size: 13px;
              font-weight: 900;
            }
            .general-ledger-analysis-row strong {
              color: var(--gl-text);
              font-size: 15px;
              font-weight: 950;
            }
            .general-ledger-analysis-row.is-total {
              background: color-mix(in srgb, var(--gl-success) 8%, white);
            }
            .general-ledger-analysis-row .tone-success { color: var(--gl-success); }
            .general-ledger-analysis-row .tone-alert { color: var(--gl-alert); }
            .general-ledger-analysis-row .tone-info { color: var(--gl-info); }
            .general-ledger-analysis-row .tone-focus { color: var(--gl-focus); }
            .general-ledger-analysis-row .tone-muted { color: var(--gl-text); }
            .general-ledger-page .bg-white,
            .general-ledger-page .bg-slate-50,
            .general-ledger-page .bg-emerald-50,
            .general-ledger-page .bg-amber-50,
            .general-ledger-page .bg-red-50 {
              background-color: var(--gl-inner) !important;
            }
            .general-ledger-page input,
            .general-ledger-page [role="combobox"] {
              border-color: var(--gl-border) !important;
              background: var(--gl-inner) !important;
              color: var(--gl-text) !important;
              border-radius: 10px !important;
            }
            .general-ledger-page button {
              border-radius: 10px;
            }
            .general-ledger-page *:focus-visible {
              outline-color: var(--gl-focus) !important;
              --tw-ring-color: var(--gl-focus) !important;
            }
            @media (max-width: 1100px) {
              .general-ledger-metrics,
              .general-ledger-tabs {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            @media (max-width: 640px) {
              .general-ledger-command {
                padding: 16px;
              }
              .general-ledger-metrics,
              .general-ledger-tabs {
                grid-template-columns: 1fr;
              }
              .general-ledger-panel-header {
                align-items: flex-start;
                flex-direction: column;
              }
            }
          `}</style>
        </div>
      </AuthChecker>
    </SessionValidator>
  );
}
