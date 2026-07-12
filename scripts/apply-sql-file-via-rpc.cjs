const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, '')])
  );
}

const env = {
  ...readEnvFile(path.join(process.cwd(), '.env.local')),
  ...readEnvFile(path.join(process.cwd(), '.env')),
  ...process.env,
};

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/apply-sql-file-via-rpc.cjs <sql-file>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(filePath), 'utf8');
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const payloads = [
    { sql },
    { query: sql },
    { sql_query: sql },
  ];

  const errors = [];
  for (const payload of payloads) {
    const { data, error } = await supabase.rpc('exec_sql', payload);
    if (!error) {
      console.log(JSON.stringify({
        status: 'applied',
        file: filePath,
        parameter: Object.keys(payload)[0],
        data: data ?? null,
      }, null, 2));
      return;
    }
    errors.push({
      parameter: Object.keys(payload)[0],
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  console.error(JSON.stringify({
    status: 'failed',
    file: filePath,
    errors,
  }, null, 2));
  process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
