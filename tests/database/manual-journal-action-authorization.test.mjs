// Synthetic PostgreSQL security/financial regression tests. No production connection.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrationName = '20261001100732_harden_manual_journal_action_authorization';
const company = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const other = '44444444-4444-4444-8444-444444444444';
const debit = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const credit = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const signatures = [
  'public.create_manual_journal_entry_v1(uuid,text,date,text,text,uuid,jsonb,uuid,uuid)',
  'public.post_manual_journal_entry_v1(uuid,uuid,uuid)',
  'public.post_manual_journal_entry_v1(uuid,uuid,uuid,boolean)',
];
const capturedDefinitionHashes = [
  '6fcc72b591421a120a5b0de9e40a35eae1c5185b91bb1a2ec81466d3aa74a589',
  'd82c9667ab32ad23a8486c1c6bf01d12adf00cc429d62976a73ea810834b6343',
  '7e5acc4967ba80644ee5cd91310e5947a6f87b5df5a137dfe65feff060d8dd7b',
];
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const migration = () => read('../../supabase/migrations/' + migrationName + '.sql');
const rollback = () => read('../../supabase/rollbacks/' + migrationName + '.rollback.sql');
const hash = text => createHash('sha256').update(text).digest('hex');
let db;
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const admin = () => db.exec('RESET ROLE');
async function asRole(role = 'authenticated', user = actor, claimRole = role) {
  await admin();
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)", [user || '', claimRole]);
  await db.exec('SET ROLE ' + role);
}
const lines = amount => [
  { account_id: debit, debit_amount: amount, credit_amount: 0, line_description: 'Synthetic debit' },
  { account_id: credit, debit_amount: 0, credit_amount: amount, line_description: 'Synthetic credit' },
];
const create = (options = {}) => query(`SELECT (public.create_manual_journal_entry_v1(
  $1::uuid,$2::text,$3::date,$4::text,$5::text,$6::uuid,$7::jsonb,$8::uuid,$9::uuid)).*`,
  [options.company === undefined ? company : options.company, null, options.date || '2026-09-30',
    'Synthetic regression only', 'manual', null, JSON.stringify(options.lines || lines(100)),
    options.key || randomUUID(), options.actor === undefined ? other : options.actor]);
// The live 3/4 overload defaults make a three-argument SQL call ambiguous (42725).
// Exercise the exact current three-argument body through an isolated test-only alias;
// retain the original overloads unchanged for migration/metadata/ambiguity assertions.
async function post3(id, tenant = company, nominated = other) {
  const role = (await query("SELECT current_setting('role',true) AS role"))[0].role;
  await admin();
  const definition = (await query('SELECT pg_get_functiondef($1::regprocedure) AS definition', [signatures[1]]))[0].definition;
  await db.exec(definition.replace('FUNCTION public.post_manual_journal_entry_v1(', 'FUNCTION public.test_strict_manual_journal_post(') + ';');
  await db.exec(`REVOKE ALL ON FUNCTION public.test_strict_manual_journal_post(uuid,uuid,uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.test_strict_manual_journal_post(uuid,uuid,uuid) TO authenticated, service_role;`);
  await db.exec('SET ROLE ' + role);
  return query('SELECT (public.test_strict_manual_journal_post($1::uuid,$2::uuid,$3::uuid)).*', [tenant, id, nominated]);
}
const post4 = (id, ack = false, tenant = company, nominated = other) => query(
  'SELECT (public.post_manual_journal_entry_v1($1::uuid,$2::uuid,$3::uuid,$4::boolean)).*', [tenant, id, nominated, ack]);
const denied = action => assert.rejects(action, error => error.code === '42501');
const financialError = action => assert.rejects(action, error => error.code === 'P0001');
const metadata = () => query(`SELECT p.oid,p.proowner,p.proacl,p.proconfig,p.prosecdef,p.provolatile,
  pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.oid=ANY($1::regprocedure[]) ORDER BY p.oid`, [signatures]);
