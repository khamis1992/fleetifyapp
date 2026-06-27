import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFinancialIntegrityReport } from '@/hooks/finance/useFinancialIntegrityReport';

const issueLabels: Record<string, string> = {
  completed_payment_without_journal: 'دفعات مكتملة بلا قيد',
  unbalanced_journal_entries: 'قيود غير متزنة',
  invoice_paid_amount_mismatch: 'فواتير لا تطابق المدفوعات',
  overpaid_invoices: 'فواتير مدفوعة بأكثر من قيمتها',
  financial_controls_migration_not_applied: 'طبقة الحماية غير مطبقة على قاعدة البيانات',
};

export const FinancialIntegrityPanel = () => {
  const { data, isLoading, isFetching, refetch } = useFinancialIntegrityReport();
  const isHealthy = data?.status === 'healthy';

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isHealthy ? 'bg-[#E8FBF6] text-[#22C7A1]' : 'bg-[#FFF0F2] text-[#FB6B7A]'}`}>
              {isHealthy ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[#020617]">صحة النظام المالي</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${isHealthy ? 'bg-[#E8FBF6] text-[#22C7A1]' : 'bg-[#FFF0F2] text-[#FB6B7A]'}`}>
                  {isLoading ? 'جاري الفحص' : isHealthy ? 'سليم' : 'يحتاج مراجعة'}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-[#94A3B8]">
                فحص مركزي للمدفوعات، القيود، الفواتير، وحالات الدفع الزائد.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 gap-2 rounded-xl border-slate-200 text-[#020617]"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            إعادة الفحص
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="الدفعات المكتملة" value={data?.summary.completed_payments ?? 0} tone="neutral" />
          <Metric label="دفعات بلا قيد" value={data?.summary.completed_payments_without_journal ?? 0} tone={(data?.summary.completed_payments_without_journal ?? 0) > 0 ? 'danger' : 'success'} />
          <Metric label="قيود غير متزنة" value={data?.summary.unbalanced_journal_entries ?? 0} tone={(data?.summary.unbalanced_journal_entries ?? 0) > 0 ? 'danger' : 'success'} />
          <Metric label="فواتير متعارضة" value={(data?.summary.invoice_paid_amount_mismatches ?? 0) + (data?.summary.overpaid_invoices ?? 0)} tone={((data?.summary.invoice_paid_amount_mismatches ?? 0) + (data?.summary.overpaid_invoices ?? 0)) > 0 ? 'danger' : 'success'} />
        </div>

        {data?.issues && data.issues.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#FB6B7A]/20 bg-[#FFF0F2] p-3">
            <div className="flex items-center gap-2 text-sm font-black text-[#020617]">
              <AlertTriangle className="h-4 w-4 text-[#FB6B7A]" />
              عناصر تحتاج مراجعة
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {data.issues.map((issue) => (
                <div key={issue.code} className="rounded-xl bg-white px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-[#020617]">{issueLabels[issue.code] || issue.code}</span>
                    <span className="rounded-full bg-[#FFF0F2] px-2 py-1 text-xs font-black text-[#FB6B7A]">{issue.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isHealthy && !isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#22C7A1]/20 bg-[#E8FBF6] px-3 py-2 text-sm font-bold text-[#047A63]">
            <CheckCircle2 className="h-4 w-4" />
            لا توجد فروقات حرجة في آخر فحص.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'danger' }) => {
  const className =
    tone === 'success'
      ? 'bg-[#E8FBF6] text-[#22C7A1]'
      : tone === 'danger'
        ? 'bg-[#FFF0F2] text-[#FB6B7A]'
        : 'bg-[#F6F8FB] text-[#020617]';

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-3">
      <p className="text-xs font-bold text-[#94A3B8]">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-lg font-black ${className}`}>{value}</p>
    </div>
  );
};
