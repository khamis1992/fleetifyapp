const fs = require('fs');
const path = require('path');

function readEnv(name) {
  if (process.env[name]) return process.env[name];

  for (const fileName of ['.env', '.env.taqadi-agent']) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, 'utf8');
    const match = text.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'));
    if (match?.[1]) return match[1];
  }

  return undefined;
}

const PROJECT_REF = readEnv('SUPABASE_PROJECT_REF') || 'qwhunliohlkkahbspfiu';
const dryRun = process.argv.includes('--dry-run');
const token = readEnv('SUPABASE_ACCESS_TOKEN');

if (!dryRun && !token) {
  console.error([
    'Missing SUPABASE_ACCESS_TOKEN.',
    'Create a Supabase Management API access token with database_write permission.',
    'Then set SUPABASE_ACCESS_TOKEN in the environment, .env, or .env.taqadi-agent and rerun:',
    '  npm run customers:apply-arabic-data-guard',
    'To verify the target project and SQL file without applying changes, run:',
    '  npm run customers:apply-arabic-data-guard -- --dry-run',
    'Manual fallback SQL file:',
    '  supabase/manual/20260806120022_apply_customer_official_arabic_data_guard.sql',
  ].join('\n'));
  process.exit(1);
}

const sqlPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260806120022_enforce_customer_official_arabic_data.sql'
);

const verifySql = `
select
  exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'has_arabic_text'
  ) as has_arabic_text_exists,
  exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_customer_official_arabic_data'
  ) as enforcement_function_exists,
  exists(
    select 1
    from pg_trigger
    where tgname = 'trg_enforce_customer_official_arabic_data'
      and not tgisinternal
  ) as trigger_exists;
`;

async function runSql(query, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, read_only: readOnly }),
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body?.message || body?.error || response.statusText;
    throw new Error(`Supabase Management API ${response.status}: ${message}`);
  }

  return body;
}

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf8');

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      projectRef: PROJECT_REF,
      sqlPath,
      bytes: Buffer.byteLength(sql, 'utf8'),
    }, null, 2));
    return;
  }

  await runSql(sql, false);
  const verification = await runSql(verifySql, true);

  console.log(JSON.stringify({
    mode: 'apply',
    projectRef: PROJECT_REF,
    sqlPath,
    verification,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
