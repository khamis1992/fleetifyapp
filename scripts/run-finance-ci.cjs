const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  for (const fileName of ['.env', '.env.taqadi-agent']) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;

    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=("?)(.*)\2$/);
      if (!match) continue;
      const [, key,, value] = match;
      if (!process.env[key]) process.env[key] = value;
    }
  }

  if (!process.env.VITE_SUPABASE_URL && process.env.TAQADI_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = process.env.TAQADI_SUPABASE_URL;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TAQADI_SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TAQADI_SUPABASE_SERVICE_ROLE_KEY;
  }
}

loadDotEnv();

const requireDb = process.argv.includes('--require-db');
const offline = process.argv.includes('--offline');
if (offline && requireDb) {
  console.error('--offline and --require-db cannot be combined.');
  process.exit(1);
}
const hasDbEnv = Boolean(
  process.env.VITE_SUPABASE_URL
  && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const steps = [
  ['npm', ['run', 'files:integrity']],
  ['npm', ['run', 'finance:permissions']],
  ['npm', ['run', 'finance:type-check']],
  ['npm', ['run', 'finance:test']],
  ['npm', ['exec', '--', 'vitest', 'run', 'src/components/finance/workspace/__tests__', 'src/hooks/__tests__/financeRegisterReaders.test.tsx']],
  ['node', ['--test', 'tests/database/financial-workspace.test.mjs', 'tests/database/collected-fee-posting.test.mjs', 'tests/database/financial-lifecycle.test.mjs', 'tests/database/customer-collection-summary.test.mjs']],
  ['npm', ['exec', '--', 'vitest', 'run', 'src/services/__tests__/financialReporting.test.ts', 'src/services/__tests__/accountingRefresh.test.ts', 'src/components/finance/__tests__/ProtectedFinanceRoute.test.tsx', 'src/hooks/__tests__/financialAnalysisBasis.test.tsx', 'src/hooks/__tests__/usePayrollJournalIntegration.test.ts', 'src/hooks/__tests__/accountMappingCommands.test.tsx', 'src/utils/__tests__/accountMappingValidation.test.ts', 'src/services/__tests__/customerCollectionSummary.test.tsx']],
];

if (!offline && (hasDbEnv || requireDb)) {
  const healthSnapshotScript = requireDb ? 'finance:health:snapshot:required' : 'finance:health:snapshot';
  steps.push(
    ['npm', ['run', 'finance:integrity']],
    ['npm', ['run', 'finance:controls']],
    ['npm', ['run', 'finance:reconciliation']],
    ['npm', ['run', healthSnapshotScript]]
  );
} else {
  console.log(offline ? 'Offline finance verification: live DB checks and snapshot writes are disabled.' : 'Skipping live DB finance checks because Supabase service-role environment variables are not set.');
}

if (requireDb && !hasDbEnv) {
  console.error('Live DB finance checks are required, but VITE_SUPABASE_URL and service role key are missing.');
  process.exit(1);
}

for (const [command, args] of steps) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? 'cmd.exe' : command;
  const finalArgs = isWindows ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args;
  const result = spawnSync(executable, finalArgs, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
