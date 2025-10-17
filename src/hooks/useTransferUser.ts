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
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to transfer users');
      }

      // Call our API route instead of RPC directly
      // This allows us to use service role on the backend
      const response = await fetch('/api/admin/transfer-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(transferData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: TransferUserResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed for unknown reasons');
      }

      return result;
    },
  });
};

