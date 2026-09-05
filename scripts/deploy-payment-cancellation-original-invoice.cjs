const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MIGRATION_VERSION = '20260902035618';
const MIGRATION_NAME = 'payment_cancellation_restores_original_invoice';
const MIGRATION_FILE = `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`;
const PROJECT_REF = 'qwhunliohlkkahbspfiu';
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const CONTRACT_ID = '662e4640-2b0a-4a21-a05a-b44681f8c1eb';
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
    ...options,
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${output}`);
  }

  return output;
}

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

function collectRemoteVersions(migrationList) {
  const versions = new Set();
  for (const line of migrationList.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d*)\s*\|\s*(\d+)\s*\|/);
    if (match?.[2]) versions.add(match[2]);
  }
  if (versions.size === 0) {
    throw new Error('Unable to read remote migration versions');
  }
  return [...versions].sort();
}

function prepareWorkdir(remoteVersions) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleetify-payment-cancel-'));
  const supabaseDir = path.join(workdir, 'supabase');
  const migrationsDir = path.join(supabaseDir, 'migrations');
  fs.mkdirSync(migrationsDir, { recursive: true });

  fs.copyFileSync(
    path.join(process.cwd(), 'supabase', 'config.toml'),
    path.join(supabaseDir, 'config.toml'),
  );
  fs.cpSync(
    path.join(process.cwd(), 'supabase', '.temp'),
    path.join(supabaseDir, '.temp'),
    { recursive: true },
  );

  for (const version of remoteVersions) {
    fs.writeFileSync(
      path.join(migrationsDir, `${version}_remote_history_placeholder.sql`),
      `-- ${version} already exists in the remote migration history.\n`,
      'utf8',
    );
  }

  fs.copyFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', MIGRATION_FILE),
    path.join(migrationsDir, MIGRATION_FILE),
  );

  return workdir;
}

async function verifyData() {
  const url = readEnv('VITE_SUPABASE_URL');
  const serviceRole = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const scheduleIds = [
    '52810fa1-dcd0-4246-aa04-ba6867d5e62d',
    'cce220e0-ce22-48d8-87e6-464093364e15',
    'ef5acba7-5817-4fbe-9fb8-95079a991c01',
    'f596cdbb-3df9-4281-9347-24d9400ada79',
  ];
  const query = new URLSearchParams({
    select: 'id,invoice_id,amount,paid_amount,status',
    company_id: `eq.${COMPANY_ID}`,
    contract_id: `eq.${CONTRACT_ID}`,
    id: `in.(${scheduleIds.join(',')})`,
  });
  const response = await fetch(`${url}/rest/v1/contract_payment_schedules?${query}`, {
    headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
  });
  if (!response.ok) throw new Error(`Schedule verification failed: ${response.status}`);

  const rows = await response.json();
  const expected = new Map([
    [scheduleIds[0], ['4fd6c2eb-3f33-49a4-bf53-e894c6ff91d3', 1060, 0, 'overdue']],
    [scheduleIds[1], ['9cf06121-686a-4ed0-9e5f-4fc94e6c75aa', 1050, 1050, 'paid']],
    [scheduleIds[2], ['f1fff785-978d-4ab4-b3bd-aead25774414', 1050, 1050, 'paid']],
    [scheduleIds[3], ['34077b49-a76d-4a1c-846c-d082cd8070f9', 1060, 0, 'overdue']],
  ]);
  const valid = rows.length === 4 && rows.every((row) => {
    const target = expected.get(row.id);
    return target
      && row.invoice_id === target[0]
      && Number(row.amount) === target[1]
      && Number(row.paid_amount || 0) === target[2]
      && row.status === target[3];
  });
  if (!valid) throw new Error(`LTO202437 verification failed: ${JSON.stringify(rows)}`);

  return rows;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const migrationList = run(NPX, ['supabase', 'migration', 'list']);
  const remoteVersions = collectRemoteVersions(migrationList);
  const workdir = prepareWorkdir(remoteVersions);
  const pushArgs = ['supabase', 'db', 'push', '--include-all', '--workdir', workdir, '--yes'];

  const dryRunOutput = run(NPX, [...pushArgs, '--dry-run']);
  if (!dryRunOutput.includes(MIGRATION_FILE)) {
    if (remoteVersions.includes(MIGRATION_VERSION)) {
      const rows = await verifyData();
      console.log(JSON.stringify({ mode: 'already-applied', projectRef: PROJECT_REF, rows }, null, 2));
      return;
    }
    throw new Error(`Dry run did not select ${MIGRATION_FILE}\n${dryRunOutput}`);
  }

  if (!apply) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      projectRef: PROJECT_REF,
      migration: MIGRATION_FILE,
      remoteVersionsMirrored: remoteVersions.length,
      workdir,
    }, null, 2));
    return;
  }

  const applyOutput = run(NPX, pushArgs);
  const rows = await verifyData();
  console.log(JSON.stringify({
    mode: 'applied',
    projectRef: PROJECT_REF,
    migration: MIGRATION_FILE,
    output: applyOutput.trim().split(/\r?\n/).slice(-8),
    rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
