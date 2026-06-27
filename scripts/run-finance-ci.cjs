const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=("?)(.*)\2$/);
    if (!match) continue;
    const [, key,, value] = match;
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const requireDb = process.argv.includes('--require-db');
const hasDbEnv = Boolean(
  process.env.VITE_SUPABASE_URL
  && (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
);

const steps = [
  ['npm', ['run', 'files:integrity']],
  ['npm', ['run', 'finance:permissions']],
  ['npm', ['run', 'type-check']],
  ['npm', ['run', 'finance:test']],
];

if (hasDbEnv || requireDb) {
  const healthSnapshotScript = requireDb ? 'finance:health:snapshot:required' : 'finance:health:snapshot';
  steps.push(
    ['npm', ['run', 'finance:integrity']],
    ['npm', ['run', 'finance:controls']],
    ['npm', ['run', 'finance:reconciliation']],
    ['npm', ['run', healthSnapshotScript]]
  );
} else {
  console.log('Skipping live DB finance checks because Supabase service-role environment variables are not set.');
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