const rows = () => query(`SELECT (SELECT count(*) FROM journal_entries) AS headers,
  (SELECT count(*) FROM journal_entry_lines) AS lines,
  (SELECT COALESCE(sum(debit_amount),0) FROM journal_entry_lines) AS debits,
  (SELECT COALESCE(sum(credit_amount),0) FROM journal_entry_lines) AS credits`);
async function install() { await admin(); await db.exec(await migration()); await asRole(); }
async function roleOf(role) { await admin(); await db.query('UPDATE user_roles SET role=$1 WHERE user_id=$2', [role, actor]); await asRole(); }
async function grant(id, value = true) {
  await admin();
  await db.query('DELETE FROM user_permissions WHERE user_id=$1 AND permission_id=$2', [actor, id]);
  await db.query('INSERT INTO user_permissions VALUES($1,$2,$3)', [actor, id, value]);
  await asRole();
}
async function preparedDraft() {
  const entry = (await create())[0];
  await admin(); await db.query('UPDATE journal_entries SET created_by=$1 WHERE id=$2', [other, entry.id]); await asRole();
  return entry;
}
async function setup() {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE ROLE unrelated;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
    CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
    CREATE TABLE employees(id uuid DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean,has_system_access boolean,account_status text);
    CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
    CREATE TABLE user_permissions(user_id uuid,permission_id text,granted boolean);
    CREATE TABLE chart_of_accounts(id uuid,company_id uuid,is_active boolean,is_header boolean,account_level integer);
    CREATE TABLE cost_centers(id uuid,company_id uuid); CREATE TABLE fixed_assets(id uuid,company_id uuid);
    CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,
      entry_number text,entry_date date,description text,reference_type text,reference_id uuid,
      total_debit numeric,total_credit numeric,status text,created_by uuid,manual_idempotency_key uuid,
      posted_by uuid,posted_at timestamptz,updated_at timestamptz,workflow_notes text);
    CREATE UNIQUE INDEX manual_journal_company_key ON journal_entries(company_id,manual_idempotency_key);
    CREATE TABLE journal_entry_lines(id uuid DEFAULT gen_random_uuid(),journal_entry_id uuid,account_id uuid,
      cost_center_id uuid,asset_id uuid,employee_id uuid,line_description text,debit_amount numeric,credit_amount numeric,line_number integer);
    CREATE TABLE closed_periods(company_id uuid,entry_date date);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
    CREATE FUNCTION public.system_agent_date_in_closed_period(tenant uuid,day date) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS(SELECT 1 FROM public.closed_periods WHERE company_id=tenant AND entry_date=day) $$;`);
  await db.exec(await read('./fixtures/manual-journal-live-before-authorization.sql'));
  await db.query('INSERT INTO profiles VALUES($1,$2,true)', [actor, company]);
  await db.query("INSERT INTO employees(user_id,company_id,is_active,has_system_access,account_status) VALUES($1,$2,true,true,'active')", [actor, company]);
  await db.query("INSERT INTO user_roles VALUES($1,$2,'accountant')", [actor, company]);
  await db.query('INSERT INTO chart_of_accounts VALUES($1,$3,true,false,3),($2,$3,true,false,3)', [debit, credit, company]);
  await asRole();
}

describe('manual journal server action authorization', { concurrency: false }, () => {
  beforeEach(setup); afterEach(async () => db?.close());

  it('reproduces the inspected missing-permission hole and closes all three entry points before writes', async () => {
    await roleOf('employee');
    const prior = (await create())[0];
    await admin(); await db.query('UPDATE journal_entries SET created_by=$1 WHERE id=$2', [other, prior.id]); await asRole();
    assert.equal((await post3(prior.id))[0].status, 'posted');
    await install(); await admin(); const unchanged = await rows(); await asRole();
    await denied(() => create()); await denied(() => post3(prior.id)); await denied(() => post4(prior.id, true));
    await admin(); assert.deepEqual(await rows(), unchanged);
  });

  it('documents the existing three-argument overload ambiguity without changing signatures or defaults', async () => {
    const draft = (await create())[0];
    const ambiguous = () => query('SELECT public.post_manual_journal_entry_v1($1::uuid,$2::uuid,$3::uuid)', [company, draft.id, actor]);
    await assert.rejects(ambiguous, error => error.code === '42725');
    await install(); await assert.rejects(ambiguous, error => error.code === '42725');
    await admin(); assert.equal((await query('SELECT status FROM journal_entries WHERE id=$1', [draft.id]))[0].status, 'draft');
  });

  it('matches role defaults: managers may create, but only accountants and administrators may post', async () => {
    await install();
    for (const role of ['super_admin', 'company_admin', 'accountant', 'manager']) {
      await roleOf(role); const draft = await preparedDraft();
      if (role === 'manager') { await denied(() => post3(draft.id)); await denied(() => post4(draft.id, true)); }
      else assert.equal((await post3(draft.id))[0].status, 'posted');
    }
    for (const role of ['fleet_manager', 'sales_agent', 'employee']) { await roleOf(role); await denied(() => create()); }
    await roleOf('employee'); await grant('finance.ledger.write');
    const draft = await preparedDraft(); await denied(() => post4(draft.id, true));
    await grant('finance.journal.post'); assert.equal((await post4(draft.id))[0].status, 'posted');
    await admin(); await db.exec('DELETE FROM user_permissions'); await asRole();
    await grant('finance.journal.create_draft'); assert.equal((await create())[0].status, 'draft');
  });

  it('keeps the verified current company-admin pattern permitted and gives explicit denial precedence', async () => {
    await install(); await roleOf('company_admin'); await grant('finance.ledger.write');
    const key = randomUUID(); const draft = (await create({ key }))[0];
    assert.equal(draft.created_by, actor); // Authenticated identity overrides nominated other actor.
    assert.equal((await create({ key }))[0].id, draft.id);
    await grant('finance.journal.create_draft', false); await denied(() => create({ key }));
    await admin(); await db.exec('DELETE FROM user_permissions'); await asRole();
    await grant('finance.ledger.write', false); await denied(() => create());
    await admin(); await db.exec('DELETE FROM user_permissions'); await asRole();
    await grant('finance.journal.post', false);
    await denied(() => post3(draft.id)); await denied(() => post4(draft.id, true));
    await grant('finance.journal.post', true); assert.equal((await post4(draft.id, true))[0].status, 'posted');
    await grant('finance.journal.post', false);
    await denied(() => post3(draft.id)); await denied(() => post4(draft.id, true)); // No posted-return bypass.
  });

  it('requires a single active scoped employee with active system access, including self-review', async () => {
    await install(); const draft = (await create())[0];
    for (const assignment of ["is_active=false", "is_active=NULL", "has_system_access=false", "has_system_access=NULL", "account_status='disabled'", "account_status=NULL", "account_status='ACTIVE'", "company_id='" + foreign + "'"]) {
      await admin(); await db.exec('UPDATE employees SET ' + assignment); await asRole();
      await denied(() => create()); await denied(() => post3(draft.id)); await denied(() => post4(draft.id, true));
      await admin(); await db.query("UPDATE employees SET company_id=$1,is_active=true,has_system_access=true,account_status='active'", [company]); await asRole();
    }
    await admin(); await db.query("INSERT INTO employees(user_id,company_id,is_active,has_system_access,account_status) VALUES($1,$2,true,true,'active')", [actor, company]); await asRole();
    await denied(() => create()); await denied(() => post4(draft.id, true));
    await admin(); await db.exec('DELETE FROM employees'); await asRole(); await denied(() => create());
  });

  it('retains authentication/company boundaries and prevents actor and JWT-role impersonation', async () => {
    await install(); const draft = (await create())[0]; assert.equal(draft.created_by, actor);
    await denied(() => create({ company: foreign })); await denied(() => post4(draft.id, true, foreign));
    await denied(() => create({ company: null })); await denied(() => post3(draft.id, null));
    await financialError(() => post4(null, true));
    await roleOf('super_admin'); await denied(() => create({ company: foreign }));
    await admin(); await db.exec('UPDATE profiles SET is_active=false'); await asRole(); await denied(() => create());
    await admin(); await db.exec('UPDATE profiles SET is_active=true'); await asRole('authenticated', actor, 'service_role');
    await denied(() => create()); await denied(() => post3(draft.id)); await denied(() => post4(draft.id, true));
    await asRole('authenticated', null, 'service_role'); await denied(() => create({ actor: other }));
    for (const role of ['anon', 'unrelated']) { await asRole(role, actor); await denied(() => create()); }
    await asRole('authenticated', null); await denied(() => create());
    await admin(); await db.exec('DELETE FROM profiles'); await asRole(); await denied(() => create());
  });

  it('preserves strict post3 and explicit post4 self-review, retry stability and workflow notes', async () => {
    await install(); const draft = (await create())[0];
    await admin(); await db.query("UPDATE journal_entries SET workflow_notes='Existing reviewer note' WHERE id=$1", [draft.id]); await asRole();
    await denied(() => post3(draft.id)); await denied(() => post4(draft.id)); await denied(() => post4(draft.id, null));
    const posted = (await post4(draft.id, true))[0];
    assert.equal(posted.posted_by, actor); assert.equal(posted.status, 'posted');
    assert.match(posted.workflow_notes, new RegExp('^Existing reviewer note\\nSELF_REVIEW_ACKNOWLEDGED by ' + actor + ' at '));
    assert.deepEqual((await post4(draft.id, true))[0], posted); assert.deepEqual((await post3(draft.id))[0], posted);
    const independent = await preparedDraft();
    await admin(); await db.query("UPDATE journal_entries SET workflow_notes='Independent review' WHERE id=$1", [independent.id]); await asRole();
    assert.equal((await post4(independent.id, false))[0].workflow_notes, 'Independent review');
  });

  it('preserves the real SQL service role path, explicit actor requirement and financial checks', async () => {
    await install(); await admin(); await db.exec('DELETE FROM employees; DELETE FROM profiles; DELETE FROM user_roles');
    await db.query("INSERT INTO user_permissions VALUES($1,'finance.journal.post',false)", [other]);
    await asRole('service_role', null); await denied(() => create({ actor: null }));
    const draft = (await create({ actor: other }))[0]; assert.equal(draft.created_by, other);
    assert.equal((await post3(draft.id, company, other))[0].posted_by, other);
    const otherDraft = (await create({ actor: other }))[0]; assert.equal((await post4(otherDraft.id, false, company, other))[0].status, 'posted');
    await financialError(() => create({ actor: other, lines: lines(0) }));
    await financialError(() => post4(null, true, company, other));
    await asRole('service_role', null, 'authenticated'); await denied(() => create({ actor: other })); // Original auth requirement retained.
  });

  it('keeps idempotency, line/account/dimension validation, closed periods and posting consistency', async () => {
    await install(); const key = randomUUID(); const draft = (await create({ key }))[0];
    assert.equal((await create({ key }))[0].id, draft.id);
    await admin(); assert.equal(Number((await rows())[0].headers), 1); assert.equal(Number((await rows())[0].lines), 2); await asRole();
    for (const badLines of [lines(0), lines(-10), [lines(100)[0]], [{...lines(100)[0], credit_amount: 5}, lines(100)[1]], [lines(100)[0], {...lines(100)[1], credit_amount: 90}]]) await financialError(() => create({ lines: badLines }));
    for (const assignment of ['account_level=2', 'is_header=true', 'is_active=false', "company_id='" + foreign + "'"]) {
      await admin(); await db.query('UPDATE chart_of_accounts SET ' + assignment + ' WHERE id=$1', [debit]); await asRole();
      await financialError(() => create());
      await admin(); await db.query('UPDATE chart_of_accounts SET company_id=$1,account_level=3,is_header=false,is_active=true WHERE id=$2', [company, debit]); await asRole();
    }
    for (const dimension of ['cost_center_id', 'asset_id', 'employee_id']) await financialError(() => create({ lines: [{...lines(100)[0], [dimension]: randomUUID()}, lines(100)[1]] }));
    await admin(); await db.query('INSERT INTO closed_periods VALUES($1,$2)', [company, '2026-09-30']); await asRole();
    await financialError(() => create()); await financialError(() => post4(draft.id, true));
    await admin(); await db.exec('DELETE FROM closed_periods'); await db.query('UPDATE journal_entries SET total_credit=99 WHERE id=$1', [draft.id]); await asRole();
    await financialError(() => post4(draft.id, true));
    await admin(); await db.query("UPDATE journal_entries SET total_credit=100,status='cancelled' WHERE id=$1", [draft.id]); await asRole();
    await financialError(() => post4(draft.id, true));
  });

  it('changes only guard bodies, retaining function metadata, grants, helper and all stored rows', async () => {
    await preparedDraft(); await admin(); const before = await metadata(); const rowsBefore = await rows();
    const helperBefore = await query("SELECT pg_get_functiondef('public.is_finance_action_authorized(uuid,uuid,text[],text[])'::regprocedure) AS definition");
    await install(); await admin(); const after = await metadata();
    assert.deepEqual(await rows(), rowsBefore); assert.deepEqual(await query("SELECT pg_get_functiondef('public.is_finance_action_authorized(uuid,uuid,text[],text[])'::regprocedure) AS definition"), helperBefore);
    for (let i=0; i<before.length; i++) {
      assert.deepEqual({...after[i], definition: undefined}, {...before[i], definition: undefined});
      assert.equal(after[i].definition.replace(/\r?\n  -- MANUAL_JOURNAL_ACTION_AUTHORIZATION_BEGIN[\s\S]*?  -- MANUAL_JOURNAL_ACTION_AUTHORIZATION_END/, ''), before[i].definition);
      for (const role of ['authenticated','service_role']) assert.equal((await query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed", [role, signatures[i]]))[0].allowed, true);
      for (const role of ['anon','unrelated']) assert.equal((await query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed", [role, signatures[i]]))[0].allowed, false);
    }
    assert.equal((await query("SELECT has_function_privilege('authenticated','public.is_finance_action_authorized(uuid,uuid,text[],text[])','EXECUTE') AS allowed"))[0].allowed, false);
    await db.exec(await rollback()); const restored = await metadata(); assert.deepEqual(restored, before); assert.deepEqual(await rows(), rowsBefore);
    // Independent exact capture verifies the inspected CRLF body and rollback, not a rewritten approximation.
    for (const row of restored) assert.ok(capturedDefinitionHashes.includes(hash(row.definition)));
  });

  it('fails closed on migration and rollback body drift rather than overwriting another change', async () => {
    await admin();
    const definition = (await metadata())[0].definition;
    await db.exec(definition.replace('Authentication is required', 'Authentication is required - drift') + ';');
    await assert.rejects(async () => db.exec(await migration()), error => error.code === '55000');
    await db.exec('ROLLBACK');
    assert.match((await metadata())[0].definition, /required - drift/);
    await db.exec(definition + ';'); await db.exec(await migration());
    const changed = (await metadata())[0].definition;
    await db.exec(changed.replace('Authentication is required', 'Authentication is required - drift') + ';');
    await assert.rejects(async () => db.exec(await rollback()), error => error.code === '55000');
    await db.exec('ROLLBACK'); assert.match((await metadata())[0].definition, /required - drift/);
  });
});
