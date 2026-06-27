import { type CSSProperties, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BankReconciliationPanel } from "@/components/finance/BankReconciliationPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Bank, BankTransaction, useBankTransactions, useBanks, useCreateBank, useCreateBankTransaction, useDeleteBankTransaction, useTreasurySummary } from "@/hooks/useTreasury";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const treasuryColors = {
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

const treasuryStyle = {
  "--treasury-text": treasuryColors.text,
  "--treasury-surface": treasuryColors.surface,
  "--treasury-inner": treasuryColors.inner,
  "--treasury-muted": treasuryColors.muted,
  "--treasury-border": treasuryColors.border,
  "--treasury-info": treasuryColors.info,
  "--treasury-alert": treasuryColors.alert,
  "--treasury-focus": treasuryColors.focus,
  "--treasury-success": treasuryColors.success,
} as CSSProperties;

const accountTypeLabels: Record<string, string> = {
  checking: "جاري",
  savings: "توفير",
  business: "تجاري",
};

interface TreasuryMetricProps {
  title: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  accent: string;
}

const TreasuryMetric = ({ title, value, helper, icon: Icon, accent }: TreasuryMetricProps) => (
  <div className="treasury-metric">
    <div className="flex items-start justify-between gap-3">
      <span className="treasury-metric-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-bold" style={{ color: treasuryColors.muted }}>
        {helper}
      </span>
    </div>
    <div className="mt-5">
      <p className="text-sm font-bold" style={{ color: treasuryColors.muted }}>
        {title}
      </p>
      <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: treasuryColors.text }}>
        {value}
      </p>
    </div>
  </div>
);

