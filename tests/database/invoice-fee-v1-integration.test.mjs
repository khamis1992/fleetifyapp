// Two unchanged real RPC bodies; downstream accounting/auth are explicit doubles.
// This tests their integration boundary, not production triggers or concurrency.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const company = '22222222-2222-4222-8222-222222222222';
const invoice = '11111111-1111-4111-8111-111111111111';
const actor = '33333333-3333-4333-8333-333333333333';
const fee = '44444444-4444-4444-8444-444444444444';
const contract = '55555555-5555-4555-8555-555555555555';
const customer = '66666666-6666-4666-8666-666666666666';
const args = [company, invoice, 1620, 120, fee, '2026-09-03', 'cash', 'REF', 'note', 'stable-request', actor];
let db;
const call = async (overrides = {}, version = 'v2') => {
  assert.ok(['v1', 'v2'].includes(version));
  const values = args.map((value,i) => Object.hasOwn(overrides,i) ? overrides[i] : value);
  return (await db.query(`SELECT public.create_invoice_payment_with_late_fee_${version}($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) id`,values)).rows[0].id;
};
const reject = async (overrides,pattern,version = 'v2') => {
  await db.exec('SAVEPOINT attempt');
  await assert.rejects(call(overrides,version),pattern);
  await db.exec('ROLLBACK TO SAVEPOINT attempt; RELEASE SAVEPOINT attempt');
};
const rows = async (sql,values = []) => (await db.query(sql,values)).rows;
const size = async (table) => {
  assert.ok(['payments','payment_allocations','late_fees','fixture_effects','invoice_fee_payment_requests','invoice_fee_payment_context'].includes(table));
  return Number((await rows(`SELECT count(*) n FROM public.${table}`))[0].n);
};

