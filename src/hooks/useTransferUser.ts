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
      const { data, error } = await supabase.functions.invoke('transfer-user-company', {
        body: transferData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Transfer failed due to a network or server error');
      }

      if (!data.success) {
        console.error('Transfer business logic error:', data);
        const errorMessage = data.error || 'Transfer failed for unknown reasons';
        throw new Error(errorMessage);
      }

      return data;
    },
  });
};