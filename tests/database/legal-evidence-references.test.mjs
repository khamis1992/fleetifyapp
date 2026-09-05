// Real FK actions + migration on isolated PG17, not full production policies or
// evidence immutability. Existing names/actions verified via production catalog.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const migration = '../../supabase/migrations/20260903192847_preserve_referenced_legal_evidence.sql';
const rollback = '../../supabase/rollbacks/20260903192847_preserve_referenced_legal_evidence.rollback.sql';
// Independent snapshot of the eleven existing SET NULL relationships, not
// extracted from the new migration (so omitting a constraint fails the tests).
const refs = [
  ['legal_case_damage_costs', 'evidence_document_id', 'legal_case_damage_costs_evidence_document_id_fkey'],
  ['legal_case_evidence_proposals', 'source_document_id', 'legal_case_evidence_proposals_source_document_id_fkey'],
  ['legal_case_formal_notices', 'proof_document_id', 'legal_case_formal_notices_proof_document_id_fkey'],
  ['legal_case_litigation_profile', 'contractual_compensation_document_id', 'legal_case_litigation_profile_contractual_compensation_doc_fkey'],
  ['legal_case_litigation_profile', 'defendant_contact_document_id', 'legal_case_litigation_profile_defendant_contact_document_i_fkey'],
  ['legal_case_litigation_profile', 'delivery_handover_document_id', 'legal_case_litigation_profile_delivery_handover_document_i_fkey'],
  ['legal_case_litigation_profile', 'notice_exception_document_id', 'legal_case_litigation_profile_notice_exception_document_id_fkey'],
  ['legal_case_litigation_profile', 'retention_rate_source_document_id', 'legal_case_litigation_profile_retention_rate_source_docume_fkey'],
  ['legal_case_litigation_profile', 'termination_supporting_document_id', 'legal_case_litigation_profile_termination_supporting_docum_fkey'],
  ['legal_case_litigation_profile', 'vehicle_return_document_id', 'legal_case_litigation_profile_vehicle_return_document_id_fkey'],
  ['legal_notice_agent_jobs', 'proof_document_id', 'legal_notice_agent_jobs_proof_document_id_fkey'],
];
const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const docId = uuid(100), rowId = uuid(200), company = uuid(1), contract = uuid(2);
async function fixture(apply = true) {
  const db = new PGlite();
  await db.exec(`CREATE TABLE contract_documents(id uuid PRIMARY KEY, company_id uuid, contract_id uuid,
    file_path text, document_type text, UNIQUE(company_id,contract_id,id));`);
  for (const table of new Set(refs.map(([table]) => table))) {
    const columns = refs.filter(([name]) => name === table).map(([, column]) => column);
    await db.exec(`CREATE TABLE ${table}(id uuid PRIMARY KEY, company_id uuid, ${columns.map((column) => `${column} uuid`).join(',')})`);
  }
  for (const [table, column, name] of refs) {
    await db.exec(`ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY(${column}) REFERENCES contract_documents(id) ON DELETE SET NULL`);
  }
  // The already-deployed signed-source protection must not be weakened.
  for (const [table, name] of [
    ['lawsuit_preparations', 'lawsuit_preparations_direct_source_document_fkey'],
    ['taqadi_filing_jobs', 'taqadi_filing_jobs_source_document_scope_fkey'],
  ]) {
    await db.exec(`CREATE TABLE ${table}(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,source_document_id uuid,
      CONSTRAINT ${name} FOREIGN KEY(company_id,contract_id,source_document_id)
      REFERENCES contract_documents(company_id,contract_id,id) ON DELETE RESTRICT)`);
  }
  if (apply) await db.exec(await read(migration));
  return db;
}
const insertDoc = (db, id = docId) => db.query('INSERT INTO contract_documents VALUES($1,$2,$3,$4,$5)', [id, company, contract, `fixture-${id}.pdf`, 'other']);
const insertRef = (db, table, column) => db.query(`INSERT INTO ${table}(id,company_id,${column}) VALUES($1,$2,$3)`, [rowId, company, docId]);

