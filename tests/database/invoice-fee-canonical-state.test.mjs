// Real RPCs, principal controls, allocation validator, seeding, synchronization,
// invoice totals, receipt journals and bank movement/balance. Auth, period and contract rollup remain doubles.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFile(new URL(path,import.meta.url),'utf8');
const company = '22222222-2222-4222-8222-222222222222';
const invoice = '11111111-1111-4111-8111-111111111111';
const actor = '33333333-3333-4333-8333-333333333333';
const fee = '44444444-4444-4444-8444-444444444444';
const contract = '55555555-5555-4555-8555-555555555555';
const customer = '66666666-6666-4666-8666-666666666666';
const other = '77777777-7777-4777-8777-777777777777';
const bank = '88888888-8888-4888-8888-888888888888';
let db;
const rows = async (sql,values=[]) => (await db.query(sql,values)).rows;
const call = async (amount=1620, feeAmount=120, key='request-one',method='cash',reference=null,feeId=fee) => (await rows(
  'SELECT public.create_invoice_payment_with_late_fee_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) id',
  [company,invoice,amount,feeAmount,feeId,'2026-09-03',method,reference,null,key,actor],
))[0].id;
const loadFunction = async (file,name) => {
  assert.match(name,/^[a-z_][a-z_0-9]*$/);
  const source = await read(`../../supabase/migrations/${file}`);
  const body = source.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))?.[0];
  assert.ok(body,`function ${name} missing from ${file}`);
  await db.exec(body);
};

