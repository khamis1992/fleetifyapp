import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { subscribeToRecordChanges } from '@/services/recordQuerySynchronization';

export function RecordChangeSynchronization() {
  const client = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  useEffect(() => {
    if (!companyId || !user?.id) return;
    return subscribeToRecordChanges(client, companyId);
  }, [client, companyId, user?.id]);
  return null;
}
