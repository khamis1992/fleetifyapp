/**
 * Financial statement notes (إيضاحات) — read/write for BS auto-disclosure.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const financialStatementNoteSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  as_of_date: z.string(),
  account_code: z.string().nullable(),
  note_key: z.string(),
  title_ar: z.string(),
  body_ar: z.string(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type FinancialStatementNote = z.infer<typeof financialStatementNoteSchema>;

function requireCompany(companyId: string | null | undefined): asserts companyId is string {
  if (!companyId) throw new Error("NO_COMPANY_ACCESS");
}

export async function listFinancialStatementNotes(
  companyId: string,
  asOfDate: string,
  opts?: { activeOnly?: boolean }
): Promise<FinancialStatementNote[]> {
  requireCompany(companyId);
  let q = supabase
    .from("financial_statement_notes")
    .select(
      "id, company_id, as_of_date, account_code, note_key, title_ar, body_ar, sort_order, is_active, created_at, updated_at"
    )
    .eq("company_id", companyId)
    .eq("as_of_date", asOfDate)
    .order("sort_order", { ascending: true })
    .order("note_key", { ascending: true });
  if (opts?.activeOnly !== false) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return z.array(financialStatementNoteSchema).parse(data ?? []);
}

export async function listAllFinancialStatementNotes(
  companyId: string
): Promise<FinancialStatementNote[]> {
  requireCompany(companyId);
  const { data, error } = await supabase
    .from("financial_statement_notes")
    .select(
      "id, company_id, as_of_date, account_code, note_key, title_ar, body_ar, sort_order, is_active, created_at, updated_at"
    )
    .eq("company_id", companyId)
    .order("as_of_date", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return z.array(financialStatementNoteSchema).parse(data ?? []);
}

export async function upsertFinancialStatementNote(input: {
  companyId: string;
  id?: string;
  as_of_date: string;
  account_code?: string | null;
  note_key: string;
  title_ar: string;
  body_ar: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<FinancialStatementNote> {
  requireCompany(input.companyId);
  const row = {
    company_id: input.companyId,
    as_of_date: input.as_of_date,
    account_code: input.account_code?.trim() || null,
    note_key: input.note_key.trim(),
    title_ar: input.title_ar.trim(),
    body_ar: input.body_ar.trim(),
    sort_order: input.sort_order ?? 100,
    is_active: input.is_active ?? true,
    ...(input.id ? { id: input.id } : {}),
  };
  const { data, error } = await supabase
    .from("financial_statement_notes")
    .upsert(row, { onConflict: "company_id,as_of_date,note_key" })
    .select(
      "id, company_id, as_of_date, account_code, note_key, title_ar, body_ar, sort_order, is_active, created_at, updated_at"
    )
    .single();
  if (error) throw error;
  return financialStatementNoteSchema.parse(data);
}
