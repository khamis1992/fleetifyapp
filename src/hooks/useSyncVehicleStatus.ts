import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SyncResult {
  vehiclesUpdatedToRented: number;
  vehiclesUpdatedToAvailable: number;
  contractsLinked: number;
  errors: string[];
}

type SyncPayload = {
  status_updates?: number;
  mileage_updates?: number;
  contracts_linked?: number;
};

export function useSyncVehicleStatus() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async (companyId: string): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.rpc('sync_company_vehicle_states_v1', {
        p_company_id: companyId,
      });
      if (error) throw error;
      const payload = (data || {}) as SyncPayload;
      const statusUpdates = Number(payload.status_updates || 0);
      const mileageUpdates = Number(payload.mileage_updates || 0);
      if (statusUpdates || mileageUpdates) {
        toast.success(`تم تصحيح حالة ${statusUpdates} مركبة وعداد ${mileageUpdates} مركبة`);
      } else {
        toast.info('جميع حالات المركبات والعدادات متطابقة');
      }
      return {
        vehiclesUpdatedToRented: statusUpdates,
        vehiclesUpdatedToAvailable: 0,
        contractsLinked: 0,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل مزامنة الأسطول';
      toast.error(message);
      return { vehiclesUpdatedToRented: 0, vehiclesUpdatedToAvailable: 0, contractsLinked: 0, errors: [message] };
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, handleSync };
}
