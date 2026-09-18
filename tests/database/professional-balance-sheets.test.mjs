// Executes the real migration with isolated synthetic data. Never connects to production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { startTemporaryPostgres } from './helpers/temporary-postgres.mjs';

const company='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const maker='33333333-3333-4333-8333-333333333333';
const reviewer='44444444-4444-4444-8444-444444444444';
const outsider='55555555-5555-4555-8555-555555555555';
const cash='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const revenue='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const equity='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const expense='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const depreciation='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
const liability='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
const foreignAccount='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
const asset='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8';
const confirmations={assets:true,liabilities:true,equity:true,reconciliation:true,completeness:true};
const notes='Reviewed all ledger reconciliations and complete supporting documents.';
const migration='20260918001000_professional_balance_sheets';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const value=async(sql,args=[]) => (await rows(sql,args))[0].value;
const auth=async(id=maker,tenant=company,role='authenticated')=>{
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[id||'',tenant||'']);
  await db.exec(`SET ROLE ${role}`);
};
const admin=()=>db.exec('RESET ROLE');
const get=(cutoff='2026-08-31',comparison=null,tenant=company)=>value(
  'SELECT public.get_professional_balance_sheet_v1($1,$2,$3) value',[tenant,cutoff,comparison]);
const save=(cutoff='2026-08-31',comparison=null)=>value(
  'SELECT public.save_professional_balance_sheet_v1($1,$2,$3,$4) value',[company,cutoff,comparison,'Prepared for accounting review']);
const approve=(id,confirm=confirmations,review=notes)=>value(
  'SELECT public.approve_professional_balance_sheet_v1($1,$2,$3) value',[id,review,confirm]);
const voidReport=(id,reason='Superseded by a reviewed newer statement')=>value(
  'SELECT public.void_professional_balance_sheet_v1($1,$2) value',[id,reason]);