describe('real v1 and v2 fee payment RPC integration', { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    assert.equal(Math.floor(Number((await rows('SHOW server_version_num'))[0].server_version_num)/10000),17);
    await db.exec(await read('./fixtures/invoice-fee-replay-schema.sql'));
    await db.exec(await read('./fixtures/invoice-fee-v1-integration-schema.sql'));
    const source = await read('../../supabase/migrations/20260725170000_separate_invoice_late_fee_payments.sql');
    const body = source.match(/CREATE OR REPLACE FUNCTION public\.create_invoice_payment_with_late_fee_v1\([\s\S]*?\n\$\$;/)?.[0];
    assert.ok(body, 'load the real function, never silently keep the simplified fixture');
    await db.exec(body);
    assert.equal((await rows("SELECT prosrc LIKE '%create_payment_bank_transaction%' loaded FROM pg_proc WHERE proname='create_invoice_payment_with_late_fee_v1'"))[0].loaded,true);
    await db.exec(await read('../../supabase/migrations/20260903203807_replay_safe_invoice_late_fee_payment.sql'));
    const controlSource = await read('../../supabase/migrations/20260712052300_atomic_payment_cancellation_and_contract_totals.sql');
    const control = controlSource.match(/CREATE OR REPLACE FUNCTION public\.enforce_payment_financial_controls\(\)[\s\S]*?\n\$\$;/)?.[0];
    assert.ok(control);
    await db.exec(control);
    await db.exec(await read('./fixtures/live-overpayment-warning-20260903.sql'));
    const allocationGuard = source.match(/CREATE OR REPLACE FUNCTION public\.validate_payment_allocation_row\(\)[\s\S]*?\n\$\$;/)?.[0];
    assert.ok(allocationGuard);
    await db.exec(allocationGuard);
    await db.exec(await read('../../supabase/migrations/20260903210643_guard_fee_receipt_principal_with_command_context.sql'));
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      SELECT set_config('fixture.uid','${actor}',true),set_config('fixture.role','authenticated',true),
        set_config('fixture.allowed','yes',true),set_config('fixture.period_closed','no',true),
        set_config('fixture.fail_effect','',true),set_config('app.financial_controls_bypass','off',true),
        set_config('app.payment_allocation_batch_mode','prior-value',true);`);
    await db.query(`INSERT INTO public.invoices(id,company_id,balance,status,total_amount,contract_id,customer_id,due_date)
      VALUES($1,$2,1500,'active',1500,$3,$4,'2026-09-01')`,[invoice,company,contract,customer]);
    await db.query('INSERT INTO public.late_fees(id,company_id,invoice_id,fee_amount,status,contract_id) VALUES($1,$2,$3,3000,$4,$5)',[fee,company,invoice,'applied',contract]);
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('persists one receipt, separates principal and fee, and restores batch mode', async () => {
    const id = await call();
    const payment = (await rows('SELECT * FROM public.payments WHERE id=$1',[id]))[0];
    assert.equal(payment.company_id,company);
    assert.equal(payment.contract_id,contract);
    assert.equal(payment.customer_id,customer);
    assert.equal(Number(payment.amount),1620);
    assert.equal(Number(payment.amount_paid),1500);
    assert.equal(Number(payment.late_fee_amount),120);
    assert.equal(Number(payment.remaining_amount),0);
    assert.equal(payment.idempotency_key,'stable-request');
    const allocations = await rows('SELECT allocation_type,target_id,amount FROM public.payment_allocations ORDER BY allocation_order');
    assert.deepEqual(allocations.map(a => [a.allocation_type,a.target_id,Number(a.amount)]),[
      ['invoice',invoice,1500],['late_fee',fee,120],
    ]);
    assert.deepEqual((await rows('SELECT operation,target,batch FROM public.fixture_effects ORDER BY id')), [
      { operation:'allocation',target:id,batch:'on' }, { operation:'invoice',target:invoice,batch:'on' },
      { operation:'contract',target:contract,batch:'on' }, { operation:'bank',target:id,batch:'on' },
    ]);
    assert.equal((await rows("SELECT current_setting('app.payment_allocation_batch_mode') mode"))[0].mode,'prior-value');
  });

  it('reproduces the old principal-check-before-replay defect and recovers with v2', async () => {
    const id = await call({},'v1');
    await reject({},/Principal payment would overpay/,'v1');
    assert.equal(await call(),id);
    assert.equal(await size('payments'),1);
    assert.equal(await size('payment_allocations'),2);
    assert.equal(await size('fixture_effects'),4);
  });
  it('reproduces the old closed-period replay defect and recovers without new postings', async () => {
    const id = await call();
    await db.exec("SELECT set_config('fixture.period_closed','yes',true)");
    await reject({},/financial period closed/,'v1');
    assert.equal(await call(),id);
    await reject({ 9:'new-request' },/financial period closed/);
    assert.equal(await size('fixture_effects'),4);
  });
  it('keeps cancellation final even if the original request is repeated', async () => {
    const id = await call();
    await db.exec("UPDATE public.payments SET payment_status='cancelled'; UPDATE public.payment_allocations SET is_active=false; UPDATE public.invoices SET status='cancelled'; UPDATE public.late_fees SET status='waived'");
    assert.equal(await call(),id);
    assert.equal((await rows('SELECT payment_status FROM public.payments'))[0].payment_status,'cancelled');
    assert.equal(await size('fixture_effects'),4);
  });
  it('does not repeat downstream calls after a second identical request', async () => {
    const id = await call();
    await db.exec("SELECT set_config('fixture.fail_effect','bank',true)");
    assert.equal(await call(),id);
    assert.equal(await size('fixture_effects'),4);
  });
  it('collects fees only without inventing a principal allocation', async () => {
    const id = await call({ 2:120 });
    assert.equal(await call({ 2:120 }),id);
    assert.equal(await size('payment_allocations'),1);
    assert.equal((await rows('SELECT allocation_type FROM public.payment_allocations'))[0].allocation_type,'late_fee');
  });
  it('supports separate intentional partial receipts and blocks a third overpayment', async () => {
    const first = await call({ 2:560,3:60,9:'part-one' });
    const second = await call({ 2:1060,3:60,9:'part-two' });
    assert.notEqual(first,second);
    assert.equal(await call({ 2:560,3:60,9:'part-one' }),first);
    await reject({ 2:560,3:60,9:'part-three' },/Principal payment would overpay/);
    assert.equal(await size('payments'),2);
    assert.equal(await size('fixture_effects'),8);
  });

  // Production-matching guards, with only the scoped principal calculation
  // changed by the pending migration. Other production triggers remain untested.
  const installLiveControls = async () => {
    await db.exec(`CREATE TRIGGER enforce_payment_financial_controls_trigger BEFORE INSERT OR UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_financial_controls();
      CREATE TRIGGER trigger_check_overpayment BEFORE INSERT ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.check_payment_overpayment();
      CREATE TRIGGER validate_payment_allocation_row_trigger BEFORE INSERT OR UPDATE ON public.payment_allocations
      FOR EACH ROW EXECUTE FUNCTION public.validate_payment_allocation_row();`);
  };
  it('allows exactly 1500 principal plus 120 fee only through the validated v2 command', async () => {
    await installLiveControls();
    await reject({},/Payment would overpay invoice by QAR 120/,'v1');
    const id = await call();
    assert.equal(await call(),id);
    assert.equal(await size('payments'),1);
    assert.equal(await size('payment_allocations'),2);
    assert.equal(Number((await rows('SELECT public.canonical_invoice_paid_amount($1,NULL) paid',[invoice]))[0].paid),1500);
    assert.equal((await rows('SELECT count(*)::int n FROM public.invoice_fee_payment_context'))[0].n,0);
  });
  it('restores an identical partial receipt after the live warning changes stored notes', async () => {
    await installLiveControls();
    await call({2:620,9:'partial-one'}); // principal 500 + fee 120
    const id = await call({2:1000,9:'partial-two'}); // principal 880 + fee 120
    assert.equal(Number((await rows('SELECT public.canonical_invoice_paid_amount($1,NULL) paid',[invoice]))[0].paid),1380);
    const savedNote = (await rows('SELECT notes FROM public.payments WHERE id=$1',[id]))[0].notes;
    assert.match(savedNote,/تحذير/);
    assert.notEqual(savedNote,'note');
    assert.equal(await call({2:1000,9:'partial-two'}),id);
    await reject({2:1000,9:'partial-two',8:'different request note'},/different payment data/);
    assert.equal(await size('payments'),2);
    assert.equal(await size('fixture_effects'),8);
  });
  it('does not guess missing original notes for a legacy v1 receipt or create a replacement', async () => {
    await installLiveControls();
    await call({2:620,9:'legacy-one'},'v1');
    await call({2:1000,9:'legacy-two'},'v1');
    await reject({2:1000,9:'legacy-two'},/different payment data/);
    assert.equal(await size('payments'),2);
    assert.equal(await size('invoice_fee_payment_requests'),0);
  });
  it.todo('RELEASE GATE: full-schema journals, bank balances, all triggers and concurrent callers');
  it('does not let allocation batch mode or fee fields alone bypass the principal guard', async () => {
    await installLiveControls();
    await db.exec("SELECT set_config('app.payment_allocation_batch_mode','on',true)");
    await reject({},/Payment would overpay invoice/,'v1');
    assert.equal(await size('payments'),0);
    assert.equal(await size('invoice_fee_payment_context'),0);
  });
  it('preserves genuine principal overpayment protection for the authorized command', async () => {
    await installLiveControls();
    await reject({2:1620.02},/Principal payment would overpay/);
    assert.equal(await size('payments'),0);
    assert.equal(await size('invoice_fee_payment_context'),0);
  });
  it('preserves closed-period protection and leaves no transaction capability behind', async () => {
    await installLiveControls();
    await db.exec("SELECT set_config('fixture.period_closed','yes',true)");
    await reject({},/financial period closed/);
    assert.equal(await size('invoice_fee_payment_context'),0);
    assert.equal(await size('payments'),0);
  });
  it('rejects an actual allocation that exceeds the assessed fee', async () => {
    await installLiveControls();
    await db.query('UPDATE public.late_fees SET fee_amount=100 WHERE id=$1',[fee]);
    await reject({},/remaining assessed fee/);
    assert.equal(await size('payments'),0);
  });
  it('supports an authenticated RPC caller without granting capability-table access', async () => {
    await installLiveControls();
    await db.exec('SET LOCAL ROLE authenticated');
    assert.ok(await call());
    await db.exec('RESET ROLE');
    assert.equal(await size('invoice_fee_payment_context'),0);
  });
  for (const role of ['anon','authenticated','service_role']) {
    it(`denies direct capability insertion and helper access to ${role}`, async () => {
      for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) {
        assert.equal((await rows('SELECT has_table_privilege($1,$2,$3) allowed',[role,'public.invoice_fee_payment_context',privilege]))[0].allowed,false);
      }
      assert.equal((await rows('SELECT has_function_privilege($1,$2,$3) allowed',[role,'public.payment_principal_for_control_v1(public.payments)','EXECUTE']))[0].allowed,false);
      await db.exec(`SAVEPOINT capability_insert; SET LOCAL ROLE ${role}`);
      await assert.rejects(db.query(`INSERT INTO public.invoice_fee_payment_context
        (company_id,idempotency_key,invoice_id,actor_id,amount,fee_amount,payment_date,payment_method)
        VALUES($1,'forged',$2,$3,1620,120,'2026-09-03','cash')`,[company,invoice,actor]),/permission denied/);
      await db.exec('ROLLBACK TO SAVEPOINT capability_insert');
    });
  }
  it('requires the capability to belong to this transaction, not a retained stale row', async () => {
    await installLiveControls();
    await db.query(`INSERT INTO public.invoice_fee_payment_context
      (company_id,idempotency_key,invoice_id,actor_id,amount,fee_amount,payment_date,payment_method,transaction_id)
      VALUES($1,'stable-request',$2,$3,1620,120,'2026-09-03','cash','1'::xid8)`,[company,invoice,actor]);
    await reject({},/Payment would overpay invoice/,'v1');
    assert.equal(await size('payments'),0);
  });
  it('does not commit if a fee allocation was silently omitted after the principal guard passed', async () => {
    await installLiveControls();
    await db.exec(`CREATE FUNCTION public.fixture_skip_fee_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.allocation_type='late_fee' THEN RETURN NULL; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER fixture_skip_fee BEFORE INSERT ON public.payment_allocations
      FOR EACH ROW EXECUTE FUNCTION public.fixture_skip_fee_allocation();`);
    await reject({},/allocations do not match/);
    for (const table of ['payments','payment_allocations','fixture_effects','invoice_fee_payment_requests','invoice_fee_payment_context']) assert.equal(await size(table),0,table);
  });
  it('uses the real allocation guard to reject a fee belonging to another contract', async () => {
    await installLiveControls();
    await db.query('UPDATE public.late_fees SET contract_id=$1 WHERE id=$2',[customer,fee]);
    await reject({},/Late-fee allocation does not match/);
    assert.equal(await size('payments'),0);
    assert.equal(await size('invoice_fee_payment_context'),0);
  });
  it('restores the original financial guard on rollback without deleting receipt history', async () => {
    await installLiveControls();
    await call();
    const rollback = (await read('../../supabase/rollbacks/20260903210643_guard_fee_receipt_principal_with_command_context.rollback.sql'))
      .replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
    await db.exec(rollback);
    assert.equal((await rows("SELECT md5(replace(prosrc,chr(13)||chr(10),chr(10))) hash FROM pg_proc WHERE oid='public.enforce_payment_financial_controls()'::regprocedure"))[0].hash,'4daf47f4a7f0569e413439c6c130230d');
    assert.equal((await rows("SELECT to_regclass('public.invoice_fee_payment_context') missing"))[0].missing,null);
    assert.equal(await size('payments'),1);
    assert.equal(await size('invoice_fee_payment_requests'),1);
  });
  it('refuses rollback if unexpected command context would be discarded', async () => {
    await db.query(`INSERT INTO public.invoice_fee_payment_context
      (company_id,idempotency_key,invoice_id,actor_id,amount,fee_amount,payment_date,payment_method)
      VALUES($1,'unexpected',$2,$3,1620,120,'2026-09-03','cash')`,[company,invoice,actor]);
    const rollback = (await read('../../supabase/rollbacks/20260903210643_guard_fee_receipt_principal_with_command_context.rollback.sql'))
      .replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
    await db.exec('SAVEPOINT unsafe_rollback');
    await assert.rejects(db.exec(rollback),/context is not empty/);
    await db.exec('ROLLBACK TO SAVEPOINT unsafe_rollback');
    assert.equal(await size('invoice_fee_payment_context'),1);
    assert.equal((await rows("SELECT to_regprocedure('public.create_invoice_payment_with_late_fee_v2(uuid,uuid,numeric,numeric,uuid,date,text,text,text,text,uuid)') IS NOT NULL present"))[0].present,true);
  });
  for (const effect of ['allocation','invoice','contract','bank']) {
    it(`rolls back the receipt, both allocations and new fee when ${effect} fails`, async () => {
      await db.exec('DELETE FROM public.late_fees');
      await db.query("SELECT set_config('fixture.fail_effect',$1,true)",[effect]);
      await reject({4:null},/injected downstream failure/);
      for (const table of ['payments','payment_allocations','late_fees','fixture_effects','invoice_fee_payment_requests','invoice_fee_payment_context']) assert.equal(await size(table),0,table);
      assert.equal((await rows("SELECT current_setting('app.payment_allocation_batch_mode') mode"))[0].mode,'prior-value');
      await db.exec("SELECT set_config('fixture.fail_effect','',true)");
      const id = await call({4:null});
      assert.equal(await call({4:null}),id);
      assert.equal(await size('payments'),1);
      assert.equal(await size('late_fees'),1);
      assert.equal(await size('invoice_fee_payment_requests'),1);
    });
  }
  it('rolls back a saved receipt and all downstream effects if command evidence cannot be saved', async () => {
    await db.exec(`CREATE FUNCTION public.fixture_reject_command_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected evidence failure'; END; $$;
      CREATE TRIGGER fixture_evidence_failure AFTER INSERT ON public.invoice_fee_payment_requests
      FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_command_evidence();`);
    await reject({},/injected evidence failure/);
    for (const table of ['payments','payment_allocations','fixture_effects','invoice_fee_payment_requests','invoice_fee_payment_context']) assert.equal(await size(table),0,table);
    await db.exec('DROP TRIGGER fixture_evidence_failure ON public.invoice_fee_payment_requests');
    assert.ok(await call());
    assert.equal(await size('payments'),1);
    assert.equal(await size('invoice_fee_payment_requests'),1);
  });
  it('rejects an accounting-side change to the requested amount instead of recording false evidence', async () => {
    await db.exec(`CREATE FUNCTION public.fixture_change_receipt_amount() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.amount := NEW.amount + 1; RETURN NEW; END; $$;
      CREATE TRIGGER fixture_change_receipt BEFORE INSERT ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.fixture_change_receipt_amount();`);
    await reject({},/evidence does not match its receipt/);
    for (const table of ['payments','payment_allocations','fixture_effects','invoice_fee_payment_requests']) assert.equal(await size(table),0,table);
  });
});
