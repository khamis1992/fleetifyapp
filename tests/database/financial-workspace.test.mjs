import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const company='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const cash='33333333-3333-4333-8333-333333333333', revenue='44444444-4444-4444-8444-444444444444';
let db;
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
async function post(amount, date='2026-09-01', status='posted', type='invoice') {
  const [{id}]=await query('INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit,reference_type) VALUES($1,$2,$3,$4,$4,$5) RETURNING id',[company,date,status,Math.abs(amount),type]);
  await query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount)
    VALUES($1,$2,$4,$5),($1,$3,$5,$4)`,[id,cash,revenue,Math.max(amount,0),Math.max(-amount,0)]);
  return id;
}
const snapshot=async(tenant=company,date='2026-09-06')=>(await query('SELECT get_financial_workspace_v1($1,$2) report',[tenant,date]))[0].report;

describe('financial workspace and ledger readers in PostgreSQL',()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $$;
      CREATE FUNCTION public.get_user_company(uuid) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT current_setting('test.company')::uuid $$;
      CREATE FUNCTION public.is_super_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
      CREATE TABLE companies(id uuid PRIMARY KEY);
      CREATE TABLE chart_of_accounts(id uuid PRIMARY KEY,company_id uuid,account_code varchar,account_name text,account_name_ar text,
        account_type text,account_subtype text,balance_type text,current_balance numeric,is_active boolean DEFAULT true,is_header boolean DEFAULT false,account_level integer DEFAULT 3);
      CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,entry_date date,status text,total_debit numeric,total_credit numeric,reference_type text,reference_id uuid);
      CREATE TABLE journal_entry_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_entry_id uuid,account_id uuid,debit_amount numeric DEFAULT 0,credit_amount numeric DEFAULT 0);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,invoice_month date,invoice_date date,due_date date,invoice_type text,
        status text,payment_status text,total_amount numeric,paid_amount numeric,balance_due numeric);
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,payment_date date,payment_status text,transaction_type text,amount numeric,journal_entry_id uuid);
      CREATE TABLE payment_allocations(id uuid DEFAULT gen_random_uuid(),company_id uuid,payment_id uuid,is_active boolean,amount numeric);
      CREATE TABLE payroll(id uuid DEFAULT gen_random_uuid(),company_id uuid,payroll_date date,status text,journal_entry_id uuid);
      CREATE TABLE vehicle_maintenance(id uuid DEFAULT gen_random_uuid(),company_id uuid,completed_date date,status text,actual_cost numeric,journal_entry_id uuid);
      CREATE TABLE property_payments(id uuid DEFAULT gen_random_uuid(),company_id uuid,payment_date date,status text,journal_entry_id uuid);
      GRANT USAGE ON SCHEMA public TO authenticated,anon,service_role;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
      ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
      CREATE POLICY company_scope ON companies TO authenticated USING (id=current_setting('test.company')::uuid);
    `);
    for(const table of ['chart_of_accounts','journal_entries','invoices','payments','payment_allocations','payroll','vehicle_maintenance','property_payments']) {
      await db.exec(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        CREATE POLICY company_scope ON ${table} TO authenticated USING (company_id=current_setting('test.company')::uuid);`);
    }
    await db.exec(`ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
      CREATE POLICY company_scope ON journal_entry_lines TO authenticated USING (EXISTS (SELECT 1 FROM journal_entries e WHERE e.id=journal_entry_id));`);
    await db.exec(await readFile(new URL('../../supabase/migrations/20260906060900_financial_workspace_ledger_readers.sql',import.meta.url),'utf8'));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await query('INSERT INTO companies VALUES($1),($2)',[company,other]);
    await query(`INSERT INTO chart_of_accounts(id,company_id,account_code,account_name,account_type,balance_type,current_balance)
      VALUES($1,$3,'101','Cash','assets','debit',999999),($2,$3,'401','Rent','revenue','credit',999999)`,[cash,revenue,company]);
    await query("SELECT set_config('test.company',$1,true)",[company]);
  });
  afterEach(async()=>db.exec('ROLLBACK; RESET ROLE'));
  it('uses journal amounts once and ignores mutable cache values',async()=>{
    await post(1200);
    const balances=await query('SELECT * FROM get_account_balances($1,$2)',[company,'2026-09-06']);
    assert.equal(Number(balances[0].closing_balance),1200);
    assert.equal(Number(balances[0].opening_balance),0);
    const trial=await query('SELECT * FROM get_trial_balance($1,$2)',[company,'2026-09-06']);
    assert.equal(trial.reduce((sum,row)=>sum+Number(row.debit_balance)-Number(row.credit_balance),0),0);
  });
  it('preserves refunds, reversals and inactive historical accounts',async()=>{
    await post(1000);await post(-1200);
    await query('UPDATE chart_of_accounts SET is_active=false WHERE id=$1',[revenue]);
    const report=await snapshot();
    assert.equal(report.summary.total_revenue,-200);assert.equal(report.summary.total_assets,-200);
    assert.equal(report.trend.at(-1).revenue,-200);
    assert.equal((await query('SELECT * FROM get_trial_balance($1,$2)',[company,'2026-09-06'])).length,2);
  });
  it('keeps balance sheet cumulative while income is limited to the selected period',async()=>{
    await post(800,'2026-08-31');await post(200);await post(700,'2026-10-01');await post(500,'2026-09-02','draft');
    const report=await snapshot();
    assert.equal(report.summary.total_assets,1000);assert.equal(report.summary.total_revenue,200);
    assert.equal(report.summary.total_assets,report.summary.total_liabilities+report.summary.total_equity);
    assert.equal(report.posted_entries,2);assert.equal(report.draft_entries,1);
    assert.equal(report.trend.at(-2).revenue,800);
  });
  it('excludes closing transfers and their reversals from profit and loss only',async()=>{
    await post(1000);
    const closing=await post(-1000,'2026-09-02','posted','annual_close');
    let report=await snapshot();assert.equal(report.summary.total_revenue,1000);
    const accounts=(await query('SELECT get_income_statement_accounts_v1($1,$2,$3) report',[company,'2026-09-01','2026-09-06']))[0].report;
    assert.equal(accounts[0].current_balance,1000);
    assert.equal(report.summary.total_assets,0);assert.equal(report.trend.at(-1).revenue,1000);
    const reversal=await post(1000,'2026-09-03','posted','journal_reversal');
    await query('UPDATE journal_entries SET reference_id=$1 WHERE id=$2',[closing,reversal]);
    report=await snapshot();assert.equal(report.summary.total_revenue,1000);assert.equal(report.summary.total_assets,1000);
  });
  it('includes more than 1000 entries and does not discard legacy posting violations',async()=>{
    await query(`INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit)
      SELECT $1,'2026-09-01','posted',1,1 FROM generate_series(1,1005)`,[company]);
    await query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount)
      SELECT id,$1::uuid,1,0 FROM journal_entries UNION ALL SELECT id,$2::uuid,0,1 FROM journal_entries`,[cash,revenue]);
    await query('UPDATE chart_of_accounts SET account_level=2 WHERE id=$1',[revenue]);
    const report=await snapshot();assert.equal(report.summary.total_revenue,1005);
    assert.equal(report.checks.find(c=>c.code==='posting_accounts').count,1005);
    assert.equal(report.checks.find(c=>c.code==='journal_balance').count,0);
  });
  it('separates receipt cash from income and includes partially paid overdue invoices',async()=>{
    await post(1000);
    await query(`INSERT INTO invoices(company_id,invoice_month,invoice_date,due_date,invoice_type,status,payment_status,total_amount,paid_amount,balance_due)
      VALUES($1,'2026-09-01','2026-09-01','2026-09-01','sales','sent','partial',1000,300,700),
      ($1,'2026-09-01','2026-09-01','2026-09-01','sales','cancelled','unpaid',9000,0,9000),
      ($1,'2026-10-01','2026-10-01','2026-10-01','sales','sent','unpaid',2000,0,2000)`,[company]);
    await query(`INSERT INTO payments(company_id,payment_date,payment_status,transaction_type,amount)
      VALUES($1,'2026-09-02','completed','receipt',300),($1,'2026-09-02','cancelled','receipt',9000)`,[company]);
    const report=await snapshot();assert.equal(report.receivables.overdue,700);assert.equal(report.receivables.overdue_count,1);
    assert.equal(report.summary.total_revenue,1000);assert.equal(report.monthly_receipts,300);
    assert.equal((await snapshot(company,'2026-09-01')).receivables.overdue_count,0);
  });
  it('surfaces missing department journals, allocations and broken journal lines',async()=>{
    const id=await post(100);await query('DELETE FROM journal_entry_lines WHERE journal_entry_id=$1 AND account_id=$2',[id,revenue]);
    await query(`INSERT INTO payroll(company_id,payroll_date,status) VALUES($1,'2026-09-01','paid');`,[company]);
    await query(`INSERT INTO vehicle_maintenance(company_id,completed_date,status,actual_cost) VALUES($1,'2026-09-01','completed',120);`,[company]);
    await query(`INSERT INTO property_payments(company_id,payment_date,status) VALUES($1,'2026-09-01','paid');`,[company]);
    const checks=(await snapshot()).checks;
    for(const code of ['journal_balance','payroll_journal','maintenance_journal','property_journal']) assert.equal(checks.find(c=>c.code===code).count,1);
  });
  it('uses the caller RLS and rejects foreign company access',async()=>{
    await post(100);await db.exec('SET LOCAL ROLE authenticated');
    assert.equal((await snapshot()).summary.total_revenue,100);
    await assert.rejects(snapshot(other),/Company reporting access required/);
  });
  it('does not expose reports to anonymous callers',async()=>{
    await db.exec('SET LOCAL ROLE anon');await assert.rejects(snapshot(),/permission denied/);
  });
  it('does not confuse public company visibility with financial authorization',async()=>{
    await db.exec('CREATE POLICY public_company ON companies FOR SELECT TO authenticated USING (true); SET LOCAL ROLE authenticated');
    await assert.rejects(snapshot(other),/Company reporting access required/);
  });
  it('restores previous reporting signatures and permissions when rolled back',async()=>{
    await db.exec(await readFile(new URL('../../supabase/rollbacks/20260906060900_financial_workspace_ledger_readers.rollback.sql',import.meta.url),'utf8'));
    assert.equal((await query("SELECT to_regprocedure('get_financial_workspace_v1(uuid,date)') fn"))[0].fn,null);
    assert.equal((await query("SELECT prosecdef FROM pg_proc WHERE oid='get_account_balances(uuid,date,text)'::regprocedure"))[0].prosecdef,true);
    assert.equal((await query("SELECT has_function_privilege('anon','get_trial_balance(uuid,date)','EXECUTE') allowed"))[0].allowed,true);
    // Rollback contains its own transaction, so reapply before the fixture cleanup.
    await db.exec(await readFile(new URL('../../supabase/migrations/20260906060900_financial_workspace_ledger_readers.sql',import.meta.url),'utf8'));
  });
});
