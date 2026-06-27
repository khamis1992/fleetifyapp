import { ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FINANCE_FIELD_PERMISSION_MATRIX,
  FINANCE_PERMISSION_MATRIX,
  SEGREGATION_OF_DUTIES_RULES,
  getFinanceAccessCoverage,
} from "@/utils/financeAccessRules";

const riskStyle = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

const entityLabel: Record<string, string> = {
  invoice: "الفواتير",
  payment: "الدفعات",
  journal_entry: "القيود اليومية",
  period: "الفترات",
  bank_reconciliation: "التسوية البنكية",
  budget: "الميزانيات",
  audit: "التدقيق",
};

export function FinancePermissionsMatrixPanel() {
  const coverage = getFinanceAccessCoverage();
  const criticalCount = FINANCE_PERMISSION_MATRIX.filter((permission) => permission.risk === "critical").length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-[#22C7A1]">المرحلة الأولى</p>
            <h2 className="text-xl font-black text-[#020617]">مصفوفة الصلاحيات المالية وفصل المهام</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">
              هذه الطبقة تحدد من يستطيع تنفيذ كل إجراء مالي حساس، وما الحقول التي تحتاج صلاحية مستقلة، ومتى يجب فصل المنفذ عن المعتمد.
            </p>
          </div>
        </div>

        <div className="grid min-w-[280px] grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-3 text-center">
            <p className="text-lg font-black text-[#020617]">{coverage.actionCount}</p>
            <p className="text-[11px] font-bold text-[#94A3B8]">إجراء</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-3 text-center">
            <p className="text-lg font-black text-[#020617]">{coverage.fieldCount}</p>
            <p className="text-[11px] font-bold text-[#94A3B8]">حقل حساس</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-3 text-center">
            <p className="text-lg font-black text-[#020617]">{coverage.segregationRuleCount}</p>
            <p className="text-[11px] font-bold text-[#94A3B8]">قاعدة فصل</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 shadow-none lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-[#020617]">الإجراءات المحمية</h3>
                <p className="text-xs font-bold text-[#94A3B8]">{criticalCount} إجراء عالي الحساسية يحتاج ضبطًا دقيقًا</p>
              </div>
              <SlidersHorizontal className="h-5 w-5 text-[#7C83F6]" />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {FINANCE_PERMISSION_MATRIX.map((permission) => (
                <div key={permission.id} className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#020617]">{permission.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{permission.description}</p>
                    </div>
                    <Badge variant="outline" className={riskStyle[permission.risk]}>
                      {permission.risk}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#64748B]">
                      {entityLabel[permission.entity]}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-mono text-[#94A3B8]">
                      {permission.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="rounded-2xl border-slate-200 shadow-none">
            <CardContent className="p-4">
              <h3 className="font-black text-[#020617]">صلاحيات الحقول</h3>
              <div className="mt-3 space-y-2">
                {FINANCE_FIELD_PERMISSION_MATRIX.map((field) => (
                  <div key={`${field.entity}.${field.field}`} className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-[#020617]">{field.label}</p>
                      <Badge variant="outline" className={riskStyle[field.risk]}>
                        {field.risk}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-[#94A3B8]">{field.entity}.{field.field}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-none">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-[#020617]">فصل المهام</h3>
                <UsersRound className="h-5 w-5 text-[#FB6B7A]" />
              </div>
              <div className="space-y-2">
                {SEGREGATION_OF_DUTIES_RULES.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                    <p className="text-sm font-black text-[#020617]">{rule.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#64748B]">{rule.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
