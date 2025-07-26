import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ContractRenewalData {
  contract_id: string;
  new_end_date: string;
  new_amount?: number;
  renewal_terms?: string;
  auto_renew?: boolean;
  renewal_period_months?: number;
}

// Hook to get contracts expiring soon
export const useExpiringContracts = (daysAhead: number = 30) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["expiring-contracts", user?.profile?.company_id, daysAhead],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          customer:customers(first_name, last_name, company_name, customer_type),
          vehicle:vehicles(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)
        .eq("status", "active")
        .lte("end_date", futureDate.toISOString().split('T')[0])
        .order("end_date", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id
  });
};

// Hook to renew a contract
export const useRenewContract = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (renewalData: ContractRenewalData) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");
      
      // Get the original contract
      const { data: originalContract, error: fetchError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", renewalData.contract_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create a new contract based on the original
      const { data: newContract, error } = await supabase
        .from("contracts")
        .insert({
          contract_number: `${originalContract.contract_number}-R${Date.now()}`,
          contract_date: new Date().toISOString().split('T')[0],
          start_date: originalContract.end_date,
          end_date: renewalData.new_end_date,
          contract_amount: renewalData.new_amount || originalContract.contract_amount,
          monthly_amount: originalContract.monthly_amount,
          contract_type: originalContract.contract_type,
          customer_id: originalContract.customer_id,
          vehicle_id: originalContract.vehicle_id,
          cost_center_id: originalContract.cost_center_id,
          description: `تجديد ${originalContract.description || ''}`,
          terms: renewalData.renewal_terms || originalContract.terms,
          status: 'active',
          company_id: user.profile.company_id,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the original contract status to 'renewed'
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: 'renewed' })
        .eq("id", renewalData.contract_id);
      
      if (updateError) throw updateError;
      
      return newContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-contracts-for-renewal"] });
      toast.success("تم تجديد العقد بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في تجديد العقد: " + error.message);
    }
  });
};

// Hook to auto-renew eligible contracts
export const useAutoRenewContracts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");
      
      // Get contracts that are expiring in 7 days and have auto-renewal enabled
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const { data: contractsToRenew, error: fetchError } = await supabase
        .from("contracts")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("status", "active")
        .lte("end_date", sevenDaysFromNow.toISOString().split('T')[0]);
      
      if (fetchError) throw fetchError;
      
      const renewedContracts = [];
      
      for (const contract of contractsToRenew || []) {
        // Calculate new end date (add same duration)
        const startDate = new Date(contract.start_date);
        const endDate = new Date(contract.end_date);
        const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const newEndDate = new Date(contract.end_date);
        newEndDate.setDate(newEndDate.getDate() + durationDays);
        
        // Create renewed contract
        const { data: newContract, error } = await supabase
          .from("contracts")
          .insert({
            contract_number: `${contract.contract_number}-AR${Date.now()}`,
            contract_date: new Date().toISOString().split('T')[0],
            start_date: contract.end_date,
            end_date: newEndDate.toISOString().split('T')[0],
            contract_amount: contract.contract_amount,
            monthly_amount: contract.monthly_amount,
            contract_type: contract.contract_type,
            customer_id: contract.customer_id,
            vehicle_id: contract.vehicle_id,
            cost_center_id: contract.cost_center_id,
            description: `تجديد تلقائي ${contract.description || ''}`,
            terms: contract.terms,
            status: 'active',
            company_id: user.profile.company_id,
            created_by: user.id
          })
          .select()
          .single();
        
        if (!error) {
          // Update original contract
          await supabase
            .from("contracts")
            .update({ status: 'renewed' })
            .eq("id", contract.id);
          
          renewedContracts.push(newContract);
        }
      }
      
      return renewedContracts;
    },
    onSuccess: (renewedContracts) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-contracts"] });
      if (renewedContracts.length > 0) {
        toast.success(`تم تجديد ${renewedContracts.length} عقد تلقائياً`);
      }
    },
    onError: (error) => {
      toast.error("خطأ في التجديد التلقائي: " + error.message);
    }
  });
};

// Hook to suspend/cancel contracts
export const useUpdateContractStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ contractId, status, reason }: { 
      contractId: string; 
      status: 'suspended' | 'cancelled' | 'active'; 
      reason?: string 
    }) => {
      const updateData: any = { status };
      
      if (reason) {
        updateData.description = reason;
      }
      
      const { data, error } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", contractId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      const statusText = variables.status === 'suspended' ? 'تعليق' : 
                        variables.status === 'cancelled' ? 'إلغاء' : 'تفعيل';
      toast.success(`تم ${statusText} العقد بنجاح`);
    },
    onError: (error) => {
      toast.error("خطأ في تحديث حالة العقد: " + error.message);
    }
  });
};