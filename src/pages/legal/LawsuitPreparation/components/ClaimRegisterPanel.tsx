import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyRecordChange } from "@/services/recordQuerySynchronization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CLAIM_KIND_LABELS,
  CLAIM_DISPOSITION_LABELS,
  type LegalClaimItem,
  type LegalClaimRegister,
} from "@/types/legalClaimRegister";
import { useLawsuitPreparationContext } from "../store";
import { monthlyRetentionAmount } from "@/utils/legal-claim-register-validation";

const money = (n: number | null) =>
  n == null
    ? "لم يُقدّر بعد"
    : `${n.toLocaleString("ar-QA", { minimumFractionDigits: 2 })} ر.ق.`;
const selectClass =
  "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900";
export function ClaimRegisterView({
  register,
}: {
  register?: LegalClaimRegister;
}) {
  if (!register) return null;
  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-slate-600">
        كل طلب مرتبط بأساسه وفترته. البدائل والاحتياطيات معروضة منفصلة عن إجمالي
        الأصل.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-100">
            <tr>
              {["البند", "نوع الطلب", "الفترة والأساس", "المبلغ", "الحالة"].map(
                (label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {register.rows.map((row) => (
              <tr key={row.key} className="border-b align-top">
                <td className="p-3 font-bold">{row.label}</td>
                <td className="p-3">
                  {CLAIM_DISPOSITION_LABELS[row.disposition]}
                </td>
                <td className="p-3 max-w-sm">
                  <p>
                    {row.key === "fixed_general_compensation" ? "مبلغ ثابت" : row.period_from &&
                    row.period_to &&
                    row.period_from <= row.period_to
                      ? `${row.period_from} — ${row.period_to}`
                      : row.status === "excluded"
                      ? "لا توجد فترة مدرجة"
                      : "حسب المستند"}
                  </p>
                  <p className="text-slate-600">{row.basis}</p>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {row.status === "incomplete"
                    ? "يحتاج استكمالًا"
                    : money(row.amount)}
                </td>
                <td className="p-3 max-w-xs">
                  {row.status === "ready"
                    ? row.disposition === "primary"
                      ? "داخل الإجمالي"
                      : "خارج إجمالي الأصل"
                    : row.status === "excluded"
                    ? "غير مدرج"
                    : row.issues.join("؛ ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rounded-lg bg-slate-900 p-4 font-bold text-white">
        إجمالي الطلبات الأصلية: {money(register.primary_total)}
      </p>
      {register.issues.length > 0 && (
        <div role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">
          {register.issues.map((issue, i) => (
            <p key={i}>{issue}</p>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyItem = (): Partial<LegalClaimItem> => ({
  kind: "rental_opportunity",
  disposition: "alternative",
  description: "",
  requested_amount: null,
  avoided_costs: 0,
  third_party_recovery: 0,
  evidence_ids: [],
  calculation_basis: "",
  causation_notes: "",
  independence_notes: "",
  opportunity_reference: "",
  alternative_to: "retention",
  review_status: "draft",
  exclusion_reason: "",
});

export function ClaimRegisterPanel() {
  const { state } = useLawsuitPreparationContext();
  const client = useQueryClient();
  const companyId = state.companyId,
    contractId = state.contract?.id;
  const [draft, setDraft] = useState<Partial<LegalClaimItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const caseId = state.legalCase?.id;
  const key = ["legal-claim-items", companyId, contractId, caseId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(companyId && contractId),
    queryFn: async () => {
      let request = supabase
        .from("legal_case_claim_items")
        .select("*")
        .eq("company_id", companyId!)
        .eq("contract_id", contractId!);
      request = caseId
        ? request.eq("case_id", caseId)
        : request.is("case_id", null);
      const { data, error } = await request.order("created_at").order("id");
      if (error) throw error;
      return data as LegalClaimItem[];
    },
  });
  const update = (field: keyof LegalClaimItem, value: unknown) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const save = async () => {
    if (!draft || !companyId || !contractId) return;
    setSaving(true);
    try {
      if (
        draft.requested_amount != null &&
        Number(draft.avoided_costs || 0) +
          Number(draft.third_party_recovery || 0) >
          draft.requested_amount
      )
        throw new Error("الخصومات تتجاوز مبلغ الطلب؛ راجع القيم قبل الحفظ");
      if (
        draft.period_from &&
        draft.period_to &&
        draft.period_to < draft.period_from
      )
        throw new Error("نهاية فترة الطلب تسبق بدايتها");
      const { id, updated_at } = draft;
      const values = {
        kind: draft.kind!,
        disposition: draft.disposition!,
        description: draft.description || "",
        period_from: draft.period_from || null,
        period_to: draft.period_to || null,
        requested_amount: draft.requested_amount ?? null,
        avoided_costs: draft.avoided_costs ?? 0,
        third_party_recovery: draft.third_party_recovery ?? 0,
        evidence_ids: draft.evidence_ids || [],
        calculation_basis: draft.calculation_basis || "",
        causation_notes: draft.causation_notes || "",
        alternative_to:
          draft.disposition === "primary" ? null : draft.alternative_to || null,
        independence_notes: draft.independence_notes || "",
        opportunity_reference: draft.opportunity_reference || "",
        review_status: draft.review_status!,
        exclusion_reason: draft.exclusion_reason || "",
        opportunity_requested_on: draft.opportunity_requested_on || null,
        opportunity_probability: draft.opportunity_probability || "",
        alternative_unavailable_reason:
          draft.alternative_unavailable_reason || "",
        overlap_group: draft.overlap_group || "",
        recovery_reference: draft.recovery_reference || "",
      };
      const payload = {
        ...values,
        kind: draft.kind!,
        company_id: companyId,
        contract_id: contractId,
      };
      const request = id
        ? supabase
            .from("legal_case_claim_items")
            .update(values)
            .eq("id", id)
            .eq("company_id", companyId)
            .eq("contract_id", contractId)
            .eq("updated_at", updated_at!)
        : supabase
            .from("legal_case_claim_items")
            .insert({ ...payload, case_id: state.legalCase?.id || null });
      const { data, error } = await request.select("id").maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error("تغير هذا البند منذ فتحه. أعد تحميله قبل الحفظ.");
      await notifyRecordChange(client, {
        entity: "legal",
        companyId,
        recordId: contractId,
      });
      toast.success("تم حفظ الطلب وتحديث مراجعته المالية");
      setDraft(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || "تعذر حفظ الطلب"
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className="lawsuit-section-panel space-y-5"
      id="lawsuit-claim-register"
      dir="rtl"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">سجل المطالبات والتعويضات</h2>
          <p className="text-sm text-slate-600">
            الطلبات الإضافية وأدلتها، مع منع جمع البدائل مع الأصل.
          </p>
        </div>
        <Button disabled={!caseId} onClick={() => setDraft(emptyItem())}>
          إضافة طلب
        </Button>
      </div>
      {!caseId && (
        <p>
          سجّل ملف القضية أولاً لربط الطلبات بهذه القضية وحفظها منفصلة عن أي
          دعوى أخرى للعقد.
        </p>
      )}
      <ClaimRegisterView register={state.financialClaimSource?.claimRegister} />
      {query.error && (
        <p role="alert" className="text-red-700">
          تعذر تحميل الطلبات الإضافية: {query.error.message}
        </p>
      )}
      {query.data?.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border p-3 gap-3"
        >
          <span>
            {CLAIM_KIND_LABELS[item.kind]} —{" "}
            {item.description || "مسودة تحتاج استكمالًا"}
          </span>
          <Button variant="outline" onClick={() => setDraft(item)}>
            استكمال / تعديل الطلب
          </Button>
        </div>
      ))}
      {draft && (
        <form
          className="grid gap-4 rounded-xl border bg-slate-50 p-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            نوع الطلب
            <select
              className={selectClass}
              value={draft.kind}
              onChange={(e) => {
                update("kind", e.target.value);
                if (e.target.value === "reputation_reserve")
                  update("disposition", "subsidiary");
              }}
            >
              {Object.entries(CLAIM_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            تصنيف الطلب
            <select
              className={selectClass}
              value={draft.disposition}
              disabled={draft.kind === "reputation_reserve"}
              onChange={(e) => update("disposition", e.target.value)}
            >
              {Object.entries(CLAIM_DISPOSITION_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="md:col-span-2">
            الوقائع والضرر المطلوب
            <Textarea
              value={draft.description || ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label>
            بداية الفترة
            <Input
              type="date"
              value={draft.period_from || ""}
              onChange={(e) => update("period_from", e.target.value || null)}
            />
          </label>
          <label>
            نهاية الفترة حتى تاريخ التصفية
            <Input
              type="date"
              value={draft.period_to || ""}
              onChange={(e) => update("period_to", e.target.value || null)}
            />
          </label>
          <label>
            المبلغ المطلوب قبل الخصومات
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.requested_amount ?? ""}
              onChange={(e) =>
                update(
                  "requested_amount",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
          </label>
          <label>
            المصروفات المتجنبة
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.avoided_costs ?? 0}
              onChange={(e) => update("avoided_costs", Number(e.target.value))}
            />
          </label>
          <label>
            ما جبره التأمين أو الغير عن هذا البند
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.third_party_recovery ?? 0}
              onChange={(e) =>
                update("third_party_recovery", Number(e.target.value))
              }
            />
          </label>
          <label>
            أساس الحساب وجزء الشهر
            <Textarea
              value={draft.calculation_basis || ""}
              onChange={(e) => update("calculation_basis", e.target.value)}
            />
          </label>
          {draft.kind === "rental_opportunity" && (
            <label className="md:col-span-2">
              طالب التأجير / مرجع الحجز ودليل جدية الفرصة
              <Input
                value={draft.opportunity_reference || ""}
                onChange={(e) =>
                  update("opportunity_reference", e.target.value)
                }
              />
            </label>
          )}
          {draft.kind === "rental_opportunity" && (
            <>
              <label>
                تاريخ طلب التأجير
                <Input
                  type="date"
                  value={draft.opportunity_requested_on || ""}
                  onChange={(e) =>
                    update("opportunity_requested_on", e.target.value || null)
                  }
                />
              </label>
              <label>
                جدية الفرصة واحتمال تحققها
                <Textarea
                  value={draft.opportunity_probability || ""}
                  onChange={(e) =>
                    update("opportunity_probability", e.target.value)
                  }
                />
              </label>
              <label>
                سبب تعذر توفير مركبة بديلة والحد من الضرر
                <Textarea
                  value={draft.alternative_unavailable_reason || ""}
                  onChange={(e) =>
                    update("alternative_unavailable_reason", e.target.value)
                  }
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={
                  !draft.period_from ||
                  !draft.period_to ||
                  !state.contract?.monthly_amount
                }
                onClick={() => {
                  try {
                    const amount = monthlyRetentionAmount(
                      draft.period_from!,
                      draft.period_to!,
                      Number(state.contract?.monthly_amount),
                      "calendar_days"
                    );
                    update("requested_amount", amount);
                    update(
                      "calculation_basis",
                      `أجرة العقد الشهرية ${state.contract?.monthly_amount} ريال، بنسبة أيام الشهر الفعلية عن الفترة المحددة؛ قبل المصروفات المتجنبة والجبر من الغير.`
                    );
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
              >
                تقدير الفرصة بأجرة العقد الشهرية
              </Button>
            </>
          )}
          <label>
            المنفعة أو الضرر المشترك لمراجعة التداخل
            <Input
              placeholder="مثال: منفعة المركبة / إصلاح الهيكل"
              value={draft.overlap_group || ""}
              onChange={(e) => update("overlap_group", e.target.value)}
            />
          </label>
          {Number(draft.third_party_recovery) > 0 && (
            <label>
              مرجع مبلغ التأمين أو الغير
              <Input
                value={draft.recovery_reference || ""}
                onChange={(e) => update("recovery_reference", e.target.value)}
              />
            </label>
          )}
          <label className="md:col-span-2">
            علاقة الضرر بالإخلال وشرط الطلب الاحتياطي
            <Textarea
              value={draft.causation_notes || ""}
              onChange={(e) => update("causation_notes", e.target.value)}
            />
          </label>
          {draft.disposition === "primary" ? (
            <label className="md:col-span-2">
              سبب استقلال الضرر وعدم جبره ببقية المطالبات
              <Textarea
                value={draft.independence_notes || ""}
                onChange={(e) => update("independence_notes", e.target.value)}
              />
            </label>
          ) : (
            <label>
              الطلب الأصلي المرتبط
              <select
                className={selectClass}
                value={draft.alternative_to || ""}
                onChange={(e) =>
                  update("alternative_to", e.target.value || null)
                }
              >
                <option value="">اختر الطلب الأصلي</option>
                {state.financialClaimSource?.claimRegister?.rows
                  .filter(
                    (row) =>
                      row.disposition === "primary" && row.key !== draft.id
                  )
                  .map((row) => (
                    <option key={row.key} value={row.key}>
                      {row.label}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <fieldset className="md:col-span-2 space-y-2">
            <legend className="font-bold">مستندات الإثبات</legend>
            {state.contractEvidenceDocuments?.map((doc) => (
              <label key={doc.id} className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={draft.evidence_ids?.includes(doc.id) || false}
                  onChange={(e) =>
                    update(
                      "evidence_ids",
                      e.target.checked
                        ? [...(draft.evidence_ids || []), doc.id]
                        : (draft.evidence_ids || []).filter(
                            (id) => id !== doc.id
                          )
                    )
                  }
                />
                {doc.document_name}
              </label>
            ))}
          </fieldset>
          <label>
            حالة المراجعة
            <select
              className={selectClass}
              value={draft.review_status}
              onChange={(e) => update("review_status", e.target.value)}
            >
              <option value="draft">مسودة تحتاج استكمالًا</option>
              <option value="reviewed">
                تمت مراجعة الطلب والأدلة والتداخل
              </option>
              <option value="excluded">مستبعد من هذه المطالبة</option>
            </select>
          </label>
          {draft.review_status === "excluded" && (
            <label>
              سبب الاستبعاد
              <Textarea
                required
                value={draft.exclusion_reason || ""}
                onChange={(e) => update("exclusion_reason", e.target.value)}
              />
            </label>
          )}
          <p className="md:col-span-2 text-sm text-slate-600">
            صافي هذا البند:{" "}
            {money(
              draft.requested_amount == null
                ? null
                : Math.max(
                    0,
                    draft.requested_amount -
                      Number(draft.avoided_costs || 0) -
                      Number(draft.third_party_recovery || 0)
                  )
            )}
            . حفظ الطلب لا ينشئ فاتورة أو قيدًا محاسبيًا.
          </p>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "جارٍ الحفظ…" : "حفظ الطلب وتحديث البيان"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setDraft(null)}
            >
              إلغاء
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
