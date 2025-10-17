import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferUserRequest {
  userId: string;
  fromCompanyId: string;
  toCompanyId: string;
  newRoles: string[];
  transferReason?: string;
  dataHandlingStrategy: {
    contracts: 'move' | 'keep' | 'copy';
    invoices: 'move' | 'keep' | 'copy';
    vehicles: 'move' | 'keep' | 'copy';
    other: 'move' | 'keep' | 'copy';
  };
}

interface TransferUserResponse {
  success: boolean;
  transferLogId?: string;
  message?: string;
  error?: string;
}

export const useTransferUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation<TransferUserResponse, Error, TransferUserRequest>({
    mutationFn: async (transferData) => {
      console.log("🔄 ===== STARTING USER TRANSFER =====");
      console.log("📋 Transfer Data:", JSON.stringify(transferData, null, 2));

      // Validate input data
      if (!transferData.userId) {
        throw new Error('User ID is required');
      }
      if (!transferData.toCompanyId) {
        throw new Error('Target company ID is required');
      }
      if (!transferData.newRoles || transferData.newRoles.length === 0) {
        throw new Error('At least one role is required');
      }

      console.log("✅ Input validation passed");
      console.log("🔄 Calling RPC function: transfer_user_to_company");
      console.log("📤 RPC Parameters:", {
        p_user_id: transferData.userId,
        p_target_company_id: transferData.toCompanyId,
        p_new_roles: transferData.newRoles,
        p_reason: transferData.transferReason || null,
      });

      // Call the RPC function directly with proper parameters
      const { data, error } = await supabase.rpc("transfer_user_to_company", {
        p_user_id: transferData.userId,
        p_target_company_id: transferData.toCompanyId,
        p_new_roles: transferData.newRoles,
        p_reason: transferData.transferReason || null,
      });

      console.log("📥 RPC Response - Data:", data);
      console.log("📥 RPC Response - Error:", error);

      if (error) {
        console.error("❌ ===== TRANSFER RPC ERROR =====");
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        console.error("Error Details:", error.details);
        console.error("Error Hint:", error.hint);
        throw new Error(error.message || 'فشل نقل المستخدم');
      }

      console.log("✅ ===== TRANSFER SUCCESSFUL =====");
      console.log("Transfer Log ID:", data);

      return {
        success: true,
        transferLogId: data,
        message: 'تم نقل المستخدم بنجاح'
      };
    },
    onSuccess: (data, variables) => {
      console.log("✅ ===== MUTATION SUCCESS CALLBACK =====");
      console.log("Success Data:", data);
      console.log("Variables:", variables);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      toast.success(data.message || 'تم نقل المستخدم بنجاح');
    },
    onError: (error: Error, variables) => {
      console.error("❌ ===== MUTATION ERROR CALLBACK =====");
      console.error("Error:", error);
      console.error("Error Message:", error.message);
      console.error("Variables:", variables);
      
      toast.error(error.message || 'فشل نقل المستخدم');
    },
  });
};

