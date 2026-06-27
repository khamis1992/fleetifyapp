import { type CSSProperties, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FinanceErrorBoundary } from "@/components/finance/FinanceErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { cn } from "@/lib/utils";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useEnhancedJournalEntries } from "@/hooks/useGeneralLedger";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

const ledgerColors = {
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
  "--ledger-text": ledgerColors.text,
  "--ledger-surface": ledgerColors.surface,
  "--ledger-inner": ledgerColors.inner,
  "--ledger-muted": ledgerColors.muted,
  "--ledger-border": ledgerColors.border,
  "--ledger-info": ledgerColors.info,
  "--ledger-alert": ledgerColors.alert,
  "--ledger-focus": ledgerColors.focus,
  "--ledger-success": ledgerColors.success,
} as CSSProperties;

interface SummaryTileProps {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
  accent: string;
}

const SummaryTile = ({ label, value, helper, icon: Icon, accent }: SummaryTileProps) => (
  <div className="daily-ledger-tile">
    <div className="flex items-center justify-between gap-3">
      <span className="daily-ledger-tile-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-bold" style={{ color: ledgerColors.muted }}>
        {helper}
      </span>
    </div>
    <p className="mt-5 text-sm font-bold" style={{ color: ledgerColors.muted }}>
      {label}
    </p>
    <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: ledgerColors.text }}>
      {value}
    </p>
  </div>
);

const getStatusText = (status: string) => {
  switch (status) {
    case "posted":
      return "مرحل";
    case "draft":
      return "مسودة";
    case "cancelled":
      return "ملغي";
    case "reversed":
      return "معكوس";
    default:
      return status;
  }
};

const getStatusMeta = (status: string) => {
  switch (status) {
    case "posted":
      return { icon: CheckCircle2, color: ledgerColors.success, tone: "مكتمل" };
    case "draft":
      return { icon: Clock3, color: ledgerColors.focus, tone: "قيد العمل" };
    case "cancelled":
    case "reversed":
      return { icon: XCircle, color: ledgerColors.alert, tone: "مستبعد" };
    default:
      return { icon: ShieldAlert, color: ledgerColors.info, tone: "مراجعة" };
  }
};