const codes=report=>report.checks.map(c=>c.code);
async function journal({date='2026-01-15',debits=[[cash,100]],credits=[[revenue,100]],status='posted',tenant=company}={}) {
  await admin();
  const totalDebit=debits.reduce((s,x)=>s+x[1],0),totalCredit=credits.reduce((s,x)=>s+x[1],0);
  const id=(await rows(`INSERT INTO public.journal_entries(company_id,entry_date,status,total_debit,total_credit)
    VALUES($1,$2,$3,$4,$5) RETURNING id`,[tenant,date,status,totalDebit,totalCredit]))[0].id;
  let n=0;
  for (const [account,d] of debits) await db.query(`INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount)
    VALUES($1,$2,$3,$4,0)`,[id,account,++n,d]);
  for (const [account,c] of credits) await db.query(`INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount)
    VALUES($1,$2,$3,0,$4)`,[id,account,++n,c]);
  await auth();
  return id;
}
async function install(instance=new PGlite()) {
  await instance.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.company',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE TABLE companies(id uuid PRIMARY KEY,name text,name_ar text,commercial_register text,currency text,address text,address_ar text);
    CREATE TABLE profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean,
      first_name text,last_name text,first_name_ar text,last_name_ar text);
    CREATE TABLE employees(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean,
      has_system_access boolean,account_status text);
    CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
    CREATE TABLE user_permissions(user_id uuid,permission_id text,granted boolean);
    CREATE TABLE chart_of_accounts(id uuid PRIMARY KEY,company_id uuid,account_code text,account_name text,account_name_ar text,
      account_type text,account_subtype text,balance_type text,account_level int,is_header boolean,is_active boolean,
      parent_account_id uuid,parent_account_code text);
    CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,entry_number text DEFAULT 'TEST',
      entry_date date,status text,total_debit numeric,total_credit numeric,posted_at timestamptz,
      reversed_at timestamptz,reversal_entry_id uuid,reference_type text,reference_id uuid);
    CREATE TABLE journal_entry_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_entry_id uuid,account_id uuid,
      line_number int,debit_amount numeric,credit_amount numeric,line_description text);
    CREATE TABLE vehicles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,is_active boolean,purchase_cost numeric,purchase_date date);
  `);
  // Load the real, verified authorization helper, including explicit-deny precedence.
  const baseline=await read('../../supabase/migrations/20260712052300_atomic_payment_cancellation_and_contract_totals.sql');
  const start=baseline.indexOf('CREATE OR REPLACE FUNCTION public.is_finance_action_authorized(');
  const end=baseline.indexOf('CREATE OR REPLACE FUNCTION public.canonical_contract_paid_amount',start);
  await instance.exec(baseline.slice(start,end));
  await instance.exec(await read(`../../supabase/migrations/${migration}.sql`));
  return instance;
}
async function seed() {
  await db.query(`INSERT INTO companies VALUES($1,'Al-Araf Car Rental','شركة العراف لتأجير السيارات','CR-TEST','QAR','Doha','الدوحة'),
    ($2,'Other company','شركة أخرى','CR-OTHER','QAR','Doha','الدوحة')`,[company,foreign]);
  await db.query(`INSERT INTO profiles(user_id,company_id,is_active,first_name,last_name) VALUES
    ($1,$4,true,'Preparing','Accountant'),($2,$4,true,'Reviewing','Accountant'),($3,$5,true,'Other','Accountant')`,
  [maker,reviewer,outsider,company,foreign]);
  await db.query(`INSERT INTO user_roles VALUES($1,$4,'accountant'),($2,$4,'accountant'),($3,$5,'accountant')`,
    [maker,reviewer,outsider,company,foreign]);
  for(const [id,code,type,subtype,balance] of [
    [cash,'cash','assets','current_asset','debit'],[revenue,'revenue','revenue',null,'credit'],
    [equity,'equity','equity',null,'credit'],[expense,'expense','expenses',null,'debit'],
    [depreciation,'depreciation','asset','accumulated_depreciation','credit'],
    [liability,'liability','liabilities','current_liability','credit'],[asset,'vehicles','asset','fixed_asset','debit']])
    await db.query(`INSERT INTO chart_of_accounts(id,company_id,account_code,account_name,account_name_ar,account_type,
      account_subtype,balance_type,account_level,is_header,is_active) VALUES($1,$2,$3,$3,$3,$4,$5,$6,3,false,true)`,
    [id,company,code,type,subtype,balance]);
  await db.query(`INSERT INTO chart_of_accounts(id,company_id,account_code,account_name,account_type,account_subtype,account_level)
    VALUES($1,$2,'FOREIGN-SECRET','Foreign confidential name','asset','current_asset',3)`,[foreignAccount,foreign]);
}

describe('professional balance sheets: canonical SQL and protected review workflow',{concurrency:false},()=>{
  beforeEach(async()=>{ db=await install(); await seed(); await auth(); });
  afterEach(async()=>{ await db?.close(); });

  it('fails closed for approval under repeatable read snapshots',async()=>{
    await journal();const saved=await save();await auth(reviewer);
    await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(approve(saved.id),/requires read committed isolation/);
    await db.exec('ROLLBACK');
  });

  it('includes all 2400 posted lines without an API row cap and calculates retained plus unclosed results',async()=>{
    await admin();
    await db.query(`WITH inserted AS (
      INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit)
      SELECT $1,'2026-01-15','posted',10,10 FROM generate_series(1,1200) RETURNING id)
      INSERT INTO journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount)
      SELECT id,$2::uuid,1,10,0 FROM inserted UNION ALL SELECT id,$3::uuid,2,0,10 FROM inserted`,[company,cash,revenue]);
    await auth();
    await journal({debits:[[cash,500]],credits:[[equity,500]]});
    const report=await get();
    assert.equal(report.current.postedLines,2402);
    assert.equal(report.current.postedEntries,1201);
    assert.equal(report.current.assets,12500);
    assert.equal(report.current.equityAccounts,500);
    assert.equal(report.current.unclosedResult,12000);
    assert.equal(report.current.equity,12500);
    assert.equal(report.current.imbalance,0);
    assert.match(report.fingerprint,/^[a-f0-9]{64}$/);
    assert.equal(report.company.name,'Al-Araf Car Rental');
    assert.deepEqual(report.permissions,{canSave:true,canApprove:true});
  });

  it('retains signed contra balances and inactive accounts, and closing journals do not double-count income',async()=>{
    await journal({debits:[[asset,1000]],credits:[[equity,1000]]});
    await journal({debits:[[cash,300]],credits:[[revenue,300]]});
    await journal({debits:[[expense,100]],credits:[[depreciation,100]]});
    await admin(); await db.query('UPDATE chart_of_accounts SET is_active=false WHERE id=$1',[asset]); await auth();
    let report=await get();
    assert.equal(report.accounts.find(a=>a.id===depreciation).balance,-100);
    assert.equal(report.accounts.find(a=>a.id===asset).balance,1000);
    assert.equal(report.accounts.find(a=>a.id===asset).isActive,false);
    assert.equal(report.current.assets,1200);
    assert.equal(report.current.unclosedResult,200);
    assert.equal(report.current.equity,1200);
    assert.ok(!codes(report).includes('negative_asset_balances'));
    await journal({debits:[[revenue,300]],credits:[[expense,100],[equity,200]]});
    report=await get();
    assert.equal(report.current.unclosedResult,0);
    assert.equal(report.current.equityAccounts,1200);
    assert.equal(report.current.equity,1200);
    assert.equal(report.current.imbalance,0);
  });

  it('uses cumulative cutoff balances for the current and prior columns and excludes future entries',async()=>{
    await journal({date:'2025-12-31',debits:[[cash,300]],credits:[[equity,300]]});
    await journal({date:'2026-08-31',debits:[[cash,200]],credits:[[revenue,200]]});
    await journal({date:'2026-09-01',debits:[[cash,999]],credits:[[revenue,999]]});
    const report=await get('2026-08-31','2025-12-31');
    assert.equal(report.current.assets,500);
    assert.equal(report.comparison.assets,300);
    assert.equal(report.accounts.find(a=>a.id===cash).comparisonBalance,300);
    assert.equal(report.current.postedEntries,2);
    assert.equal(report.comparison.postedEntries,1);
  });

  it('rejects invalid dates, future dates, infinite dates and a comparison after or equal to cutoff',async()=>{
    for(const [cutoff,comparison] of [[null,null],['infinity',null],['2099-12-31',null],['2026-08-31','2026-08-31'],['2026-08-31','2026-09-01']])
      await assert.rejects(get(cutoff,comparison),/Invalid balance sheet date/);
  });

  it('reports unknown/missing classifications without guessing codes and preserves header postings',async()=>{
    await journal();
    await admin();
    await db.query("UPDATE chart_of_accounts SET account_code='111001',account_subtype=NULL,is_header=true,account_level=1 WHERE id=$1",[cash]);
    await auth();
    const report=await get();
    assert.equal(report.current.assets,100);
    assert.equal(report.accounts.find(a=>a.id===cash).classification,'unclassified');
    assert.ok(codes(report).includes('unclassified_accounts'));
    assert.ok(codes(report).includes('legacy_posting_accounts'));
  });

  it('maps both explicit contra maturities and leaves ambiguous contra_asset unclassified',async()=>{
    await journal({debits:[[expense,100]],credits:[[depreciation,100]]});
    for(const [subtype,classification] of [['contra_current_asset','current'],['contra_non_current_asset','non_current'],['contra_asset','unclassified']]) {
      await admin(); await db.query('UPDATE chart_of_accounts SET account_subtype=$1 WHERE id=$2',[subtype,depreciation]); await auth();
      const report=await get();
      assert.equal(report.accounts.find(a=>a.id===depreciation).classification,classification);
      assert.equal(codes(report).includes('unclassified_accounts'),classification==='unclassified');
      assert.equal(codes(report).includes('negative_asset_balances'),classification==='unclassified');
    }
  });

  it('flags malformed journals, header disagreement, invalid foreign/missing accounts, and unknown types',async()=>{
    const id=await journal({debits:[[cash,100]],credits:[[revenue,99]]});
    await admin();
    await db.query('UPDATE journal_entries SET total_debit=999 WHERE id=$1',[id]);
    await db.query('UPDATE journal_entry_lines SET debit_amount=-1 WHERE journal_entry_id=$1 AND account_id=$2',[id,cash]);
    await db.query("UPDATE chart_of_accounts SET account_type='unexpected' WHERE id=$1",[revenue]);
    await auth();
    await journal({debits:[[foreignAccount,50]],credits:[[revenue,50]]});
    await journal({debits:[['ffffffff-ffff-4fff-8fff-ffffffffffff',50]],credits:[[revenue,50]]});
    const report=await get();
    for(const expected of ['malformed_journal_lines','unbalanced_journals','journal_header_mismatch','invalid_ledger_accounts','unknown_account_types'])
      assert.ok(codes(report).includes(expected),expected);
    assert.ok(!JSON.stringify(report).includes('FOREIGN-SECRET'));
    assert.ok(!JSON.stringify(report).includes('Foreign confidential name'));
    assert.equal(report.accounts.filter(a=>a.code==='UNRESOLVED').length,2);
  });

  it('identifies missing company identity/currency and current vehicle gaps without substituting values',async()=>{
    await journal();
    await admin();
    await db.query('UPDATE companies SET commercial_register=NULL,currency=NULL WHERE id=$1',[company]);
    await db.query('INSERT INTO vehicles(company_id,is_active) VALUES($1,true)',[company]); await auth();
    const report=await get();
    assert.equal(report.company.currency,'');
    for(const expected of ['missing_company_identity','missing_company_currency','current_vehicles_missing_cost','current_vehicles_missing_purchase_date'])
      assert.ok(codes(report).includes(expected),expected);
  });

  it('discloses draft entries, future reversals and unexpected negative assets',async()=>{
    const original=await journal({date:'2025-12-01',debits:[[expense,100]],credits:[[cash,100]]});
    const reversal=await journal({date:'2026-09-10',debits:[[cash,100]],credits:[[expense,100]]});
    await journal({status:'draft'});
    await admin(); await db.query('UPDATE journal_entries SET reversal_entry_id=$1,reversed_at=$2 WHERE id=$3',
      [reversal,'2026-09-10',original]); await auth();
    const report=await get();
    assert.equal(report.current.assets,-100);
    assert.equal(report.current.draftEntries,1);
    assert.ok(codes(report).includes('draft_entries'));
    assert.ok(codes(report).includes('reversals_after_date'));
    assert.ok(codes(report).includes('negative_asset_balances'));
  });

  it('blocks excluded legacy reversals and invalid cross-tenant reversal pointers without using foreign data',async()=>{
    const original=await journal();
    const other=await journal({tenant:foreign,date:'2026-09-01',debits:[[foreignAccount,333]],credits:[[foreignAccount,333]]});
    await admin();
    await db.query('UPDATE journal_entries SET reversal_entry_id=$1 WHERE id=$2',[other,original]); await auth();
    const before=await get();
    assert.ok(before.checks.some(c=>c.code==='invalid_reversal_link' && c.severity==='error'));
    assert.ok(!codes(before).includes('reversals_after_date'));
    await admin(); await db.query("UPDATE journal_entries SET total_debit=999,total_credit=999,entry_date='2026-09-15' WHERE id=$1",[other]); await auth();
    assert.equal((await get()).fingerprint,before.fingerprint);
    await admin(); await db.query("UPDATE journal_entries SET status='reversed',reversal_entry_id=NULL WHERE id=$1",[original]); await auth();
    assert.ok((await get()).checks.some(c=>c.code==='legacy_reversed_entries' && c.severity==='error'));
    const saved=await save(); await auth(reviewer);
    await assert.rejects(approve(saved.id),/blocking accounting errors/);
  });

  it('denies anonymous, foreign, inactive, nonfinance and explicitly denied users including SELECT RLS',async()=>{
    await journal(); const saved=await save();
    await auth(outsider,foreign);
    await assert.rejects(get(),/Not authorized/);
    assert.equal((await rows('SELECT * FROM public.professional_balance_sheet_reports WHERE id=$1',[saved.id])).length,0);
    await assert.rejects(approve(saved.id),/Not authorized/);
    await auth(null,null,'anon'); await assert.rejects(get(),/permission denied/);
    await auth(null,company); await assert.rejects(get(),/Not authorized/);
    await auth(); await admin(); await db.query('UPDATE profiles SET is_active=false WHERE user_id=$1',[maker]); await auth();
    await assert.rejects(get(),/Not authorized/);
    await admin(); await db.query('UPDATE profiles SET is_active=true WHERE user_id=$1',[maker]);
    await db.query("UPDATE user_roles SET role='employee' WHERE user_id=$1",[maker]); await auth();
    await assert.rejects(get(),/Not authorized/);
    await admin(); await db.query("UPDATE user_roles SET role='company_admin' WHERE user_id=$1",[maker]);
    await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.view',false)",[maker]); await auth();
    await assert.rejects(get(),/Not authorized/);
  });

  it('does not accept forged monetary payloads, direct writes or raw private calculator calls',async()=>{
    await journal(); const saved=await save();
    await assert.rejects(db.query('UPDATE public.professional_balance_sheet_reports SET status=$1 WHERE id=$2',['approved',saved.id]),/permission denied/);
    await assert.rejects(db.query('INSERT INTO public.professional_balance_sheet_reports(id) VALUES($1)',[saved.id]),/permission denied/);
    await assert.rejects(db.query('DELETE FROM public.professional_balance_sheet_reports WHERE id=$1',[saved.id]),/permission denied/);
    await assert.rejects(db.query('SELECT balance_sheet_private.calculate($1,$2,NULL)',[company,'2026-08-31']),/permission denied/);
    await assert.rejects(db.query('SELECT public.save_professional_balance_sheet_v1($1,$2,NULL,NULL,$3)',[company,'2026-08-31',{assets:1}]),/does not exist/);
  });

  it('honors explicit employee system-access revocation without inventing an employee requirement for admins',async()=>{
    await journal();
    await admin(); await db.query("UPDATE user_roles SET role='company_admin' WHERE user_id=$1",[maker]); await auth();
    assert.equal((await get()).permissions.canSave,true); // No linked employee is permitted by canonical finance access.
    await admin();
    await db.query("INSERT INTO employees(user_id,company_id,is_active,has_system_access,account_status) VALUES($1,$2,false,true,'active')",[maker,company]);
    await auth(); assert.equal((await get()).permissions.canSave,true); // Inactive personnel is not a revoked login.
    await admin(); await db.query('UPDATE employees SET has_system_access=false WHERE user_id=$1',[maker]); await auth();
    await assert.rejects(get(),/Not authorized/); await assert.rejects(save(),/Not authorized/);
    await admin(); await db.query("UPDATE employees SET has_system_access=true,account_status='suspended' WHERE user_id=$1",[maker]); await auth();
    await assert.rejects(get(),/Not authorized/);
    await admin(); await db.query("UPDATE employees SET account_status='active' WHERE user_id=$1",[maker]);
    await db.query("INSERT INTO employees(user_id,company_id,is_active,has_system_access,account_status) VALUES($1,$2,false,false,'suspended')",[maker,foreign]);
    await auth(); assert.equal((await get()).permissions.canSave,true); // Another company's employee row cannot decide access here.
  });

  it('requires an independent accountant, permission, notes and all five explicit review confirmations',async()=>{
    await journal(); const saved=await save();
    await assert.rejects(approve(saved.id),/Generator cannot approve/);
    await auth(reviewer);
    await assert.rejects(approve(saved.id,confirmations,'short'),/Review notes/);
    await assert.rejects(approve(saved.id,{...confirmations,assets:false}),/five accountant/);
    await assert.rejects(approve(saved.id,{...confirmations,assets:'true'}),/five accountant/);
    await admin(); await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.approve',false)",[reviewer]); await auth(reviewer);
    await assert.rejects(approve(saved.id),/Not authorized/);
    assert.equal((await get()).permissions.canApprove,false);
  });

  it('preserves manager viewing and preparation access without granting accountant approval',async()=>{
    await journal(); const preparedByAccountant=await save();
    await admin(); await db.query("UPDATE user_roles SET role='manager' WHERE user_id=$1",[reviewer]); await auth(reviewer);
    assert.deepEqual((await get()).permissions,{canSave:true,canApprove:false});
    assert.equal((await save()).status,'draft');
    await assert.rejects(approve(preparedByAccountant.id),/Not authorized/);
    await admin(); await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.save',false)",[reviewer]); await auth(reviewer);
    assert.equal((await get()).permissions.canSave,false);
    await assert.rejects(save(),/Not authorized/);
    await admin(); await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.view',false)",[reviewer]); await auth(reviewer);
    await assert.rejects(get(),/Not authorized/);
  });

  it('approves valid reports, freezes content, records approval and supports audited voiding',async()=>{
    await journal(); const saved=await save();
    await auth(reviewer);
    const approved=await approve(saved.id);
    assert.equal(approved.status,'approved');
    assert.equal(approved.approved_by,reviewer);
    assert.equal(approved.approved_by_name,'Reviewing Accountant');
    assert.deepEqual(approved.confirmations,confirmations);
    assert.deepEqual(approved.payload,saved.payload);
    await admin();
    await assert.rejects(db.query("UPDATE professional_balance_sheet_reports SET payload='{}' WHERE id=$1",[saved.id]),/immutable/);
    await assert.rejects(db.query('DELETE FROM professional_balance_sheet_reports WHERE id=$1',[saved.id]),/cannot be deleted/);
    await auth(reviewer);
    const voided=await voidReport(saved.id);
    assert.equal(voided.status,'voided');
    assert.equal(voided.approved_by,reviewer);
    assert.deepEqual(voided.payload,saved.payload);
    await admin();
    assert.deepEqual((await rows('SELECT action FROM balance_sheet_private.report_events WHERE report_id=$1 ORDER BY created_at,id',[saved.id])).map(r=>r.action).sort(),['approved','created','voided']);
    await assert.rejects(db.query("UPDATE professional_balance_sheet_reports SET status='approved' WHERE id=$1",[saved.id]),/immutable/);
  });

  it('allows saving drafts with blocking errors but refuses approval',async()=>{
    await journal();
    await admin(); await db.query('UPDATE chart_of_accounts SET account_subtype=NULL WHERE id=$1',[cash]); await auth();
    const saved=await save();
    assert.equal(saved.status,'draft');
    await auth(reviewer);
    await assert.rejects(approve(saved.id),/blocking accounting errors/);
  });

  it('does not approve an empty ledger and preserves server-enforced save permission',async()=>{
    const empty=await save();
    assert.ok(empty.payload.checks.some(c=>c.code==='no_posted_entries' && c.severity==='error'));
    assert.ok(empty.payload.accounts.every(a=>a.comparisonBalance===0));
    await auth(reviewer); await assert.rejects(approve(empty.id),/blocking accounting errors/);
    await admin(); await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.save',false)",[maker]); await auth();
    assert.equal((await get()).permissions.canSave,false);
    await assert.rejects(save(),/Not authorized/);
  });

  it('detects source changes even when net balances are unchanged and metadata changes',async()=>{
    await journal(); let saved=await save();
    await journal({debits:[[cash,50]],credits:[[revenue,50]]});
    await journal({debits:[[revenue,50]],credits:[[cash,50]]});
    await auth(reviewer);
    await assert.rejects(approve(saved.id),/source changed/);
    await auth(); saved=await save();
    await admin(); await db.query("UPDATE chart_of_accounts SET account_name='Changed name' WHERE id=$1",[cash]); await auth(reviewer);
    await assert.rejects(approve(saved.id),/source changed/);
  });

  it('fingerprints are stable across actors/time but track historical, draft and comparison sources',async()=>{
    await journal({date:'2025-12-31'});
    const first=await get('2026-08-31','2025-12-31');
    await auth(reviewer); const second=await get('2026-08-31','2025-12-31');
    assert.equal(first.fingerprint,second.fingerprint);
    await journal({status:'draft'});
    const third=await get('2026-08-31','2025-12-31');
    assert.notEqual(first.fingerprint,third.fingerprint);
    assert.notEqual(third.fingerprint,(await get('2026-08-31',null)).fingerprint);
  });

  it('lists only the current tenant and returns at most the latest fifty saved statements',async()=>{
    await journal();
    for(let n=0;n<52;n++) await save();
    const listed=await value('SELECT public.list_professional_balance_sheets_v1($1) value',[company]);
    assert.equal(listed.length,50);
    assert.ok(listed.every(r=>r.company_id===company));
    await auth(outsider,foreign);
    assert.deepEqual(await value('SELECT public.list_professional_balance_sheets_v1($1) value',[foreign]),[]);
    await assert.rejects(value('SELECT public.list_professional_balance_sheets_v1($1) value',[company]),/Not authorized/);
  });
});

describe('professional balance sheet rollback preserves signed history',()=>{
  it('removes entry points while retaining approved rows, audit events, tenant RLS and immutability',async()=>{
    db=await install();
    try {
      await seed(); await auth(); await journal(); const saved=await save(); await auth(reviewer); await approve(saved.id);
      await admin(); await db.exec(await read(`../../supabase/rollbacks/${migration}.rollback.sql`));
      const retained=(await rows('SELECT * FROM professional_balance_sheet_reports WHERE id=$1',[saved.id]))[0];
      assert.equal(retained.status,'approved');
      assert.deepEqual(retained.payload,saved.payload);
      assert.equal((await rows('SELECT count(*)::int n FROM balance_sheet_private.report_events'))[0].n,2);
      await assert.rejects(db.query('DELETE FROM professional_balance_sheet_reports WHERE id=$1',[saved.id]),/cannot be deleted/);
      await auth(reviewer); assert.equal((await rows('SELECT id FROM professional_balance_sheet_reports')).length,1);
      await assert.rejects(get(),/does not exist/);
      await auth(outsider,foreign); assert.equal((await rows('SELECT id FROM professional_balance_sheet_reports')).length,0);
    } finally { await db.close(); }
  });
});

describe('professional balance sheet native PostgreSQL source locking',{
  skip:process.env.BALANCE_SHEET_NATIVE_CONCURRENCY!=='1',
},()=>{
  it('observes committed changes after waiting and prevents a source writer from racing approval',async()=>{
    let cluster,owner,writer,approver;
    try {
      cluster=await startTemporaryPostgres();
      owner=new pg.Client(cluster.config); writer=new pg.Client(cluster.config); approver=new pg.Client(cluster.config);
      await Promise.all([owner.connect(),writer.connect(),approver.connect()]);
      owner.exec=sql=>owner.query(sql); db=await install(owner);
      await seed(); await auth(); await journal(); const original=await save();
      await approver.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[reviewer,company]);
      await approver.query('SET ROLE authenticated');
      await admin();
      const waitForLock=async client=>{
        for(let attempt=0;attempt<100;attempt++) {
          const result=await owner.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[client.processID]);
          if(result.rows[0]?.wait_event_type==='Lock') return;
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        assert.fail('Expected concurrent connection to wait on a source-table lock');
      };
      await writer.query('BEGIN');
      await writer.query("UPDATE journal_entry_lines SET line_description='Changed while approval waits' WHERE account_id=$1",[cash]);
      const approval=approver.query('SELECT public.approve_professional_balance_sheet_v1($1,$2,$3)',[original.id,notes,confirmations])
        .then(result=>({result}),error=>({error}));
      await waitForLock(approver);
      await writer.query('COMMIT');
      const stale=await approval;
      assert.equal(stale.error?.code,'40001');
      assert.match(stale.error?.message||'',/source changed/);
      assert.equal((await owner.query('SELECT status FROM professional_balance_sheet_reports WHERE id=$1',[original.id])).rows[0].status,'draft');

      await auth(); const fresh=await save(); await admin();
      await approver.query('BEGIN');
      const approved=await approver.query('SELECT public.approve_professional_balance_sheet_v1($1,$2,$3) report',[fresh.id,notes,confirmations]);
      assert.equal(approved.rows[0].report.status,'approved');
      const sourceWrite=writer.query("UPDATE journal_entry_lines SET line_description='A later independent ledger update' WHERE account_id=$1",[cash]);
      await waitForLock(writer);
      await approver.query('COMMIT');
      await sourceWrite;
      const saved=(await owner.query('SELECT status,payload,source_fingerprint FROM professional_balance_sheet_reports WHERE id=$1',[fresh.id])).rows[0];
      assert.equal(saved.status,'approved');
      assert.deepEqual(saved.payload,fresh.payload);
      assert.equal(saved.source_fingerprint,fresh.source_fingerprint);
    } finally {
      await Promise.allSettled([writer?.end(),approver?.end(),owner?.end()]);
      await cluster?.close();
    }
  });
});
