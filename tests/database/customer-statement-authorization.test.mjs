// Synthetic PGlite security regression tests. Never uses a production connection.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = '20261001030500_harden_customer_statement_company_access';
const signature = 'public.get_customer_account_statement_by_code(uuid,text,date,date)';
const capturedDefinitionSha = 'b6592d274b86819dfb1d36ab817fadb1a36243efd1246af4df6fea4f1119a914';
const company = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const customer = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const foreignCustomer = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
let db;
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const admin = () => db.exec('RESET ROLE');
async function asRole(role = 'authenticated', user = actor, claimRole = role) {
  await admin();
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false),set_config('request.jwt.claims',$3,false)",
    [user || '', claimRole, JSON.stringify({ sub: user || null, role: claimRole })]);
  await db.exec('SET ROLE ' + role);
}
const statement = (tenant = company, code = 'SAME-CODE', from = null, to = null) =>
  query('SELECT * FROM public.get_customer_account_statement_by_code($1,$2,$3,$4)', [tenant, code, from, to]);
const metadata = () => query("SELECT p.oid,p.proowner,p.proacl,p.proconfig,p.prosecdef,p.provolatile,pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.oid=$1::regprocedure", [signature]);
const install = async () => { await admin(); await db.exec(await read('../../supabase/migrations/' + migration + '.sql')); await asRole(); };
const denied = action => assert.rejects(action, error => error.code === '42501');
const invalid = action => assert.rejects(action, error => error.code === '22023');
async function setup() {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE ROLE unrelated;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
    CREATE TABLE profiles(id uuid DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean);
    CREATE TABLE employees(user_id uuid,company_id uuid,has_system_access boolean,account_status text);
    CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
    CREATE TABLE user_permissions(user_id uuid,permission_id text,granted boolean);
    CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,customer_code text,is_active boolean);
    CREATE TABLE invoices(id uuid DEFAULT gen_random_uuid(),customer_id uuid,company_id uuid,invoice_date date,invoice_number varchar(50),notes text,total_amount numeric,status text);
    CREATE TABLE payments(id uuid DEFAULT gen_random_uuid(),customer_id uuid,company_id uuid,payment_date date,payment_number varchar(50),notes text,amount numeric,payment_status text);`);
  await db.exec(await read('./fixtures/customer-statement-authorization-helpers.sql'));
  await db.exec(await read('./fixtures/customer-statement-live-before-authorization.sql'));
  await db.query('INSERT INTO profiles(user_id,company_id,is_active) VALUES($1,$2,true)', [actor, company]);
  await db.query("INSERT INTO user_roles VALUES($1,$2,'accountant')", [actor, company]);
  await db.query("INSERT INTO customers VALUES($1,$3,'SAME-CODE',true),($2,$4,'SAME-CODE',true)", [customer, foreignCustomer, company, foreign]);
  for (const [tenant, id, date, number, amount, status] of [
    [company, customer, '2026-01-01', 'INV-1', 100, 'paid'],
    [company, customer, '2026-02-01', 'INV-2', 200, 'issued'],
    [company, customer, '2026-03-01', 'CANCELLED', 900, 'cancelled'],
    [foreign, foreignCustomer, '2026-01-01', 'FOREIGN', 999, 'issued']
  ]) await db.query('INSERT INTO invoices(company_id,customer_id,invoice_date,invoice_number,total_amount,status) VALUES($1,$2,$3,$4,$5,$6)', [tenant,id,date,number,amount,status]);
  for (const [date, number, amount, status] of [
    ['2026-01-02', 'PAY-1', 30, 'completed'],
    ['2026-02-02', 'PAY-2', 25, 'approved'],
    ['2026-03-02', 'PENDING', 60, 'pending']
  ]) await db.query('INSERT INTO payments(company_id,customer_id,payment_date,payment_number,amount,payment_status) VALUES($1,$2,$3,$4,$5,$6)', [company,customer,date,number,amount,status]);
  await asRole();
}

describe('customer statement company authorization', { concurrency: false }, () => {
  beforeEach(setup); afterEach(async () => db?.close());
  it('preserves authorized results, signature, OID and source rows while closing the anonymous disclosure', async () => {
    const before = await statement();
    const periodBefore = await statement(company, 'SAME-CODE', '2026-02-01', '2026-02-28');
    await asRole('anon', null); assert.equal((await statement(foreign))[0].debit_amount, '999');
    await admin(); const metaBefore = (await metadata())[0];
    const rowsBefore = await query("SELECT (SELECT count(*) FROM invoices) AS invoices,(SELECT count(*) FROM payments) AS payments");
    await install();
    assert.deepEqual(await statement(), before);
    assert.deepEqual(await statement(company, 'SAME-CODE', '2026-02-01', '2026-02-28'), periodBefore);
    // Retained legacy limitation: this is period movement, not an opening-inclusive balance.
    assert.equal(Number(periodBefore[0].running_balance), 200); assert.equal(Number(periodBefore[1].running_balance), 175);
    await admin(); const metaAfter = (await metadata())[0];
    assert.equal(metaAfter.oid, metaBefore.oid); assert.equal(metaAfter.proowner, metaBefore.proowner);
    assert.equal(metaAfter.prosecdef, true); assert.equal(metaAfter.provolatile, metaBefore.provolatile);
    assert.deepEqual(metaAfter.proconfig, ['search_path=""']);
    assert.deepEqual(await query("SELECT (SELECT count(*) FROM invoices) AS invoices,(SELECT count(*) FROM payments) AS payments"), rowsBefore);
    for (const role of ['anon','unrelated']) {
      assert.equal((await query('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS allowed',[role,signature]))[0].allowed,false);
      await asRole(role,null); await denied(() => statement()); await admin();
    }
    for (const role of ['authenticated','service_role']) assert.equal((await query('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS allowed',[role,signature]))[0].allowed,true);
  });
  it('requires authenticated active company membership even for a super administrator', async () => {
    await install(); await denied(() => statement(foreign));
    await asRole('authenticated', null); await denied(() => statement());
    await admin(); await db.exec("UPDATE profiles SET is_active=false"); await asRole(); await denied(() => statement());
    await admin(); await db.exec("UPDATE user_roles SET role='super_admin'"); await asRole(); await denied(() => statement());
    await admin(); await db.exec("UPDATE profiles SET is_active=true"); await asRole(); await denied(() => statement(foreign));
    await admin(); await db.exec('DELETE FROM profiles'); await asRole(); await denied(() => statement());
  });
  it('preserves customer-reader roles and explicit grants while respecting explicit denial and employee access revocation', async () => {
    await install();
    for (const role of ['super_admin','admin','company_admin','manager','accountant','fleet_manager','sales_agent']) {
      await admin(); await db.query('UPDATE user_roles SET role=$1',[role]); await asRole(); assert.equal((await statement()).length,4);
    }
    await admin(); await db.query('UPDATE user_roles SET company_id=$1',[foreign]); await asRole(); await denied(() => statement());
    await admin(); await db.query("UPDATE user_roles SET role='employee',company_id=$1",[company]); await asRole(); await denied(() => statement());
    await admin(); await db.query("INSERT INTO user_permissions VALUES($1,'operations.customers.read',true)",[actor]); await asRole(); assert.equal((await statement()).length,4);
    await admin(); await db.exec("UPDATE user_roles SET role='company_admin';UPDATE user_permissions SET granted=false"); await asRole(); await denied(() => statement());
    await admin(); await db.exec('DELETE FROM user_permissions'); await db.query("INSERT INTO employees VALUES($1,$2,false,'active')",[actor,company]);
    await asRole(); await denied(() => statement());
    await admin(); await db.exec("UPDATE employees SET has_system_access=true,account_status='disabled'"); await asRole(); await denied(() => statement());
    await admin(); await db.exec("UPDATE employees SET account_status='active'"); await asRole(); assert.equal((await statement()).length,4);
  });
  it('uses the actual SQL service role and rejects forged JWT role text from ordinary callers', async () => {
    await install(); await asRole('authenticated',null,'service_role'); await denied(() => statement(foreign));
    await asRole('authenticated',actor,'service_role'); await denied(() => statement(foreign));
    await asRole('anon',null,'service_role'); await denied(() => statement(foreign));
    await asRole('service_role',null); assert.equal((await statement(foreign))[0].debit_amount,'999');
    await asRole('service_role',null,'authenticated'); assert.equal((await statement()).length,4);
    await admin(); await db.exec('DELETE FROM profiles'); await asRole('authenticated',actor,'postgres'); await denied(() => statement());
  });
  it('rejects invalid inputs before source lookup and keeps missing or inactive customers empty', async () => {
    await install();
    for (const args of [
      [null,'SAME-CODE',null,null], [company,null,null,null], [company,'   ',null,null],
      [company,'SAME-CODE','infinity',null], [company,'SAME-CODE',null,'-infinity'],
      [company,'SAME-CODE','0001-01-01 BC',null], [company,'SAME-CODE','2026-03-01','2026-01-01']
    ]) await invalid(() => statement(...args));
    assert.deepEqual(await statement(company,'missing'),[]);
    await admin(); await db.query('UPDATE customers SET is_active=false WHERE id=$1',[customer]); await asRole();
    assert.deepEqual(await statement(),[]);
    await asRole('service_role',null); await invalid(() => statement(company,'',null,null));
  });
  it('cannot read shadow temporary tables under the definer search path', async () => {
    await install(); const before=await statement(); await admin();
    await db.exec(`CREATE TEMP TABLE customers(id uuid,company_id uuid,customer_code text,is_active boolean);
      CREATE TEMP TABLE invoices(id uuid,customer_id uuid,company_id uuid,invoice_date date,invoice_number varchar(50),notes text,total_amount numeric,status text);
      CREATE TEMP TABLE payments(id uuid,customer_id uuid,company_id uuid,payment_date date,payment_number varchar(50),notes text,amount numeric,payment_status text);`);
    await asRole(); assert.deepEqual(await statement(),before);
  });
  it('rolls back to the inspected body, original execution privileges and results without DROP', async () => {
    const before=await statement(); await admin(); const metaBefore=(await metadata())[0];
    const normalized = definition => definition.replace(/\r\n/g,'\n');
    // The fixture is pinned independently of the migration and rollback.
    const fixture=await read('./fixtures/customer-statement-live-before-authorization.sql');
    const captured=fixture.slice(fixture.indexOf('CREATE OR REPLACE FUNCTION'),fixture.lastIndexOf('$function$')+10)+'\n';
    assert.equal(createHash('sha256').update(normalized(metaBefore.definition)).digest('hex'),capturedDefinitionSha);
    assert.equal(createHash('sha256').update(normalized(captured)).digest('hex'),capturedDefinitionSha);
    await install(); await admin(); await db.exec(await read('../../supabase/rollbacks/'+migration+'.rollback.sql'));
    const after=(await metadata())[0];
    assert.deepEqual({...after,proacl:[...after.proacl].sort(),definition:normalized(after.definition)},
      {...metaBefore,proacl:[...metaBefore.proacl].sort(),definition:normalized(metaBefore.definition)});
    await asRole(); assert.deepEqual(await statement(),before);
  });
});

