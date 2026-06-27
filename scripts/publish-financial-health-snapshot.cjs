const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const text = fs.readFileSync(envPath, 'utf8');
  return text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];
}

function latestReport(prefix) {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) return null;

  const candidates = fs.readdirSync(reportsDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.json'))
    .map((file) => {
      const absolutePath = path.join(reportsDir, file);
      return { file, absolutePath, mtimeMs: fs.statSync(absolutePath).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (candidates.length === 0) return null;
  const candidate = candidates[0];
  return {
    path: candidate.absolutePath,
    data: JSON.parse(fs.readFileSync(candidate.absolutePath, 'utf8')),
  };
}

function deriveSnapshot(integrity, controls, reconciliation) {
  const integrityReports = integrity?.data?.reports || [];
  const unhealthyCompanies = integrityReports.filter((report) => report.status !== 'healthy').length;
  const controlsCritical = Number(controls?.data?.criticalIssues || 0);
  const controlsWarnings = Number(controls?.data?.warnings || 0);
  const reconciliationIssues = Number(reconciliation?.data?.summary?.issue_count || reconciliation?.data?.issues?.length || 0);
  const checkedCompanies = Math.max(
    integrityReports.length,
    Number(reconciliation?.data?.summary?.companies || 0),
    Array.isArray(reconciliation?.data?.companies) ? reconciliation.data.companies.length : 0,
  );

  let status = 'healthy';
  if (unhealthyCompanies > 0 || controlsCritical > 0 || reconciliationIssues > 0) {
    status = 'critical';
  } else if (controlsWarnings > 0) {
    status = 'warning';
  }

  return {
    source: 'finance_ci',
    status,
    checkedCompanies,
    criticalIssues: unhealthyCompanies + controlsCritical,
    warnings: controlsWarnings,
    reconciliationIssues,
    integrityReportPath: integrity?.path || null,
    controlsReportPath: controls?.path || null,
    reconciliationReportPath: reconciliation?.path || null,
    payload: {
      integrity: integrity?.data || null,
      controls: controls?.data || null,
      reconciliation: reconciliation?.data || null,
    },
  };
}

async function main() {
  const requireSnapshot = process.argv.includes('--require-db') || process.argv.includes('--require-snapshot');
  const supabaseUrl = readEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    if (requireSnapshot) {
      throw new Error('Financial health snapshot is required, but Supabase service credentials are not set.');
    }
    console.log('Skipping financial health snapshot because Supabase service credentials are not set.');
    return;
  }

  const snapshot = deriveSnapshot(
    latestReport('financial-integrity-'),
    latestReport('financial-controls-'),
    latestReport('financial-reconciliation-'),
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc('publish_financial_health_snapshot', {
    p_source: snapshot.source,
    p_status: snapshot.status,
    p_checked_companies: snapshot.checkedCompanies,
    p_critical_issues: snapshot.criticalIssues,
    p_warnings: snapshot.warnings,
    p_reconciliation_issues: snapshot.reconciliationIssues,
    p_integrity_report_path: snapshot.integrityReportPath,
    p_controls_report_path: snapshot.controlsReportPath,
    p_reconciliation_report_path: snapshot.reconciliationReportPath,
    p_payload: snapshot.payload,
  });

  if (error) {
    if (/publish_financial_health_snapshot|financial_health_snapshots/i.test(error.message)) {
      if (requireSnapshot) {
        throw new Error(`Financial health snapshot is required, but the database migration is not applied yet: ${error.message}`);
      }
      console.log(`Skipping financial health snapshot because the database migration is not applied yet: ${error.message}`);
      return;
    }
    throw error;
  }

  console.log(JSON.stringify({
    status: snapshot.status,
    snapshotId: data,
    checkedCompanies: snapshot.checkedCompanies,
    criticalIssues: snapshot.criticalIssues,
    warnings: snapshot.warnings,
    reconciliationIssues: snapshot.reconciliationIssues,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
