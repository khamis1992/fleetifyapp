import { useMemo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialAnalysis } from "@/hooks/useFinancialAnalysis";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueAccountRow {
  account_id: string;
  account_code: string;
  account_name_ar: string | null;
  account_name: string;
  closing_balance: number;
}

export default function FinancialPerformancePanel() {
  const query = useFinancialAnalysis();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // Revenue-account drill-down + classification completeness, read from the ledger.
  const accountsQuery = useQuery({
    queryKey: ["analysis-accounts", companyId],
    enabled: Boolean(companyId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");
      const { data, error } = await supabase.rpc("get_account_balances", {
        company_id_param: companyId,
        as_of_date: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      const rows = (data || []) as Array<Record<string, unknown>>;
      const type = (row: Record<string, unknown>) => String(row.account_type || "").toLowerCase();
      return {
        revenue: rows
          .filter(row => ["revenue", "income"].includes(type(row)))
          .map(row => ({
            account_id: String(row.account_id),
            account_code: String(row.account_code),
            account_name_ar: (row.account_name_ar as string) ?? null,
            account_name: String(row.account_name),
            closing_balance: Number(row.closing_balance) || 0,
          })) as RevenueAccountRow[],
        unclassified: rows.filter(
          row =>
            ["asset", "assets", "liability", "liabilities"].includes(type(row)) &&
            Math.abs(Number(row.closing_balance) || 0) > 0.01
        ).length,
      };
    },
  });

  const revenueAccounts = accountsQuery.data?.revenue || [];
  const unclassifiedCount = accountsQuery.data?.unclassified ?? 0;
  const revenue = Number(query.data?.incomeStatement.revenue ?? 0);
  const negativeRevenue = query.data ? revenue < -0.01 : false;

  const absurdRatios = useMemo(() => {
    const list = query.data?.ratios || [];
    return new Set(
      list
        .filter(ratio => ratio.value != null && ratio.percentage && Math.abs(ratio.value) > 500)
        .map(ratio => ratio.name)
    );
  }, [query.data]);

  if (query.error)
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 p-6">
        <p>تعذر تحميل التحليل المالي.</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => query.refetch()}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  if (!query.data)
    return (
      <p role="status" className="p-6">
        جاري تحميل التحليل المالي…
      </p>
    );
  const data = query.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          القيود المرحلة ·{" "}
          <bdi>
            {data.period.from} — {data.period.to}
          </bdi>
        </p>
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw size={16} className="me-2" />
          تحديث
        </Button>
      </div>

      {negativeRevenue && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">الإيراد الصافي سالب ({formatCurrency(revenue)}) — إشارة غير طبيعية.</p>
            <p className="mt-1 leading-6">
              راجع تفصيل حسابات الإيراد أدناه: الأسباب الشائعة عكوس قيود تُدين حسابات إيراد، أو إقفالات سنوية كنست أكثر من الرصيد. عالج السبب أو اعكسه قبل الاعتماد.
            </p>
          </div>
        </div>
      )}

      {unclassifiedCount > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="leading-6">
            التصنيف المحاسبي ناقص ({unclassifiedCount} حساب أصول/التزامات عليه رصيد بلا تصنيف متداول/غير متداول) — النسب المالية أدناه تقديرية وقد تكون مضللة. صنّف الحسابات من دليل الحسابات أولاً.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["الإيرادات", data.incomeStatement.revenue],
          ["المصروفات", data.incomeStatement.expenses],
          ["صافي النتيجة", data.incomeStatement.netIncome],
        ].map(([title, value]) => (
          <Card key={title}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {formatCurrency(Number(value))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مصادر الإيراد (من الدفتر)</CardTitle>
        </CardHeader>
        <CardContent>
          {accountsQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">جارٍ قراءة حسابات الإيراد…</p>
          ) : revenueAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا أرصدة إيراد مرحّلة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr>
                    <th className="text-start">الحساب</th>
                    <th className="text-start">الاسم</th>
                    <th className="text-start">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueAccounts.map(account => (
                    <tr key={account.account_id} className="border-t">
                      <td><bdi>{account.account_code}</bdi></td>
                      <td>{account.account_name_ar || account.account_name}</td>
                      <td className={account.closing_balance < 0 ? "font-semibold text-destructive" : ""}>
                        <bdi>{formatCurrency(account.closing_balance)}</bdi>
                        {account.closing_balance < -0.01 && (
                          <span className="ms-2 text-xs text-destructive">مدين — راجعه</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المقارنة بالفترة السابقة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr>
                  <th className="text-start">المؤشر</th>
                  <th className="text-start">الفترة الحالية</th>
                  <th className="text-start">الفترة السابقة</th>
                  <th className="text-start">الفرق</th>
                </tr>
              </thead>
              <tbody>
                {data.historicalComparison.map((item) => (
                  <tr key={item.metric} className="border-t">
                    <td>{item.metric}</td>
                    <td>{formatCurrency(item.currentYear)}</td>
                    <td>{formatCurrency(item.previousYear)}</td>
                    <td>{formatCurrency(item.change)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>المؤشرات المالية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {data.ratios.map((ratio) => (
              <div
                key={ratio.name}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <h3 className="text-sm font-semibold">{ratio.name}</h3>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {ratio.description}
                  </p>
                </div>
                <bdi className="text-lg font-semibold">
                  {absurdRatios.has(ratio.name) ? (
                    <span className="text-sm font-normal text-muted-foreground" title="قيمة غير معنوية بسبب تصنيف ناقص">
                      غير معنوي
                    </span>
                  ) : ratio.value == null ? (
                    "غير متاح"
                  ) : (
                    <>
                      {ratio.value.toFixed(2)}
                      {ratio.percentage ? (unclassifiedCount > 0 ? "% تقديري" : "%") : ""}
                    </>
                  )}
                </bdi>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
