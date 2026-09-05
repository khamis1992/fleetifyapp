import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const policy = read('supabase/migrations/20260827204249_agent_safety_kernel.sql');
const containment = read('supabase/migrations/20260828113000_agent_failure_containment_and_escalation.sql');
const rollback = read('supabase/rollbacks/20260828113000_agent_failure_containment_and_escalation.rollback.sql');
const verifier = read('scripts/verify-agent-safety-readiness.mjs');
const invoiceGenerator = read('supabase/functions/generate-monthly-invoices/index.ts');
const historicalBackfill = read('supabase/functions/backfill-historical-invoices/index.ts');
const depreciationAgent = read('supabase/functions/monthly-vehicle-depreciation/index.ts');
const paymentReminders = read('supabase/functions/process-payment-reminders/index.ts');
const orchestrator = read('supabase/functions/system-audit-orchestrator/index.ts');
const auditRuntime = read('supabase/functions/_shared/system-audit/runtime.ts');
const legacyLegalCases = read('supabase/functions/check-legal-case-triggers/index.ts');
const legacyDailyAudit = read('supabase/functions/daily-audit-agent/index.ts');
const legacyDailyReport = read('supabase/functions/send-daily-report/index.ts');
const legacyWeeklyReport = read('supabase/functions/send-weekly-report/index.ts');
const legacyReminderAdapter = read('supabase/functions/send-whatsapp-reminders/index.ts');
const trafficMailIngest = read('supabase/functions/ingest-traffic-mail/index.ts');
const scanInvoice = read('supabase/functions/scan-invoice/index.ts');
const legacyTaqadiEndpoints = [
  read('supabase/functions/auto-submit-taqadi/index.ts'),
  read('supabase/functions/manus-taqadi/index.ts'),
  read('supabase/functions/taqadi-automation/index.ts'),
];
const legacyTrafficFine = read('supabase/functions/process-traffic-fine/index.ts');
const legacyMonitoringCollector = read('supabase/functions/monitoring-collector/index.ts');
const excelImportReviewer = read('supabase/functions/excel-import-ai-review/index.ts');
const createUserAccount = read('supabase/functions/create-user-account/index.ts');
const legacyTransferUser = read('supabase/functions/transfer-user-company/index.ts');
const privilegedAdmin = read('supabase/functions/_shared/privileged-admin.ts');
const legacyWhatsappDocument = read('supabase/functions/send-whatsapp-document/index.ts');
const browserWhatsapp = read('src/utils/whatsappWebSender.ts');
const browserWhatsappProvider = read('src/services/whatsapp/WhatsAppService.ts');
const config = read('supabase/config.toml');

