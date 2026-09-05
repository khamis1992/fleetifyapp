// Actual v2 SQL plus the captured production invoice core. Accounting, permission
// and legacy generators are explicit test doubles, not a full-schema certificate.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const company = '22222222-2222-4222-8222-222222222222';
const customer = '33333333-3333-4333-8333-333333333333';
const contract = '55555555-5555-4555-8555-555555555555';
const other = '77777777-7777-4777-8777-777777777777';
const migration = '20260903161841_support_authoritative_partial_contract_schedules';
let db;
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function invoke() {
  await db.exec('SAVEPOINT command');
  try { return (await rows('SELECT public.generate_contract_billing_graph_v2($1) AS result', [contract]))[0].result; }
  catch (error) { await db.exec('ROLLBACK TO SAVEPOINT command'); throw error; }
  finally { await db.exec('RELEASE SAVEPOINT command'); }
}
async function monthlyReport(month = '2026-02-01') {
  await db.exec('SAVEPOINT report');
  try {
    await db.exec('SET LOCAL ROLE authenticated');
    return (await rows('SELECT public.get_canonical_rental_month_summary_v1($1,$2) AS result', [company,month]))[0].result;
  } catch (error) {
    await db.exec('ROLLBACK TO SAVEPOINT report');
    throw error;
  } finally {
    await db.exec('RESET ROLE; RELEASE SAVEPOINT report');
  }
}
async function invoice({ month = '2026-02-01', amount = 1000, type = 'sales',
  reference = `RENT-${randomUUID()}`, penalty = null, state = 'sent', tenant = company, client = customer } = {}) {
  return (await rows(`INSERT INTO invoices(company_id,customer_id,contract_id,invoice_month,invoice_date,due_date,
    total_amount,invoice_type,invoice_number,penalty_id,status,payment_status)
    VALUES($1,$2,$3,$4,$4,$4,$5,$6,$7,$8,$9,'unpaid') RETURNING id`,
  [tenant,client,contract,month,amount,type,reference,penalty,state]))[0].id;
}

