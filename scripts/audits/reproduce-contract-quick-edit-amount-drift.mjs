/**
 * Read-only production-code reproduction: no network or external database.
 * Loads the deployed trigger definitions from versioned migrations into a
 * minimal in-memory PostgreSQL 17 fixture. This demonstrates a known defect;
 * it is NOT a passing regression test or a full production-schema simulation.
 * Run: node scripts/audits/reproduce-contract-quick-edit-amount-drift.mjs
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = async (name) => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');

try {
  const version = (await db.query('show server_version_num')).rows[0].server_version_num;
  assert.equal(Math.floor(Number(version) / 10000), 17);
  const creation = await migration('20260803172500_create_contract_with_billing_graph_atomic.sql');
  const guard = creation.match(/CREATE OR REPLACE FUNCTION public\.require_atomic_contract_billing_graph\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(guard, 'Expected the actual billing guard in its source migration');
  await db.exec(`
    CREATE TABLE public.contracts (
      id integer PRIMARY KEY, company_id uuid, customer_id uuid, vehicle_id uuid,
      cost_center_id uuid, status text, start_date date, end_date date,
      monthly_amount numeric, contract_amount numeric, total_paid numeric,
      balance_due numeric, description text
    );
  `);
  await db.exec(guard);
  await db.exec(await migration('20260827143500_preserve_explicit_contract_amount_in_legacy_sync.sql'));
  // Trigger names, timing and UPDATE column list verified read-only against
  // production on 2026-09-03. Same-event BEFORE triggers run in name order.
  await db.exec(`
    CREATE TRIGGER trg_require_atomic_contract_billing_graph
      BEFORE UPDATE OF status,contract_amount,monthly_amount,start_date,end_date,customer_id,vehicle_id,cost_center_id
      ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.require_atomic_contract_billing_graph();
    CREATE TRIGGER trg_sync_contract_amount
      BEFORE UPDATE OF start_date,end_date,monthly_amount ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.sync_contract_amount();
    INSERT INTO public.contracts(id,status,start_date,end_date,monthly_amount,contract_amount,total_paid,balance_due,description)
      VALUES (1,'active','2024-08-15','2027-08-15',1800,64800,1800,63000,'original');
  `);
  const inspect = async () => (await db.query(`
    SELECT contract_amount::text, balance_due::text, description FROM public.contracts WHERE id=1
  `)).rows[0];
  const before = await inspect();
  await db.exec("UPDATE public.contracts SET description='notes only' WHERE id=1");
  const narrowUpdate = await inspect();
  assert.equal(narrowUpdate.contract_amount, before.contract_amount);

  // The current wizard sends unchanged protected columns with the note.
  await db.exec(`UPDATE public.contracts SET
    customer_id=NULL, vehicle_id=NULL, start_date='2024-08-15', end_date='2027-08-15',
    monthly_amount=1800, contract_amount=64800, description='wizard notes' WHERE id=1`);
  const wizardUpdate = await inspect();
  const defectReproduced = Number(wizardUpdate.contract_amount) !== Number(before.contract_amount);
  console.log(JSON.stringify({
    fixture: 'synthetic, in-memory; selected deployed triggers only', version,
    before, narrowUpdate, wizardUpdate, defectReproduced,
    unexpectedIncrease: Number(wizardUpdate.contract_amount) - Number(before.contract_amount),
  }, null, 2));
  assert.ok(defectReproduced, 'Historical reproduction no longer exhibits the documented defect');
  assert.equal(Number(wizardUpdate.contract_amount), 66600);
} finally {
  await db.close();
}
