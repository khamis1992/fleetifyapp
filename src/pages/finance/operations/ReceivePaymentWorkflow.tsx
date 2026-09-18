import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedPaymentForm } from "@/components/finance/UnifiedPaymentForm";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
import { Button } from "@/components/ui/button";
import { financeToday } from "@/services/financialReporting";

/** Daily receipts share the audited payment form and its atomic, idempotent command. */
export default function ReceivePaymentWorkflow() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { companyId } = useUnifiedCompanyAccess();
  const contractReference = params.get("contract") || "";
  const amount = Number(params.get("amount") || 0);
  const contract = useQuery({
    queryKey: ["receipt-contract-context", companyId, contractReference],
    enabled: !!companyId && !!contractReference,
    queryFn: async () => {
      if (!companyId) throw new Error("لم يتم تحديد الشركة.");
      const isId =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          contractReference
        );
      const { data, error } = await supabase
        .from("contracts")
        .select("id, customer_id")
        .eq("company_id", companyId)
        .eq(isId ? "id" : "contract_number", contractReference)
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error("لم يتم العثور على العقد المحدد ضمن الشركة الحالية.");
      return data;
    },
  });
  const backTo = contract.data
    ? `/contracts/${contract.data.id}`
    : "/finance/payments";
  if (contractReference && contract.isLoading)
    return (
      <p role="status" className="p-6">
        جاري تحميل العقد…
      </p>
    );
  if (contract.error)
    return (
      <section dir="rtl" className="space-y-4 p-6">
        <h1 className="text-xl font-bold">استلام دفعة</h1>
        <p role="alert">
          تعذر تحميل العقد المحدد. تحقق من الرابط أو أعد المحاولة.
        </p>
        <Button variant="outline" onClick={() => contract.refetch()}>
          إعادة المحاولة
        </Button>
      </section>
    );
  return (
    <section dir="rtl" className="space-y-4">
      <FinanceContextActions ids={["payments"]} />
      <UnifiedPaymentForm
        key={`${companyId}:${contract.data?.id || ""}:${
          params.get("invoice") || ""
        }`}
        open
        presentation="page"
        type="customer_payment"
        customerId={contract.data?.customer_id || undefined}
        contractId={contract.data?.id}
        invoiceId={params.get("invoice") || undefined}
        initialData={{
          amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
          payment_date: financeToday(),
        }}
        onOpenChange={(open) => {
          if (!open) navigate(backTo);
        }}
        onCancel={() => navigate(backTo)}
        onSuccess={() => navigate(backTo)}
      />
    </section>
  );
}
