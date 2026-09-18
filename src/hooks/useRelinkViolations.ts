import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AssignmentCandidate {
  contract_id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  start_date: string;
  end_date: string;
}
export interface ViolationAssignment {
  id: string;
  penalty_number: string;
  penalty_date: string;
  amount: number;
  vehicle_plate: string | null;
  vehicle_id: string | null;
  ready: boolean;
  reason: string;
  token: string;
  candidates: AssignmentCandidate[];
}

// These RPCs are introduced by 20260906200000_customer_violation_assignment.sql.
// Keep the narrow adapter here until generated database types are refreshed.
type AssignmentRpc = (
  name: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;
const assignmentRpc = (supabase.rpc as unknown as AssignmentRpc).bind(supabase);

export function useRelinkViolations(companyId: string | null | undefined) {
  const client = useQueryClient();
  const preview = useQuery({
    queryKey: ["traffic-violation-assignment-preview", companyId],
    enabled: Boolean(companyId),
    retry: false,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await assignmentRpc(
        "preview_customer_violation_assignments_v1",
        { p_company_id: companyId }
      );
      if (error) throw new Error(/PGRST202|Could not find the function|schema cache/i.test(error.message)
        ? 'ميزة الإسناد بانتظار نشر تحديث قاعدة البيانات. لم تُغيّر أي مخالفة.' : error.message);
      if (!Array.isArray(data)) throw new Error("تعذر قراءة معاينة الإسناد");
      return data as ViolationAssignment[];
    },
  });
  const assignment = useMutation({
    mutationFn: async (items: ViolationAssignment[]) => {
      if (
        !companyId ||
        items.length < 1 ||
        items.length > 50 ||
        items.some((item) => !item.ready)
      ) {
        throw new Error("اختر من 1 إلى 50 مخالفة جاهزة للإسناد");
      }
      const { data, error } = await assignmentRpc(
        "assign_customer_violations_v1",
        {
          p_company_id: companyId,
          p_items: items.map(({ id, token }) => ({ id, token })),
        }
      );
      if (error) throw new Error(error.message);
      return data as { assigned: number };
    },
    onSuccess: (data) => {
      toast.success(`تم إسناد ${data.assigned} مخالفة للعملاء وتسجيل العملية`);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: async () => {
      // Refresh the customer, contract, legal and financial views that consume penalties too.
      await client.invalidateQueries({
        predicate: ({ queryKey }) =>
          queryKey.some(
            (key) =>
              typeof key === "string" &&
              /traffic|violation|penalt|customer|contract|legal|collection/.test(
                key
              )
          ),
      });
    },
  });
  return { preview, assignment };
}
