#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const projectRoot = process.cwd();
const sqlFile = process.argv[2];
const checkOnly = process.argv.includes('--check');
const rollbackOnly = process.argv.includes('--rollback');

if (!sqlFile) {
  console.error('Usage: node scripts/apply-sql-file-via-pg.cjs <sql-file> [--check|--rollback]');
  process.exit(1);
}

const poolerUrlPath = path.join(projectRoot, 'supabase', '.temp', 'pooler-url');
if (!fs.existsSync(poolerUrlPath)) {
  console.error('Missing supabase/.temp/pooler-url');
  process.exit(1);
}

const connectionString = fs.readFileSync(poolerUrlPath, 'utf8').trim();
if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('Pooler URL is not usable.');
  process.exit(1);
}

const resolvedSqlFile = path.resolve(projectRoot, sqlFile);
if (!fs.existsSync(resolvedSqlFile)) {
  console.error(`SQL file not found: ${resolvedSqlFile}`);
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const ping = await client.query('select current_database() as database_name, current_user as user_name');
  console.log(JSON.stringify({
    status: 'connected',
    database: ping.rows[0]?.database_name,
    user: ping.rows[0]?.user_name,
  }));

  if (checkOnly) {
    await client.end();
    return;
  }

  const sql = fs.readFileSync(resolvedSqlFile, 'utf8');
  await client.query('begin');
  try {
    await client.query(sql);
    if (rollbackOnly) {
      await client.query('rollback');
      console.log(JSON.stringify({ status: 'validated', file: resolvedSqlFile }));
    } else {
      await client.query('commit');
      console.log(JSON.stringify({ status: 'applied', file: resolvedSqlFile }));
    }
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: 'failed',
    message: error.message,
    code: error.code,
    detail: error.detail,
    hint: error.hint,
  }));
  process.exit(1);
});