describe('contract billing graph with the actual rental core', () => {
  before(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('fixture.uid',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
      CREATE TABLE companies(id uuid PRIMARY KEY,currency text);
      CREATE TABLE profiles(id uuid,user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,first_name_ar text,last_name_ar text,
        first_name text,last_name text,company_name_ar text,company_name text);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_number text,
        start_date date,end_date date,status text,contract_amount numeric,monthly_amount numeric,
        assigned_to_profile_id uuid,cost_center_id uuid);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,contract_id uuid,
        cost_center_id uuid,invoice_number varchar,invoice_date date,invoice_month date,due_date date,total_amount numeric,
        subtotal numeric,tax_amount numeric,discount_amount numeric,paid_amount numeric,balance_due numeric,status text,
        payment_status text,invoice_type text,currency text,notes text,created_by uuid,created_at timestamptz,updated_at timestamptz,
        penalty_id uuid);
      CREATE TABLE invoice_items(invoice_id uuid,line_number int,item_description text,item_description_ar text,
        quantity numeric,unit_price numeric,line_total numeric,tax_rate numeric,tax_amount numeric,cost_center_id uuid);
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,
        contract_id uuid,invoice_id uuid,amount numeric,payment_date date,payment_status text,transaction_type text);
      CREATE TABLE payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,payment_id uuid,
        target_id uuid,allocation_type text,amount numeric,is_active boolean);
      GRANT USAGE ON SCHEMA public,auth TO authenticated;
      CREATE UNIQUE INDEX invoices_company_id_invoice_number_key ON invoices(company_id,invoice_number);
      CREATE UNIQUE INDEX uq_invoices_penalty_id ON invoices(penalty_id) WHERE penalty_id IS NOT NULL;
      CREATE TABLE contract_payment_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,
        installment_number int,due_date date,amount numeric,status text DEFAULT 'pending',paid_amount numeric DEFAULT 0,
        paid_date date,invoice_id uuid,updated_at timestamptz);
      CREATE TABLE audit_logs(company_id uuid,action text,resource_type text,resource_id uuid,entity_name text,
        changes_summary text,new_values jsonb,metadata jsonb,status text,severity text,user_id uuid,user_name text,notes text);
      CREATE TABLE fixture_calls(kind text,invoice_id uuid);
      CREATE TABLE legal_case_litigation_profile(company_id uuid,contract_id uuid,vehicle_returned_at date,
        termination_date date,termination_date_status text);
      CREATE TABLE legal_cases(company_id uuid,contract_id uuid,judgment_final_at timestamptz,
        outcome_date date,workflow_stage text,case_status text);
      CREATE FUNCTION is_finance_action_authorized(uuid,uuid,text[],text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION generate_payment_schedules_for_contract(uuid,boolean) RETURNS jsonb LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'fixture: legacy schedule generator not implemented'; END $$;
      CREATE FUNCTION generate_invoices_from_payment_schedule(uuid) RETURNS integer LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'fixture: legacy invoice generator not implemented'; END $$;
      CREATE FUNCTION system_invoice_has_single_balanced_posted_journal(uuid,uuid,numeric) RETURNS boolean LANGUAGE sql AS $$
        SELECT coalesce(current_setting('fixture.reject_journal',true),'') <> 'yes' $$;
      CREATE FUNCTION system_agent_date_in_closed_period(uuid,date) RETURNS boolean LANGUAGE sql AS $$
        SELECT coalesce(current_setting('fixture.closed',true),'') = 'yes' $$;
      CREATE FUNCTION system_agent_resolve_invoice_month_findings(uuid,uuid,uuid,date) RETURNS void LANGUAGE sql AS $$
        INSERT INTO public.fixture_calls VALUES('resolve', $3) $$;`);
    await db.exec(await read('./fixtures/live-rental-invoice-core-20260904.sql'));
    await db.exec(await read('../../supabase/migrations/20260904003755_exclude_traffic_invoices_from_rental_core.sql'));
    await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
    await db.exec(await read('../../supabase/migrations/20260903222544_canonical_rental_month_summary.sql'));
    await db.exec(await read('../../supabase/migrations/20260904023524_canonical_legal_recorded_obligations.sql'));
  });
  after(async () => db?.close());
  beforeEach(async () => {
    await db.exec('BEGIN');
    await rows("INSERT INTO companies VALUES($1,'QAR')", [company]);
    await rows(`INSERT INTO contracts(id,company_id,customer_id,contract_number,start_date,end_date,status,contract_amount,monthly_amount)
      VALUES($1,$2,$3,'FIXTURE','2026-01-01','2026-03-01','active',2000,1000)`, [contract,company,customer]);
    await rows(`INSERT INTO contract_payment_schedules(company_id,contract_id,installment_number,due_date,amount)
      VALUES($1,$2,1,'2026-02-01',1000),($1,$2,2,'2026-03-01',1000)`, [company,contract]);
  });
  afterEach(async () => db.exec('ROLLBACK; RESET ROLE'));

  it('generates service-typed rental invoices using the real core and replays without duplication', async () => {
    assert.equal((await invoke()).created_invoices,2);
    assert.equal((await invoke()).created_invoices,0);
    assert.deepEqual(await rows('SELECT invoice_type, count(*)::int AS count FROM invoices GROUP BY invoice_type'),
      [{ invoice_type:'service', count:2 }]);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoice_items'))[0].count,2);
  });

  it('reports actual generated rent through partial payment and cancellation without trusting invoice caches', async () => {
    await installLiveMonthIndex();
    assert.equal((await invoke()).created_invoices,2);
    await rows("SELECT set_config('fixture.uid',$1,true)",[customer]);
    await rows('INSERT INTO profiles(id,user_id,company_id,is_active) VALUES($1,$1,$2,true)',[customer,company]);
    await rows("INSERT INTO customers(id,company_id,first_name_ar) VALUES($1,$2,'عميل اختبار')",[customer,company]);
    for (const month of ['2026-02-01','2026-03-01']) {
      const [result] = (await monthlyReport(month)).rows;
      assert.equal(result.invoice_count,1);
      assert.equal(result.invoiced_amount,1000);
      assert.equal(result.paid_amount,0);
      assert.equal(result.outstanding_amount,1000);
      assert.deepEqual(result.review_reasons,[],'Core-generated service rent must not disappear or require manual classification');
    }
    const [{ id: rent }] = await rows("SELECT id FROM invoices WHERE invoice_month='2026-02-01'");
    const [{ id: receipt }] = await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,
      amount,payment_date,payment_status,transaction_type)
      VALUES($1,$2,$3,$4,500,'2026-04-15','completed','receipt') RETURNING id`,[company,customer,contract,rent]);
    await rows(`INSERT INTO payment_allocations(company_id,payment_id,target_id,allocation_type,amount,is_active)
      VALUES($1,$2,$3,'invoice',500,true)`,[company,receipt,rent]);
    let result = (await monthlyReport()).rows[0];
    assert.equal(result.paid_amount,500);
    assert.equal(result.outstanding_amount,500);
    assert.equal(result.receipt_count,1);
    assert.equal(result.latest_payment_date,'2026-04-15');
    assert.deepEqual(result.review_reasons,[]);
    assert.equal((await monthlyReport('2026-03-01')).rows[0].paid_amount,0);
    await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[receipt]);
    // Deliberately leave a stale paid cache and the active allocation in place.
    await rows("UPDATE invoices SET paid_amount=1000,balance_due=0,payment_status='paid' WHERE id=$1",[rent]);
    const beforeRead = await rows('SELECT * FROM invoices ORDER BY id');
    result = (await monthlyReport()).rows[0];
    assert.equal(result.paid_amount,0);
    assert.equal(result.outstanding_amount,1000);
    assert.equal(result.receipt_count,0);
    assert.equal(result.latest_payment_date,null);
    assert.deepEqual(result.review_reasons,[]);
    assert.deepEqual(await rows('SELECT * FROM invoices ORDER BY id'),beforeRead,'Report must not rewrite invoices');
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoices'))[0].count,2,'Cancellation must not create a replacement invoice');
  });

  it('shares generated rent, actual settlement and cutoff exclusions with the pending legal row source',async()=>{
    await invoke();
    const [{id:rent}]=await rows("SELECT id FROM invoices WHERE invoice_month='2026-02-01'");
    const [{id:future}]=await rows("SELECT id FROM invoices WHERE invoice_month='2026-03-01'");
    const legal=async(excluded=[]) => (await rows(
      "SELECT public.canonical_legal_recorded_obligations_v1($1,$2,'2026-04-15',$3::uuid[]) value",
      [company,contract,excluded]))[0].value;
    assert.equal((await legal()).recorded_rent_total,2000);
    const [{id:receipt}]=await rows(`INSERT INTO payments(company_id,customer_id,contract_id,invoice_id,amount,payment_date,payment_status,transaction_type)
      VALUES($1,$2,$3,$4,500,'2026-04-15','completed','receipt') RETURNING id`,[company,customer,contract,rent]);
    assert.equal((await legal()).recorded_rent_total,1500);
    await rows("INSERT INTO legal_case_litigation_profile(company_id,contract_id,vehicle_returned_at) VALUES($1,$2,'2026-02-20')",[company,contract]);
    const cut=await legal([future]);assert.equal(cut.recorded_rent_total,500);assert.equal(cut.manual_excluded_total,0);
    await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[receipt]);
    await rows("UPDATE invoices SET balance_due=0,paid_amount=1000,payment_status='paid' WHERE id=$1",[rent]);
    assert.equal((await legal([future])).recorded_rent_total,1000);
    assert.equal((await rows('SELECT count(*)::int n FROM invoices'))[0].n,2);
  });

  for (const charge of [{type:'service',penalty:other}, {type:'sales',reference:' tv-123 '}]) {
    it(`keeps traffic charges out of duplicate detection and installment links: ${JSON.stringify(charge)}`, async () => {
      const rent = await invoice();
      const traffic = await invoice({ ...charge,amount:1000 });
      const before = await rows('SELECT * FROM invoices WHERE id=$1',[traffic]);
      assert.equal((await invoke()).created_invoices,1);
      assert.equal((await rows('SELECT invoice_id FROM contract_payment_schedules WHERE installment_number=1'))[0].invoice_id,rent);
      assert.deepEqual(await rows('SELECT * FROM invoices WHERE id=$1',[traffic]),before);
    });
    it(`creates missing rent despite an existing traffic invoice: ${JSON.stringify(charge)}`, async () => {
      const traffic = await invoice({ ...charge,amount:1000 });
      assert.equal((await invoke()).created_invoices,2);
      assert.equal((await invoke()).created_invoices,0);
      assert.equal((await rows('SELECT count(*)::int AS count FROM contract_payment_schedules WHERE invoice_id=$1',[traffic]))[0].count,0);
    });
  }

  it('still blocks actual duplicate rental invoices', async () => {
    await invoice(); await invoice({ reference:'RENT-2' });
    await assert.rejects(invoke(), /More than one active invoice/);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoices'))[0].count,2);
  });
  it('rejects invoice customer mismatch rather than silently using its amount', async () => {
    await invoice({ client:other });
    await assert.rejects(invoke(), /customer/);
  });
  it('requires explicit reconciliation for an unlinked service invoice', async () => {
    await invoice({type:'service'});
    await assert.rejects(invoke(), /service invoice/);
  });
  it('rejects a rental invoice without a service month rather than creating around it', async () => {
    await invoice({month:null});
    await assert.rejects(invoke(), /billing month/);
  });
  it('ignores another company invoice and preserves it', async () => {
    const id = await invoice({tenant:other});
    assert.equal((await invoke()).created_invoices,2);
    assert.equal((await rows('SELECT company_id FROM invoices WHERE id=$1',[id]))[0].company_id,other);
  });
  it('rolls back invoice/items/schedule writes when journal verification fails', async () => {
    await db.exec("SET LOCAL fixture.reject_journal = 'yes'");
    await assert.rejects(invoke(), /balanced posted journal/);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoices'))[0].count,0);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoice_items'))[0].count,0);
    assert.equal((await rows('SELECT count(*)::int AS count FROM contract_payment_schedules WHERE invoice_id IS NOT NULL'))[0].count,0);
    assert.equal((await rows('SELECT count(*)::int AS count FROM audit_logs'))[0].count,0);
  });
  it('retains the closed-period guard', async () => {
    await db.exec("SET LOCAL fixture.closed = 'yes'");
    await assert.rejects(invoke(), /closed accounting period/);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoices'))[0].count,0);
  });
  it('retains out-of-period schedule rejection', async () => {
    await rows("UPDATE contract_payment_schedules SET due_date='2026-04-01' WHERE installment_number=2");
    await assert.rejects(invoke(), /outside the contract/);
  });

  it('runs newly generated schedules through the same rental-only path, using actual counts', async () => {
    await db.exec(`DELETE FROM contract_payment_schedules;
      CREATE OR REPLACE FUNCTION public.generate_payment_schedules_for_contract(uuid,boolean) RETURNS jsonb LANGUAGE sql AS $$
        INSERT INTO public.contract_payment_schedules(company_id,contract_id,installment_number,due_date,amount)
        SELECT company_id,id,1,'2026-02-01'::date,1000 FROM public.contracts WHERE id=$1;
        INSERT INTO public.contract_payment_schedules(company_id,contract_id,installment_number,due_date,amount)
        SELECT company_id,id,2,'2026-03-01'::date,1000 FROM public.contracts WHERE id=$1;
        SELECT '{"success":true,"schedules_created":999}'::jsonb $$;`);
    await invoice({penalty:other});
    const result = await invoke();
    assert.equal(result.mode,'generated_schedule');
    assert.equal(result.created_invoices,2);
    assert.equal(result.schedule_count,2);
    assert.equal((await invoke()).created_invoices,0);
  });

  it('rejects a success acknowledgement with no persisted schedules instead of recursing indefinitely', async () => {
    await db.exec(`DELETE FROM contract_payment_schedules;
      CREATE OR REPLACE FUNCTION public.generate_payment_schedules_for_contract(uuid,boolean) RETURNS jsonb LANGUAGE sql AS $$
        SELECT '{"success":true,"schedules_created":2}'::jsonb $$;`);
    await assert.rejects(invoke(), /without an active schedule/);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoices'))[0].count,0);
  });

  it('rolls back newly generated schedules too when downstream validation fails', async () => {
    await db.exec(`DELETE FROM contract_payment_schedules;
      CREATE OR REPLACE FUNCTION public.generate_payment_schedules_for_contract(uuid,boolean) RETURNS jsonb LANGUAGE sql AS $$
        INSERT INTO public.contract_payment_schedules(company_id,contract_id,installment_number,due_date,amount)
        SELECT company_id,id,1,'2026-04-01'::date,2000 FROM public.contracts WHERE id=$1;
        SELECT '{"success":true,"schedules_created":1}'::jsonb $$;`);
    await assert.rejects(invoke(), /outside the contract/);
    assert.equal((await rows('SELECT count(*)::int AS count FROM contract_payment_schedules'))[0].count,0);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoices'))[0].count,0);
  });

  it('rejects an unexpected helper result even when its journal check claims success', async () => {
    const traffic = await invoice({penalty:other});
    await db.exec(`CREATE OR REPLACE FUNCTION public.system_generate_invoice_for_contract_month_core(p_contract_id uuid,p_invoice_month date)
      RETURNS uuid LANGUAGE sql AS $$ SELECT '${traffic}'::uuid $$;`);
    await assert.rejects(invoke(), /identity or amount/);
    assert.equal((await rows('SELECT count(*)::int AS count FROM contract_payment_schedules WHERE invoice_id IS NOT NULL'))[0].count,0);
  });

  const applyBody = async (path) => db.exec((await read(path)).replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
  const coreForward = '../../supabase/migrations/20260904003755_exclude_traffic_invoices_from_rental_core.sql';
  const coreRollback = '../../supabase/rollbacks/20260904003755_exclude_traffic_invoices_from_rental_core.rollback.sql';
  const indexForward = '../../supabase/migrations/20260904013746_align_rental_month_uniqueness_with_traffic_classification.sql';
  const indexRollback = '../../supabase/rollbacks/20260904013746_align_rental_month_uniqueness_with_traffic_classification.rollback.sql';
  const indexDefinition = async () => (await rows("SELECT pg_get_indexdef('public.idx_invoices_unique_contract_month'::regclass) AS definition"))[0].definition;
  async function rejectedWrite(action,expected) {
    await db.exec('SAVEPOINT rejected_write');
    try { await assert.rejects(action(),expected); }
    finally { await db.exec('ROLLBACK TO SAVEPOINT rejected_write; RELEASE SAVEPOINT rejected_write'); }
  }
  const coreDefinition = async () => (await rows("SELECT pg_get_functiondef('public.system_generate_invoice_for_contract_month_core(uuid,date)'::regprocedure) AS definition"))[0].definition;

  it('preserves the core privileges, restores its exact definition on rollback and supports replay', async () => {
    const privileges = await rows("SELECT proacl::text,prosecdef FROM pg_proc WHERE oid='public.system_generate_invoice_for_contract_month_core(uuid,date)'::regprocedure");
    const fixed = await coreDefinition();
    await applyBody(coreForward);
    assert.equal(await coreDefinition(),fixed);
    await applyBody(coreRollback);
    assert.equal((await rows("SELECT md5(pg_get_functiondef('public.system_generate_invoice_for_contract_month_core(uuid,date)'::regprocedure)) AS hash"))[0].hash,
      'd7972cf4eac7f73a3e1e3d33efb0a2f0');
    await applyBody(coreRollback);
    await applyBody(coreForward);
    assert.equal(await coreDefinition(),fixed);
    assert.deepEqual(await rows("SELECT proacl::text,prosecdef FROM pg_proc WHERE oid='public.system_generate_invoice_for_contract_month_core(uuid,date)'::regprocedure"),privileges);
  });

  it('refuses to replace an unreviewed core version in either direction', async () => {
    await db.exec('ALTER FUNCTION public.system_generate_invoice_for_contract_month_core(uuid,date) COST 101');
    const altered = await coreDefinition();
    for (const path of [coreForward,coreRollback]) {
      await db.exec('SAVEPOINT ddl_attempt');
      await assert.rejects(applyBody(path), /changed after review/);
      await db.exec('ROLLBACK TO SAVEPOINT ddl_attempt; RELEASE SAVEPOINT ddl_attempt');
      assert.equal(await coreDefinition(),altered);
    }
  });

  it('keeps the new command unavailable to anonymous callers', async () => {
    assert.equal((await rows("SELECT has_function_privilege('anon','public.generate_contract_billing_graph_v2(uuid)','EXECUTE') AS allowed"))[0].allowed,false);
  });

  // Exact observed production rental-month index, kept separate so deliberate
  // duplicate-corruption fixtures above can still reach the preflight guard.
  const installLiveMonthIndex = () => db.exec(`CREATE UNIQUE INDEX idx_invoices_unique_contract_month ON public.invoices
    USING btree (contract_id, ((date_trunc('month'::text, (COALESCE(invoice_month, invoice_date))::timestamp without time zone))::date))
    WHERE ((contract_id IS NOT NULL) AND (COALESCE(invoice_month, invoice_date) IS NOT NULL) AND (penalty_id IS NULL)
      AND (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['cancelled'::text,'canceled'::text,'void'::text,'voided'::text,'deleted'::text,'inactive'::text]))
      AND (lower(COALESCE(payment_status, ''::text)) <> ALL (ARRAY['cancelled'::text,'canceled'::text,'void'::text,'voided'::text,'deleted'::text,'inactive'::text])))`);

  it('creates rent beside a linked traffic invoice with the real unique-month index enabled', async () => {
    await installLiveMonthIndex();
    await invoice({penalty:other,type:'service'});
    assert.equal((await invoke()).created_invoices,2);
    assert.equal((await invoke()).created_invoices,0);
  });

  it('reproduces the pre-migration index conflict for a TV reference without penalty_id, with atomic rollback', async () => {
    await installLiveMonthIndex();
    const id = await invoice({reference:'TV-ORPHAN'});
    await assert.rejects(invoke(), /idx_invoices_unique_contract_month/);
    assert.deepEqual(await rows('SELECT id FROM invoices'),[{id}]);
    assert.equal((await rows('SELECT count(*)::int AS count FROM invoice_items'))[0].count,0);
    assert.equal((await rows('SELECT count(*)::int AS count FROM contract_payment_schedules WHERE invoice_id IS NOT NULL'))[0].count,0);
  });

  for(const reference of ['TV-ORPHAN',' tv-orphan ','Tv-OrPhAn']) {
    it(`creates missing rent beside ${JSON.stringify(reference)} with the corrected actual unique index`,async()=>{
      await installLiveMonthIndex();
      const id=await invoice({reference,type:'service'});
      const before=await rows('SELECT * FROM invoices WHERE id=$1',[id]);
      await applyBody(indexForward);
      assert.equal((await invoke()).created_invoices,2);
      assert.equal((await invoke()).created_invoices,0,'Retry must not duplicate rent');
      assert.deepEqual(await rows('SELECT * FROM invoices WHERE id=$1',[id]),before);
      assert.equal((await rows('SELECT count(*)::int n FROM contract_payment_schedules WHERE invoice_id=$1',[id]))[0].n,0);
      assert.equal((await rows('SELECT count(*)::int n FROM invoice_items'))[0].n,2);
      await rejectedWrite(()=>invoice({reference:'RENT-DUPLICATE'}),e=>e.code==='23505');
      await rejectedWrite(()=>rows("UPDATE invoices SET invoice_number='RECLASSIFIED-RENT' WHERE id=$1",[id]),e=>e.code==='23505');
      assert.equal((await rows('SELECT count(*)::int n FROM invoices'))[0].n,3);
    });
  }
  it('round trips the exact reviewed month index without changing invoice data and is replay safe',async()=>{
    await installLiveMonthIndex();
    await db.exec("COMMENT ON INDEX public.idx_invoices_unique_contract_month IS 'Keep this reviewed annotation'");
    await invoice({reference:'TV-ONLY'});
    const before=await rows('SELECT * FROM invoices');
    const old=await indexDefinition();
    await applyBody(indexForward);
    const fixed=await indexDefinition();
    assert.notEqual(fixed,old);
    await applyBody(indexForward);assert.equal(await indexDefinition(),fixed);
    await applyBody(indexRollback);assert.equal(await indexDefinition(),old);
    await applyBody(indexRollback);assert.equal(await indexDefinition(),old);
    await applyBody(indexForward);assert.equal(await indexDefinition(),fixed);
    assert.deepEqual(await rows('SELECT * FROM invoices'),before);
    assert.equal((await rows("SELECT obj_description('public.idx_invoices_unique_contract_month'::regclass,'pg_class') AS comment"))[0].comment,'Keep this reviewed annotation');
  });
  it('refuses a lossy rollback and retains working uniqueness when rent now coexists with traffic',async()=>{
    await installLiveMonthIndex();await applyBody(indexForward);
    await invoice({reference:'TV-ONLY'});await invoke();
    const before=await rows('SELECT * FROM invoices ORDER BY id');
    const fixed=await indexDefinition();
    await rejectedWrite(()=>applyBody(indexRollback),/refusing lossy rollback/);
    assert.equal(await indexDefinition(),fixed);
    assert.deepEqual(await rows('SELECT * FROM invoices ORDER BY id'),before);
    await rejectedWrite(()=>invoice(),e=>e.code==='23505');
  });
  it('refuses unexpected index definitions in both directions without replacing them',async()=>{
    await installLiveMonthIndex();
    await db.exec('ALTER INDEX public.idx_invoices_unique_contract_month SET (fillfactor=75)');
    const changed=await indexDefinition();
    for(const path of [indexForward,indexRollback]) {
      await rejectedWrite(()=>applyBody(path),/changed after review/);
      assert.equal(await indexDefinition(),changed);
    }
  });
  it('refuses a missing index in either direction',async()=>{
    for(const path of [indexForward,indexRollback]) await rejectedWrite(()=>applyBody(path),/missing or invalid/);
  });
  it('keeps the service-month fallback and inactive-invoice rules after index replacement',async()=>{
    await installLiveMonthIndex();await applyBody(indexForward);
    await invoice({reference:'RENT-CANCELLED',state:'cancelled'});
    const rent=await invoice({reference:'RENT-LIVE'});
    await rows("UPDATE invoices SET invoice_month=null,invoice_date='2026-02-18',due_date='2026-03-01' WHERE id=$1",[rent]);
    await rejectedWrite(()=>invoice({reference:'SECOND-FEBRUARY-RENT'}),e=>e.code==='23505');
    const march=await invoice({reference:'MARCH-RENT',month:'2026-03-01'});
    assert.ok(march,'Due date must not reserve another billing month');
  });
});
