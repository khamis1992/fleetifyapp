import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      // Use RPC function instead of Edge Function
      const { data, error } = await supabase.rpc('transfer_user_to_company', {
        p_user_id: transferData.userId,
        p_from_company_id: transferData.fromCompanyId,
        p_to_company_id: transferData.toCompanyId,
        p_new_roles: transferData.newRoles,
        p_transfer_reason: transferData.transferReason || null,
        p_data_handling_strategy: transferData.dataHandlingStrategy
      });

      if (error) {
        console.error('RPC function error:', error);
        throw new Error(error.message || 'Transfer failed due to a database error');
      }

      // data is the JSONB result from the function
      const result = data as TransferUserResponse;

      if (!result.success) {
        console.error('Transfer business logic error:', result);
        const errorMessage = result.error || 'Transfer failed for unknown reasons';
        throw new Error(errorMessage);
      }

      return result;
    },
  });
};

