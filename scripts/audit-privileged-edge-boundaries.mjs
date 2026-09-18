import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];

const explicitActiveUserAi = [
  'contract-health-analysis',
  'customer-ai-summary',
  'customer-id-ocr',
  'daily-decision-center',
  'deepseek-ocr',
  'extract-traffic-violations',
  'financial-analysis-ai',
  'olmocr',
  'pdf-ocr',
  'smart-document-generator',
  'traffic-violations-ai-advisor',
  'vehicle-ocr',
];

const classifiedPrivilegedFunctions = new Set([
  ...explicitActiveUserAi,
  'analyze-call-recording', 'api-monitoring-webhook', 'auto-submit-taqadi',
  'backfill-historical-invoices', 'check-legal-case-triggers', 'collection-message-agent',
  'contract-id-scanner', 'contract-terms-scanner', 'create-user-account',
  'customer-duplicate-detector', 'customer-proposal-ai-reviewer', 'daily-audit-agent',
  'correction-verifier-agent', 'customer-id-autofill-agent', 'daily-closeout-ai-reviewer',
  'excel-import-ai-review', 'generate-monthly-invoices', 'ingest-traffic-mail',
  'legal-notice-agent', 'manus-taqadi', 'missing-contract-pdf-agent',
  'intelligent-contract-processor', 'journal-entry-ai-reviewer', 'legal-case-ai-reviewer',
  'monitoring-collector', 'monthly-vehicle-depreciation', 'nightly-ops-auditor',
  'openai-chat', 'process-payment-reminders', 'process-traffic-fine', 'safe-auto-repair',
  'scan-invoice', 'send-daily-report', 'send-weekly-report', 'send-whatsapp-document',
  'payment-match-agent', 'system-audit-dashboard',
  'send-whatsapp-reminders', 'smart-contract-assigner', 'system-audit-orchestrator',
  'system-audit-worker', 'taqadi-automation', 'traffic-violations-ai-advisor',
  'transfer-user-company', 'ultramsg-ack-webhook', 'upload-missing-contract-pdf',
  'vehicle-ocr', 'violation-inbox-processor',
]);

const functionRoot = resolve(root, 'supabase/functions');
const privileged = [];
for (const entry of readdirSync(functionRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
  const path = join(functionRoot, entry.name, 'index.ts');
  if (!existsSync(path)) continue;
  const source = readFileSync(path, 'utf8');
  const hasServiceRole = source.includes('SUPABASE_SERVICE_ROLE_KEY') || source.includes('createServiceClient');
  const hasExternalEffect = /fetch\(\s*[`'"]https?:\/\//.test(source) || source.includes('LONGCAT_CHAT_COMPLETIONS_URL');
  if (hasServiceRole || hasExternalEffect) {
    privileged.push(entry.name);
    if (!classifiedPrivilegedFunctions.has(entry.name)) {
      failures.push(`unclassified privileged Edge function: ${entry.name}`);
    }
  }
}

for (const name of explicitActiveUserAi) {
  const source = read(`supabase/functions/${name}/index.ts`);
  if (!source.includes('authorizeActiveCompanyUser(req)')) {
    failures.push(`AI endpoint lacks explicit active-company auth: ${name}`);
  }
}

const sensitiveSource = [
  read('src/utils/whatsappWebSender.ts'),
  read('src/services/whatsapp/WhatsAppService.ts'),
  ...readdirSync(functionRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(functionRoot, entry.name, 'index.ts')))
    .map((entry) => readFileSync(join(functionRoot, entry.name, 'index.ts'), 'utf8')),
].join('\n');

for (const pattern of [
  /ULTRAMSG_TOKEN\s*=\s*['"][^'"]+['"]/, 
  /ULTRAMSG_INSTANCE_ID\s*=\s*['"]instance[^'"]+['"]/, 
  /rls3i8flwugsei1j/,
]) {
  if (pattern.test(sensitiveSource)) failures.push(`embedded provider credential pattern: ${pattern}`);
}

const browserSender = read('src/utils/whatsappWebSender.ts');
const browserProvider = read('src/services/whatsapp/WhatsAppService.ts');
const retiredDocument = read('supabase/functions/send-whatsapp-document/index.ts');
const containment = read('supabase/migrations/20260828113000_agent_failure_containment_and_escalation.sql');
if (browserSender.includes('api.ultramsg.com') || browserProvider.includes('fetch(')) {
  failures.push('browser can still call the WhatsApp provider directly');
}
if (!browserSender.includes("supabase.functions.invoke('send-whatsapp-reminders'")) {
  failures.push('browser WhatsApp sender does not use the audited Edge command');
}
if (!retiredDocument.includes('status: 410') || retiredDocument.includes('getPublicUrl')) {
  failures.push('legacy public-document sender is not retired fail-closed');
}
for (const token of [
  'outbound_whatsapp_commands',
  'reject_browser_whatsapp_credentials_v1',
  'recipient_hash',
  'message_hash',
  'dedupe_key',
]) {
  if (!containment.includes(token)) failures.push(`manual WhatsApp containment missing: ${token}`);
}

const result = {
  privilegedFunctions: privileged.length,
  classified: privileged.filter((name) => classifiedPrivilegedFunctions.has(name)).length,
  explicitActiveUserAi: explicitActiveUserAi.length,
  failures,
  ready: failures.length === 0,
};
console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exitCode = 1;
