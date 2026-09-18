import { RefreshCw } from "lucide-react";
import { useFinancialAnalysis } from "@/hooks/useFinancialAnalysis";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancialPerformancePanel() {
  const query = useFinancialAnalysis();
  const { formatCurrency } = useCurrencyFormatter();
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
                  {ratio.value == null
                    ? "غير متاح"
                    : `${ratio.value.toFixed(2)}${ratio.percentage ? "%" : ""}`}
                </bdi>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
