// node --test tests/database/invoice-fee-replay.test.mjs
// Actual v2 SQL on PostgreSQL 17 (PGlite), with explicit auth/v1 fixture doubles.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const migration = '../../supabase/migrations/20260903203807_replay_safe_invoice_late_fee_payment.sql';
const rollback = '../../supabase/rollbacks/20260903203807_replay_safe_invoice_late_fee_payment.rollback.sql';
const invoice = '11111111-1111-4111-8111-111111111111';
const company = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const fee = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const args = [company, invoice, 1620, 120, fee, '2026-09-03', 'cash', 'REF', 'note', 'stable-attempt', actor];
let db;
const call = async (overrides = {}) => {
  const values = args.map((value, i) => Object.hasOwn(overrides, i) ? overrides[i] : value);
  return (await db.query(`SELECT public.create_invoice_payment_with_late_fee_v2(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) id`, values)).rows[0].id;
};
const count = async () => Number((await db.query('SELECT count(*) AS n FROM public.delegate_calls')).rows[0].n);
const reject = async (overrides, pattern) => {
  await db.exec('SAVEPOINT rejected_command');
  await assert.rejects(call(overrides), pattern);
  await db.exec('ROLLBACK TO SAVEPOINT rejected_command');
};

describe('invoice fee replay command', { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    assert.equal(Math.floor(Number((await db.query('SHOW server_version_num')).rows[0].server_version_num) / 10000), 17);
    await db.exec(await read('./fixtures/invoice-fee-replay-schema.sql'));
    await db.exec(await read(migration));
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      SELECT set_config('fixture.uid','${actor}',true),set_config('fixture.role','authenticated',true),
        set_config('fixture.allowed','yes',true),set_config('fixture.period_closed','no',true),
        set_config('fixture.delegate_fails','no',true);
      INSERT INTO public.invoices VALUES('${invoice}','${company}',1500,'active');
      INSERT INTO public.late_fees VALUES('${fee}','${company}','${invoice}',3000,'applied');`);
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('creates once then returns the same ID although the principal balance is now zero', async () => {
    const first = await call();
    assert.equal(await call(), first);
    assert.equal(await count(), 1);
  });

  it('restores an existing result after period closure without calling the accounting engine', async () => {
    const first = await call();
    await db.exec("SELECT set_config('fixture.period_closed','yes',true)");
    assert.equal(await call(), first);
    assert.equal(await count(), 1);
  });

  it('does not turn a cancelled prior attempt into a new payment', async () => {
    const first = await call();
    await db.exec(`UPDATE public.payments SET payment_status='cancelled';
      UPDATE public.invoices SET status='cancelled'; UPDATE public.late_fees SET status='waived';
      UPDATE public.payment_allocations SET is_active=false;`);
    assert.equal(await call(), first);
    assert.equal(await count(), 1);
  });

  for (const [field, value] of [[2,1700],[3,100],[6,'check'],[5,'2026-09-04'],[7,'CHANGED'],[8,'changed note'],[4,other]]) {
    it(`rejects a changed replay field ${field}`, async () => {
      await call();
      await reject({ [field]: value }, /different payment data|another fee assessment/);
      assert.equal(await count(), 1);
    });
  }

  for (const mode of ['no','null']) {
    it(`rejects even existing attempts when authorization is ${mode}`, async () => {
      await call();
      await db.query("SELECT set_config('fixture.allowed',$1,true)", [mode]);
      await reject({}, /Not authorized/);
    });
  }
  it('rejects an unauthenticated caller and an impersonated actor', async () => {
    await reject({ 10: other }, /Actor identity mismatch/);
    await db.exec("SELECT set_config('fixture.uid','',true)");
    await reject({}, /Actor identity mismatch/);
    assert.equal(await count(), 0);
  });
  it('rejects another company before attempting payment or replay', async () => {
    await reject({ 0: other }, /Not authorized/);
    assert.equal(await count(), 0);
  });
  it('rejects replay against a different invoice in the same company', async () => {
    await call();
    await db.query('INSERT INTO public.invoices VALUES($1,$2,1500,$3)',[other,company,'active']);
    await reject({ 1: other }, /different payment data/);
    assert.equal(await count(),1);
  });
  it('rejects a different authorized actor taking over the previous attempt', async () => {
    await call();
    await db.query("SELECT set_config('fixture.uid',$1,true)",[other]);
    await reject({ 10: other }, /different payment data/);
    assert.equal(await count(),1);
  });
  it('requires an explicit service actor', async () => {
    await db.exec("SELECT set_config('fixture.role','service_role',true),set_config('fixture.uid','',true)");
    await reject({ 10: null }, /Actor identity mismatch/);
    assert.ok(await call());
    assert.equal(await count(), 1);
  });

  for (const state of ['waived','paid','cancelled']) {
    it(`does not collect an explicit fee in ${state} state`, async () => {
      await db.query('UPDATE public.late_fees SET status=$1',[state]);
      await reject({}, /not collectible/);
      assert.equal(await count(), 0);
    });
  }
  it('does not create a replacement for a missing explicit fee ID', async () => {
    await reject({ 4: other }, /not collectible/);
    assert.equal(await count(), 0);
  });
  it('subtracts active allocations and rejects paying more than the remaining fee', async () => {
    await db.query(`INSERT INTO public.payment_allocations VALUES($1,$2,'late_fee',$3,2950,true)`,[company,other,fee]);
    await reject({}, /remaining assessed fee/);
    assert.ok(await call({ 2: 1550, 3: 50 }));
    assert.equal(await count(), 1);
  });
  it('ignores inactive fee allocations in the collectible balance', async () => {
    await db.query(`INSERT INTO public.payment_allocations VALUES($1,$2,'late_fee',$3,3000,false)`,[company,other,fee]);
    assert.ok(await call());
  });
  it('does not silently collect a calculated quote when an assessment already exists', async () => {
    await reject({ 4: null }, /assessment changed/);
    await db.exec("UPDATE public.late_fees SET status='waived'");
    await reject({ 4: null }, /assessment changed/);
    assert.equal(await count(), 0);
  });
  it('creates a new calculated assessment only when none exists and replays it', async () => {
    await db.exec('DELETE FROM public.late_fees');
    const first = await call({ 4: null });
    assert.equal(await call({ 4: null }), first);
    assert.equal(await count(), 1);
  });
  it('rolls back all delegated changes when accounting fails', async () => {
    await db.exec("SELECT set_config('fixture.delegate_fails','yes',true)");
    await reject({}, /injected accounting failure/);
    assert.equal(await count(), 0);
    assert.equal(Number((await db.query('SELECT count(*) n FROM public.payments')).rows[0].n),0);
  });
  for (const invalid of [{9:null},{9:''},{2:'NaN'},{3:'Infinity'},{3:-1},{2:10,3:120},{2:1620.001,3:120.001}]) {
    it(`rejects invalid request ${JSON.stringify(invalid)}`, async () => {
      await reject(invalid, /valid amounts are required/);
      assert.equal(await count(),0);
    });
  }
  it('does not expose the security-definer command to anonymous callers', async () => {
    const signature = 'public.create_invoice_payment_with_late_fee_v2(uuid,uuid,numeric,numeric,uuid,date,text,text,text,text,uuid)';
    assert.equal((await db.query('SELECT has_function_privilege($1,$2,$3) allowed',['anon',signature,'EXECUTE'])).rows[0].allowed,false);
    assert.equal((await db.query('SELECT has_function_privilege($1,$2,$3) allowed',['authenticated',signature,'EXECUTE'])).rows[0].allowed,true);
  });
  it('allows an authorized authenticated role but denies actual anonymous execution', async () => {
    await db.exec('SET LOCAL ROLE authenticated');
    assert.ok(await call());
    await db.exec('RESET ROLE; SET LOCAL ROLE anon');
    await reject({}, /permission denied/);
    await db.exec('RESET ROLE');
    assert.equal(await count(),1);
  });

  it('keeps original request notes when the stored receipt is edited', async () => {
    const id = await call();
    await db.exec("UPDATE public.payments SET notes='automated or employee amendment'");
    assert.equal(await call(),id);
    const snapshot = (await db.query('SELECT request_payload FROM public.invoice_fee_payment_requests')).rows[0].request_payload;
    assert.equal(snapshot.notes,'note');
    await reject({8:'automated or employee amendment'},/different payment data/);
    assert.equal(await count(),1);
  });
  it('distinguishes a calculated fee request from an explicit assessment replay', async () => {
    await db.exec('DELETE FROM public.late_fees');
    await call({4:null});
    const generated = (await db.query('SELECT id FROM public.late_fees')).rows[0].id;
    await reject({4:generated},/different payment data/);
    assert.equal(await count(),1);
  });
  it('normalizes input once for whitespace, method casing and numeric scale', async () => {
    const id = await call({2:'1620.00',3:'120.00',6:' CASH ',7:' REF ',8:' note ',9:' stable-attempt '});
    assert.equal(await call(),id);
    assert.equal(Number((await db.query('SELECT count(*) n FROM public.invoice_fee_payment_requests')).rows[0].n),1);
  });
  it('does not replay a receipt reassigned to another invoice outside this command', async () => {
    await call();
    await db.query('UPDATE public.payments SET invoice_id=$1',[other]);
    await reject({},/receipt identity changed/);
    assert.equal(await count(),1);
  });

  for (const statement of [
    "UPDATE public.invoice_fee_payment_requests SET request_payload='{}'::jsonb",
    'DELETE FROM public.invoice_fee_payment_requests',
    'TRUNCATE public.invoice_fee_payment_requests',
  ]) {
    it(`rejects even owner mutation: ${statement.split(' ')[0]}`, async () => {
      await call();
      await db.exec('SAVEPOINT evidence_mutation');
      await assert.rejects(db.exec(statement),/evidence is immutable/);
      await db.exec('ROLLBACK TO SAVEPOINT evidence_mutation');
      assert.equal(Number((await db.query('SELECT count(*) n FROM public.invoice_fee_payment_requests')).rows[0].n),1);
    });
  }
  for (const role of ['anon','authenticated','service_role']) {
    it(`denies direct ledger privileges and reading to ${role}`, async () => {
      await call();
      for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
        assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) allowed',[role,'public.invoice_fee_payment_requests',privilege])).rows[0].allowed,false);
      }
      await db.exec(`SAVEPOINT denied_reader; SET LOCAL ROLE ${role}`);
      await assert.rejects(db.query('SELECT * FROM public.invoice_fee_payment_requests'),/permission denied/);
      await db.exec('ROLLBACK TO SAVEPOINT denied_reader');
    });
  }
  it('RLS still hides evidence if SELECT is accidentally granted to an ordinary caller', async () => {
    await call();
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.invoice_fee_payment_requests'::regclass")).rows[0].relrowsecurity,true);
    await db.exec('GRANT SELECT ON public.invoice_fee_payment_requests TO authenticated; SET LOCAL ROLE authenticated');
    assert.deepEqual((await db.query('SELECT * FROM public.invoice_fee_payment_requests')).rows,[]);
    await db.exec('RESET ROLE');
  });
  for (const table of ['invoices','payments']) {
    it(`retains command history by preventing a referenced ${table} deletion`, async () => {
      await call();
      await db.exec('SAVEPOINT delete_parent');
      await assert.rejects(db.exec(`DELETE FROM public.${table}`),/foreign key constraint/);
      await db.exec('ROLLBACK TO SAVEPOINT delete_parent');
    });
  }
  it('rejects inserting command evidence with mismatched payload identity', async () => {
    const id = await call();
    await db.exec('SAVEPOINT forged_evidence');
    await assert.rejects(db.query(`INSERT INTO public.invoice_fee_payment_requests
      (company_id,idempotency_key,invoice_id,actor_id,request_payload,payment_id)
      VALUES($1,'forged',$2,$3,'{}'::jsonb,$4)`,[company,invoice,actor,id]),/payload identity mismatch/);
    await db.exec('ROLLBACK TO SAVEPOINT forged_evidence');
  });
  it('rejects a command record whose receipt is in a different company', async () => {
    const id = await call();
    const snapshot = (await db.query('SELECT request_payload FROM public.invoice_fee_payment_requests')).rows[0].request_payload;
    await db.exec('SAVEPOINT forged_scope');
    await assert.rejects(db.query(`INSERT INTO public.invoice_fee_payment_requests
      (company_id,idempotency_key,invoice_id,actor_id,request_payload,payment_id)
      VALUES($1,'stable-attempt',$2,$3,$4::jsonb,$5)`,[other,invoice,actor,JSON.stringify({...snapshot,company_id:other}),id]),/does not match its receipt/);
    await db.exec('ROLLBACK TO SAVEPOINT forged_scope');
  });
});

it('rollback removes only the additive command and retains original engine and data', async () => {
  const isolated = new PGlite();
  try {
    await isolated.exec(await read('./fixtures/invoice-fee-replay-schema.sql'));
    await isolated.exec(await read(migration));
    await isolated.exec(`BEGIN;
      SELECT set_config('fixture.uid','${actor}',true),set_config('fixture.role','authenticated',true),set_config('fixture.allowed','yes',true);`);
    await isolated.query('INSERT INTO public.invoices VALUES($1,$2,1500,$3)',[invoice,company,'active']);
    await isolated.query('INSERT INTO public.late_fees VALUES($1,$2,$3,3000,$4)',[fee,company,invoice,'applied']);
    await isolated.query('SELECT public.create_invoice_payment_with_late_fee_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',args);
    await isolated.exec('COMMIT');
    const evidence = (await isolated.query('SELECT * FROM public.invoice_fee_payment_requests')).rows;
    await isolated.exec(await read(rollback));
    assert.equal((await isolated.query("SELECT count(*)::int n FROM pg_proc WHERE proname='create_invoice_payment_with_late_fee_v2'")).rows[0].n,0);
    assert.equal((await isolated.query("SELECT count(*)::int n FROM pg_proc WHERE proname='create_invoice_payment_with_late_fee_v1'")).rows[0].n,1);
    assert.equal((await isolated.query('SELECT count(*)::int n FROM public.invoices')).rows[0].n,1);
    assert.equal((await isolated.query('SELECT count(*)::int n FROM public.payments')).rows[0].n,1);
    assert.deepEqual((await isolated.query('SELECT * FROM public.invoice_fee_payment_requests')).rows,evidence);
    await assert.rejects(isolated.exec('DELETE FROM public.invoice_fee_payment_requests'),/evidence is immutable/);
  } finally { await isolated.close(); }
});
