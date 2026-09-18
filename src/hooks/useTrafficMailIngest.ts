import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrafficMailStatus {
  configured: boolean;
  state: {
    graph_folder_name: string | null;
    last_sync_at: string | null;
    last_sync_status: 'never' | 'running' | 'success' | 'error';
    last_error: string | null;
    last_result: Record<string, number | string | boolean>;
  } | null;
}

async function invokeTrafficMail(companyId: string, action: 'status' | 'sync') {
  const { data, error } = await supabase.functions.invoke('ingest-traffic-mail', {
    body: { companyId, action },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useTrafficMailIngest(companyId?: string | null) {
  const queryClient = useQueryClient();
  const requireCompanyId = () => {
    if (!companyId) throw new Error('تعذر تحديد الشركة الحالية');
    return companyId;
  };
  const status = useQuery<TrafficMailStatus>({
    queryKey: ['traffic-mail-ingest-status', companyId],
    enabled: Boolean(companyId),
    queryFn: () => invokeTrafficMail(requireCompanyId(), 'status'),
    staleTime: 30_000,
    retry: false,
  });
  const sync = useMutation({
    mutationFn: () => invokeTrafficMail(requireCompanyId(), 'sync'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['traffic-mail-ingest-status', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
    },
  });
  return { status, sync };
}