describe('complete autonomous-agent governance inventory', () => {
  it('maps live financial and collection schedulers to their exact runtime identities', () => {
    for (const agentId of [
      'system-audit-orchestrator',
      'generate-monthly-invoices',
      'monthly-vehicle-depreciation',
      'payment-reminder-agent',
    ]) {
      expect(policy).toContain(`'${agentId}'`);
      expect(containment).toContain(`'${agentId}'`);
      expect(verifier).toContain(`'${agentId}'`);
    }
    expect(policy).not.toContain("'daily-invoice-generation'");
    expect(policy).toContain("'system-audit-orchestrator-v14'");
    expect(containment).toContain("'agent_secret_system_audit_orchestrator'");
    expect(containment).toContain("'agent_secret_generate_monthly_invoices'");
    expect(containment).toContain("'agent_secret_monthly_vehicle_depreciation'");
    expect(containment).toContain("'agent_secret_payment_reminders'");
    expect(containment).toContain("'agent_secret_traffic_mail_ingest'");
    expect(verifier).toContain('REQUIRED_MACHINE_IDENTITIES');
    expect(verifier).toContain('identity:${agentId}');
    expect(verifier).toContain('company_scoped:');
  });

  it('replaces the dead depreciation endpoint with a governed atomic posting agent', () => {
    expect(policy).toContain("'monthly-vehicle-depreciation'");
    expect(verifier).toContain("'monthly-vehicle-depreciation'");
    expect(depreciationAgent).toContain('authorizeScheduledAgent');
    expect(depreciationAgent).toContain('authorizePrivilegedCompanyActor');
    expect(depreciationAgent).toContain('process_vehicle_depreciation_monthly_agent_v1');
    expect(depreciationAgent).toContain('finishAgentExecution');
    expect(containment).toContain("'monthly-vehicle-depreciation'");
    expect(containment).toContain('/functions/v1/monthly-vehicle-depreciation');
    expect(containment).toContain('DEPRECIATION_POSTCONDITION_FAILED');
    expect(containment).toContain('record_agent_mutation_v1');
    expect(containment).toContain('FUTURE_DEPRECIATION_FORBIDDEN');
    expect(config).toMatch(/\[functions\.monthly-vehicle-depreciation\]\s*verify_jwt\s*=\s*false/);
  });

  it('governs historical invoice backfill and removes its reusable shared secret', () => {
    expect(policy).toContain("'historical-invoice-backfill'");
    expect(verifier).toContain("'historical-invoice-backfill'");
    expect(historicalBackfill).toContain('authorizePrivilegedCompanyActor');
    expect(historicalBackfill).toContain('authorizeGovernedAgent');
    expect(historicalBackfill).toContain('"historical-invoice-backfill"');
    expect(historicalBackfill).toContain('finishAgentExecution');
    expect(historicalBackfill).not.toContain('INVOICE_GENERATOR_SECRET');
    expect(historicalBackfill).toContain('clampInt(body.maxContracts, 1, 200, 100)');
  });

  it('guards privileged account creation and retires the duplicate transfer writer', () => {
    expect(privilegedAdmin).toContain('auth.getUser(token)');
    expect(privilegedAdmin).toContain('Request-body actor IDs are deliberately ignored');
    expect(createUserAccount).toContain('authorizePrivilegedCompanyActor');
    expect(createUserAccount).toContain('finalize_user_account_creation_v1');
    expect(createUserAccount).toContain('admin.auth.admin.deleteUser(createdAuthUserId)');
    expect(createUserAccount).toContain('Never reset an existing account');
    expect(createUserAccount).not.toContain('Request body:');
    expect(legacyTransferUser).toContain('Legacy transfer endpoint retired');
    expect(legacyTransferUser).toContain('status: 410');
    expect(containment).toContain('SUPER_ADMIN_REQUIRED');
    expect(containment).toContain('USER_PROFILE_NOT_FOUND_IN_SOURCE_COMPANY');
    expect(containment).toContain('BUSINESS_DATA_TRANSFER_NOT_IMPLEMENTED_USE_KEEP');
    expect(containment).toContain('WHERE profile.user_id = p_user_id');
  });

  it('requires company scope and shared safety authorization in invoice and reminder writers', () => {
    for (const source of [invoiceGenerator, paymentReminders]) {
      expect(source).toContain('authorizeScheduledAgent');
      expect(source).toContain('companyId is required');
      expect(source).toContain('finishAgentExecution');
    }
    expect(invoiceGenerator).toContain('"generate-monthly-invoices"');
    expect(paymentReminders).toContain('"payment-reminder-agent"');
    expect(paymentReminders).toContain('.eq("company_id", companyId)');
    expect(paymentReminders).not.toContain('function authorizePaymentReminders');
    expect(invoiceGenerator).not.toContain('function authorizeInvoiceGenerator');
  });

  it('replaces dead legacy WhatsApp cron rows with the claimed reminder pipeline', () => {
    for (const job of [
      'whatsapp-reminder-day28-pre-due',
      'whatsapp-reminder-day2-overdue',
      'whatsapp-reminder-day5-final-warning',
      'whatsapp-reminder-day10-legal-action',
    ]) expect(containment).toContain(`'${job}'`);
    expect(containment).toMatch(/cron\.schedule\(\s*'process-payment-reminders'/);
    expect(legacyReminderAdapter).toContain('Legacy bulk sender disabled; use process-payment-reminders');
    expect(paymentReminders).toContain('claim_automated_invoice_reminder_delivery');
    expect(paymentReminders).toContain('complete_automated_invoice_reminder_delivery');
  });

  it('governs the current system-audit release while preserving its internal worker boundary', () => {
    expect(auditRuntime).toContain('authorizeScheduledAgent');
    expect(auditRuntime).toContain('"system-audit-orchestrator"');
    expect(orchestrator).toContain('await authorizeSystemAgent(req, body.companyId)');
    expect(orchestrator).toContain('finishAgentExecution');
    expect(containment).toContain('system-audit-orchestrator-v14');
    expect(containment).not.toContain("name = 'audit_agent_secret'");
  });

  it('retires bypass writers and removes embedded WhatsApp credentials', () => {
    expect(legacyLegalCases).toContain('Legacy automatic legal-case trigger retired');
    expect(legacyLegalCases).toContain('status: 410');
    expect(legacyDailyAudit).toContain('Legacy daily-audit writer retired');
    expect(legacyDailyAudit).toContain('body.dryRun === false');
    expect(legacyDailyReport).toContain('Legacy daily WhatsApp report agent retired');
    expect(legacyWeeklyReport).toContain('Legacy weekly WhatsApp report agent retired');
    expect(legacyDailyReport).toContain("Deno.env.get('ULTRAMSG_TOKEN')");
    expect(legacyWeeklyReport).toContain("Deno.env.get('ULTRAMSG_TOKEN')");
    expect(legacyDailyReport).not.toMatch(/ULTRAMSG_TOKEN\s*=\s*['"][^'"]+['"]/);
    expect(legacyWeeklyReport).not.toMatch(/ULTRAMSG_TOKEN\s*=\s*['"][^'"]+['"]/);
    for (const retired of [
      'daily-audit-agent',
      'legacy-legal-case-trigger',
      'legacy-daily-report-agent',
      'legacy-weekly-report-agent',
    ]) {
      expect(policy).toContain(`'${retired}'`);
      expect(verifier).toContain(`'${retired}'`);
    }
  });

  it('retires every legacy Taqadi browser bypass in favor of the guarded filing queue', () => {
    for (const endpoint of legacyTaqadiEndpoints) {
      expect(endpoint).toContain('LEGACY_TAQADI_BYPASS_RETIRED');
      expect(endpoint).toContain('status: 410');
      expect(endpoint).toContain('taqadi_filing_jobs');
    }
  });

  it('fails invoice OCR closed when the user has no active company membership', () => {
    expect(scanInvoice).not.toContain("let companyId = 'default-company'");
    expect(scanInvoice).toContain(".eq('user_id', user.id)");
    expect(scanInvoice).toContain(".eq('is_active', true)");
    expect(scanInvoice).toContain("error: 'Active company membership required'");
  });

  it('governs traffic-mail writes and quarantines ambiguous plate or contract matches', () => {
    expect(policy).toMatch(/'traffic-mail-ingest'[^\n]+?'auto_apply'/);
    expect(trafficMailIngest).toContain('authorizeScheduledAgent');
    expect(trafficMailIngest).toContain('"traffic-mail-ingest"');
    expect(trafficMailIngest).toContain('finishAgentExecution');
    expect(trafficMailIngest).not.toContain('MOI_MAIL_SECRET');
    expect(trafficMailIngest).toContain('ambiguous_vehicle_plate');
    expect(trafficMailIngest).toContain('ambiguous_contract_on_violation_date');
    expect(trafficMailIngest).toContain('.limit(2)');
    expect(containment).toContain('invoke_traffic_mail_ingest_v2');
    expect(containment).toContain("'traffic-mail-ingest-v1'");
    expect(containment).not.toContain('moi_mail_secret');
  });

  it('retires fuzzy traffic-fine ingestion and governs Excel import staging', () => {
    expect(legacyTrafficFine).toContain('LEGACY_TRAFFIC_FINE_WEBHOOK_RETIRED');
    expect(legacyTrafficFine).toContain('status: 410');
    expect(policy).toContain("'legacy-traffic-fine-webhook'");
    expect(verifier).toContain("'legacy-traffic-fine-webhook'");
    expect(policy).toMatch(/'excel-import-ai-reviewer'[^\n]+?'propose'/);
    expect(excelImportReviewer).toContain('authorizeGovernedAgent');
    expect(excelImportReviewer).toContain('"excel-import-ai-reviewer"');
    expect(excelImportReviewer).toContain('finishAgentExecution');
    expect(excelImportReviewer).toContain('companyId is required');
  });

  it('retires the service-role monitoring collector in favor of signed ingestion', () => {
    expect(legacyMonitoringCollector).toContain('LEGACY_MONITORING_COLLECTOR_RETIRED');
    expect(legacyMonitoringCollector).toContain('status: 410');
    expect(legacyMonitoringCollector).toContain('api-monitoring-webhook');
    expect(policy).toContain("'legacy-monitoring-collector'");
    expect(verifier).toContain("'legacy-monitoring-collector'");
  });

  it('removes every browser-side WhatsApp credential path and governs interactive sends', () => {
    expect(legacyWhatsappDocument).toContain('status: 410');
    expect(legacyWhatsappDocument).not.toContain('getPublicUrl');
    expect(browserWhatsapp).toContain("supabase.functions.invoke('send-whatsapp-reminders'");
    expect(browserWhatsapp).not.toContain('ULTRAMSG_TOKEN');
    expect(browserWhatsapp).not.toContain('api.ultramsg.com');
    expect(browserWhatsappProvider).not.toContain('fetch(');
    expect(legacyReminderAdapter).toContain('authorizePrivilegedCompanyActor');
    expect(legacyReminderAdapter).toContain('outbound_whatsapp_commands');
    expect(containment).toContain('reject_browser_whatsapp_credentials_v1');
    expect(policy).toContain("'legacy-whatsapp-document-sender'");
    expect(policy).toContain("'legacy-public-legal-document-upload'");
    expect(verifier).toContain("'legacy-whatsapp-document-sender'");
    expect(verifier).toContain("'legacy-public-legal-document-upload'");
  });

  it('uses a fail-closed rollback instead of restoring shared-secret writers', () => {
    expect(rollback).toContain("'generate-monthly-invoices'");
    expect(rollback).toContain("'process-payment-reminders'");
    expect(rollback).toContain("'payment-reminder-agent'");
    expect(rollback).toContain('intentionally not');
  });
});
