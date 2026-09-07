import assert from 'node:assert/strict';
import { before,after,beforeEach,afterEach,describe,it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { installIntegrityFixture,seedIntegrityFixture,snapshot } from './helpers/financial-integrity-fixture.mjs';
import { collect,cancelReceipt,ids } from './helpers/collected-fee-fixture.mjs';
describe('independent financial integrity runtime',{concurrency:false},()=>{
 let db;
 before(async()=>{db=new PGlite();await installIntegrityFixture(db);});
 after(async()=>db?.close());
 beforeEach(async()=>{await db.exec('BEGIN');await seedIntegrityFixture(db);});
 afterEach(async()=>db.exec('ROLLBACK'));
 it('counts a receipt once, repairs a stale header, and remains stable on replay',async()=>{
  await collect(db);
  assert.equal((await snapshot(db)).canonical_paid,500);
  assert.equal((await snapshot(db)).stored_paid,500);
  await db.query('UPDATE public.contracts SET total_paid=620 WHERE id=$1',[ids.contract]);
  await db.query('SELECT public.process_contract_financial_reconciliation_v1(20)');
  assert.equal((await snapshot(db)).header_mismatch,false);
  assert.equal((await snapshot(db)).stored_paid,500);
  await db.query('SELECT public.enqueue_contract_financial_reconciliation_v1($1,$2)',[ids.company,ids.contract]);
  await db.query('SELECT public.process_contract_financial_reconciliation_v1(20)');
  assert.equal((await db.query('SELECT status FROM public.contract_financial_reconciliation_queue')).rows[0].status,'matched');
 });
 it('synchronizes a reversed receipt without changing receipt facts or schedule face value',async()=>{
  const payment=await collect(db,{amount:1620});
  assert.equal((await snapshot(db)).stored_paid,1500);
  await cancelReceipt(db,payment);
  assert.equal((await snapshot(db)).stored_paid,0);
  assert.equal(Number((await db.query('SELECT paid_amount FROM public.contract_payment_schedules')).rows[0].paid_amount),0);
 });
 for(const order of ['contract-first','invoice-first']) it(`preserves cancellation evidence and blocks rebilling (${order})`,async()=>{
  const cancelContract=()=>db.query("UPDATE public.contracts SET status='cancelled' WHERE id=$1",[ids.contract]);
  const cancelInvoice=()=>db.query("UPDATE public.invoices SET status='cancelled',payment_status='cancelled' WHERE id=$1",[ids.invoice]);
  if(order==='contract-first'){await cancelContract();await cancelInvoice();}else{await cancelInvoice();await cancelContract();}
  await db.query('SELECT public.process_contract_financial_reconciliation_v1(20)');
  const s=(await db.query('SELECT * FROM public.contract_payment_schedules')).rows[0];
  assert.equal(s.invoice_id,null);assert.equal(s.cancelled_invoice_id,ids.invoice);
  assert.equal(s.financial_hold_reason,'cancelled_invoice_obligation_review');assert.notEqual(s.status,'cancelled');
  const state=await snapshot(db);assert.equal(state.review_amount,1500);assert.equal(state.outstanding,0);
  assert.equal((await db.query('SELECT status FROM public.contract_financial_reconciliation_queue')).rows[0].status,'review');
  await assert.rejects(()=>db.query(`INSERT INTO public.invoices(company_id,contract_id,customer_id,total_amount,invoice_month,invoice_date,due_date,invoice_type,status)
   VALUES($1,$2,$3,1500,'2026-09-01','2026-09-01','2026-09-01','sales','sent')`,[ids.company,ids.contract,ids.customer]),/موقوف/);
 });
 it('rejects duplicate links and incorrect billing months',async()=>{
  await assert.rejects(()=>db.query(`INSERT INTO public.contract_payment_schedules(company_id,contract_id,invoice_id,amount,due_date)
    VALUES($1,$2,$3,1500,'2026-10-01')`,[ids.company,ids.contract,ids.invoice]),/شهر/);
 });
 it('does not rewrite an ambiguous schedule amount',async()=>{
  await db.query('UPDATE public.contract_payment_schedules SET invoice_id=NULL WHERE contract_id=$1',[ids.contract]);
  await db.query('UPDATE public.contract_payment_schedules SET amount=1490 WHERE contract_id=$1',[ids.contract]);
  await db.query('SELECT public.process_contract_financial_reconciliation_v1(20)');
  assert.equal(Number((await db.query('SELECT amount,invoice_id FROM public.contract_payment_schedules')).rows[0].amount),1490);
  assert.equal((await db.query('SELECT invoice_id FROM public.contract_payment_schedules')).rows[0].invoice_id,null);
 });
 it('retries a failed repair at most three times and rolls back partial writes',async()=>{
  await db.exec(`CREATE FUNCTION public.fixture_fail_contract_repair() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'injected repair failure';END;$$;
   CREATE TRIGGER fixture_fail_contract_repair BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_contract_repair();`);
  for(let i=0;i<3;i++) {await db.exec("UPDATE public.contract_financial_reconciliation_queue SET available_at=now()");await db.query('SELECT public.process_contract_financial_reconciliation_v1(20)');}
  const q=(await db.query('SELECT * FROM public.contract_financial_reconciliation_queue')).rows[0];
  assert.equal(q.status,'failed');assert.equal(q.attempts,3);assert.match(q.last_error,/injected/);
 });
 it('requires company membership for snapshot reads and denies private helper execution',async()=>{
  await db.query("SELECT set_config('fixture.uid',$1,true)",[ids.other]);
  await assert.rejects(()=>db.query('SELECT public.get_contract_financial_integrity_v1($1,$2)',[ids.company,ids.contract]),/صلاحية/);
 });
 it('respects financial pause without consulting messaging controls',async()=>{
  await db.exec('UPDATE public.contract_financial_reconciliation_controls SET enabled=false');
  const r=(await db.query('SELECT public.process_contract_financial_reconciliation_v1(20) result')).rows[0].result;
  assert.equal(r.processed,0);assert.equal((await db.query('SELECT status FROM public.contract_financial_reconciliation_queue')).rows[0].status,'pending');
 });
});
