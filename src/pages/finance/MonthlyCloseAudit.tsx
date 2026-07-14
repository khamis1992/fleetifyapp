import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getDefaultAuditMonth,
  MonthlyCloseAuditBlocker,
  useMonthlyCloseAudit,
} from "@/hooks/finance/useMonthlyCloseAudit";

const severityLabel = {
  critical: "حرج",
  high: "مهم",
  medium: "متوسط",
};

const severityClasses = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
};

const formatQar = (value: number) =>
  new Intl.NumberFormat("ar-QA", {
    style: "currency",
    currency: "QAR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "بدون تاريخ";
  return new Date(value).toLocaleDateString("ar-QA");
};

const BlockerRow = ({ blocker }: { blocker: MonthlyCloseAuditBlocker }) => (
  <div className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[130px_1fr_150px_120px] lg:items-center">
    <div>
      <Badge variant="outline" className={cn("rounded-full", severityClasses[blocker.severity])}>
        {severityLabel[blocker.severity]}
      </Badge>
    </div>
    <div className="min-w-0">
      <p className="font-bold text-slate-900">{blocker.title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{blocker.detail}</p>
    </div>
    <div className="text-sm text-slate-500">
      <p>{formatDate(blocker.date)}</p>
      {blocker.entityNumber && <p className="mt-1 truncate font-medium text-slate-700">{blocker.entityNumber}</p>}
    </div>
    <div className="flex items-center justify-between gap-3 lg:justify-end">
      <span className="font-bold text-slate-900">{blocker.amount ? formatQar(blocker.amount) : "-"}</span>
      {blocker.link && (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link to={blocker.link} aria-label="فتح المصدر">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  </div>
);

const MonthlyCloseAudit: React.FC = () => {
  const [month, setMonth] = useState(getDefaultAuditMonth());
  const auditQuery = useMonthlyCloseAudit(month);
  const audit = auditQuery.data;

  const blockersByCheck = useMemo(() => {
    if (!audit) return [];
    return audit.checks.filter((check) => check.blockers.length > 0);
  }, [audit]);

  const handleCopyReport = async () => {
    if (!audit?.managementReport) return;
    await navigator.clipboard.writeText(audit.managementReport);
    toast.success("تم نسخ تقرير التدقيق");
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB]" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">AI للتدقيق والإقفال الشهري</p>
                <h1 className="mt-1 text-2xl font-black text-slate-950">ماذا يمنع إقفال الشهر؟</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  فحص رقابي يراجع الدفعات والفواتير والقيود والعقود للشهر المحدد، ثم يعطي قرارًا واضحًا قبل الإقفال.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-10 w-full pr-9 text-left sm:w-44"
                />
              </div>
              <Button variant="outline" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
                <RefreshCw className={cn("ml-2 h-4 w-4", auditQuery.isFetching && "animate-spin")} />
                تحديث
              </Button>
            </div>
          </div>
        </section>

        {auditQuery.isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
            جاري فحص بيانات الشهر...
          </div>
        )}

        {auditQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            تعذر تشغيل تدقيق الإقفال. يرجى إعادة المحاولة بعد التأكد من الاتصال بقاعدة البيانات.
          </div>
        )}

        {audit && (
          <>
            <section
              className={cn(
                "rounded-xl border p-5 shadow-sm",
                audit.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
              )}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_220px] lg:items-center">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                      audit.ready ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                    )}
                  >
                    {audit.ready ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600">القرار النهائي</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      {audit.ready ? "الشهر جاهز للإقفال" : "الشهر يحتاج معالجة قبل الإقفال"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      الفترة من {formatDate(audit.startDate)} إلى {formatDate(audit.endDate)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-white/75 p-4">
                  <p className="text-xs font-bold text-slate-500">العوائق</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{audit.blockersCount}</p>
                </div>
                <div className="rounded-lg bg-white/75 p-4">
                  <p className="text-xs font-bold text-slate-500">المبلغ المتأثر</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatQar(audit.affectedAmount)}</p>
                </div>
                <div className="rounded-lg bg-white/75 p-4">
                  <p className="text-xs font-bold text-slate-500">الفحوصات السليمة</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {audit.checks.filter((check) => check.status === "passed").length} / {audit.checks.length}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {audit.checks.map((check) => {
                const passed = check.status === "passed";
                return (
                  <div key={check.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          passed ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}
                      >
                        {passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <Badge variant="outline" className={cn("rounded-full", passed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : severityClasses[check.severity])}>
                        {passed ? "سليم" : `${check.count} عائق`}
                      </Badge>
                    </div>
                    <h3 className="mt-4 font-black text-slate-950">{check.title}</h3>
                    <p className="mt-2 min-h-12 text-xs leading-6 text-slate-500">{check.description}</p>
                    <p className="mt-3 text-sm font-bold text-slate-800">{formatQar(check.amount)}</p>
                  </div>
                );
              })}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-black text-slate-950">قائمة ما يمنع الإقفال</h2>
                  <p className="mt-1 text-sm text-slate-500">العناصر التالية يجب مراجعتها قبل اعتماد إقفال الشهر.</p>
                </div>
                <FileText className="h-5 w-5 text-slate-400" />
              </div>

              {audit.ready ? (
                <div className="p-10 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                  <h3 className="mt-4 text-lg font-black text-slate-950">لا توجد عوائق</h3>
                  <p className="mt-2 text-sm text-slate-500">كل الفحوصات المطلوبة لهذا الشهر سليمة.</p>
                </div>
              ) : (
                <div>
                  {blockersByCheck.map((check) => (
                    <div key={check.id} className="border-b border-slate-100 last:border-b-0">
                      <div className="bg-slate-50 px-4 py-3">
                        <h3 className="font-black text-slate-900">{check.title}</h3>
                      </div>
                      {check.blockers.map((blocker) => (
                        <BlockerRow key={blocker.id} blocker={blocker} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">تقرير التدقيق للإدارة</h2>
                  <p className="mt-1 text-sm text-slate-500">ملخص جاهز للإرسال أو الحفظ ضمن ملف الإقفال الشهري.</p>
                </div>
                <Button variant="outline" onClick={handleCopyReport}>
                  <ClipboardCopy className="ml-2 h-4 w-4" />
                  نسخ التقرير
                </Button>
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {audit.managementReport}
              </pre>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyCloseAudit;
