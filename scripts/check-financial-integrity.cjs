const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const text = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  return text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const serviceRoleKey = readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const failOnIssues = process.argv.includes('--fail-on-issues');
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id,name')
    .order('name');

  if (companiesError) throw companiesError;

  const reports = [];
  for (const company of companies || []) {
    const { data, error } = await supabase.rpc('get_financial_integrity_report', {
      p_company_id: company.id,
    });

    reports.push({
      company_id: company.id,
      company_name: company.name,
      status: error ? 'error' : data?.status,
      error: error?.message || null,
      summary: data?.summary || null,
      issues: data?.issues || [],
    });
  }

  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(
    reportsDir,
    `financial-integrity-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ checked_at: new Date().toISOString(), reports }, null, 2),
    'utf8'
  );

  const unhealthy = reports.filter((report) => report.status !== 'healthy');
  console.log(JSON.stringify({
    checkedCompanies: reports.length,
    healthyCompanies: reports.length - unhealthy.length,
    unhealthyCompanies: unhealthy.length,
    reportPath,
    unhealthy: unhealthy.map((report) => ({
      company_name: report.company_name,
      status: report.status,
      summary: report.summary,
      issues: report.issues.map((issue) => ({ code: issue.code, count: issue.count })),
      error: report.error,
    })),
  }, null, 2));

  if (failOnIssues && unhealthy.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