describe('referenced legal evidence is not silently detached', { concurrency: false }, () => {
  let db;
  before(async () => {
    db = await fixture();
    assert.equal(Math.floor(Number((await db.query('show server_version_num')).rows[0].server_version_num) / 10000), 17);
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec('BEGIN'); await insertDoc(db); });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  for (const [table, column, name] of refs) {
    it(`preserves ${table}.${column} when the generic document DELETE is attempted`, async () => {
      await insertRef(db, table, column);
      await db.exec('SAVEPOINT attempt');
      await assert.rejects(db.query('DELETE FROM contract_documents WHERE id=$1', [docId]), (error) => error.code === '23503' && error.constraint === name);
      await db.exec('ROLLBACK TO SAVEPOINT attempt');
      assert.equal((await db.query(`SELECT ${column} value FROM ${table}`)).rows[0].value, docId);
      assert.equal((await db.query('SELECT count(*)::int n FROM contract_documents')).rows[0].n, 1);
    });
  }
  it('does not mistake a replacement file for permission to delete a referenced original', async () => {
    await insertDoc(db, uuid(101));
    await insertRef(db, 'legal_case_formal_notices', 'proof_document_id');
    await assert.rejects(db.query('DELETE FROM contract_documents WHERE id=$1', [docId]), (error) => error.code === '23503');
  });
  it('leaves genuinely unreferenced documents deletable', async () => {
    assert.equal((await db.query('DELETE FROM contract_documents WHERE id=$1 RETURNING id', [docId])).rows.length, 1);
  });
  it('keeps nullable references without fabricating a proof document', async () => {
    await db.query('INSERT INTO legal_case_formal_notices(id,company_id) VALUES($1,$2)', [rowId, company]);
    await db.query('DELETE FROM contract_documents WHERE id=$1', [docId]);
    assert.equal((await db.query('SELECT proof_document_id FROM legal_case_formal_notices')).rows[0].proof_document_id, null);
  });
  it('rolls back unrelated deletions in a bulk operation that includes referenced evidence', async () => {
    await insertDoc(db, uuid(101));
    await insertRef(db, 'legal_notice_agent_jobs', 'proof_document_id');
    await db.exec('SAVEPOINT attempt');
    await assert.rejects(db.exec('DELETE FROM contract_documents'), (error) => error.code === '23503');
    await db.exec('ROLLBACK TO SAVEPOINT attempt');
    assert.equal((await db.query('SELECT count(*)::int n FROM contract_documents')).rows[0].n, 2);
    assert.equal((await db.query('SELECT proof_document_id FROM legal_notice_agent_jobs')).rows[0].proof_document_id, docId);
  });
  for (const table of ['lawsuit_preparations', 'taqadi_filing_jobs']) {
    it(`retains the pre-existing signed source protection in ${table}`, async () => {
      await db.query(`INSERT INTO ${table} VALUES($1,$2,$3,$4)`, [rowId, company, contract, docId]);
      await assert.rejects(db.query('DELETE FROM contract_documents WHERE id=$1', [docId]), (error) => error.code === '23503');
    });
  }
  it('keeps all thirteen evidence foreign keys validated and restrictive', async () => {
    const constraints = (await db.query(`SELECT confdeltype,convalidated FROM pg_constraint
      WHERE contype='f' AND confrelid='public.contract_documents'::regclass`)).rows;
    assert.equal(constraints.length, 13);
    assert.ok(constraints.every((constraint) => constraint.confdeltype === 'r' && constraint.convalidated));
  });
});

it('reproduces the old evidence-loss behavior; rollback and reapply preserve current records', async () => {
  const db = await fixture(false);
  try {
    // Every old relationship previously allowed deleting its proof and retained
    // the business record with a null link. Rollback restores each test's fixture.
    for (const [table, column] of refs) {
      await db.exec('BEGIN');
      await insertDoc(db);
      await insertRef(db, table, column);
      await db.query('DELETE FROM contract_documents WHERE id=$1', [docId]);
      assert.equal((await db.query(`SELECT ${column} value FROM ${table}`)).rows[0].value, null);
      await db.exec('ROLLBACK');
    }
    await insertDoc(db);
    await insertRef(db, 'legal_case_formal_notices', 'proof_document_id');
    await db.exec(await read(migration));
    await db.exec(await read(rollback));
    assert.equal((await db.query('SELECT proof_document_id FROM legal_case_formal_notices')).rows[0].proof_document_id, docId);
    const actions = (await db.query(`SELECT confdeltype FROM pg_constraint WHERE conname=ANY($1::text[])`, [refs.map(([, , name]) => name)])).rows;
    assert.equal(actions.length, refs.length);
    assert.ok(actions.every((row) => row.confdeltype === 'n'));
    await db.exec(await read(migration));
    assert.equal((await db.query('SELECT proof_document_id FROM legal_case_formal_notices')).rows[0].proof_document_id, docId);
    await assert.rejects(db.query('DELETE FROM contract_documents WHERE id=$1', [docId]), (error) => error.code === '23503');
  } finally { await db.close(); }
});

it('rolls back all earlier constraint changes if a later schema prerequisite is missing', async () => {
  const db = await fixture(false);
  try {
    await insertDoc(db);
    await insertRef(db, 'legal_case_formal_notices', 'proof_document_id');
    await db.exec('ALTER TABLE legal_notice_agent_jobs DROP CONSTRAINT legal_notice_agent_jobs_proof_document_id_fkey');
    await assert.rejects(db.exec(await read(migration)), /legal_notice_agent_jobs_proof_document_id_fkey/);
    await db.exec('ROLLBACK');
    const actions = (await db.query('SELECT confdeltype FROM pg_constraint WHERE conname=ANY($1::text[])', [refs.map(([, , name]) => name)])).rows;
    assert.equal(actions.length, 10);
    assert.ok(actions.every((row) => row.confdeltype === 'n'));
    assert.equal((await db.query('SELECT proof_document_id FROM legal_case_formal_notices')).rows[0].proof_document_id, docId);
  } finally { await db.close(); }
});
