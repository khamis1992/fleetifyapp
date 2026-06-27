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

const BASELINE_PERIOD = {
  period_name: 'Financial Controls Verification 1900-01',
  start_date: '1900-01-01',
  end_date: '1900-01-31',
  status: 'locked',
  is_adjustment_period: true,
};

async function main() {
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id,name')
    .order('name');

  if (companiesError) throw companiesError;

  const results = [];

  for (const company of companies || []) {
    const { data: existing, error: existingError } = await supabase
      .from('accounting_periods')
      .select('id,status,period_name,start_date,end_date')
      .eq('company_id', company.id)
      .eq('start_date', BASELINE_PERIOD.start_date)
      .eq('end_date', BASELINE_PERIOD.end_date)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      results.push({
        company_id: company.id,
        company_name: company.name,
        action: 'exists',
        period_id: existing.id,
        status: existing.status,
      });
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('accounting_periods')
      .insert({
        company_id: company.id,
        ...BASELINE_PERIOD,
      })
      .select('id,status')
      .single();

    if (insertError) throw insertError;

    results.push({
      company_id: company.id,
      company_name: company.name,
      action: 'created',
      period_id: inserted.id,
      status: inserted.status,
    });
  }

  const reportsDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(
    reportsDir,
    `financial-controls-baseline-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ checked_at: new Date().toISOString(), baseline: BASELINE_PERIOD, results }, null, 2),
    'utf8'
  );

  console.log(JSON.stringify({
    companies: results.length,
    created: results.filter((item) => item.action === 'created').length,
    existing: results.filter((item) => item.action === 'exists').length,
    reportPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
