import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Isolated causal reproduction using four exact read-only production captures.
// Minimal schema, synthetic IDs, no credentials, no Supabase connection.
// It proves writer-order and cancellation-order defects, not full-schema coverage.
const db = new PGlite();
const cid = '00000000-0000-0000-0000-000000000001';
const company = '00000000-0000-0000-0000-000000000002';
const invoice = '00000000-0000-0000-0000-000000000003';
try {
  await db.exec(`
    CREATE TABLE contracts(id uuid primary key,company_id uuid,contract_amount numeric,total_paid numeric,
      balance_due numeric,payment_status text,status text,last_payment_date date,updated_at timestamptz);
    CREATE TABLE payments(id uuid primary key,company_id uuid,contract_id uuid,amount numeric,
      transaction_type text,payment_status text,payment_date date);
    CREATE TABLE invoices(id uuid primary key,company_id uuid,contract_id uuid,status text,payment_status text);
    CREATE TABLE contract_payment_schedules(id uuid primary key,company_id uuid,contract_id uuid,
      invoice_id uuid,status text,paid_amount numeric,updated_at timestamptz);
  `);
  const captured = await readFile(new URL('./deployed-writers.sql', import.meta.url), 'utf8');
  await db.exec(captured.replace(/^\$function\$$/gm, '$function$;'));
  await db.exec(`
    CREATE TRIGGER contract_payment_insert_trigger AFTER INSERT ON payments
      FOR EACH ROW WHEN (NEW.contract_id IS NOT NULL) EXECUTE FUNCTION update_contract_payment_totals();
    CREATE TRIGGER payments_update_contract_balance AFTER INSERT OR DELETE OR UPDATE ON payments
      FOR EACH ROW EXECUTE FUNCTION update_contract_balance();
    CREATE TRIGGER trg_cancel_contract_future_schedules AFTER UPDATE OF status ON contracts
      FOR EACH ROW EXECUTE FUNCTION cancel_contract_future_schedules();
    CREATE TRIGGER trg_detach_schedules_on_invoice_cancel AFTER UPDATE OF status,payment_status ON invoices
      FOR EACH ROW EXECUTE FUNCTION detach_schedules_on_invoice_cancel();
  `);
  await db.query("INSERT INTO contracts VALUES($1,$2,54000,0,54000,'unpaid','active',NULL,now())",[cid,company]);
  await db.query("INSERT INTO payments VALUES('00000000-0000-0000-0000-000000000004',$1,$2,7524,'receipt','completed','2024-05-25')",[company,cid]);
  // Start with an already reconciled historical balance, as on the live contract.
  await db.exec("UPDATE contracts SET total_paid=7524,balance_due=46476");
  await db.query("INSERT INTO payments VALUES('00000000-0000-0000-0000-000000000005',$1,$2,1476,'receipt','completed','2026-09-06')",[company,cid]);
  let result=(await db.query('SELECT total_paid,(SELECT sum(amount) FROM payments) receipt_total FROM contracts')).rows[0];
  assert.equal(Number(result.total_paid),10476);
  assert.equal(Number(result.receipt_total),9000);
  console.log('PASS: exact captured insert writers reproduce 10476 stored versus 9000 receipts; excess 1476.');
  // A one-off aggregate repair alone does not prevent recurrence.
  await db.exec("UPDATE contracts SET total_paid=9000,balance_due=45000");
  await db.query("INSERT INTO payments VALUES('00000000-0000-0000-0000-000000000006',$1,$2,100,'receipt','completed','2026-09-06')",[company,cid]);
  result=(await db.query('SELECT total_paid,(SELECT sum(amount) FROM payments) receipt_total FROM contracts')).rows[0];
  assert.equal(Number(result.total_paid),9200);
  assert.equal(Number(result.receipt_total),9100);
  console.log('PASS: drift returns after one-off repair and another receipt.');
  // Counterfactual only: removing the additive writer eliminates this mechanism.
  // Production needs the fully canonical migration, not this reduced SUM fixture.
  await db.exec('DROP TRIGGER payments_update_contract_balance ON payments');
  await db.query("INSERT INTO payments VALUES('00000000-0000-0000-0000-000000000007',$1,$2,100,'receipt','completed','2026-09-06')",[company,cid]);
  result=(await db.query('SELECT total_paid,(SELECT sum(amount) FROM payments) receipt_total FROM contracts')).rows[0];
  assert.equal(Number(result.total_paid),9200);
  assert.equal(Number(result.receipt_total),9200);
  console.log('PASS: removing the competing additive writer prevents this double count.');
  await db.query("INSERT INTO invoices VALUES($1,$2,$3,'sent','unpaid')",[invoice,company,cid]);
  await db.query("INSERT INTO contract_payment_schedules VALUES('00000000-0000-0000-0000-000000000008',$1,$2,$3,'overdue',0,now())",[company,cid,invoice]);
  await db.exec("UPDATE contracts SET status='cancelled'");
  await db.exec("UPDATE invoices SET status='cancelled',payment_status='cancelled'");
  const schedule=(await db.query('SELECT status,invoice_id FROM contract_payment_schedules')).rows[0];
  assert.deepEqual(schedule,{status:'overdue',invoice_id:null});
  console.log('PASS: cancelling contract before invoice leaves an overdue unlinked installment.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await db.close(); }
