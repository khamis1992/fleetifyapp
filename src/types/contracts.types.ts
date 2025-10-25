/**
 * Contract-related TypeScript interfaces
 * Phase 2 UX Improvements - Contract Drafts
 */

export interface ContractDraft {
  id: string;
  company_id: string;
  user_id: string;
  draft_data: Record<string, unknown>; // JSON object with contract form data
  customer_id?: string | null;
  vehicle_id?: string | null;
  draft_name?: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ContractDraftInput {
  draft_data: Record<string, unknown>;
  customer_id?: string | null;
  vehicle_id?: string | null;
  draft_name?: string | null;
}

export interface ContractDraftUpdateInput {
  draft_data?: Record<string, unknown>;
  customer_id?: string | null;
  vehicle_id?: string | null;
  draft_name?: string | null;
}
