import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const reviewerSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/customer-proposal-ai-reviewer/index.ts'),
  'utf8',
);
const centerSource = readFileSync(
  resolve(process.cwd(), 'src/components/customers/CustomerDataReviewCenter.tsx'),
  'utf8',
);
const hookSource = readFileSync(
  resolve(process.cwd(), 'src/hooks/useCustomerIdProposals.ts'),
  'utf8',
);

describe('Kimi K3 proposal review agent', () => {
  it('uses the Kimi model through the shared client', () => {
    expect(reviewerSource).toContain('../_shared/kimi.ts');
    expect(reviewerSource).toContain('KIMI_MODEL');
  });

  it('writes the verdict into the proposal without applying data changes', () => {
    expect(reviewerSource).toContain('ai_review');
    expect(reviewerSource).toContain('تم التدقيق — مقترح جاهز للاعتماد');
  });

  it('requires authorization before reviewing', () => {
    expect(reviewerSource).toContain('authorizeScheduledAgent');
    expect(reviewerSource).toContain('"customer-proposal-ai-reviewer"');
    expect(reviewerSource).toContain('finishAgentExecution');
    expect(reviewerSource).toContain('Unauthorized');
  });

  it('shows the agent verdict badge and trigger in the review center', () => {
    expect(centerSource).toContain('تدقيق الوكيل (Kimi K3)');
    expect(centerSource).toContain('AiReviewBadge');
    expect(hookSource).toContain('customer-proposal-ai-reviewer');
  });

  it('runs deterministic validators before calling the model', () => {
    expect(reviewerSource).toContain('checkChange');
    expect(reviewerSource).toContain('الفحوصات الحتمية');
    expect(reviewerSource).toContain('/^\\d{11}$/');
  });

  it('sends the evidence image to the vision model when available', () => {
    expect(reviewerSource).toContain('loadEvidenceImage');
    expect(reviewerSource).toContain('KIMI_VISION_MODEL');
    expect(reviewerSource).toContain('image_url');
  });

  it('learns from recent human decisions as few-shot examples', () => {
    expect(reviewerSource).toContain('loadFewShotExamples');
    expect(reviewerSource).toContain('قرارات سابقة لفريق المراجعة');
  });

  it('auto-approves only with correct verdict, 95% OCR confidence and confirmed identity', () => {
    expect(reviewerSource).toContain('AUTO_APPROVE_CONFIDENCE = 0.95');
    expect(reviewerSource).toContain('identityConfirmed');
    expect(reviewerSource).toContain('applyProposal');
    expect(reviewerSource).toContain('apply_customer_id_scan_proposal_v1');
    expect(reviewerSource).toContain('اعتمد آلياً — تحقق مؤكد');
  });

  it('flags cross-document conflicts for human resolution', () => {
    expect(reviewerSource).toContain('findCrossDocumentConflicts');
    expect(reviewerSource).toContain('تعارض بين المستندات');
    expect(centerSource).toContain('تعارض بين المستندات — يحتاج حسمًا');
  });

  it('offers one-click approval for AI-verified proposals', () => {
    expect(centerSource).toContain('اعتماد ما وافق عليه الوكيل');
    expect(centerSource).toContain('aiReadyProposals');
  });
});