export default function Treasury() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateBankDialogOpen, setIsCreateBankDialogOpen] = useState(false);
  const [isCreateTransactionDialogOpen, setIsCreateTransactionDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: banks, isLoading: banksLoading, error: banksError, refetch: refetchBanks } = useBanks();
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useBankTransactions();
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useTreasurySummary();
  const createBank = useCreateBank();
  const createTransaction = useCreateBankTransaction();
  const deleteTransaction = useDeleteBankTransaction();
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: companyCurrency } = useCompanyCurrency();

  const [newBank, setNewBank] = useState<Partial<Bank>>({
    bank_name: "",
    account_number: "",
    account_type: "checking",
    currency: companyCurrency,
    current_balance: 0,
    opening_balance: 0,
    is_active: true,
    is_primary: false,
  });

  const [newTransaction, setNewTransaction] = useState({
    transaction_type: "deposit",
    amount: 0,
    description: "",
    reference_number: "",
    bank_id: "",
  });

  const filteredBanks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return banks || [];

    return (banks || []).filter((bank) =>
      bank.bank_name.toLowerCase().includes(term) ||
      bank.account_number.includes(term)
    );
  }, [banks, searchTerm]);

  const recentTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = transactions || [];
    if (!term) return list.slice(0, 10);

    return list.filter((transaction) =>
      transaction.transaction_number.toLowerCase().includes(term) ||
      transaction.description.toLowerCase().includes(term) ||
      transaction.reference_number?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm, transactions]);

  const handleCreateBank = async () => {
    if (!newBank.bank_name || !newBank.account_number || !user?.profile?.company_id) return;

    await createBank.mutateAsync({
      ...newBank,
      company_id: user.profile.company_id,
    } as Omit<Bank, "id" | "created_at" | "updated_at">);

    setNewBank({
      bank_name: "",
      account_number: "",
      account_type: "checking",
      currency: companyCurrency,
      current_balance: 0,
      opening_balance: 0,
      is_active: true,
      is_primary: false,
    });
    setIsCreateBankDialogOpen(false);
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.description) {
      toast.error("يرجى إدخال وصف المعاملة");
      return;
    }
    if (!newTransaction.bank_id) {
      toast.error("يرجى اختيار البنك");
      return;
    }
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (!user?.profile?.company_id) {
      toast.error("خطأ في بيانات المستخدم");
      return;
    }

    const transactionNumber = `TRX-${Date.now()}`;
    const selectedBank = banks?.find((bank) => bank.id === newTransaction.bank_id);
    if (!selectedBank) {
      toast.error("البنك المحدد غير موجود");
      return;
    }

    const balanceAfter = newTransaction.transaction_type === "deposit"
      ? selectedBank.current_balance + newTransaction.amount
      : selectedBank.current_balance - newTransaction.amount;

    try {
      await createTransaction.mutateAsync({
        company_id: user.profile.company_id,
        bank_id: newTransaction.bank_id,
        transaction_number: transactionNumber,
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: newTransaction.transaction_type,
        amount: newTransaction.amount,
        balance_after: balanceAfter,
        description: newTransaction.description,
        reference_number: newTransaction.reference_number,
        status: "completed",
        reconciled: false,
      } as Omit<BankTransaction, "id" | "created_at" | "updated_at">);

      setNewTransaction({
        transaction_type: "deposit",
        amount: 0,
        description: "",
        reference_number: "",
        bank_id: "",
      });
      setIsCreateTransactionDialogOpen(false);
    } catch (error) {
      toast.error(`حدث خطأ في إنشاء المعاملة: ${(error as Error).message}`);
    }
  };

  const handleRefresh = () => {
    refetchBanks();
    refetchTransactions();
    refetchSummary();
  };

  const getTransactionIcon = (type: string) => {
    if (type === "deposit") return <ArrowDownRight className="h-4 w-4 text-[#22C7A1]" aria-hidden="true" />;
    if (type === "withdrawal") return <ArrowUpRight className="h-4 w-4 text-[#FB6B7A]" aria-hidden="true" />;
    return <ArrowRightLeft className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />;
  };

  const getTransactionBadge = (type: string) => {
    if (type === "deposit") {
      return <Badge className="border-0 bg-[#22C7A1]/10 text-[#22C7A1] hover:bg-[#22C7A1]/10">إيداع</Badge>;
    }
    if (type === "withdrawal") {
      return <Badge className="border-0 bg-[#FB6B7A]/10 text-[#FB6B7A] hover:bg-[#FB6B7A]/10">سحب</Badge>;
    }
    return <Badge className="border-0 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/10">تحويل</Badge>;
  };

  if (!user || banksLoading || summaryLoading) {
    return (
      <div className="treasury-system flex min-h-screen items-center justify-center" dir="rtl" style={treasuryStyle}>
        <div className="treasury-state">
          <RefreshCw className="h-10 w-10 animate-spin text-[#FB6B7A]" />
          <p>جاري تحميل بيانات الخزينة...</p>
        </div>
      </div>
    );
  }

  if (banksError) {
    return (
      <div className="treasury-system flex min-h-screen items-center justify-center" dir="rtl" style={treasuryStyle}>
        <div className="treasury-state">
          <span className="treasury-state-icon">
            <Landmark className="h-8 w-8" />
          </span>
          <p className="font-bold text-[#FB6B7A]">حدث خطأ في تحميل البيانات</p>
          <Button onClick={() => refetchBanks()} className="mt-2 bg-[#020617] text-white hover:bg-[#020617]/90">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="treasury-system min-h-screen" dir="rtl" style={treasuryStyle}>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="treasury-command"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="treasury-command-icon">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-[#FB6B7A]/10 text-[#FB6B7A] hover:bg-[#FB6B7A]/10">
                    مركز السيولة
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: treasuryColors.muted }}>
                    الحسابات البنكية، الحركة النقدية، التسويات
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-normal sm:text-3xl" style={{ color: treasuryColors.text }}>
                  الخزينة والبنوك
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: treasuryColors.muted }}>
                  متابعة موحدة للأرصدة والتدفقات النقدية والمعاملات اليومية بنفس أسلوب مركز المحاسبة العام.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsCreateTransactionDialogOpen(true)}
                className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90"
              >
                <Plus className="h-4 w-4" />
                معاملة جديدة
              </Button>
              <Button
                onClick={() => setIsCreateBankDialogOpen(true)}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <Building2 className="h-4 w-4" />
                حساب جديد
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate("/finance/hub")}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <ArrowLeft className="h-4 w-4" />
                المالية
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TreasuryMetric
              title="إجمالي الأرصدة"
              value={formatCurrency(summary?.totalBalance || 0)}
              helper={`${summary?.totalBanks || 0} حساب نشط`}
              icon={Wallet}
              accent={treasuryColors.alert}
            />
            <TreasuryMetric
              title="الإيداعات الشهرية"
              value={formatCurrency(summary?.monthlyDeposits || 0)}
              helper="آخر 30 يوم"
              icon={ArrowDownRight}
              accent={treasuryColors.success}
            />
            <TreasuryMetric
              title="المسحوبات الشهرية"
              value={formatCurrency(summary?.monthlyWithdrawals || 0)}
              helper="آخر 30 يوم"
              icon={ArrowUpRight}
              accent={treasuryColors.focus}
            />
            <TreasuryMetric
              title="صافي التدفق النقدي"
              value={formatCurrency(summary?.netFlow || 0)}
              helper={(summary?.netFlow || 0) >= 0 ? "موجب" : "سالب"}
              icon={Activity}
              accent={(summary?.netFlow || 0) >= 0 ? treasuryColors.success : treasuryColors.alert}
            />
          </div>
        </motion.section>

        <section className="treasury-toolbar">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: treasuryColors.muted }}>
              Treasury Workspace
            </p>
            <h2 className="mt-1 text-xl font-black" style={{ color: treasuryColors.text }}>
              الحسابات المصرفية
            </h2>
            <p className="mt-1 text-sm" style={{ color: treasuryColors.muted }}>
              عرض مختصر للحسابات النشطة وأحدث المعاملات المصرفية.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <Input
              placeholder="بحث عن حساب أو معاملة..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 rounded-lg border-[#E5EAF1] bg-[#F6F8FB] pr-10"
              aria-label="بحث في الخزينة"
            />
          </div>
        </section>

        <BankReconciliationPanel />

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="treasury-panel"
        >
          <div className="treasury-panel-header">
            <div className="flex items-center gap-3">
              <span className="treasury-panel-icon" style={{ color: treasuryColors.info, backgroundColor: `${treasuryColors.info}14` }}>
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black" style={{ color: treasuryColors.text }}>
                  الحسابات البنكية
                </h3>
                <p className="text-xs" style={{ color: treasuryColors.muted }}>
                  {filteredBanks.length} حساب مطابق للبحث
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-[#E5EAF1] bg-white" onClick={() => setIsCreateBankDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              إضافة حساب
            </Button>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredBanks.slice(0, 4).map((bank, index) => {
              const creditLimit = Math.max(Math.abs(bank.opening_balance || 0) * 1.5, Math.abs(bank.current_balance || 0), 1);
              const usagePercent = Math.min(Math.round((Math.abs(bank.current_balance || 0) / creditLimit) * 100), 100);

              return (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="treasury-bank-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="treasury-bank-icon">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {bank.is_primary && (
                        <Badge className="border-0 bg-[#7C83F6]/10 text-[#7C83F6] hover:bg-[#7C83F6]/10">
                          رئيسي
                        </Badge>
                      )}
                      <Badge className={cn(
                        "border-0",
                        bank.is_active ? "bg-[#22C7A1]/10 text-[#22C7A1]" : "bg-slate-100 text-slate-500"
                      )}>
                        {bank.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="truncate text-sm font-black" style={{ color: treasuryColors.text }}>
                      {bank.bank_name}
                    </h4>
                    <p className="mt-1 truncate text-xs font-bold" style={{ color: treasuryColors.muted }}>
                      {bank.account_number}
                    </p>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span style={{ color: treasuryColors.muted }}>الرصيد الحالي</span>
                      <span className="font-black" style={{ color: treasuryColors.text }}>
                        {formatCurrency(bank.current_balance, { currency: bank.currency })}
                      </span>
                    </div>
                    <div className="treasury-progress">
                      <span
                        className="treasury-progress-fill"
                        style={{
                          width: `${usagePercent}%`,
                          backgroundColor: usagePercent > 80 ? treasuryColors.alert : usagePercent > 60 ? treasuryColors.focus : treasuryColors.success,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="outline" className="border-[#E5EAF1] text-xs">
                      {accountTypeLabels[bank.account_type] || bank.account_type}
                    </Badge>
                    <span className="text-xs font-bold" style={{ color: treasuryColors.muted }}>
                      {usagePercent}% من الحد المرجعي
                    </span>
                  </div>
                </motion.div>
              );
            })}

            <button type="button" className="treasury-add-card" onClick={() => setIsCreateBankDialogOpen(true)}>
              <span className="treasury-add-icon">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-sm font-black">إضافة حساب جديد</span>
              <span className="text-xs">فتح حساب خزينة أو بنك</span>
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="treasury-panel overflow-hidden"
        >
          <div className="treasury-panel-header">
            <div className="flex items-center gap-3">
              <span className="treasury-panel-icon" style={{ color: treasuryColors.focus, backgroundColor: `${treasuryColors.focus}14` }}>
                <ArrowRightLeft className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black" style={{ color: treasuryColors.text }}>
                  المعاملات البنكية
                </h3>
                <p className="text-xs" style={{ color: treasuryColors.muted }}>
                  أحدث 10 حركات مع بحث سريع
                </p>
              </div>
            </div>
            <Button className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90" onClick={() => setIsCreateTransactionDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              معاملة جديدة
            </Button>
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-10 w-10 animate-spin text-[#FB6B7A]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]" aria-label="جدول المعاملات البنكية">
                <TableHeader>
                  <TableRow className="border-b border-[#E5EAF1] bg-[#F6F8FB]">
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">رقم المعاملة</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">التاريخ</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">النوع</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">المبلغ</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">الوصف</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">الحالة</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#94A3B8]" scope="col">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {recentTransactions.map((transaction, index) => (
                      <motion.tr
                        key={transaction.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ delay: index * 0.025 }}
                        className="border-b border-[#E5EAF1]/70 transition-colors hover:bg-[#F6F8FB]"
                      >
                        <TableCell className="font-mono text-sm text-[#020617]">{transaction.transaction_number}</TableCell>
                        <TableCell className="text-sm text-[#64748B]">
                          {new Date(transaction.transaction_date).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            {getTransactionBadge(transaction.transaction_type)}
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm font-black",
                          transaction.transaction_type === "deposit" ? "text-[#22C7A1]" : "text-[#FB6B7A]"
                        )}>
                          {transaction.transaction_type === "deposit" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm text-[#64748B]">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "border-0",
                            transaction.status === "completed"
                              ? "bg-[#22C7A1]/10 text-[#22C7A1]"
                              : "bg-[#7C83F6]/10 text-[#7C83F6]"
                          )}>
                            {transaction.status === "completed" ? "مكتملة" : "معلقة"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-[#FB6B7A] hover:bg-[#FB6B7A]/10 hover:text-[#FB6B7A]">
                                حذف
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد حذف المعاملة</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف المعاملة رقم {transaction.transaction_number}؟ هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTransaction.mutate(transaction.id)}
                                  className="bg-[#FB6B7A] hover:bg-[#FB6B7A]/90"
                                  disabled={deleteTransaction.isPending}
                                >
                                  {deleteTransaction.isPending ? "جاري الحذف..." : "حذف"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}

          {recentTransactions.length === 0 && !transactionsLoading && (
            <div className="p-6">
              <EmptyState
                icon={ArrowRightLeft}
                title="لا توجد معاملات"
                description="لم يتم تسجيل أي معاملات بنكية مطابقة. ابدأ بإضافة معاملة جديدة."
                onAction={() => setIsCreateTransactionDialogOpen(true)}
                actionLabel="معاملة جديدة"
              />
            </div>
          )}
        </motion.section>
      </div>

      <Dialog open={isCreateBankDialogOpen} onOpenChange={setIsCreateBankDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء حساب مصرفي جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل الحساب المصرفي الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">اسم البنك</Label>
              <Input
                id="bankName"
                value={newBank.bank_name}
                onChange={(event) => setNewBank({ ...newBank, bank_name: event.target.value })}
                placeholder="اسم البنك"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">رقم الحساب</Label>
              <Input
                id="accountNumber"
                value={newBank.account_number}
                onChange={(event) => setNewBank({ ...newBank, account_number: event.target.value })}
                placeholder="رقم الحساب"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="accountType">نوع الحساب</Label>
              <Select value={newBank.account_type} onValueChange={(value) => setNewBank({ ...newBank, account_type: value })}>
                <SelectTrigger id="accountType" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">حساب جاري</SelectItem>
                  <SelectItem value="savings">حساب توفير</SelectItem>
                  <SelectItem value="business">حساب تجاري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="openingBalance">الرصيد الافتتاحي</Label>
              <Input
                id="openingBalance"
                type="number"
                value={newBank.opening_balance}
                onChange={(event) => setNewBank({ ...newBank, opening_balance: Number(event.target.value), current_balance: Number(event.target.value) })}
                placeholder="0.000"
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
              <Label htmlFor="isPrimary" className="cursor-pointer">حساب رئيسي</Label>
              <Switch
                id="isPrimary"
                checked={newBank.is_primary}
                onCheckedChange={(checked) => setNewBank({ ...newBank, is_primary: checked })}
              />
            </div>
            <Button
              onClick={handleCreateBank}
              className="w-full bg-[#020617] text-white hover:bg-[#020617]/90"
              disabled={createBank.isPending}
            >
              {createBank.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateTransactionDialogOpen} onOpenChange={setIsCreateTransactionDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء معاملة مصرفية جديدة</DialogTitle>
            <DialogDescription>أدخل تفاصيل المعاملة المصرفية الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankSelect">البنك</Label>
              <Select value={newTransaction.bank_id} onValueChange={(value) => setNewTransaction({ ...newTransaction, bank_id: value })}>
                <SelectTrigger id="bankSelect" className="mt-1">
                  <SelectValue placeholder="اختر البنك" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bank_name} - {bank.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transactionType">نوع المعاملة</Label>
              <Select value={newTransaction.transaction_type} onValueChange={(value) => setNewTransaction({ ...newTransaction, transaction_type: value })}>
                <SelectTrigger id="transactionType" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">إيداع</SelectItem>
                  <SelectItem value="withdrawal">سحب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                value={newTransaction.amount}
                onChange={(event) => setNewTransaction({ ...newTransaction, amount: Number(event.target.value) })}
                placeholder="0.000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={newTransaction.description}
                onChange={(event) => setNewTransaction({ ...newTransaction, description: event.target.value })}
                placeholder="وصف المعاملة"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="referenceNumber">رقم المرجع (اختياري)</Label>
              <Input
                id="referenceNumber"
                value={newTransaction.reference_number}
                onChange={(event) => setNewTransaction({ ...newTransaction, reference_number: event.target.value })}
                placeholder="رقم المرجع"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCreateTransaction}
              className="w-full bg-[#020617] text-white hover:bg-[#020617]/90"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? "جاري الإنشاء..." : "إنشاء المعاملة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .treasury-system {
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.92), var(--treasury-inner) 320px),
            var(--treasury-inner);
          color: var(--treasury-text);
        }

        .treasury-command,
        .treasury-toolbar,
        .treasury-panel {
          border: 1px solid var(--treasury-border);
          background: var(--treasury-surface);
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .treasury-command {
          padding: 24px;
          overflow: hidden;
          position: relative;
        }

        .treasury-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, var(--treasury-alert), var(--treasury-success), var(--treasury-focus), var(--treasury-info));
        }

        .treasury-command-icon,
        .treasury-panel-icon,
        .treasury-metric-icon,
        .treasury-bank-icon,
        .treasury-add-icon,
        .treasury-state-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .treasury-command-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--treasury-alert) 14%, white);
          color: var(--treasury-alert);
          border: 1px solid color-mix(in srgb, var(--treasury-alert) 24%, white);
        }

        .treasury-metric {
          min-height: 132px;
          border: 1px solid var(--treasury-border);
          background: var(--treasury-inner);
          border-radius: 8px;
          padding: 16px;
        }

        .treasury-metric-icon,
        .treasury-panel-icon {
          width: 40px;
          height: 40px;
          border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
        }

        .treasury-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .treasury-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          border-bottom: 1px solid var(--treasury-border);
          background: color-mix(in srgb, var(--treasury-inner) 70%, white);
        }

        .treasury-bank-card {
          min-height: 220px;
          border: 1px solid var(--treasury-border);
          background: var(--treasury-surface);
          border-radius: 8px;
          padding: 16px;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .treasury-bank-card:hover {
          border-color: color-mix(in srgb, var(--treasury-info) 36%, var(--treasury-border));
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055);
          transform: translateY(-2px);
        }

        .treasury-bank-icon {
          width: 40px;
          height: 40px;
          background: color-mix(in srgb, var(--treasury-info) 14%, white);
          color: var(--treasury-info);
          border: 1px solid color-mix(in srgb, var(--treasury-info) 24%, white);
        }

        .treasury-progress {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--treasury-inner);
        }

        .treasury-progress-fill {
          display: block;
          height: 100%;
          border-radius: inherit;
          transition: width 220ms ease;
        }

        .treasury-add-card {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px dashed color-mix(in srgb, var(--treasury-alert) 42%, var(--treasury-border));
          background: var(--treasury-inner);
          border-radius: 8px;
          color: var(--treasury-text);
          transition: border-color 160ms ease, background-color 160ms ease;
        }

        .treasury-add-card:hover {
          border-color: var(--treasury-alert);
          background: color-mix(in srgb, var(--treasury-alert) 5%, white);
        }

        .treasury-add-card span:last-child {
          color: var(--treasury-muted);
        }

        .treasury-add-icon {
          width: 40px;
          height: 40px;
          background: color-mix(in srgb, var(--treasury-alert) 12%, white);
          color: var(--treasury-alert);
        }

        .treasury-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          color: var(--treasury-muted);
          text-align: center;
        }

        .treasury-state-icon {
          width: 64px;
          height: 64px;
          color: var(--treasury-alert);
          background: color-mix(in srgb, var(--treasury-alert) 12%, white);
        }

        .treasury-system button,
        .treasury-system input,
        .treasury-system textarea,
        .treasury-system [role="combobox"] {
          border-radius: 8px !important;
        }

        .treasury-system *:focus-visible {
          outline-color: var(--treasury-focus) !important;
          --tw-ring-color: var(--treasury-focus) !important;
        }

        @media (max-width: 760px) {
          .treasury-command {
            padding: 18px;
          }

          .treasury-toolbar,
          .treasury-panel-header {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
