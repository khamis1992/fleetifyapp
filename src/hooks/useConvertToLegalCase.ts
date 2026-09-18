import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { DelinquentCustomer } from "./useDelinquentCustomers";

export interface ConvertToCaseData {
  delinquentCustomer: DelinquentCustomer;
  additionalNotes?: string;
  attachments?: string[];
}

type LegalCaseSummary = {
  id: string;
  case_number: string;
};

type ConvertLegalResult = {
  legal_case: LegalCaseSummary;
  case_number: string;
  total_case_value: number;
  blocked?: boolean;
  message_ar?: string;
};

const priorityForRisk = (riskScore: number) => {
  if (riskScore >= 85) return "urgent";
  if (riskScore >= 70) return "high";
  if (riskScore >= 60) return "medium";
  return "low";
};

const buildConversionNotes = ({
  delinquentCustomer,
  additionalNotes,
  attachments,
}: ConvertToCaseData) => {
  const details = [
    `العميل: ${delinquentCustomer.customer_name}`,
    `العقد: ${delinquentCustomer.contract_number}`,
    `أيام التأخير: ${delinquentCustomer.days_overdue}`,
    `إجمالي المديونية المعروضة: ${delinquentCustomer.total_debt} ر.ق`,
    additionalNotes?.trim(),
    attachments?.length
      ? `مراجع المرفقات: ${attachments.join(", ")}`
      : undefined,
  ];

  return details.filter(Boolean).join("\n");
};

const convertDelinquentCustomer = async (
  companyId: string,
  actorId: string,
  input: ConvertToCaseData,
) => {
  const contractId = input.delinquentCustomer.contract_id;
  if (!contractId) {
    throw new Error("لا يمكن إنشاء قضية دون عقد مرتبط بالمديونية");
  }

  const { data, error } = await supabase.rpc("convert_contract_to_legal_v1", {
    p_company_id: companyId,
    p_contract_id: contractId,
    p_notes: buildConversionNotes(input),
    p_priority: priorityForRisk(input.delinquentCustomer.risk_score),
    p_case_type: "payment_collection",
    p_vehicle_returned: false,
    p_actor_id: actorId,
  });

  if (error) throw error;

  const result = data as unknown as ConvertLegalResult;
  if (result?.blocked) {
    throw new Error(
      result.message_ar
      || "لا توجد نسخة عقد PDF مطابقة للعميل. تم إنشاء طلب واتساب تلقائي للمسؤولين.",
    );
  }
  if (!result?.legal_case?.id || !result.case_number) {
    throw new Error("لم تُرجع عملية التحويل بيانات القضية القانونية");
  }

  return {
    ...result.legal_case,
    case_number: result.case_number,
    total_case_value: Number(result.total_case_value || 0),
  };
};

const invalidateLegalConversionQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  [
    "delinquent-customers",
    "legal-cases",
    "legal-case-stats",
    "legal-collection-report",
    "legal-collection-stats",
    "delinquency-stats",
    "contracts",
    "contract-details",
    "vehicles",
  ].forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  });
};

export const useConvertToLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConvertToCaseData) => {
      const companyId = user?.profile?.company_id;
      if (!user?.id || !companyId) {
        throw new Error("المستخدم غير مصرح له أو غير مرتبط بشركة");
      }

      return convertDelinquentCustomer(companyId, user.id, input);
    },
    onSuccess: (legalCase) => {
      invalidateLegalConversionQueries(queryClient);
      toast.success("تم إنشاء القضية القانونية وربطها بالعقد", {
        description: `رقم القضية: ${legalCase.case_number}`,
      });
    },
    onError: (error: Error) => {
      toast.error("تعذر تحويل المديونية إلى قضية قانونية", {
        description: error.message,
      });
    },
  });
};

export const useBulkConvertToLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delinquentCustomers: DelinquentCustomer[]) => {
      const companyId = user?.profile?.company_id;
      if (!user?.id || !companyId) {
        throw new Error("المستخدم غير مصرح له أو غير مرتبط بشركة");
      }

      const results: Awaited<ReturnType<typeof convertDelinquentCustomer>>[] = [];
      const errors: Array<{ customer: string; error: unknown }> = [];

      for (const delinquentCustomer of delinquentCustomers) {
        try {
          results.push(
            await convertDelinquentCustomer(companyId, user.id, {
              delinquentCustomer,
            }),
          );
        } catch (error) {
          errors.push({ customer: delinquentCustomer.customer_name, error });
        }
      }

      return { results, errors };
    },
    onSuccess: ({ results, errors }) => {
      invalidateLegalConversionQueries(queryClient);
      toast.success(`تم إنشاء ${results.length} قضية قانونية`, {
        description: errors.length
          ? `تعذر إنشاء ${errors.length} قضية، ولم تُحفظ لها تغييرات جزئية`
          : undefined,
      });
    },
    onError: (error: Error) => {
      toast.error("تعذرت عملية التحويل الجماعي", {
        description: error.message,
      });
    },
  });
};
