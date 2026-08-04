import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('system audit dashboard open-review scope', () => {
  it('uses the latest full run for snapshot findings and cross-run lifecycle only for managed codes', () => {
    const source = read('supabase/functions/system-audit-dashboard/index.ts');
    const loader = source.slice(
      source.indexOf('async function loadOpenReviewFindings'),
      source.indexOf('function summarizeFindings'),
    );

    expect(source).toContain('run.status === "completed" && isFullAudit(run.requested_domains)');
    expect(source).toContain('loadOpenReviewFindings(admin, companyId, latestCompletedFullRun?.id || null)');
    expect(source).toContain('reviewSnapshotComplete: Boolean(latestCompletedFullRun)');
    expect(source).toContain('const openReviewTotals = summarizeFindings(openReviewFindings)');
    expect(source).toContain('pendingReview: (openReviewTotals.status.review || 0)');
    expect(source).toContain('topReviewTypes: openReviewTotals.topReviewTypes');
    expect(loader).toContain('.eq("company_id", companyId)');
    expect(loader).toContain('`run_id.eq.${latestCompletedFullRunId},code.in.(${lifecycleManagedCodes})`');
    expect(loader).toContain('finding.run_id === latestCompletedFullRunId');
    expect(loader).toContain('CROSS_RUN_LIFECYCLE_MANAGED_REVIEW_CODES.has(finding.code)');
    expect(source).toContain('"invoice.month_reconciliation_needs_review"');
  });

  it('deduplicates historical copies by issue entity and target month', () => {
    const source = read('supabase/functions/system-audit-dashboard/index.ts');

    expect(source).toContain('const unique = new Map<string, AgentReviewFinding>()');
    expect(source).toContain('finding.evidence?.target_month');
    expect(source).toContain('if (!unique.has(key)) unique.set(key, finding)');
  });

  it('ships Arabic labels for the new invoice reconciliation review types', () => {
    for (const path of [
      'src/hooks/useSystemAuditDashboard.ts',
      'src/components/tasks/SystemAuditAgentDashboard.tsx',
    ]) {
      const source = read(path);
      expect(source).toContain('invoice.zero_amount_blocks_billing_month');
      expect(source).toContain('invoice.schedule_amount_mismatch_requires_review');
      expect(source).toContain('invoice.month_reconciliation_needs_review');
      expect(source).toContain('contract.missing_billing_graph');
    }
  });

  it('keeps separate tasks per target month and refreshes a task to the current finding', () => {
    const source = read('src/hooks/useSystemAuditDashboard.ts');

    expect(source).toContain('targetMonthFromEvidence(finding.evidence)');
    expect(source).toContain('targetMonth: targetMonthFromEvidence(finding.evidence)');
    expect(source).toContain('tasksToRefresh.push({ id: task.id, seed })');
    expect(source).toContain('metadata?.systemAgentFindingId !== seed.metadata.systemAgentFindingId');
    expect(source).toContain('const companyId = dashboard.companyId');
    expect(source).toContain('const canArchiveStaleTasks = dashboard.reviewSnapshotComplete !== false');
    expect(source).toContain('if (canArchiveStaleTasks) staleTaskIds.push(task.id)');
    expect(source).not.toContain('if (dashboard.reviewSnapshotComplete === false) {');
    expect(source).toContain('.contains("metadata", { source: "system_audit_agent" })');
    expect(source).not.toContain('user?.profile?.company_id || dashboard.companyId');
  });

  it('keeps the system-audit route visible even when customer verification tasks exist', () => {
    const source = read('src/components/tasks/VerificationTasksList.tsx');
    const header = source.slice(
      source.indexOf('<CardHeader'),
      source.indexOf('</CardHeader>'),
    );

    expect(header).toContain('canOpenSystemAudit');
    expect(source).toContain("['manager', 'company_admin', 'super_admin']");
    expect(header).toContain("navigate('/tasks?tab=system-audit')");
  });

  it('enforces the same manager-level access in the dashboard endpoint', () => {
    const source = read('supabase/functions/system-audit-dashboard/index.ts');

    expect(source).toContain('const canReviewSystemAudit = isSuperAdmin');
    expect(source).toContain('["manager", "company_admin"].includes(role.role)');
    expect(source).toContain('System audit review access denied');
  });
});
