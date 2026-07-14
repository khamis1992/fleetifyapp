import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';

export interface CustomerCommunicationRow {
  id: string;
  customer_id: string;
  company_id: string;
  contract_id: string | null;
  communication_type: 'phone' | 'message' | 'meeting' | 'note';
  communication_date: string;
  communication_time: string;
  duration_minutes: number | null;
  employee_id: string;
  notes: string;
  action_required: 'quote' | 'contract' | 'payment' | 'maintenance' | 'renewal' | 'none' | null;
  action_description: string | null;
  follow_up_scheduled: boolean | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  follow_up_status: 'pending' | 'completed' | 'cancelled' | null;
  attachments: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export type CustomerCommunicationInsert = Omit<
  CustomerCommunicationRow,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

interface CustomerCommunicationsDatabase {
  public: {
    Tables: {
      customer_communications: {
        Row: CustomerCommunicationRow;
        Insert: CustomerCommunicationInsert;
        Update: Partial<CustomerCommunicationInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// The table exists in migrations but is missing from the generated database type.
export const customerCommunicationsClient = supabase as unknown as SupabaseClient<CustomerCommunicationsDatabase>;
