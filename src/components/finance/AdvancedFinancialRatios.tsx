import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFinancialAnalysis } from '@/hooks/useFinancialAnalysis';
import { financeToday } from '@/services/financialReporting';

export function AdvancedFinancialRatios() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const today = financeToday(),
    year = Number(today.slice(0, 4)),
    month = Number(today.slice(5, 7));
  const firstMonth =
    period === 'year' ? 1 : period === 'quarter' ? Math.floor((month - 1) / 3) * 3 + 1 : month;
  const from = `${year}-${String(firstMonth).padStart(2, '0')}-01`;
  const query = useFinancialAnalysis({ dateFrom: from, dateTo: today });
  return (
    <section className="space-y-5 p-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">النسب المالية</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {from} — {today} · أرصدة الميزانية تراكمية حتى نهاية الفترة
          </p>
        </div>
        <div className="flex gap-2">
          {(['month', 'quarter', 'year'] as const).map((value) => (
            <Button
              key={value}
              variant={period === value ? 'default' : 'outline'}
              onClick={() => setPeriod(value)}
            >
              {{ month: 'الشهر', quarter: 'الربع', year: 'السنة' }[value]}
            </Button>
          ))}
        </div>
      </div>
      {query.isLoading && <p role="status">جاري حساب النسب...</p>}
      {query.isError && (
        <div role="alert">
          تعذر تحميل بيانات النسب. <Button onClick={() => query.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {query.data && !query.isError && (
        <>
          {!query.data.classificationComplete && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              تصنيف بعض حسابات الأصول والالتزامات غير مكتمل. نسب السيولة غير متاحة حتى استكماله.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.ratios.map((ratio) => (
              <article key={ratio.name} className="rounded-xl border p-5">
                <h4 className="text-sm text-muted-foreground">{ratio.name}</h4>
                <p className="my-4 text-2xl font-bold">
                  <bdi>
                    {ratio.value == null
                      ? 'غير متاح'
                      : ratio.value.toFixed(2) + (ratio.percentage ? '%' : '')}
                  </bdi>
                </p>
                <p className="text-xs text-muted-foreground">{ratio.description}</p>
              </article>
            ))}
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            تعتمد النسب على القيود المرحلة. لا تُحسب النسبة عند غياب تصنيف لازم أو عندما يساوي المقام صفرًا.
            العائد على الأصول وحقوق الملكية يستخدم رصيد نهاية الفترة، والنتائج غير محوّلة إلى معدل سنوي.
          </p>
        </>
      )}
    </section>
  );
}
