// Actual gateway + four actual accounting helpers on isolated PostgreSQL 17.
// Minimal verified columns, not production's complete triggers/RLS or concurrency.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const company = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const contract = '55555555-5555-4555-8555-555555555555';
const invoice = '11111111-1111-4111-8111-111111111111';
const secondInvoice = '11111111-1111-4111-8111-111111111112';
const other = '77777777-7777-4777-8777-777777777777';
const migration = '../../supabase/migrations/20260903085138_restore_authenticated_contract_financial_refresh.sql';
const retirement = '../../supabase/migrations/20260904001503_retire_invoice_aggregate_receipt_sync.sql';
const retirementRollback = '../../supabase/rollbacks/20260904001503_retire_invoice_aggregate_receipt_sync.rollback.sql';
let db;
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
const invoke = async (id = contract, role = 'authenticated') => {
  assert.ok(['authenticated', 'anon', 'service_role'].includes(role));
  await db.exec('SAVEPOINT invocation');
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    return (await rows('SELECT public.refresh_contract_financial_state_v1($1) result', [id]))[0].result;
  } catch (error) {
    await db.exec('ROLLBACK TO SAVEPOINT invocation');
    throw error;
  } finally {
    await db.exec('RESET ROLE; RELEASE SAVEPOINT invocation');
  }
};
const state = async () => ({
  contracts: await rows('SELECT * FROM public.contracts ORDER BY id'),
  invoices: await rows('SELECT * FROM public.invoices ORDER BY id'),
  events: await rows('SELECT kind,target FROM public.fixture_events ORDER BY id'),
});
const insertReceipt = async (amount = 500, status = 'completed') => (await rows(
  `INSERT INTO public.payments(company_id,contract_id,invoice_id,amount,payment_status,transaction_type)
   VALUES($1,$2,$3,$4,$5,'receipt') RETURNING id`, [company, contract, invoice, amount, status],
))[0].id;
const attachReceiptSync = () => db.exec(`
  CREATE TRIGGER a_guard_canonical_rental_receipt_v1 BEFORE DELETE OR UPDATE ON public.rental_payment_receipts
    FOR EACH ROW EXECUTE FUNCTION public.guard_canonical_rental_receipt_v1();
  CREATE TRIGGER trg_sync_receipt_on_invoice_update AFTER UPDATE OF payment_status,paid_amount ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.sync_receipt_on_invoice_update();`);
const executeIsolated = async (sql) => {
  await db.exec('SAVEPOINT ddl_attempt');
  try { await db.exec(sql); }
  catch (error) { await db.exec('ROLLBACK TO SAVEPOINT ddl_attempt'); throw error; }
  finally { await db.exec('RELEASE SAVEPOINT ddl_attempt'); }
};
const receipts = () => rows('SELECT * FROM public.rental_payment_receipts ORDER BY id');
const addRentalReceipt = async (paymentId = null, amount = 500) => rows(`
  INSERT INTO public.rental_payment_receipts(company_id,contract_id,invoice_id,total_paid,
    amount_due,pending_balance,payment_status,payment_date,canonical_payment_id)
  VALUES($1,$2,$3,$4::numeric,1500,1500-$4::numeric,'partial','2099-01-10',$5) RETURNING id`,
  [company,contract,invoice,amount,paymentId]);

