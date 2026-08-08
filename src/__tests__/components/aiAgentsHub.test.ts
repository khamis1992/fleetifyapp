import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const migration = read('supabase/migrations/20260808150439_ai_agent_reviews_hub.sql');
const journalAgent = read('supabase/functions/journal-entry-ai-reviewer/index.ts');
const legalAgent = read('supabase/functions/legal-case-ai-reviewer/index.ts');
const closeoutAgent = read('supabase/functions/daily-closeout-ai-reviewer/index.ts');
const collectionAgent = read('supabase/functions/collection-message-agent/index.ts');
const autofillAgent = read('supabase/functions/customer-id-autofill-agent/index.ts');
const matchAgent = read('supabase/functions/payment-match-agent/index.ts');
const verifierAgent = read('supabase/functions/correction-verifier-agent/index.ts');
const hook = read('src/hooks/useAgentReviews.ts');

describe('Kimi K3 agents hub', () => {
  it('stores all agent verdicts in a company-isolated table', () => {
    expect(migration).toContain('CREATE TABLE public.ai_agent_reviews');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('get_user_company_id');
  });

  it('journal reviewer enforces deterministic balance checks before the model', () => {
    expect(journalAgent).toContain('deterministicIssues');
    expect(journalAgent).toContain('القيد غير متوازن');
    expect(journalAgent).toContain('حساب رئيسي غير قابل للترحيل');
  });

  it('legal case reviewer checks claim amount against invoices and documents', () => {
    expect(legalAgent).toContain('مبلغ المطالبة');
    expect(legalAgent).toContain('نسخة العقد الموقعة غير موجودة');
    expect(legalAgent).toContain('violations_proof');
  });

  it('closeout reviewer compares claims with actual system activity', () => {
    expect(closeoutAgent).toContain('actualCollected');
    expect(closeoutAgent).toContain('deterministic_flags');
  });

  it('collection agent personalizes messages from payment history', () => {
    expect(collectionAgent).toContain('سجل السداد');
    expect(collectionAgent).toContain('settlement');
  });

  it('autofill agent reads ID cards with the vision model', () => {
    expect(autofillAgent).toContain('KIMI_VISION_MODEL');
    expect(autofillAgent).toContain('national_id');
  });

  it('payment match agent scores candidate invoices', () => {
    expect(matchAgent).toContain('candidate_index');
    expect(matchAgent).toContain('payment_match');
  });

  it('correction verifier checks employee edits against OCR evidence', () => {
    expect(verifierAgent).toContain('legal_transfer_employee_reviews');
    expect(verifierAgent).toContain('raw_text');
  });

  it('routes every agent type to its edge function', () => {
    for (const fn of [
      'journal-entry-ai-reviewer', 'legal-case-ai-reviewer', 'daily-closeout-ai-reviewer',
      'collection-message-agent', 'customer-id-autofill-agent', 'payment-match-agent',
      'correction-verifier-agent',
    ]) {
      expect(hook).toContain(fn);
    }
  });
});
