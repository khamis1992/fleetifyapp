import { useMutation } from '@tanstack/react-query';
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
  return useMutation<TransferUserResponse, Error, TransferUserRequest>({
    mutationFn: async (transferData) => {
      console.log("🔄 Starting user transfer via RPC:", transferData);

      // Call the RPC function directly with proper parameters
      const { data, error } = await supabase.rpc("transfer_user_to_company", {
        p_user_id: transferData.userId,
        p_target_company_id: transferData.toCompanyId,
        p_new_roles: transferData.newRoles,
        p_reason: transferData.transferReason || null,
      });

      if (error) {
        console.error("❌ Transfer RPC error:", error);
        throw new Error(error.message || 'فشل نقل المستخدم');
      }

      console.log("✅ Transfer RPC successful:", data);

      return {
        success: true,
        transferLogId: data,
        message: 'تم نقل المستخدم بنجاح'
      };
    },
    onSuccess: (data) => {
      console.log("✅ Transfer mutation success:", data);
      toast.success(data.message || 'تم نقل المستخدم بنجاح');
    },
    onError: (error: Error) => {
      console.error("❌ Transfer mutation error:", error);
      toast.error(error.message || 'فشل نقل المستخدم');
    },
  });
};

