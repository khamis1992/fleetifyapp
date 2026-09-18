// Real migration against isolated synthetic databases; never accepts a production URL.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { startTemporaryPostgres } from './helpers/temporary-postgres.mjs';

const company='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const accountant='33333333-3333-4333-8333-333333333333';
const manager='44444444-4444-4444-8444-444444444444';
const outsider='55555555-5555-4555-8555-555555555555';
const reason='Accounting reconciliation completed and cutoff explicitly authorized.';
const migration='20260918003000_financial_reporting_period_locks';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const value=async(sql,args=[]) => (await rows(sql,args))[0].value;
const auth=async(id=accountant,tenant=company,role='authenticated')=>{
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[id||'',tenant||'']);
  await db.exec(`SET ROLE ${role}`);
};
const admin=()=>db.exec('RESET ROLE');
const lock=(date='2026-08-31',why=reason,tenant=company)=>value('SELECT public.lock_financial_reporting_period_v1($1,$2,$3) value',[tenant,date,why]);
const unlock=(why=reason,tenant=company)=>value('SELECT public.unlock_financial_reporting_period_v1($1,$2) value',[tenant,why]);
const list=(tenant=company)=>value('SELECT public.list_financial_reporting_period_locks_v1($1) value',[tenant]);
const journal=async(date='2026-01-15',tenant=company)=> (await rows(`INSERT INTO journal_entries(company_id,entry_date)
  VALUES($1,$2) RETURNING id`,[tenant,date]))[0].id;
