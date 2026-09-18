import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CustomerCollectionTotals } from "@/services/customerCollectionSummary";

export function CustomerCollectionCards({
  totals,
  loading,
  error,
  onRetry,
}: {
  totals?: CustomerCollectionTotals;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 p-4">
        <p>{error.message}</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      </div>
    );
  if (loading || !totals)
    return <p role="status">جارٍ تحميل التحصيل من الدفعات…</p>;
  const items = [
    ["المقبوضات المسجلة", totals.total],
    ["أصل الإيجار المسدد", totals.rent],
    ["رسوم التأخير المحصلة", totals.fines],
    ["دفعات مقدمة وغير مخصصة", totals.advances],
    ["تخصيصات أخرى", totals.other],
    ["رصيد الفواتير", totals.pending],
  ] as const;
  return (
    <section aria-label="ملخص تحصيل العميل" className="space-y-3">
      <p className="text-sm text-muted-foreground">
        الدفعات المكتملة بالريال القطري حتى اليوم، بعد استبعاد الدفعات الملغاة.
        أوراق الإيصالات السابقة معروضة أدناه.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ر.ق
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {totals.count} دفعة مكتملة · {totals.partial_count} فاتورة مسددة جزئيًا
      </p>
    </section>
  );
}