describe('canonical fee receipt state with real synchronization', {concurrency:false}, () => {
  before(async () => {
    db = new PGlite();
    await db.exec(await read('./fixtures/invoice-fee-replay-schema.sql'));
    await db.exec(await read('./fixtures/invoice-fee-v1-integration-schema.sql'));
    await db.exec(await read('./fixtures/invoice-fee-bank-integration-schema.sql'));
    await db.exec(await read('./fixtures/invoice-fee-journal-integration-schema.sql'));
    await db.exec(`DROP FUNCTION public.resolve_payment_bank_id(uuid,uuid,text,text);
      DROP FUNCTION public.create_payment_bank_transaction(uuid);`);
    for (const name of ['payment_method_uses_bank','resolve_payment_bank_id']) {
      await loadFunction('20260712052400_atomic_payment_creation_and_bank_linkage.sql',name);
    }
    await loadFunction('20260712052400_atomic_payment_creation_and_bank_linkage.sql','enforce_bank_transaction_payment_link');
    await db.exec(`CREATE TRIGGER a_enforce_bank_transaction_payment_link
      BEFORE INSERT OR UPDATE OF payment_id,reversal_of_transaction_id,company_id,bank_id,amount,transaction_type,journal_entry_id
      ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.enforce_bank_transaction_payment_link();`);
    await loadFunction('20260712052300_atomic_payment_cancellation_and_contract_totals.sql','recalculate_bank_balance');
    for (const name of ['create_payment_receipt_journal','trg_payment_journal_entry_fn']) {
      await loadFunction('20260712052400_atomic_payment_creation_and_bank_linkage.sql',name);
    }
    await db.exec(await read('./fixtures/live-bank-journal-functions-20260904.sql'));
    await db.exec(`CREATE TRIGGER payment_journal_before_insert BEFORE INSERT ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.trg_payment_journal_entry_fn();
      CREATE TRIGGER trigger_bank_transaction_changes BEFORE INSERT OR UPDATE ON public.bank_transactions
      FOR EACH ROW EXECUTE FUNCTION public.handle_bank_transaction_changes();
      CREATE TRIGGER handle_bank_transaction_changes AFTER INSERT ON public.bank_transactions
      FOR EACH ROW EXECUTE FUNCTION public.handle_bank_transaction_changes();
      CREATE TRIGGER bank_transaction_balance_update_trigger AFTER INSERT OR DELETE OR UPDATE ON public.bank_transactions
      FOR EACH ROW EXECUTE FUNCTION public.handle_bank_transaction_balance_update();`);
    await loadFunction('20260803150437_harden_employee_workspace_payment_authorization.sql','create_payment_bank_transaction');
    await db.exec(`REVOKE ALL ON FUNCTION public.create_payment_bank_transaction(uuid) FROM PUBLIC,anon,authenticated;
      GRANT EXECUTE ON FUNCTION public.create_payment_bank_transaction(uuid) TO service_role;`);
    await db.exec(await read('../../supabase/migrations/20260903213117_validate_legacy_bank_movement_before_payment_link.sql'));
    await db.exec(`ALTER TABLE public.invoices ADD COLUMN balance_due numeric(15,2), ADD COLUMN updated_at timestamptz;
      DROP FUNCTION public.canonical_invoice_paid_amount(uuid,uuid);
      DROP FUNCTION public.sync_payment_allocation_state(uuid);
      DROP FUNCTION public.recalculate_invoice_financial_state(uuid);`);
    await loadFunction('20260712052900_unify_canonical_payment_allocation_semantics.sql','canonical_invoice_paid_amount');
    await loadFunction('20260712055600_use_sent_for_open_invoice_recalculation.sql','recalculate_invoice_financial_state');
    for (const name of ['sync_payment_allocation_state','auto_seed_payment_invoice_allocation']) {
      await loadFunction('20260712052000_canonical_payment_allocation_ledger.sql',name);
    }
    // Match the production helper ACL, excluded by loadFunction's body matcher.
    await db.exec(`REVOKE ALL ON FUNCTION public.sync_payment_allocation_state(uuid) FROM PUBLIC,anon,authenticated;
      GRANT EXECUTE ON FUNCTION public.sync_payment_allocation_state(uuid) TO service_role;`);
    for (const name of ['create_invoice_payment_with_late_fee_v1','validate_payment_allocation_row','after_payment_allocation_change']) {
      await loadFunction('20260725170000_separate_invoice_late_fee_payments.sql',name);
    }
    await loadFunction('20260712052300_atomic_payment_cancellation_and_contract_totals.sql','enforce_payment_financial_controls');
    await db.exec(await read('./fixtures/live-overpayment-warning-20260903.sql'));
    await db.exec(await read('../../supabase/migrations/20260903203807_replay_safe_invoice_late_fee_payment.sql'));
    await db.exec(await read('../../supabase/migrations/20260903210643_guard_fee_receipt_principal_with_command_context.sql'));
    await db.exec(await read('../../supabase/migrations/20260903211652_preserve_invoice_link_for_fee_only_receipts.sql'));
    await db.exec(`CREATE TRIGGER enforce_payment_financial_controls_trigger BEFORE INSERT OR UPDATE ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_financial_controls();
      CREATE TRIGGER trigger_check_overpayment BEFORE INSERT ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.check_payment_overpayment();
      CREATE TRIGGER payment_allocation_auto_seed_after_payment AFTER INSERT OR UPDATE OF payment_status,invoice_id ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.auto_seed_payment_invoice_allocation();
      CREATE TRIGGER validate_payment_allocation_row_trigger BEFORE INSERT OR UPDATE ON public.payment_allocations
        FOR EACH ROW EXECUTE FUNCTION public.validate_payment_allocation_row();
      CREATE TRIGGER after_payment_allocation_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.payment_allocations
        FOR EACH ROW EXECUTE FUNCTION public.after_payment_allocation_change();`);
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      SELECT set_config('fixture.uid','${actor}',true),set_config('fixture.role','authenticated',true),
        set_config('fixture.allowed','yes',true),set_config('fixture.period_closed','no',true),
        set_config('fixture.fail_effect','',true),set_config('app.financial_controls_bypass','off',true),
        set_config('app.payment_allocation_batch_mode','off',true),set_config('app.payment_allocation_sync','off',true);`);
    await db.query(`INSERT INTO public.invoices(id,company_id,balance,status,total_amount,contract_id,customer_id,due_date,balance_due)
      VALUES($1,$2,1500,'sent',1500,$3,$4,'2026-09-01',1500)`,[invoice,company,contract,customer]);
    await db.query(`INSERT INTO public.late_fees(id,company_id,invoice_id,fee_amount,status,contract_id)
      VALUES($1,$2,$3,3000,'applied',$4)`,[fee,company,invoice,contract]);
    await db.query(`INSERT INTO public.banks(id,company_id,bank_name,account_number,currency,opening_balance,current_balance)
      VALUES($1,$2,'Fixture bank','TEST-ONLY','QAR',100,100)`,[bank,company]);
    for (const type of ['CASH','BANK','RECEIVABLES']) {
      const account = (await rows(`INSERT INTO public.chart_of_accounts(company_id,account_name,account_type,balance_type,is_active,is_header,account_level)
        VALUES($1,$2,'assets','debit',true,false,3) RETURNING id`,[company,type]))[0].id;
      const accountType = (await rows('INSERT INTO public.default_account_types(type_code) VALUES($1) RETURNING id',[type]))[0].id;
      await db.query('INSERT INTO public.account_mappings(company_id,chart_of_accounts_id,default_account_type_id,is_active) VALUES($1,$2,$3,true)',[company,account,accountType]);
    }
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('records full principal and fee once without auto-seeding a duplicate allocation', async () => {
    const id = await call();
    assert.equal(await call(),id);
    const state = (await rows('SELECT paid_amount,balance_due,payment_status FROM public.invoices WHERE id=$1',[invoice]))[0];
    assert.equal(Number(state.paid_amount),1500);
    assert.equal(Number(state.balance_due),0);
    assert.equal(state.payment_status,'paid');
    assert.equal((await rows('SELECT count(*)::int n FROM public.payment_allocations'))[0].n,2);
    assert.equal((await rows('SELECT count(*)::int n FROM public.payments'))[0].n,1);
    assert.equal((await rows('SELECT count(*)::int n FROM public.invoices'))[0].n,1);
    assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions'))[0].n,0);
  });

  for (const [amount,feeAmount] of [[1620,120],[620,120],[120,120]]) {
    it(`records one bank deposit of ${amount} and only ${amount-feeAmount} rent principal`,async () => {
      const id = await call(amount,feeAmount,'bank-payment','bank_transfer');
      assert.equal(await call(amount,feeAmount,'bank-payment','bank_transfer'),id);
      const movement = (await rows('SELECT id,payment_id,amount,transaction_type,balance_after FROM public.bank_transactions'))[0];
      assert.equal(movement.payment_id,id);
      assert.equal(Number(movement.amount),amount);
      assert.equal(movement.transaction_type,'deposit');
      assert.equal(Number(movement.balance_after),100+amount);
      assert.equal(Number((await rows('SELECT current_balance FROM public.banks WHERE id=$1',[bank]))[0].current_balance),100+amount);
      assert.equal(Number((await rows('SELECT paid_amount FROM public.invoices WHERE id=$1',[invoice]))[0].paid_amount),amount-feeAmount);
      assert.equal((await rows('SELECT public.create_payment_bank_transaction($1) id',[id]))[0].id,movement.id);
      assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions'))[0].n,1);
      const journal = (await rows('SELECT journal_entry_id FROM public.payments WHERE id=$1',[id]))[0].journal_entry_id;
      assert.ok(journal);
      assert.equal((await rows('SELECT journal_entry_id FROM public.bank_transactions WHERE id=$1',[movement.id]))[0].journal_entry_id,journal);
      assert.equal((await rows('SELECT count(*)::int n FROM public.journal_entries'))[0].n,1);
      const totals = (await rows('SELECT count(*)::int n,sum(debit_amount) debit,sum(credit_amount) credit FROM public.journal_entry_lines WHERE journal_entry_id=$1',[journal]))[0];
      assert.equal(totals.n,2);
      assert.equal(Number(totals.debit),amount);
      assert.equal(Number(totals.credit),amount);
    });
  }

  for (const [name,sql,values] of [
    ['inactive bank','UPDATE public.banks SET is_active=false',[]],
    ['wrong company','UPDATE public.banks SET company_id=$1',[other]],
    ['wrong currency',"UPDATE public.banks SET currency='USD'",[]],
    ['ambiguous banks',`INSERT INTO public.banks(company_id,bank_name,account_number,currency)
      VALUES($1,'Second fixture','SECOND','QAR')`,[company]],
  ]) it(`does not create a receipt when bank resolution fails: ${name}`,async () => {
    await db.query(sql,values);
    await db.exec('SAVEPOINT bank_resolution');
    await assert.rejects(call(1620,120,'no-bank','bank_transfer'),/bank/i);
    await db.exec('ROLLBACK TO SAVEPOINT bank_resolution');
    for (const table of ['payments','payment_allocations','invoice_fee_payment_requests','invoice_fee_payment_context','bank_transactions']) {
      assert.equal((await rows(`SELECT count(*)::int n FROM public.${table}`))[0].n,0);
    }
  });

  it('rolls back the complete receipt if the real bank balance update fails',async () => {
    await db.exec(`CREATE FUNCTION public.fixture_reject_bank_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected bank balance failure'; END; $$;
      CREATE TRIGGER fixture_reject_bank_update BEFORE UPDATE ON public.banks
      FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_bank_update(); SAVEPOINT bank_failure;`);
    await assert.rejects(call(1620,120,'bank-fail','bank_transfer'),/injected bank balance failure/);
    await db.exec('ROLLBACK TO SAVEPOINT bank_failure');
    for (const table of ['payments','payment_allocations','invoice_fee_payment_requests','invoice_fee_payment_context','bank_transactions','journal_entries','journal_entry_lines']) {
      assert.equal((await rows(`SELECT count(*)::int n FROM public.${table}`))[0].n,0);
    }
    assert.equal(Number((await rows('SELECT paid_amount FROM public.invoices WHERE id=$1',[invoice]))[0].paid_amount),0);
    assert.equal(Number((await rows('SELECT current_balance FROM public.banks WHERE id=$1',[bank]))[0].current_balance),100);
  });

  for (const [name,change] of [
    ['missing receivables',"UPDATE public.chart_of_accounts SET is_active=false WHERE account_name='RECEIVABLES'"],
    ['header accounts','UPDATE public.chart_of_accounts SET is_header=true'],
    ['non-posting level','UPDATE public.chart_of_accounts SET account_level=2'],
    ['journal posting failure',`CREATE FUNCTION public.fixture_fail_journal_post() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.status='posted' THEN RAISE EXCEPTION 'injected journal posting failure'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER fixture_fail_journal_post BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_journal_post();`],
  ]) it(`rolls back without receipts, movements or partial journals: ${name}`,async () => {
    await db.exec(change);
    await db.exec('SAVEPOINT journal_failure');
    await assert.rejects(call(1620,120,'journal-failure','bank_transfer'),/posting mapping is missing|journal posting failure/);
    await db.exec('ROLLBACK TO SAVEPOINT journal_failure');
    for (const table of ['payments','payment_allocations','invoice_fee_payment_requests','invoice_fee_payment_context','bank_transactions','journal_entries','journal_entry_lines']) {
      assert.equal((await rows(`SELECT count(*)::int n FROM public.${table}`))[0].n,0);
    }
  });

  it('replays a journal-backed bank receipt after period closure without reposting',async () => {
    const id = await call(620,120,'journal-replay','bank_transfer');
    await db.exec("SELECT set_config('fixture.period_closed','yes',true)");
    assert.equal(await call(620,120,'journal-replay','bank_transfer'),id);
    assert.equal((await rows('SELECT count(*)::int n FROM public.journal_entries'))[0].n,1);
    assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions'))[0].n,1);
  });

  it('does not credit newly calculated late fees as rental receivable settlement',
    {todo:'Receipt journal currently credits gross amount to RECEIVABLES; late-fee accounting mapping/policy is not configured.'},
    async () => {
      await db.exec('DELETE FROM public.late_fees'); // Isolated fixture; exercise newly assessed fee, not historical accrual.
      const id = await call(620,120,'new-assessment','bank_transfer',null,null);
      const settlement = (await rows(`SELECT sum(line.credit_amount) amount
        FROM public.journal_entry_lines line JOIN public.chart_of_accounts account ON account.id=line.account_id
        JOIN public.payments payment ON payment.journal_entry_id=line.journal_entry_id
        WHERE payment.id=$1 AND account.account_name='RECEIVABLES'`,[id]))[0].amount;
      assert.equal(Number(settlement),500);
    });

  it('does not adopt a cancelled legacy bank movement as a successful deposit',async () => {
    await db.query(`INSERT INTO public.bank_transactions(company_id,bank_id,transaction_number,transaction_date,
      transaction_type,amount,balance_after,description,reference_number,status)
      VALUES($1,$2,'LEGACY-TEST','2026-09-03','deposit',1620,100,'Fixture cancelled movement','EXTERNAL-REF','cancelled')`,[company,bank]);
    await db.exec('SAVEPOINT cancelled_movement');
    await assert.rejects(call(1620,120,'cancelled-bank','bank_transfer','EXTERNAL-REF'),/bank|movement|transaction/i);
    await db.exec('ROLLBACK TO SAVEPOINT cancelled_movement');
    assert.equal((await rows('SELECT count(*)::int n FROM public.payments'))[0].n,0);
    assert.equal((await rows('SELECT payment_id FROM public.bank_transactions'))[0].payment_id,null);
  });

  it('reattaches exactly matching internal-number legacy evidence without another deposit',async () => {
    const id = await call(620,120,'reattach','bank_transfer');
    const movement = (await rows('SELECT id FROM public.bank_transactions'))[0].id;
    await db.query('UPDATE public.bank_transactions SET payment_id=null WHERE id=$1',[movement]);
    assert.equal((await rows('SELECT public.create_payment_bank_transaction($1) id',[id]))[0].id,movement);
    assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions'))[0].n,1);
    assert.equal(Number((await rows('SELECT current_balance FROM public.banks WHERE id=$1',[bank]))[0].current_balance),720);
  });

  for (const [label,change,values] of [
    ['cancelled status',"status='cancelled'",[]],
    ['different date',"transaction_date='2026-08-03'",[]],
    ['different amount','amount=621',[]],
    ['different direction',"transaction_type='withdrawal'",[]],
    ['different journal','journal_entry_id=$1',[other]],
    ['external reference only',"reference_number='SHARED-EXTERNAL'",[]],
  ]) it(`refuses unsafe orphan bank evidence: ${label}`,async () => {
    const id = await call(620,120,'legacy','bank_transfer','SHARED-EXTERNAL');
    await db.query(`UPDATE public.bank_transactions SET payment_id=null,${change}`,values);
    await db.exec('SAVEPOINT legacy_conflict');
    await assert.rejects(rows('SELECT public.create_payment_bank_transaction($1)',[id]),/reconciliation is required/);
    await db.exec('ROLLBACK TO SAVEPOINT legacy_conflict');
    assert.equal((await rows('SELECT payment_id FROM public.bank_transactions'))[0].payment_id,null);
    assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions'))[0].n,1);
  });

  it('refuses to choose the first of multiple matching bank movements',async () => {
    const id = await call(620,120,'multiple-legacy','bank_transfer');
    await db.exec(`UPDATE public.bank_transactions SET payment_id=null;
      INSERT INTO public.bank_transactions(company_id,bank_id,transaction_number,transaction_date,transaction_type,
        amount,balance_after,description,reference_number,status)
      SELECT company_id,bank_id,'DUPLICATE-TEST',transaction_date,transaction_type,
        amount,balance_after,description,reference_number,status FROM public.bank_transactions; SAVEPOINT multiple_legacy;`);
    await assert.rejects(rows('SELECT public.create_payment_bank_transaction($1)',[id]),/Multiple legacy bank movements/);
    await db.exec('ROLLBACK TO SAVEPOINT multiple_legacy');
    assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions WHERE payment_id IS NULL'))[0].n,2);
  });

  it('restores the original bank helper on rollback and retains movements and balances',async () => {
    await call(620,120,'rollback-bank','bank_transfer');
    const rollback = (await read('../../supabase/rollbacks/20260903213117_validate_legacy_bank_movement_before_payment_link.rollback.sql'))
      .replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
    await db.exec(rollback);
    assert.equal((await rows("SELECT md5(replace(prosrc,E'\\r\\n',E'\\n')) hash FROM pg_proc WHERE oid='public.create_payment_bank_transaction(uuid)'::regprocedure"))[0].hash,'23701bf3aca679e8e5f308be19df4a6e');
    assert.equal((await rows('SELECT count(*)::int n FROM public.bank_transactions'))[0].n,1);
    assert.equal(Number((await rows('SELECT current_balance FROM public.banks WHERE id=$1',[bank]))[0].current_balance),720);
    for (const role of ['anon','authenticated','service_role']) {
      assert.equal((await rows("SELECT has_function_privilege($1,'public.create_payment_bank_transaction(uuid)','EXECUTE') allowed",[role]))[0].allowed,role==='service_role');
    }
  });
  it('keeps two partial receipts on the same invoice and excludes both fees from principal', async () => {
    await call(620,120,'part-one');
    await call(620,120,'part-two');
    const state = (await rows('SELECT paid_amount,balance_due,payment_status FROM public.invoices WHERE id=$1',[invoice]))[0];
    assert.equal(Number(state.paid_amount),1000);
    assert.equal(Number(state.balance_due),500);
    assert.equal(state.payment_status,'partial');
    assert.equal((await rows('SELECT count(*)::int n FROM public.payment_allocations'))[0].n,4);
  });
  it('preserves the invoice link for a fee-only receipt without paying any principal', async () => {
    const id = await call(120,120,'fee-only');
    assert.equal(await call(120,120,'fee-only'),id);
    assert.equal((await rows('SELECT invoice_id FROM public.payments WHERE id=$1',[id]))[0].invoice_id,invoice);
    const state = (await rows('SELECT paid_amount,balance_due FROM public.invoices WHERE id=$1',[invoice]))[0];
    assert.equal(Number(state.paid_amount),0);
    assert.equal(Number(state.balance_due),1500);
    assert.equal((await rows('SELECT count(*)::int n FROM public.payment_allocations'))[0].n,1);
  });
  it('restores synchronization flags after the real nested update functions', async () => {
    await call();
    const flags = (await rows(`SELECT current_setting('app.financial_controls_bypass') bypass,
      current_setting('app.payment_allocation_sync') sync,current_setting('app.payment_allocation_batch_mode') batch`))[0];
    assert.deepEqual(flags,{bypass:'off',sync:'off',batch:'off'});
  });

  it('collects a fee after principal is already fully paid without overpaying rent', async () => {
    await call();
    await call(120,120,'fee-after-principal');
    const state = (await rows('SELECT paid_amount,balance_due FROM public.invoices WHERE id=$1',[invoice]))[0];
    assert.equal(Number(state.paid_amount),1500);
    assert.equal(Number(state.balance_due),0);
    assert.equal((await rows('SELECT count(*)::int n FROM public.payments WHERE invoice_id=$1',[invoice]))[0].n,2);
  });

  // Deliberately corrupt only the isolated fixture to ensure historical bad
  // rows cannot manufacture a primary invoice by disappearing from a JOIN.
  for (const [label,sql,values] of [
    ['fee company','UPDATE public.late_fees SET company_id=$1 WHERE id=$2',[other,fee]],
    ['fee contract','UPDATE public.late_fees SET contract_id=$1 WHERE id=$2',[other,fee]],
    ['invoice company','UPDATE public.invoices SET company_id=$1 WHERE id=$2',[other,invoice]],
    ['invoice customer','UPDATE public.invoices SET customer_id=$1 WHERE id=$2',[other,invoice]],
    ['invoice contract','UPDATE public.invoices SET contract_id=$1 WHERE id=$2',[other,invoice]],
  ]) {
    it(`does not link fee-only receipts with mismatched ${label}`, async () => {
      const id = await call(120,120,'scope');
      await db.query(sql,values);
      await rows('SELECT public.sync_payment_allocation_state($1)',[id]);
      assert.equal((await rows('SELECT invoice_id FROM public.payments WHERE id=$1',[id]))[0].invoice_id,null);
    });
  }

  it('removes the invoice link when the only allocation is voided and keeps rent unpaid', async () => {
    const id = await call(120,120,'voided-allocation');
    await db.query("UPDATE public.payment_allocations SET is_active=false,void_reason='Test allocation cancellation' WHERE payment_id=$1",[id]);
    await rows('SELECT public.sync_payment_allocation_state($1)',[id]);
    await rows('SELECT public.recalculate_invoice_financial_state($1)',[invoice]);
    const payment = (await rows('SELECT invoice_id,allocation_status FROM public.payments WHERE id=$1',[id]))[0];
    assert.equal(payment.invoice_id,null);
    assert.equal(payment.allocation_status,'unallocated');
    assert.equal(Number((await rows('SELECT paid_amount FROM public.invoices WHERE id=$1',[invoice]))[0].paid_amount),0);
  });

  it('removes the invoice link when fee allocations no longer cover the receipt', async () => {
    const id = await call(120,120,'partial-allocation');
    await db.query('UPDATE public.payment_allocations SET amount=60 WHERE payment_id=$1',[id]);
    await rows('SELECT public.sync_payment_allocation_state($1)',[id]);
    const payment = (await rows('SELECT invoice_id,allocation_status FROM public.payments WHERE id=$1',[id]))[0];
    assert.equal(payment.invoice_id,null);
    assert.equal(payment.allocation_status,'partially_allocated');
  });

  for (const differentInvoice of [false,true]) {
    it(`handles two fee allocations for ${differentInvoice ? 'different invoices without guessing a link' : 'the same invoice'}`, async () => {
      const id = await call(120,120,'multiple-fees');
      let targetInvoice = invoice;
      if (differentInvoice) {
        targetInvoice = other;
        await db.query(`INSERT INTO public.invoices(id,company_id,balance,status,total_amount,contract_id,customer_id,due_date,balance_due)
          VALUES($1,$2,1500,'sent',1500,$3,$4,'2026-09-01',1500)`,[other,company,contract,customer]);
      }
      const secondFee = (await rows(`INSERT INTO public.late_fees(company_id,invoice_id,fee_amount,status,contract_id)
        VALUES($1,$2,100,'applied',$3) RETURNING id`,[company,targetInvoice,contract]))[0].id;
      // Like the production replacement command, synchronize after the batch.
      // A cross-invoice fee is invalid for new writes; model legacy evidence only.
      await db.exec("SELECT set_config('app.payment_allocation_batch_mode','on',true)");
      if (differentInvoice) await db.exec('ALTER TABLE public.payment_allocations DISABLE TRIGGER validate_payment_allocation_row_trigger');
      await db.query('UPDATE public.payment_allocations SET amount=60 WHERE payment_id=$1',[id]);
      await db.query(`INSERT INTO public.payment_allocations(company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order)
        VALUES($1,$2,'late_fee',$3,60,true,3)`,[company,id,secondFee]);
      if (differentInvoice) await db.exec('ALTER TABLE public.payment_allocations ENABLE TRIGGER validate_payment_allocation_row_trigger');
      await db.exec("SELECT set_config('app.payment_allocation_batch_mode','off',true)");
      await rows('SELECT public.sync_payment_allocation_state($1)',[id]);
      assert.equal((await rows('SELECT invoice_id FROM public.payments WHERE id=$1',[id]))[0].invoice_id,differentInvoice ? null : invoice);
      assert.equal(Number((await rows('SELECT public.canonical_invoice_paid_amount($1,null) paid',[invoice]))[0].paid),0);
    });
  }

  it('does not hide an invalid allocation when deriving the primary invoice', async () => {
    const id = await call(120,120,'bad-allocation');
    // Model a pre-existing corrupt row. New writes remain protected by the real validator.
    await db.exec('ALTER TABLE public.payment_allocations DISABLE TRIGGER validate_payment_allocation_row_trigger');
    await db.query('UPDATE public.payment_allocations SET amount=60 WHERE payment_id=$1',[id]);
    await db.query(`INSERT INTO public.payment_allocations(company_id,payment_id,allocation_type,target_id,amount,is_active)
      VALUES($1,$2,'late_fee',$3,60,true)`,[other,id,fee]);
    await db.exec('ALTER TABLE public.payment_allocations ENABLE TRIGGER validate_payment_allocation_row_trigger');
    await rows('SELECT public.sync_payment_allocation_state($1)',[id]);
    assert.equal((await rows('SELECT invoice_id FROM public.payments WHERE id=$1',[id]))[0].invoice_id,null);
  });

  it('preserves the service-only helper permissions', async () => {
    for (const role of ['anon','authenticated','service_role']) {
      const allowed = (await rows("SELECT has_function_privilege($1,'public.sync_payment_allocation_state(uuid)','EXECUTE') allowed",[role]))[0].allowed;
      assert.equal(allowed,role==='service_role');
    }
  });

  for (const [before,after] of [
    ['v_allocated numeric := 0;','v_allocated numeric := 0.00;'],
    ['count(DISTINCT invoice.id) = 1','count(DISTINCT invoice.id) <= 1'],
  ]) it('refuses rollback if another edit changed synchronization: '+before, async () => {
    const definition = (await rows("SELECT pg_get_functiondef('public.sync_payment_allocation_state(uuid)'::regprocedure) definition"))[0].definition;
    await db.exec(definition.replace(before,after));
    const rollback = (await read('../../supabase/rollbacks/20260903211652_preserve_invoice_link_for_fee_only_receipts.rollback.sql'))
      .replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
    await db.exec('SAVEPOINT guarded_rollback');
    await assert.rejects(db.exec(rollback),/review before rollback/);
    await db.exec('ROLLBACK TO SAVEPOINT guarded_rollback');
    assert.ok((await rows("SELECT prosrc FROM pg_proc WHERE oid='public.sync_payment_allocation_state(uuid)'::regprocedure"))[0].prosrc.includes(after));
  });

  it('rolls back the function without deleting receipts or request evidence', async () => {
    const id = await call(120,120,'rollback');
    // Strip transaction wrappers to keep the test rollback isolated.
    const rollback = (await read('../../supabase/rollbacks/20260903211652_preserve_invoice_link_for_fee_only_receipts.rollback.sql'))
      .replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
    await db.exec(rollback);
    const hash = (await rows("SELECT md5(replace(prosrc,E'\\r\\n',E'\\n')) hash FROM pg_proc WHERE oid='public.sync_payment_allocation_state(uuid)'::regprocedure"))[0].hash;
    assert.equal(hash,'ce8a7175fe46f375080b854ed2f62fd5');
    assert.equal((await rows('SELECT count(*)::int n FROM public.payments WHERE id=$1',[id]))[0].n,1);
    assert.equal((await rows('SELECT count(*)::int n FROM public.invoice_fee_payment_requests WHERE payment_id=$1',[id]))[0].n,1);
    assert.equal(await call(120,120,'rollback'),id);
  });
});
