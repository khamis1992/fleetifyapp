import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';

export interface VehicleHandoffConsent {
  contractId: string;
  updatedAt: string;
  reason: string;
}

// Keep this new endpoint typed at the boundary until the generated schema is
// refreshed; expanding its large generic union exceeds TypeScript's depth limit.
type HandoffRpc = (name: 'create_contract_with_vehicle_handoff_v1', args: {
  p_creation_args: Json; p_previous_contract_id: string; p_expected_updated_at: string; p_reason: string;
}) => PromiseLike<{ data: Json | null; error: PostgrestError | null }>;

/** Both writes must run in one database transaction; never cancel from the browser first. */
export function createContractWithHandoff(
  creationArgs: Record<string, unknown>, consent?: VehicleHandoffConsent,
) {
  const args = { ...creationArgs };
  // Zero is the default on both creator versions; omitting it also supports
  // installations where the optional deposit migration has not been applied.
  if (Number(args.p_deposit_amount || 0) === 0) delete args.p_deposit_amount;
  if (consent) {
    const client = supabase as unknown as { rpc: HandoffRpc };
    return client.rpc('create_contract_with_vehicle_handoff_v1', {
      p_creation_args: args as Json,
      p_previous_contract_id: consent.contractId,
      p_expected_updated_at: consent.updatedAt,
      p_reason: consent.reason,
    });
  }
  return supabase.rpc('create_contract_with_violation_override_atomic', args as never);
}