const line=async(parent)=> (await rows('INSERT INTO journal_entry_lines(journal_entry_id) VALUES($1) RETURNING id',[parent]))[0].id;

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
    CREATE TABLE employees(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean,has_system_access boolean,account_status text);
    CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
    CREATE TABLE user_permissions(user_id uuid,permission_id text,granted boolean);
    CREATE TABLE chart_of_accounts(id uuid PRIMARY KEY,company_id uuid,account_code text,account_name text,account_name_ar text,
      account_type text,account_subtype text,balance_type text,account_level int,is_header boolean,is_active boolean,parent_account_id uuid,parent_account_code text);
    CREATE TABLE accounting_periods(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,
      period_name text NOT NULL,start_date date NOT NULL,end_date date NOT NULL,status text NOT NULL DEFAULT 'open'
      CHECK(status IN ('open','closed','locked')),is_adjustment_period boolean DEFAULT false,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,entry_number text DEFAULT 'TEST',
      entry_date date NOT NULL,accounting_period_id uuid,description text DEFAULT 'Synthetic entry',status text DEFAULT 'draft',
      total_debit numeric DEFAULT 0,total_credit numeric DEFAULT 0,posted_at timestamptz,posted_by uuid,
      reversed_at timestamptz,reversal_entry_id uuid,reference_type text,reference_id uuid,
      workflow_notes text,rejection_reason text,reviewed_by uuid,reviewed_at timestamptz,updated_at timestamptz,updated_by uuid);
    CREATE TABLE journal_entry_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_entry_id uuid NOT NULL
      REFERENCES journal_entries(id) ON DELETE CASCADE,account_id uuid DEFAULT gen_random_uuid(),
      line_number int DEFAULT 1,debit_amount numeric DEFAULT 0,credit_amount numeric DEFAULT 0,line_description text,
      cost_center_id uuid,asset_id uuid,employee_id uuid);
    CREATE TABLE vehicles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,is_active boolean,purchase_cost numeric,purchase_date date);
    GRANT SELECT,INSERT,UPDATE,DELETE ON journal_entries,journal_entry_lines,accounting_periods TO authenticated,service_role;
  `);
  const baseline=await read('../../supabase/migrations/20260712052300_atomic_payment_cancellation_and_contract_totals.sql');
  await instance.exec(baseline.slice(baseline.indexOf('CREATE OR REPLACE FUNCTION public.is_finance_action_authorized('),
    baseline.indexOf('CREATE OR REPLACE FUNCTION public.canonical_contract_paid_amount')));
  const controls=await read('../../supabase/migrations/20260627001000_financial_controls_layer.sql');
  await instance.exec(controls.slice(controls.indexOf('CREATE OR REPLACE FUNCTION public.financial_controls_bypass_enabled()'),
    controls.indexOf('CREATE OR REPLACE FUNCTION public.prevent_payment_hard_delete()')));
  await instance.exec(await read('../../supabase/migrations/20260918001000_professional_balance_sheets.sql'));
  await instance.exec(await read(`../../supabase/migrations/${migration}.sql`));
  // The existing trigger remains in production; exercise the replacement function too.
  await instance.exec(`CREATE TRIGGER enforce_journal_entry_financial_controls_trigger BEFORE INSERT OR UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION enforce_journal_entry_financial_controls();`);
  return instance;
}
async function seed() {
  await db.query(`INSERT INTO companies(id,name,currency) VALUES($1,'Synthetic primary','QAR'),($2,'Foreign secret','QAR')`,[company,foreign]);
  await db.query(`INSERT INTO profiles(user_id,company_id,is_active,first_name) VALUES($1,$4,true,'Accountant'),($2,$4,true,'Manager'),($3,$5,true,'Outsider')`,
    [accountant,manager,outsider,company,foreign]);
  await db.query(`INSERT INTO user_roles VALUES($1,$4,'accountant'),($2,$4,'manager'),($3,$5,'accountant')`,[accountant,manager,outsider,company,foreign]);
}

describe('reporting cutoff locks integrate with existing closed periods',{concurrency:false},()=>{
  beforeEach(async()=>{db=await install();await seed();await auth();});
  afterEach(async()=>{await db?.close();});

  it('installation neither locks periods nor changes ledger data; authorized lock captures actor/reason and existing-period integration',async()=>{
    const before=await list();assert.equal(before.managed_lock,null);assert.deepEqual(before.history,[]);
    const id=await journal();await line(id);
    const saved=await lock();assert.equal(saved.status,'locked');assert.equal(saved.changed_by,accountant);assert.equal(saved.reason,reason);
    const state=await list();assert.equal(state.managed_lock.id,saved.id);assert.equal(state.history.length,1);
    assert.equal(state.history[0].actor_id,accountant);assert.equal(state.can_manage,true);
    const period=(await rows('SELECT status,start_date::text,end_date::text FROM accounting_periods WHERE id=$1',[saved.accounting_period_id]))[0];
    assert.equal(period.start_date,'0001-01-01');assert.equal(period.end_date,'2026-08-31');assert.equal(period.status,'locked');
    assert.equal((await rows('SELECT count(*)::int count FROM journal_entries'))[0].count,1);
  });

  it('rejects null/infinite/future cutoffs and missing, short or oversized reasons',async()=>{
    for(const date of [null,'infinity','-infinity','2099-12-31','0001-01-01 BC']) await assert.rejects(lock(date),/Invalid reporting period cutoff/);
    for(const why of [null,'short',' '.repeat(30),'x'.repeat(4001)]) {
      await assert.rejects(lock('2026-08-31',why),/reason of 20 to 4000/);
      await assert.rejects(unlock(why),/reason of 20 to 4000/);
    }
    assert.equal((await list()).managed_lock,null);
  });

  it('rejects foreign scope, inactive users, managers, explicit denials and anonymous actions',async()=>{
    await assert.rejects(lock('2026-08-31',reason,foreign),/Not authorized/);
    await assert.rejects(list(foreign),/Not authorized/);
    await auth(manager);assert.equal((await list()).can_manage,false);await assert.rejects(lock(),/Not authorized/);
    await auth();await admin();await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.approve',false)",[accountant]);await auth();
    await assert.rejects(lock(),/Not authorized/);
    await admin();await db.query('DELETE FROM user_permissions');await db.query('UPDATE profiles SET is_active=false WHERE user_id=$1',[accountant]);await auth();
    await assert.rejects(list(),/Not authorized/);
    await auth(null,null,'anon');await assert.rejects(lock(),/permission denied/);
  });

  it('keeps state tenant isolated and refuses direct state/audit/capability writes',async()=>{
    const saved=await lock();await auth(outsider,foreign);
    assert.equal((await list(foreign)).managed_lock,null);assert.deepEqual((await list(foreign)).history,[]);
    assert.equal((await rows('SELECT * FROM financial_reporting_period_locks')).length,0);
    await auth();await assert.rejects(db.query("UPDATE financial_reporting_period_locks SET status='unlocked' WHERE id=$1",[saved.id]),/permission denied/);
    await assert.rejects(db.query('DELETE FROM balance_sheet_private.period_lock_events'),/permission denied/);
    await assert.rejects(db.query('INSERT INTO balance_sheet_private.period_lock_mutations VALUES(pg_current_xact_id(),$1)',[saved.accounting_period_id]),/permission denied/);
  });

  it('blocks entry inserts, accounting mutations and deletion at or before cutoff but permits later dates',async()=>{
    const old=await journal('2025-12-31');await lock();
    for(const date of ['0001-01-01','2025-12-31','2026-08-31']) await assert.rejects(journal(date),/closed or locked/);
    for(const sql of ["UPDATE journal_entries SET status='posted' WHERE id=$1", "UPDATE journal_entries SET reference_type='closing' WHERE id=$1",
      'UPDATE journal_entries SET total_debit=10,total_credit=10 WHERE id=$1','DELETE FROM journal_entries WHERE id=$1'])
      await assert.rejects(db.query(sql,[old]),/closed or locked/);
    await journal('2026-09-01');
  });

  it('guards BOTH old and new header dates and companies including attempts to move out of a locked tenant',async()=>{
    const old=await journal('2026-01-15'),later=await journal('2026-09-01'),other=await journal('2026-01-15',foreign);await lock();
    for(const [sql,args] of [
      ['UPDATE journal_entries SET entry_date=$1 WHERE id=$2',['2026-09-01',old]],
      ['UPDATE journal_entries SET company_id=$1 WHERE id=$2',[foreign,old]],
      ['UPDATE journal_entries SET entry_date=$1 WHERE id=$2',['2026-08-31',later]],
      ['UPDATE journal_entries SET company_id=$1 WHERE id=$2',[company,other]]
    ]) await assert.rejects(db.query(sql,args),/closed or locked/);
  });

  it('blocks old/new line moves, amounts, account changes, insert and delete regardless of caller role or bypass GUC',async()=>{
    const old=await journal(),later=await journal('2026-09-01'),other=await journal('2026-01-15',foreign);
    const oldLine=await line(old),laterLine=await line(later),foreignLine=await line(other);await lock();
    await db.query("SELECT set_config('app.financial_controls_bypass','on',false)");
    for(const [sql,args] of [
      ['DELETE FROM journal_entry_lines WHERE id=$1',[oldLine]],
      ['UPDATE journal_entry_lines SET debit_amount=99 WHERE id=$1',[oldLine]],
      ['UPDATE journal_entry_lines SET account_id=gen_random_uuid() WHERE id=$1',[oldLine]],
      ['UPDATE journal_entry_lines SET journal_entry_id=$1 WHERE id=$2',[later,oldLine]],
      ['UPDATE journal_entry_lines SET journal_entry_id=$1 WHERE id=$2',[old,laterLine]],
      ['UPDATE journal_entry_lines SET journal_entry_id=$1 WHERE id=$2',[old,foreignLine]],
    ]) await assert.rejects(db.query(sql,args),/closed or locked/);
    await assert.rejects(line(old),/closed or locked/);
    await auth(accountant,company,'service_role');await assert.rejects(line(old),/closed or locked/);
    await admin();await assert.rejects(line(old),/closed or locked/);
  });

  it('allows harmless description/review updates and ordinary open-period cascades',async()=>{
    const old=await journal(),oldLine=await line(old),later=await journal('2026-09-01');await line(later);await lock();
    await db.query("UPDATE journal_entries SET description='Clarified narrative',workflow_notes='Internal note',reviewed_at=now() WHERE id=$1",[old]);
    await db.query("UPDATE journal_entry_lines SET line_description='Clarified narrative' WHERE id=$1",[oldLine]);
    await db.query('DELETE FROM journal_entries WHERE id=$1',[later]);
    assert.equal((await rows('SELECT * FROM journal_entry_lines WHERE journal_entry_id=$1',[later])).length,0);
  });

  it('preserves pre-existing closed periods and their guards after explicit managed unlock',async()=>{
    await db.query("INSERT INTO accounting_periods(company_id,period_name,start_date,end_date,status) VALUES($1,'Legacy 2025','2025-01-01','2025-12-31','closed')",[company]);
    await assert.rejects(journal('2025-12-31'),/closed or locked/);
    await lock();const opened=await unlock('Reopened for documented adjusting entries approved by accounting.');
    assert.equal(opened.status,'unlocked');assert.equal((await list()).history.length,2);assert.equal((await list()).other_closed_periods.length,1);
    await journal('2026-01-15');await assert.rejects(journal('2025-12-31'),/closed or locked/);
    await assert.rejects(unlock(),/No active/);
  });

  it('requires explicit reopening before reducing a cutoff and preserves every extension/reopening event',async()=>{
    const initial=await lock('2025-12-31');await assert.rejects(lock('2025-12-31'),/explicitly unlock/);await assert.rejects(lock('2025-01-01'),/explicitly unlock/);
    const extended=await lock('2026-08-31');assert.equal(initial.id,extended.id);
    await unlock();await lock('2025-12-31');
    const state=await list();assert.equal(state.history.length,4);assert.equal(state.managed_lock.locked_through,'2025-12-31');
    await admin();await assert.rejects(db.exec('DELETE FROM balance_sheet_private.period_lock_events'),/cannot be changed/);
    await assert.rejects(db.exec('TRUNCATE balance_sheet_private.period_lock_events'),/cannot be changed/);
    await assert.rejects(db.exec('DELETE FROM financial_reporting_period_locks'),/cannot be changed/);
  });

  it('prevents direct and legacy SECURITY DEFINER reopening of managed accounting_periods even with spoofed settings',async()=>{
    const saved=await lock();await db.query("SELECT set_config('app.financial_controls_bypass','on',false)");
    for(const sql of ["UPDATE accounting_periods SET status='open' WHERE id=$1", "UPDATE accounting_periods SET period_name='Tampered' WHERE id=$1",
      'UPDATE accounting_periods SET end_date=end_date-1 WHERE id=$1','DELETE FROM accounting_periods WHERE id=$1'])
      await assert.rejects(db.query(sql,[saved.accounting_period_id]),/authorized reporting period/);
    await admin();await db.exec(`CREATE FUNCTION public.legacy_open(p uuid) RETURNS void LANGUAGE sql SECURITY DEFINER
      AS $$UPDATE public.accounting_periods SET status='open' WHERE id=p$$; GRANT EXECUTE ON FUNCTION public.legacy_open(uuid) TO authenticated;`);
    await auth();await assert.rejects(db.query('SELECT public.legacy_open($1)',[saved.accounting_period_id]),/authorized reporting period/);
    assert.equal((await list()).managed_lock.status,'locked');
  });

  it('fails closed on repeatable-read accounting writes and period mutations rather than trusting a stale snapshot',async()=>{
    await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(journal(),/READ COMMITTED/);await db.exec('ROLLBACK');
    await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(lock(),/READ COMMITTED/);await db.exec('ROLLBACK');
  });

  it('rollback disables mutation commands but retains history, read access and enforcement',async()=>{
    await lock();await admin();await db.exec(await read(`../../supabase/rollbacks/${migration}.rollback.sql`));await auth();
    assert.equal((await list()).history.length,1);assert.equal((await list()).managed_lock.status,'locked');
    await assert.rejects(unlock(),/permission denied/);await assert.rejects(lock(),/permission denied/);
    await assert.rejects(journal(),/closed or locked/);
  });
});

describe('reporting period native PostgreSQL concurrency', {skip:process.env.FINANCIAL_PERIOD_NATIVE_CONCURRENCY!=='1'},()=>{
  it('waits for prior writes then blocks waiting writers after first lock and cutoff extension commit',async()=>{
    let cluster,owner,writer,locker;
    try {
      cluster=await startTemporaryPostgres();owner=new pg.Client(cluster.config);writer=new pg.Client(cluster.config);locker=new pg.Client(cluster.config);
      await Promise.all([owner.connect(),writer.connect(),locker.connect()]);owner.exec=sql=>owner.query(sql);db=await install(owner);await seed();await auth();
      for(const client of [writer,locker]) {
        await client.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[accountant,company]);
        await client.query('SET ROLE authenticated');
      }
      const waitForLock=async client=>{
        for(let attempt=0;attempt<100;attempt++) {
          const state=await owner.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[client.processID]);
          if(state.rows[0]?.wait_event_type==='Lock') return;
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        assert.fail('Expected a concurrent connection to wait on a ledger lock');
      };
      await writer.query('BEGIN');await writer.query("INSERT INTO journal_entries(company_id,entry_date) VALUES($1,'2025-12-31')",[company]);
      const closing=locker.query('SELECT lock_financial_reporting_period_v1($1,$2,$3) result',[company,'2025-12-31',reason]);
      await admin();await waitForLock(locker);await writer.query('COMMIT');await closing;
      await assert.rejects(writer.query("INSERT INTO journal_entries(company_id,entry_date) VALUES($1,'2025-12-31')",[company]),/closed or locked/);

      const parent=(await writer.query("INSERT INTO journal_entries(company_id,entry_date) VALUES($1,'2026-08-31') RETURNING id",[company])).rows[0].id;
      await locker.query('BEGIN');await locker.query('SELECT lock_financial_reporting_period_v1($1,$2,$3)',[company,'2026-08-31',reason]);
      const writing=writer.query('INSERT INTO journal_entry_lines(journal_entry_id) VALUES($1)',[parent]).then(result=>({result}),error=>({error}));
      await waitForLock(writer);await locker.query('COMMIT');
      const rejected=await writing;assert.equal(rejected.error?.code,'55000');assert.match(rejected.error?.message||'',/closed or locked/);
      assert.equal((await owner.query('SELECT count(*)::int count FROM journal_entry_lines WHERE journal_entry_id=$1',[parent])).rows[0].count,0);
    } finally {
      await Promise.allSettled([writer?.end(),locker?.end(),owner?.end()]);await cluster?.close();
    }
  });
});