describe('contract financial refresh gateway — isolated PostgreSQL', { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    assert.equal(Math.floor(Number((await rows('SHOW server_version_num'))[0].server_version_num) / 10000), 17);
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
        SELECT NULLIF(current_setting('fixture.uid',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
        SELECT jsonb_build_object('role',current_setting('fixture.jwt_role',true)) $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean);
      CREATE TABLE public.contracts(id uuid PRIMARY KEY,company_id uuid,contract_number varchar,
        contract_amount numeric,total_paid numeric,balance_due numeric,payment_status text,updated_at timestamptz,
        customer_id uuid,vehicle_id uuid);
      CREATE TABLE public.customers(id uuid PRIMARY KEY,first_name_ar text,last_name_ar text,first_name text,last_name text);
      CREATE TABLE public.invoices(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,total_amount numeric,
        paid_amount numeric,balance_due numeric,payment_status text,status text,due_date date,updated_at timestamptz);
      CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,
        contract_id uuid,invoice_id uuid,amount numeric,payment_status text,transaction_type text);
      CREATE TABLE public.payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,
        payment_id uuid,allocation_type text,target_id uuid,amount numeric,is_active boolean DEFAULT true);
      CREATE TABLE public.rental_payment_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid,customer_id uuid,customer_name text,contract_id uuid,vehicle_id uuid,invoice_id uuid,
        month text,payment_date date,rent_amount numeric,fine numeric,total_paid numeric,amount_due numeric,
        pending_balance numeric,payment_status text,payment_method text,reference_number text,
        idempotency_key uuid,canonical_payment_id uuid,created_at timestamptz,updated_at timestamptz);
      ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE TABLE public.fixture_events(id serial,kind text,target uuid);
      CREATE FUNCTION public.fixture_track_refresh() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO public.fixture_events(kind,target) VALUES(TG_TABLE_NAME,NEW.id);
        IF current_setting('fixture.fail_target',true)=NEW.id::text THEN
          RAISE EXCEPTION 'injected refresh failure';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER fixture_track_invoice AFTER UPDATE ON public.invoices
        FOR EACH ROW EXECUTE FUNCTION public.fixture_track_refresh();
      CREATE TRIGGER fixture_track_contract AFTER UPDATE ON public.contracts
        FOR EACH ROW EXECUTE FUNCTION public.fixture_track_refresh();`);
    const helpers = [
      ['20260712052900_unify_canonical_payment_allocation_semantics.sql','canonical_invoice_paid_amount','90984ae9d90e663ed1e355dd3f17e44b','uuid,uuid'],
      ['20260712052900_unify_canonical_payment_allocation_semantics.sql','canonical_contract_paid_amount','3c1d786f1ca26c117a7c0ff20f1ccba9','uuid'],
      ['20260725170500_cap_contract_principal_and_restore_allocation_recalc.sql','recalculate_contract_financial_state','26e1d042941b2d30e09d68f1abd987e9','uuid'],
      ['20260712055600_use_sent_for_open_invoice_recalculation.sql','recalculate_invoice_financial_state','901d9bfce4f34b0fef8a5ba159a86ec6','uuid'],
    ];
    for (const [file, name, hash, signature] of helpers) {
      const source = (await read(`../../supabase/migrations/${file}`)).replace(/\r\n/g, '\n');
      const definition = source.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))?.[0];
      assert.ok(definition, `Missing actual ${name}`);
      await db.exec(definition);
      assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid=$1::regprocedure", [`public.${name}(${signature})`]))[0].hash, hash,
        `Local helper differs from live body inspected on 2026-09-04: ${name}`);
      await db.exec(`REVOKE ALL ON FUNCTION public.${name}(${signature}) FROM PUBLIC,anon,authenticated;
        GRANT EXECUTE ON FUNCTION public.${name}(${signature}) TO service_role;`);
    }
    await db.exec(await read(migration));
    await db.exec(await read('./fixtures/live-invoice-receipt-triggers-20260904.sql'));
    for (const [name,hash] of [
      ['guard_canonical_rental_receipt_v1','1786bc264a42aedc98a6543c931bc58e'],
      ['sync_receipt_on_invoice_update','330e1ba91be25f6b05f7c265d4e59484'],
    ]) {
      assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE oid=$1::regprocedure",[`public.${name}()`]))[0].hash,hash);
    }
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec('BEGIN');
    await rows(`SELECT set_config('fixture.uid',$1,true),set_config('fixture.jwt_role','authenticated',true),
      set_config('request.jwt.claim.role','authenticated',true),set_config('fixture.fail_target','',true),
      set_config('app.financial_controls_bypass','off',true)`, [actor]);
    await rows('INSERT INTO public.profiles(user_id,company_id,is_active) VALUES($1,$2,true)', [actor,company]);
    await rows(`INSERT INTO public.contracts(id,company_id,contract_number,contract_amount,total_paid,balance_due,payment_status,updated_at)
      VALUES($1,$2,'TEST-REFRESH',3000,0,3000,'unpaid','2026-01-01')`, [contract,company]);
    for (const id of [invoice,secondInvoice]) {
      await rows(`INSERT INTO public.invoices VALUES($1,$2,$3,1500,0,1500,'unpaid','sent','2099-01-01','2026-01-01')`, [id,company,contract]);
    }
  });
  afterEach(async () => { await db.exec('ROLLBACK'); await db.exec('RESET ROLE'); });

  it('updates invoices in stable order before the contract and reports real before/after values', async () => {
    await insertReceipt();
    const result = await invoke();
    assert.equal(result.contract_id,contract);
    assert.equal(result.changed,true);
    assert.deepEqual(result.before,{total_paid:0,balance_due:3000,payment_status:'unpaid'});
    assert.deepEqual(result.after,{total_paid:500,balance_due:2500,payment_status:'partial'});
    const current = await state();
    assert.equal(Number(current.invoices[0].paid_amount),500);
    assert.equal(Number(current.invoices[0].balance_due),1000);
    assert.deepEqual(current.events,[{kind:'invoices',target:invoice},{kind:'invoices',target:secondInvoice},{kind:'contracts',target:contract}]);
  });

  it('can repair an invoice while returning changed=false for unchanged contract aggregates', async () => {
    await insertReceipt();
    await rows("UPDATE public.contracts SET total_paid=500,balance_due=2500,payment_status='partial'");
    assert.equal((await invoke()).changed,false);
    assert.equal(Number((await state()).invoices[0].paid_amount),500);
  });

  it('repeats without creating invoices, payments or allocations', async () => {
    await insertReceipt();
    assert.equal((await invoke()).changed,true);
    assert.equal((await invoke()).changed,false);
    assert.deepEqual((await rows(`SELECT (SELECT count(*)::int FROM invoices) invoices,
      (SELECT count(*)::int FROM payments) payments,(SELECT count(*)::int FROM payment_allocations) allocations`))[0],
    {invoices:2,payments:1,allocations:0});
  });

  it('uses only principal allocations and does not count the receipt gross amount again', async () => {
    const payment = await insertReceipt(620);
    await rows(`INSERT INTO payment_allocations(company_id,payment_id,allocation_type,target_id,amount)
      VALUES($1,$2,'invoice',$3,500),($1,$2,'late_fee',$4,120)`, [company,payment,invoice,other]);
    const result = await invoke();
    assert.equal(result.after.total_paid,500);
    assert.equal(Number((await state()).invoices[0].paid_amount),500);
  });

  it('ignores a cancelled receipt', async () => {
    await insertReceipt(500,'cancelled');
    assert.equal((await invoke()).after.total_paid,0);
  });

  it('skips cancelled invoices and their legacy payments', async () => {
    await insertReceipt();
    await rows("UPDATE public.invoices SET status='cancelled',balance_due=0 WHERE id=$1", [invoice]);
    const before = (await state()).invoices[0];
    await db.exec('DELETE FROM public.fixture_events');
    assert.equal((await invoke()).after.total_paid,0);
    const after = await state();
    assert.deepEqual(after.invoices[0],before);
    assert.equal(after.events.some((event) => event.target===invoice),false);
  });

  for (const [label,target] of [['second invoice',secondInvoice],['contract',contract]]) {
    it(`rolls back every earlier write if the ${label} update fails`, async () => {
      await insertReceipt();
      const before = await state();
      await rows("SELECT set_config('fixture.fail_target',$1,true)",[target]);
      await assert.rejects(invoke(),/injected refresh failure/);
      assert.deepEqual(await state(),before);
      assert.equal((await rows("SELECT current_setting('app.financial_controls_bypass') value"))[0].value,'off');
    });
  }

  it('does not refresh a same-company mismatched invoice linked to another contract', async () => {
    await rows('UPDATE public.invoices SET contract_id=$1 WHERE id=$2',[other,secondInvoice]);
    const before = (await state()).invoices[1];
    await invoke();
    assert.deepEqual((await state()).invoices[1],before);
  });

  it('blocks inactive profiles, other-company profiles and missing identity', async () => {
    for (const update of [
      "UPDATE public.profiles SET is_active=false",
      `UPDATE public.profiles SET is_active=true,company_id='${other}'`,
      "SELECT set_config('fixture.uid','',true)",
    ]) {
      await db.exec(update);
      const before = await state();
      await assert.rejects(invoke(), (error) => error.code==='42501');
      assert.deepEqual(await state(),before);
    }
  });

  it('has no anonymous execute grant and does not expose helpers to authenticated users', async () => {
    await assert.rejects(invoke(contract,'anon'), (error) => error.code==='42501');
    assert.equal((await rows("SELECT has_function_privilege('authenticated','public.recalculate_invoice_financial_state(uuid)','EXECUTE') allowed"))[0].allowed,false);
    assert.equal((await rows("SELECT has_function_privilege('authenticated','public.refresh_contract_financial_state_v1(uuid)','EXECUTE') allowed"))[0].allowed,true);
  });

  it('accepts the service role without impersonating a user', async () => {
    await db.exec("SELECT set_config('fixture.uid','',true),set_config('request.jwt.claim.role','service_role',true),set_config('fixture.jwt_role','service_role',true)");
    assert.equal((await invoke(contract,'service_role')).contract_id,contract);
  });

  it('rejects absent and null contract targets', async () => {
    await assert.rejects(invoke(other), (error) => error.code==='P0002');
    await assert.rejects(invoke(null), (error) => error.code==='22023');
  });

  it('rollback removes only the gateway and preserves financial facts and helper functions', async () => {
    await insertReceipt();
    await invoke();
    const before = await state();
    await db.exec(await read('../../supabase/rollbacks/20260903085138_restore_authenticated_contract_financial_refresh.rollback.sql'));
    assert.equal((await rows("SELECT to_regprocedure('public.refresh_contract_financial_state_v1(uuid)') missing"))[0].missing,null);
    assert.deepEqual(await state(),before);
    assert.equal(Number((await rows('SELECT canonical_contract_paid_amount($1) amount',[contract]))[0].amount),500);
  });

  it('does not rewrite individual canonical receipts when recomputing a two-payment invoice', {
    todo: 'Live invoice->receipt aggregate trigger conflicts with immutable per-payment receipt guard; do not deploy gateway until resolved.',
  }, async () => {
    const first = await insertReceipt(500);
    const second = await insertReceipt(500);
    for (const payment of [first,second]) {
      await rows(`INSERT INTO public.rental_payment_receipts(company_id,contract_id,invoice_id,
        total_paid,amount_due,pending_balance,payment_status,canonical_payment_id)
        VALUES($1,$2,$3,500,1500,1000,'partial',$4)`,[company,contract,invoice,payment]);
    }
    await db.exec(`CREATE TRIGGER a_guard_canonical_rental_receipt_v1 BEFORE DELETE OR UPDATE ON public.rental_payment_receipts
      FOR EACH ROW EXECUTE FUNCTION public.guard_canonical_rental_receipt_v1();
      CREATE TRIGGER trg_sync_receipt_on_invoice_update AFTER UPDATE OF payment_status,paid_amount ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.sync_receipt_on_invoice_update();`);
    const result = await invoke();
    assert.equal(result.after.total_paid,1000);
    assert.deepEqual((await rows('SELECT total_paid::int amount FROM public.rental_payment_receipts ORDER BY id')).map(r=>r.amount),[500,500]);
  });

  it('preserves legacy per-payment amounts instead of silently multiplying cumulative totals', {
    todo: 'Legacy rows have no canonical guard; the live trigger overwrites both 500 receipts with 1000.',
  }, async () => {
    await insertReceipt(500);
    await insertReceipt(500);
    for (let index = 0; index < 2; index += 1) {
      await rows(`INSERT INTO public.rental_payment_receipts(company_id,contract_id,invoice_id,
        total_paid,amount_due,pending_balance,payment_status,payment_date)
        VALUES($1,$2,$3,500,1500,1000,'partial',$4)`,
      [company,contract,invoice,`2099-01-${index + 10}`]);
    }
    const before = await rows('SELECT * FROM public.rental_payment_receipts ORDER BY id');
    await attachReceiptSync();
    assert.equal((await invoke()).after.total_paid,1000);
    const after = await rows('SELECT * FROM public.rental_payment_receipts ORDER BY id');
    assert.deepEqual(after,before,'Refreshing an invoice must not rewrite historical receipt amounts or dates');
  });

  it('does not manufacture a receipt from an invoice aggregate without payment identity', {
    todo: 'The live trigger inserts a cumulative receipt dated at invoice due_date with no canonical payment link.',
  }, async () => {
    await rows("INSERT INTO public.customers(id,first_name,last_name) VALUES($1,'Synthetic','Customer')",[actor]);
    await rows('UPDATE public.contracts SET customer_id=$1 WHERE id=$2',[actor,contract]);
    await insertReceipt(500);
    await insertReceipt(500);
    await attachReceiptSync();
    assert.equal((await invoke()).after.total_paid,1000);
    assert.equal((await rows('SELECT count(*)::int n FROM public.rental_payment_receipts'))[0].n,0,
      'Aggregate refresh is not a payment command and must not invent an unproven receipt');
  });

  it('does not leave an invoice-generated summary claiming paid after its only payment is cancelled', {
    todo: 'Generated summary remains paid at 1500 after canonical invoice balance returns to zero paid.',
  }, async () => {
    await rows("INSERT INTO public.customers(id,first_name,last_name) VALUES($1,'Synthetic','Customer')",[actor]);
    await rows('UPDATE public.contracts SET customer_id=$1 WHERE id=$2',[actor,contract]);
    const payment = await insertReceipt(1500);
    await attachReceiptSync();
    await invoke();
    const generated = await rows('SELECT id FROM public.rental_payment_receipts WHERE invoice_id=$1',[invoice]);
    assert.equal(generated.length,1,'Precondition: real trigger created a summary, not a historical individual receipt');
    await rows("UPDATE public.payments SET payment_status='cancelled' WHERE id=$1",[payment]);
    assert.equal((await invoke()).after.total_paid,0);
    assert.equal(Number((await rows('SELECT paid_amount FROM public.invoices WHERE id=$1',[invoice]))[0].paid_amount),0);
    const misleading = await rows(`SELECT id FROM public.rental_payment_receipts
      WHERE id=$1 AND payment_status='paid' AND total_paid>0`,[generated[0].id]);
    assert.equal(misleading.length,0,'A live invoice summary must not survive as paid after reversal');
  });

  describe('local retirement candidate with all five rental-receipt triggers', () => {
    beforeEach(async () => {
      await db.exec(await read('../../supabase/migrations/20260903222544_canonical_rental_month_summary.sql'));
      await db.exec(`ALTER TABLE public.rental_payment_receipts
        ADD COLUMN receipt_number text, ADD COLUMN fiscal_year integer, ADD COLUMN is_late boolean;
        CREATE SEQUENCE public.receipt_number_seq;`);
      await db.exec(await read('./fixtures/live-rental-receipt-triggers-20260904.sql'));
      for (const [name,hash] of [
        ['calculate_rental_payment_balance','0b2b7b7680e47cf7128c1fbe670e7ce7'],
        ['generate_receipt_number','ab3789bb876ba98b2eb3a41ffec9e2a1'],
        ['mark_late_rental_payment','0703b8c17861232a522141662a263a6c'],
        ['update_rental_receipt_updated_at','ef6b2d76360a727c9d6479352655b7ba'],
      ]) {
        assert.equal((await rows('SELECT md5(prosrc) hash FROM pg_proc WHERE oid=$1::regprocedure',[`public.${name}()`]))[0].hash,hash);
      }
      await attachReceiptSync();
      await db.exec(`
        CREATE TRIGGER generate_receipt_number_trigger BEFORE INSERT ON rental_payment_receipts FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();
        CREATE TRIGGER rental_payment_balance_trigger BEFORE INSERT OR UPDATE ON rental_payment_receipts FOR EACH ROW EXECUTE FUNCTION calculate_rental_payment_balance();
        CREATE TRIGGER rental_payment_late_marker BEFORE INSERT OR UPDATE ON rental_payment_receipts FOR EACH ROW EXECUTE FUNCTION mark_late_rental_payment();
        CREATE TRIGGER rental_receipts_updated_at_trigger BEFORE UPDATE ON rental_payment_receipts FOR EACH ROW EXECUTE FUNCTION update_rental_receipt_updated_at();`);
    });

    it('keeps both canonical receipt facts unchanged while recomputing the invoice aggregate', async () => {
      await addRentalReceipt(await insertReceipt(500));
      await addRentalReceipt(await insertReceipt(500));
      const before = await receipts();
      assert.equal(before.length,2);
      assert.notEqual(before[0].receipt_number,before[1].receipt_number);
      await db.exec(await read(retirement));
      assert.equal((await invoke()).after.total_paid,1000);
      assert.deepEqual(await receipts(),before);
      assert.equal(Number((await state()).invoices[0].balance_due),500);
    });

    it('keeps legacy receipt amounts and dates unchanged without classifying or deleting them', async () => {
      await insertReceipt(500); await insertReceipt(500);
      await addRentalReceipt(); await addRentalReceipt();
      const before = await receipts();
      await db.exec(await read(retirement));
      assert.equal((await invoke()).after.total_paid,1000);
      assert.deepEqual(await receipts(),before);
    });

    it('never synthesizes receipts on partial settlement, another payment, replay or full reversal', async () => {
      await rows("INSERT INTO public.customers(id,first_name,last_name) VALUES($1,'Synthetic','Customer')",[actor]);
      await rows('UPDATE public.contracts SET customer_id=$1 WHERE id=$2',[actor,contract]);
      await db.exec(await read(retirement));
      const first = await insertReceipt(500);
      assert.equal((await invoke()).after.total_paid,500);
      const second = await insertReceipt(500);
      assert.equal((await invoke()).after.total_paid,1000);
      assert.equal((await invoke()).changed,false);
      await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[second]);
      assert.equal((await invoke()).after.total_paid,500);
      assert.equal(Number((await state()).invoices[0].balance_due),1000);
      await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[first]);
      assert.equal((await invoke()).after.total_paid,0);
      assert.deepEqual(await receipts(),[]);
      assert.equal((await rows('SELECT count(*)::int n FROM invoices'))[0].n,2);
    });

    it('does not replace a fee-inclusive receipt gross with invoice principal', async () => {
      const payment = await insertReceipt(620);
      await rows(`INSERT INTO payment_allocations(company_id,payment_id,allocation_type,target_id,amount)
        VALUES($1,$2,'invoice',$3,500),($1,$2,'late_fee',$4,120)`,[company,payment,invoice,other]);
      await addRentalReceipt(payment,620);
      const before = await receipts();
      await db.exec(await read(retirement));
      assert.equal((await invoke()).after.total_paid,500);
      assert.deepEqual(await receipts(),before);
    });

    it('uses canonical payment state after reversal without rewriting legacy invoice-summary history', async () => {
      const payment = await insertReceipt(1500);
      await addRentalReceipt(null,1500); // Retained legacy history, not a new receipt command.
      const before = await receipts();
      await db.exec(await read(retirement));
      await invoke();
      await rows("UPDATE payments SET payment_status='cancelled' WHERE id=$1",[payment]);
      assert.equal((await invoke()).after.total_paid,0);
      assert.equal(Number((await rows('SELECT canonical_invoice_paid_amount($1,$2) amount',[invoice,company]))[0].amount),0);
      assert.deepEqual(await receipts(),before,'History is not the live balance; consumers must use the canonical reader');
    });

    it('leaves canonical immutability protection and every receipt trigger installed', async () => {
      const [{id}] = await addRentalReceipt(await insertReceipt(500));
      await db.exec(await read(retirement));
      await assert.rejects(executeIsolated(`UPDATE rental_payment_receipts SET total_paid=900 WHERE id='${id}'`), /immutable/);
      await assert.rejects(executeIsolated(`DELETE FROM rental_payment_receipts WHERE id='${id}'`), /cannot be deleted/);
      assert.equal((await rows("SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.rental_payment_receipts'::regclass AND NOT tgisinternal"))[0].n,5);
    });

    it('is repeatable and restores the exact original trigger without changing financial facts', async () => {
      await addRentalReceipt(await insertReceipt(500));
      const before = await receipts();
      const definition = (await rows("SELECT pg_get_triggerdef(oid) definition FROM pg_trigger WHERE tgrelid='public.invoices'::regclass AND tgname='trg_sync_receipt_on_invoice_update'"))[0].definition;
      await db.exec(await read(retirement)); await db.exec(await read(retirement));
      await db.exec(await read(retirementRollback)); await db.exec(await read(retirementRollback));
      assert.deepEqual(await receipts(),before);
      assert.equal((await rows("SELECT pg_get_triggerdef(oid) definition FROM pg_trigger WHERE tgrelid='public.invoices'::regclass AND tgname='trg_sync_receipt_on_invoice_update'"))[0].definition,definition);
      await db.exec(await read(retirement));
    });

    it('refuses retirement without the canonical monthly reader prerequisite', async () => {
      await db.exec('DROP FUNCTION public.get_canonical_rental_month_summary_v1(uuid,date)');
      await assert.rejects(executeIsolated(await read(retirement)),/must be installed/);
      assert.equal((await rows("SELECT count(*)::int n FROM pg_trigger WHERE tgname='trg_sync_receipt_on_invoice_update'"))[0].n,1);
    });

    it('works with a restricted caller search path and restores session settings', async () => {
      await db.exec("SET LOCAL search_path='pg_catalog'; SET LOCAL lock_timeout='2s'");
      const before = await rows("SELECT current_setting('search_path') path,current_setting('lock_timeout') timeout");
      await db.exec(await read(retirement));
      await db.exec(await read(retirement));
      await db.exec(await read(retirementRollback));
      await db.exec(await read(retirementRollback));
      assert.deepEqual(await rows("SELECT current_setting('search_path') path,current_setting('lock_timeout') timeout"),before);
    });

    it('refuses rollback over a replacement trigger with different events', async () => {
      await db.exec(await read(retirement));
      await db.exec('CREATE TRIGGER trg_sync_receipt_on_invoice_update AFTER INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION sync_receipt_on_invoice_update()');
      await assert.rejects(executeIsolated(await read(retirementRollback)),/Replacement trigger exists/);
    });

    it('refuses changed function bodies and does not overwrite them on rollback', async () => {
      await db.exec('CREATE OR REPLACE FUNCTION public.sync_receipt_on_invoice_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$');
      await assert.rejects(executeIsolated(await read(retirement)),/differs from inspected/);
      await assert.rejects(executeIsolated(await read(retirementRollback)),/function changed/);
    });

    it('refuses an additional renamed invoice-to-receipt trigger', async () => {
      await db.exec('CREATE TRIGGER other_receipt_sync AFTER UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION sync_receipt_on_invoice_update()');
      await assert.rejects(executeIsolated(await read(retirement)),/differs from inspected/);
      assert.equal((await rows("SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.invoices'::regclass AND tgfoid='public.sync_receipt_on_invoice_update()'::regprocedure"))[0].n,2);
    });
  });
});