const Ledger = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    data: journalEntries,
    isLoading: isLoadingEntries,
    error: entriesError,
    refetch: refetchEntries,
  } = useEnhancedJournalEntries({
    searchTerm: searchTerm || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    accountId: selectedAccount !== "all" ? selectedAccount : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: accounts, isLoading: isLoadingAccounts } = useChartOfAccounts();

  const stats = useMemo(() => {
    const entries = journalEntries || [];
    const posted = entries.filter((entry) => entry.status === "posted");
    const draft = entries.filter((entry) => entry.status === "draft");
    const cancelled = entries.filter((entry) => entry.status === "cancelled" || entry.status === "reversed");
    const totalDebit = entries.reduce((sum, entry) => sum + (entry.total_debit || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.total_credit || 0), 0);

    return {
      totalEntries: entries.length,
      postedEntries: posted.length,
      draftEntries: draft.length,
      cancelledEntries: cancelled.length,
      totalDebit,
      totalCredit,
      difference: Math.abs(totalDebit - totalCredit),
    };
  }, [journalEntries]);

  const activeFilterCount = [searchTerm, dateFrom, dateTo, selectedAccount && selectedAccount !== "all", statusFilter !== "all"].filter(Boolean).length;

  return (
    <FinanceErrorBoundary
      error={entriesError}
      isLoading={isLoadingEntries}
      onRetry={refetchEntries}
      title="خطأ في القيود اليومية"
      context="تبويبة القيود اليومية"
    >
      <div className="daily-ledger" dir="rtl" style={ledgerStyle}>
        <motion.section
          className="daily-ledger-command"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <span className="daily-ledger-command-icon">
                <FileText className="h-6 w-6" />
              </span>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-[#FB6B7A]/10 text-[#FB6B7A] hover:bg-[#FB6B7A]/10">
                    دفتر القيود اليومية
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: ledgerColors.muted }}>
                    إدخال، مراجعة، ترحيل
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-normal" style={{ color: ledgerColors.text }}>
                  القيود اليومية
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: ledgerColors.muted }}>
                  راجع القيود حسب الحالة والحساب والتاريخ، مع عرض سريع لتوازن المدين والدائن قبل الترحيل.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90">
                <Link to="/finance/accounting?tab=entries&action=new">
                  <Plus className="h-4 w-4" />
                  قيد جديد
                </Link>
              </Button>
              <Button
                onClick={() => refetchEntries()}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate("/finance/accounting")}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <ArrowLeft className="h-4 w-4" />
                المحاسبة
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="إجمالي القيود"
              value={stats.totalEntries}
              helper="كل الحالات"
              icon={Receipt}
              accent={ledgerColors.info}
            />
            <SummaryTile
              label="القيود المرحلة"
              value={stats.postedEntries}
              helper={`${stats.draftEntries} مسودة`}
              icon={CheckCircle2}
              accent={ledgerColors.success}
            />
            <SummaryTile
              label="إجمالي المدين"
              value={formatCurrency(stats.totalDebit)}
              helper="Debit"
              icon={Download}
              accent={ledgerColors.focus}
            />
            <SummaryTile
              label="فرق التوازن"
              value={formatCurrency(stats.difference)}
              helper={stats.difference === 0 ? "متوازن" : "راجع القيد"}
              icon={ShieldAlert}
              accent={stats.difference === 0 ? ledgerColors.success : ledgerColors.alert}
            />
          </div>
        </motion.section>

        <motion.section
          className="daily-ledger-filters"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="daily-ledger-filter-icon">
                <Filter className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black" style={{ color: ledgerColors.text }}>
                  البحث والتصفية
                </h3>
                <p className="text-xs" style={{ color: ledgerColors.muted }}>
                  {activeFilterCount > 0 ? `${activeFilterCount} فلاتر نشطة` : "لا توجد فلاتر نشطة"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "posted", "draft", "cancelled"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn("daily-ledger-status-chip", statusFilter === status && "is-active")}
                >
                  {status === "all" ? "الكل" : getStatusText(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: ledgerColors.muted }} />
              <Input
                placeholder="ابحث برقم القيد، البيان، أو المرجع..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="daily-ledger-input pr-10"
              />
            </div>

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="daily-ledger-input"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="daily-ledger-input"
            />

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="daily-ledger-input">
                <SelectValue placeholder={isLoadingAccounts ? "جاري تحميل الحسابات..." : "اختر الحساب"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحسابات</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.section>

        <motion.section
          className="daily-ledger-list"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="daily-ledger-list-header">
            <div>
              <h3 className="text-base font-black" style={{ color: ledgerColors.text }}>
                سجل القيود
              </h3>
              <p className="text-xs" style={{ color: ledgerColors.muted }}>
                {stats.totalEntries} قيد مطابق للعرض الحالي
              </p>
            </div>
            <Badge className="border-0 bg-[#F6F8FB] text-[#94A3B8] hover:bg-[#F6F8FB]">
              المدين {formatCurrency(stats.totalDebit)} / الدائن {formatCurrency(stats.totalCredit)}
            </Badge>
          </div>

          {isLoadingEntries ? (
            <div className="daily-ledger-empty">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: ledgerColors.alert }} />
              <p className="mt-3 text-sm font-bold" style={{ color: ledgerColors.muted }}>
                جاري تحميل القيود المحاسبية...
              </p>
            </div>
          ) : !journalEntries || journalEntries.length === 0 ? (
            <div className="daily-ledger-empty">
              <span className="daily-ledger-empty-icon">
                <Receipt className="h-8 w-8" />
              </span>
              <h3 className="mt-4 text-lg font-black" style={{ color: ledgerColors.text }}>
                لا توجد قيود محاسبية
              </h3>
              <p className="mt-2 text-sm" style={{ color: ledgerColors.muted }}>
                لم يتم العثور على قيود تطابق معايير البحث الحالية.
              </p>
              <Button asChild className="mt-5 gap-2 bg-[#020617] text-white hover:bg-[#020617]/90">
                <Link to="/finance/accounting?tab=entries&action=new">
                  <Plus className="h-4 w-4" />
                  إنشاء قيد جديد
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {journalEntries.map((entry, index) => {
                  const statusMeta = getStatusMeta(entry.status);
                  const StatusIcon = statusMeta.icon;
                  const lines = entry.journal_entry_lines || [];
                  const entryNumber = entry.entry_number || entry.id?.slice(0, 8);

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ delay: Math.min(index * 0.025, 0.2) }}
                    >
                      <Card className="daily-ledger-entry">
                        <CardContent className="p-0">
                          <div className="daily-ledger-entry-head">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="daily-ledger-entry-icon" style={{ color: statusMeta.color, backgroundColor: `${statusMeta.color}14` }}>
                                <StatusIcon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-black" style={{ color: ledgerColors.text }}>
                                    سند قيد رقم {entryNumber}
                                  </h4>
                                  <Badge
                                    className="border-0"
                                    style={{ backgroundColor: `${statusMeta.color}14`, color: statusMeta.color }}
                                  >
                                    {getStatusText(entry.status)}
                                  </Badge>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold" style={{ color: ledgerColors.muted }}>
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString("en-US") : "بدون تاريخ"}
                                  </span>
                                  {entry.reference_type && <span>المرجع: {entry.reference_type}</span>}
                                  <span>{statusMeta.tone}</span>
                                </div>
                              </div>
                            </div>

                            <div className="daily-ledger-entry-actions">
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-[#FB6B7A] hover:text-[#FB6B7A]">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {entry.description && (
                            <div className="daily-ledger-description">
                              <span>البيان</span>
                              <p>{entry.description}</p>
                            </div>
                          )}

                          <div className="overflow-x-auto">
                            <Table className="min-w-[680px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-right">رمز الحساب</TableHead>
                                  <TableHead className="text-right">اسم الحساب</TableHead>
                                  <TableHead className="text-right">البيان</TableHead>
                                  <TableHead className="text-center text-[#22C7A1]">مدين</TableHead>
                                  <TableHead className="text-center text-[#FB6B7A]">دائن</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {lines.map((line, lineIndex) => (
                                  <TableRow key={line.id || lineIndex}>
                                    <TableCell className="font-mono font-bold">
                                      {line.chart_of_accounts?.account_code || "-"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-bold">{line.chart_of_accounts?.account_name || "-"}</div>
                                      {line.chart_of_accounts?.account_name_ar && (
                                        <div className="text-xs" style={{ color: ledgerColors.muted }}>
                                          {line.chart_of_accounts.account_name_ar}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm" style={{ color: ledgerColors.muted }}>
                                      {line.line_description || entry.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-black text-[#22C7A1]">
                                      {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-black text-[#FB6B7A]">
                                      {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="daily-ledger-entry-total">
                            <span>المجموع</span>
                            <div className="flex flex-wrap gap-3">
                              <span className="text-[#22C7A1]">مدين {formatCurrency(entry.total_debit || 0)}</span>
                              <span className="text-[#FB6B7A]">دائن {formatCurrency(entry.total_credit || 0)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        <style>{`
          .daily-ledger {
            display: grid;
            gap: 16px;
            background: transparent;
          }

          .daily-ledger-command,
          .daily-ledger-filters,
          .daily-ledger-list {
            border: 1px solid var(--ledger-border);
            background: var(--ledger-surface);
            border-radius: 8px;
            box-shadow: 0 12px 30px rgba(2, 6, 23, 0.055);
          }

          .daily-ledger-command {
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .daily-ledger-command::before {
            content: "";
            position: absolute;
            inset-inline-start: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            background: linear-gradient(180deg, var(--ledger-alert), var(--ledger-focus), var(--ledger-success));
          }

          .daily-ledger-command-icon,
          .daily-ledger-filter-icon,
          .daily-ledger-entry-icon,
          .daily-ledger-empty-icon,
          .daily-ledger-tile-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 8px;
          }

          .daily-ledger-command-icon {
            width: 48px;
            height: 48px;
            color: var(--ledger-alert);
            background: color-mix(in srgb, var(--ledger-alert) 12%, white);
            border: 1px solid color-mix(in srgb, var(--ledger-alert) 22%, white);
          }

          .daily-ledger-filter-icon,
          .daily-ledger-entry-icon {
            width: 40px;
            height: 40px;
          }

          .daily-ledger-filter-icon {
            color: var(--ledger-info);
            background: color-mix(in srgb, var(--ledger-info) 12%, white);
          }

          .daily-ledger-tile {
            min-height: 126px;
            border: 1px solid var(--ledger-border);
            background: var(--ledger-inner);
            border-radius: 8px;
            padding: 16px;
          }

          .daily-ledger-tile-icon {
            width: 40px;
            height: 40px;
          }

          .daily-ledger-filters {
            padding: 16px;
          }

          .daily-ledger-status-chip {
            min-height: 34px;
            border-radius: 8px;
            border: 1px solid var(--ledger-border);
            background: var(--ledger-inner);
            color: var(--ledger-muted);
            padding: 0 12px;
            font-size: 12px;
            font-weight: 800;
            transition: 0.18s ease;
          }

          .daily-ledger-status-chip.is-active {
            border-color: var(--ledger-alert);
            background: color-mix(in srgb, var(--ledger-alert) 12%, white);
            color: var(--ledger-alert);
          }

          .daily-ledger-input,
          .daily-ledger input,
          .daily-ledger [role="combobox"] {
            min-height: 42px;
            border-radius: 8px !important;
            border-color: var(--ledger-border) !important;
            background: var(--ledger-inner) !important;
            color: var(--ledger-text) !important;
          }

          .daily-ledger-list {
            overflow: hidden;
          }

          .daily-ledger-list-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 16px;
            border-bottom: 1px solid var(--ledger-border);
            background: color-mix(in srgb, var(--ledger-inner) 68%, white);
          }

          .daily-ledger-empty {
            display: flex;
            min-height: 260px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
          }

          .daily-ledger-empty-icon {
            width: 64px;
            height: 64px;
            background: color-mix(in srgb, var(--ledger-alert) 12%, white);
            color: var(--ledger-alert);
          }

          .daily-ledger-entry {
            margin: 12px;
            overflow: hidden;
            border: 1px solid var(--ledger-border) !important;
            border-radius: 8px !important;
            box-shadow: none !important;
          }

          .daily-ledger-entry-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding: 16px;
            border-bottom: 1px solid var(--ledger-border);
            background: var(--ledger-surface);
          }

          .daily-ledger-entry-actions {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .daily-ledger-description {
            display: grid;
            gap: 4px;
            padding: 12px 16px;
            border-bottom: 1px solid var(--ledger-border);
            background: color-mix(in srgb, var(--ledger-info) 7%, white);
          }

          .daily-ledger-description span {
            color: var(--ledger-muted);
            font-size: 11px;
            font-weight: 900;
          }

          .daily-ledger-description p {
            color: var(--ledger-text);
            font-size: 13px;
            font-weight: 700;
          }

          .daily-ledger table thead tr {
            background: var(--ledger-inner) !important;
          }

          .daily-ledger table th {
            color: var(--ledger-muted) !important;
            font-size: 12px;
            font-weight: 900;
          }

          .daily-ledger table td {
            color: var(--ledger-text);
            border-color: var(--ledger-border) !important;
          }

          .daily-ledger table tbody tr:hover {
            background: color-mix(in srgb, var(--ledger-info) 5%, white) !important;
          }

          .daily-ledger-entry-total {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            border-top: 1px solid var(--ledger-border);
            background: var(--ledger-inner);
            color: var(--ledger-text);
            font-size: 13px;
            font-weight: 900;
          }

          .daily-ledger *:focus-visible {
            outline-color: var(--ledger-focus) !important;
            --tw-ring-color: var(--ledger-focus) !important;
          }

          @media (max-width: 720px) {
            .daily-ledger-entry-head,
            .daily-ledger-list-header,
            .daily-ledger-entry-total {
              align-items: stretch;
              flex-direction: column;
            }

            .daily-ledger-entry-actions {
              justify-content: flex-start;
            }
          }
        `}</style>
      </div>
    </FinanceErrorBoundary>
  );
};

export default Ledger;
