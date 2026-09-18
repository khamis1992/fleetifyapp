import { useMemo, useState } from "react";
import { BookOpen, RefreshCw, Download } from "lucide-react";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountMovementsDialog } from "@/components/finance/AccountMovementsDialog";
import { FinanceRegisterPagination } from "@/components/finance/workspace/FinanceRegisterPagination";
import { useFinanceRegisterPage } from "@/components/finance/workspace/useFinanceRegisterPage";
import { useAccountBalances } from "@/hooks/useGeneralLedger";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { financeToday } from "@/services/financialReporting";
import { exportToCSV } from "@/utils/exports/csvExport";
const accountTypes: Record<string, string> = {
  assets: "الأصول",
  asset: "الأصول",
  liabilities: "الخصوم",
  liability: "الخصوم",
  equity: "حقوق الملكية",
  revenue: "الإيرادات",
  expenses: "المصروفات",
  expense: "المصروفات",
};
export default function GeneralLedger() {
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const [asOfDate, setAsOfDate] = useState(financeToday());
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<{
    account_id: string;
    account_code: string;
    account_name: string;
    account_name_ar?: string | null;
  } | null>(null);
  const query = useAccountBalances({ asOfDate });
  const balances = useMemo(
    () =>
      (query.data || []).filter((row) =>
        `${row.account_code} ${row.account_name} ${row.account_name_ar || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [query.data, search]
  );
  const page = useFinanceRegisterPage(
    balances,
    `${companyId}:${search}:${asOfDate}`,
    25
  );
  const exportBalances = () =>
    exportToCSV(
      balances.map((row) => ({
        code: row.account_code,
        name: row.account_name_ar || row.account_name,
        type: accountTypes[row.account_type] || row.account_type,
        opening: row.opening_balance,
        debit: row.total_debits,
        credit: row.total_credits,
        closing: row.closing_balance,
      })),
      `أرصدة-الحسابات-${asOfDate}`,
      {
        headers: [
          "رمز الحساب",
          "اسم الحساب",
          "نوع الحساب",
          "الرصيد الافتتاحي",
          "إجمالي المدين",
          "إجمالي الدائن",
          "الرصيد الختامي",
        ],
      }
    );
  return (
    <section dir="rtl" className="space-y-5">
      <FinancePageHeader
        title="دفتر الأستاذ"
        description="أرصدة الحسابات وحركاتها من القيود المرحلة حتى التاريخ المحدد."
        icon={BookOpen}
        actions={
          <>
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw className="me-2 h-4 w-4" />
              تحديث
            </Button>
            <Button
              variant="outline"
              onClick={exportBalances}
              disabled={query.isFetching || !!query.error || !balances.length}
            >
              <Download className="me-2 h-4 w-4" />
              تصدير الأرصدة
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-4 rounded-xl border bg-card p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="ledger-search">بحث في الحسابات</Label>
          <Input
            id="ledger-search"
            placeholder="رمز الحساب أو اسمه"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ledger-date">الأرصدة حتى تاريخ</Label>
          <Input
            id="ledger-date"
            type="date"
            value={asOfDate}
            onChange={(event) => {
              if (event.target.value) setAsOfDate(event.target.value);
            }}
          />
        </div>
      </div>
      {query.error ? (
        <p role="alert" className="rounded-xl border border-destructive p-6">
          تعذر تحميل أرصدة الحسابات. أعد المحاولة قبل اعتماد النتائج.
        </p>
      ) : query.isLoading ? (
        <p role="status" className="p-6">
          جاري تحميل دفتر الأستاذ…
        </p>
      ) : (
        <div className="min-w-0 rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table
              className="min-w-[850px]"
              aria-label="دفتر الأستاذ - أرصدة الحسابات"
            >
              <TableHeader>
                <TableRow>
                  {[
                    "رمز الحساب",
                    "اسم الحساب",
                    "نوع الحساب",
                    "الرصيد الافتتاحي",
                    "إجمالي المدين",
                    "إجمالي الدائن",
                    "الرصيد الختامي",
                    "الحركات",
                  ].map((label) => (
                    <TableHead className="text-right" key={label} scope="col">
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((row) => (
                  <TableRow key={row.account_id}>
                    <TableCell>{row.account_code}</TableCell>
                    <TableCell className="font-bold">
                      {row.account_name_ar || row.account_name}
                    </TableCell>
                    <TableCell>
                      {accountTypes[row.account_type] || row.account_type}
                    </TableCell>
                    <TableCell>{formatCurrency(row.opening_balance)}</TableCell>
                    <TableCell>{formatCurrency(row.total_debits)}</TableCell>
                    <TableCell>{formatCurrency(row.total_credits)}</TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(row.closing_balance)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAccount(row)}
                        aria-label={`عرض حركات ${
                          row.account_name_ar || row.account_name
                        }`}
                      >
                        عرض الحركات
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!balances.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      لا توجد حسابات مطابقة.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <FinanceRegisterPagination {...page} />
        </div>
      )}
      {selectedAccount && (
        <AccountMovementsDialog
          key={`${selectedAccount.account_id}:${asOfDate}`}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedAccount(null);
          }}
          accountId={selectedAccount.account_id}
          accountName={
            selectedAccount.account_name_ar || selectedAccount.account_name
          }
          accountCode={selectedAccount.account_code}
          initialDateTo={asOfDate}
        />
      )}
    </section>
  );
}
