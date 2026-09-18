// Actual SQL on an isolated PostgreSQL fixture; not production triggers/RLS in full.
// node --test tests/database/contract-amount-preservation.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const fixPath = '../../supabase/migrations/20260903185654_preserve_contract_amount_on_nonfinancial_updates.sql';
const rollbackPath = '../../supabase/rollbacks/20260903185654_preserve_contract_amount_on_nonfinancial_updates.rollback.sql';
let db;
const row = async () => (await db.query(`SELECT contract_amount::float8 amount,
  balance_due::float8 balance, description FROM public.contracts WHERE id=1`)).rows[0];

describe('contract amount preservation — PostgreSQL 17', { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    assert.equal(Math.floor(Number((await db.query('show server_version_num')).rows[0].server_version_num) / 10000), 17);
    await db.exec(`CREATE TABLE public.contracts (
      id integer PRIMARY KEY, company_id uuid, customer_id uuid, vehicle_id uuid,
      cost_center_id uuid, status text, start_date date, end_date date,
      monthly_amount numeric, contract_amount numeric, total_paid numeric,
      balance_due numeric, description text, updated_at timestamptz
    );`);
    const source = await read('../../supabase/migrations/20260803172500_create_contract_with_billing_graph_atomic.sql');
    for (const name of ['trigger_calculate_contract_amount', 'require_atomic_contract_billing_graph']) {
      const definition = source.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(\\)[\\s\\S]*?\\$\\$;`))?.[0];
      assert.ok(definition, `Missing actual ${name} definition`);
      await db.exec(definition);
    }
    await db.exec(await read(fixPath));
    await db.exec(`
      CREATE TRIGGER auto_calculate_contract_amount BEFORE INSERT OR UPDATE ON public.contracts
        FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_contract_amount();
      CREATE TRIGGER trg_require_atomic_contract_billing_graph
        BEFORE INSERT OR UPDATE OF status,contract_amount,monthly_amount,start_date,end_date,customer_id,vehicle_id,cost_center_id
        ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.require_atomic_contract_billing_graph();
      CREATE TRIGGER trg_sync_contract_amount BEFORE INSERT OR UPDATE OF start_date,end_date,monthly_amount
        ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.sync_contract_amount();
    `);
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      SELECT set_config('fleetify.atomic_contract_creation','on',true);
      INSERT INTO public.contracts VALUES
        (1,NULL,NULL,NULL,NULL,'active','2024-08-15','2027-08-15',1800,64800,1800,63000,'original','2026-09-03T12:00:00Z');
      SELECT set_config('fleetify.atomic_contract_creation','off',true);
    `);
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('preserves agreed partial-month totals when unchanged financial columns are resent', async () => {
    await db.exec(`UPDATE public.contracts SET start_date='2024-08-15',end_date='2027-08-15',
      monthly_amount=1800,contract_amount=64800,description='note' WHERE id=1`);
    assert.deepEqual(await row(), { amount: 64800, balance: 63000, description: 'note' });
  });

  it('preserves notes-only saves and avoids silently repairing unrelated stored balances', async () => {
    await db.exec("UPDATE public.contracts SET balance_due=123, description='note' WHERE id=1");
    await db.exec('UPDATE public.contracts SET start_date=start_date,end_date=end_date,monthly_amount=monthly_amount WHERE id=1');
    assert.deepEqual(await row(), { amount: 64800, balance: 123, description: 'note' });
  });

  for (const state of ['under_legal_procedure', 'cancelled', 'closed']) {
    it(`does not drift on unchanged updates in ${state} state`, async () => {
      await db.query('UPDATE public.contracts SET status=$1 WHERE id=1', [state]);
      await db.exec('UPDATE public.contracts SET monthly_amount=monthly_amount WHERE id=1');
      assert.equal((await row()).amount, 64800);
    });
  }

  it('retains the atomic financial-change guard', async () => {
    await assert.rejects(db.exec('UPDATE public.contracts SET monthly_amount=1900 WHERE id=1'), /audited atomic amendment/);
  });

  it('lets an audited command supply an exact revised amount and recomputes balance', async () => {
    await db.exec(`SELECT set_config('fleetify.atomic_contract_creation','on',true);
      UPDATE public.contracts SET monthly_amount=1900,contract_amount=68400 WHERE id=1`);
    assert.equal((await row()).amount, 68400);
    assert.equal((await row()).balance, 66600);
  });

  it('keeps the earlier canonical calculator for a missing new-contract amount', async () => {
    await db.exec(`SELECT set_config('fleetify.atomic_contract_creation','on',true);
      INSERT INTO public.contracts(id,status,start_date,end_date,monthly_amount,contract_amount,total_paid)
        VALUES(2,'active','2026-01-01','2026-04-01',1500,0,0)`);
    const created = (await db.query('SELECT contract_amount::int amount, balance_due::int balance FROM public.contracts WHERE id=2')).rows[0];
    assert.deepEqual(created, { amount: 4500, balance: 4500 });
  });

  it('keeps explicit same-month pricing instead of deriving another amount', async () => {
    await db.exec(`SELECT set_config('fleetify.atomic_contract_creation','on',true);
      UPDATE public.contracts SET start_date='2026-01-02',end_date='2026-01-15',monthly_amount=1500,contract_amount=700 WHERE id=1;
      SELECT set_config('fleetify.atomic_contract_creation','off',true);
      UPDATE public.contracts SET monthly_amount=monthly_amount WHERE id=1`);
    assert.equal((await row()).amount, 700);
  });

  it('an optimistic notes update matches no row after the version changes', async () => {
    await db.exec("UPDATE public.contracts SET updated_at='2026-09-03T12:01:00Z',description='newer' WHERE id=1");
    const result = await db.query(`UPDATE public.contracts SET description='stale'
      WHERE id=1 AND updated_at='2026-09-03T12:00:00Z' RETURNING id`);
    assert.equal(result.rows.length, 0);
    assert.equal((await row()).description, 'newer');
  });
});

// A separate fixture is used because the migration files contain COMMIT.
it('rollback restores the old function body without deleting business rows', async () => {
  const isolated = new PGlite();
  try {
    await isolated.exec('CREATE TABLE public.contracts(id integer); INSERT INTO public.contracts VALUES(7)');
    await isolated.exec(await read(fixPath));
    await isolated.exec(await read(rollbackPath));
    const definition = (await isolated.query("SELECT pg_get_functiondef('public.sync_contract_amount()'::regprocedure) AS sql")).rows[0].sql;
    assert.match(definition, /v_billing_months/);
    assert.equal((await isolated.query('SELECT id FROM public.contracts')).rows[0].id, 7);
    await isolated.exec(await read(fixPath));
    const fixed = (await isolated.query("SELECT pg_get_functiondef('public.sync_contract_amount()'::regprocedure) AS sql")).rows[0].sql;
    assert.doesNotMatch(fixed, /v_billing_months/);
  } finally { await isolated.close(); }
});
