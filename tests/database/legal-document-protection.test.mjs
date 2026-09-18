// Execute actual migration + existing identity/lifecycle functions in PostgreSQL
// 17 (PGlite). This is not a full production-schema or two-session concurrency test.
// node --test tests/database/legal-document-protection.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const migrationPath = '../../supabase/migrations/20260903173353_protect_last_legal_signed_contract.sql';
const rollbackPath = '../../supabase/rollbacks/20260903173353_protect_last_legal_signed_contract.rollback.sql';
const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const company = uuid(1), otherCompany = uuid(2), contract = uuid(10), alias = uuid(11);
let db;

async function fixture() {
  const instance = new PGlite();
  await instance.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid,national_id text,
      first_name_ar text,last_name_ar text,first_name text,last_name text,
      company_name_ar text,company_name text);
    CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid REFERENCES customers,status text);
    CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid REFERENCES contracts,case_status text);
    CREATE TABLE contract_documents(id uuid PRIMARY KEY,company_id uuid NOT NULL,
      contract_id uuid REFERENCES contracts,document_type text,file_path text,
      legal_identity_match_status text DEFAULT 'pending',legal_evidence_state text DEFAULT 'active',
      legal_identity_checked_at timestamptz,legal_identity_expires_at timestamptz,
      legal_identity_expected_name text,legal_identity_extracted_name text,
      legal_identity_expected_id text,legal_identity_extracted_id text,
      legal_identity_match_reason text,ocr_quality_score numeric,ocr_review_reason text,
      superseded_by_document_id uuid,created_at timestamptz DEFAULT now());
    CREATE TABLE contract_document_canonical_links(id uuid PRIMARY KEY,
      company_id uuid,document_id uuid UNIQUE REFERENCES contract_documents ON DELETE CASCADE,
      source_contract_id uuid REFERENCES contracts,canonical_contract_id uuid REFERENCES contracts,link_status text);
  `);
  // Actual deployed binding/identity logic, not a stub that silently blesses files.
  const safety = await read('../../supabase/migrations/20260827204249_agent_safety_kernel.sql');
  const lifecycle = await read('../../supabase/migrations/20260828113000_agent_failure_containment_and_escalation.sql');
  for (const [source, name] of [
    [safety, 'normalize_legal_party_name_v1'],
    [safety, 'guard_signed_contract_evidence_integrity_v1'],
    [lifecycle, 'guard_contract_document_lifecycle_v1'],
  ]) {
    const definition = source.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$function\\$;`))?.[0];
    assert.ok(definition, `Actual function not found: ${name}`);
    await instance.exec(definition);
  }
  await instance.exec(`
    CREATE TRIGGER trg_00_guard_signed_contract_binding_v1 BEFORE INSERT OR UPDATE OF
      company_id,contract_id,file_path,document_type ON contract_documents FOR EACH ROW
      EXECUTE FUNCTION guard_signed_contract_evidence_integrity_v1();
    CREATE TRIGGER trg_01_guard_signed_contract_identity_match_v1 BEFORE INSERT OR UPDATE OF
      legal_identity_match_status,legal_identity_expected_name,legal_identity_extracted_name,
      legal_identity_expected_id,legal_identity_extracted_id,legal_identity_checked_at
      ON contract_documents FOR EACH ROW EXECUTE FUNCTION guard_signed_contract_evidence_integrity_v1();
    CREATE TRIGGER trg_guard_contract_document_lifecycle BEFORE INSERT OR UPDATE OF
      document_type,legal_identity_match_status,legal_identity_expires_at,legal_evidence_state,
      superseded_by_document_id,ocr_quality_score,ocr_review_reason ON contract_documents
      FOR EACH ROW EXECUTE FUNCTION guard_contract_document_lifecycle_v1();
  `);
  await instance.exec(await read(migrationPath));
  return instance;
}

async function insertDocument(id = 101, changes = {}) {
  const record = { id: uuid(id), company_id: company, contract_id: contract,
    document_type: 'signed_contract', file_path: `fixture-${id}.pdf`,
    legal_identity_match_status: 'matched', legal_evidence_state: 'active',
    legal_identity_checked_at: '2026-01-01T00:00:00Z',
    legal_identity_expected_name: 'Test Customer', legal_identity_extracted_name: 'Test Customer',
    ...changes };
  const keys = Object.keys(record);
  await db.query(`INSERT INTO contract_documents(${keys.join(',')}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(record));
}
const remove = (id = 100) => db.query('DELETE FROM contract_documents WHERE id=$1 RETURNING id', [uuid(id)]);
async function rejectsDeletion(id = 100) {
  await db.exec('SAVEPOINT rejected_deletion');
  await assert.rejects(remove(id), (error) => error.code === '23514' && /SIGNED_CONTRACT_REPLACEMENT_REQUIRED/.test(error.message));
  await db.exec('ROLLBACK TO SAVEPOINT rejected_deletion');
  assert.equal((await db.query('SELECT count(*)::int n FROM contract_documents WHERE id=$1', [uuid(id)])).rows[0].n, 1);
}

describe('last legal document protection — actual PostgreSQL functions', { concurrency: false }, () => {
  before(async () => {
    db = await fixture();
    assert.equal(Math.floor(Number((await db.query('show server_version_num')).rows[0].server_version_num) / 10000), 17);
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec('BEGIN');
    await db.query(`INSERT INTO customers(id,company_id,first_name,last_name) VALUES($1,$2,'Test','Customer'),($3,$4,'Other','Customer')`, [uuid(20), company, uuid(21), otherCompany]);
    await db.query(`INSERT INTO contracts VALUES($1,$2,$3,'under_legal_procedure'),($4,$2,$3,'active'),($5,$6,$7,'active')`, [contract, company, uuid(20), alias, uuid(12), otherCompany, uuid(21)]);
    await insertDocument(100);
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('rejects deletion of the only signed evidence', async () => { await rejectsDeletion(); });
  for (const status of ['pending', 'unverified', 'mismatch', 'failed']) {
    it(`does not accept ${status} as a replacement`, async () => {
      await insertDocument(101, { legal_identity_match_status: status });
      await rejectsDeletion();
    });
  }
  it('does not accept quarantined evidence', async () => {
    await insertDocument(101, { legal_evidence_state: 'quarantined', ocr_review_reason: 'Needs review' });
    await rejectsDeletion();
  });
  it('does not accept a superseded row pointing at the document being deleted', async () => {
    await insertDocument(101, { legal_evidence_state: 'superseded', superseded_by_document_id: uuid(100) });
    await rejectsDeletion();
  });
  it('does not accept an unsigned PDF', async () => {
    await insertDocument(101, { document_type: 'other' });
    await rejectsDeletion();
  });
  it('does not accept another contract or company', async () => {
    await insertDocument(101, { contract_id: alias });
    await insertDocument(102, { contract_id: uuid(12), company_id: otherCompany,
      legal_identity_expected_name: 'Other Customer', legal_identity_extracted_name: 'Other Customer' });
    await rejectsDeletion();
  });
  it('requires independent bytes, not two rows for the same file', async () => {
    await insertDocument(101, { file_path: 'fixture-100.pdf' });
    await rejectsDeletion();
  });
  for (const type of ['signed_contract', 'signed_contract_image']) {
    it(`allows a verified active ${type} replacement but preserves the new last row`, async () => {
      await insertDocument(101, { document_type: type });
      assert.equal((await remove()).rows.length, 1);
      await rejectsDeletion(101);
    });
  }
  for (const [name, assignments] of [
    ['missing path', "file_path=' '"],
    ['missing check timestamp', 'legal_identity_checked_at=NULL'],
    ['expired validation', "legal_identity_expires_at='2000-01-01'"],
  ]) {
    it(`rejects legacy matched metadata with ${name}`, async () => {
      await insertDocument(101);
      // Emulate inconsistent historical metadata, without claiming the current
      // binding/lifecycle triggers permit creating it through the regular UI.
      await db.exec(`ALTER TABLE contract_documents DISABLE TRIGGER USER;
        UPDATE contract_documents SET ${assignments} WHERE id='${uuid(101)}';
        ALTER TABLE contract_documents ENABLE TRIGGER USER;`);
      await rejectsDeletion();
    });
  }
  for (const status of ['pending', 'active', 'preparing', 'awaiting_acceptance', 'unknown_future_stage', null]) {
    it(`protects a cancelled collection contract with case status ${status}`, async () => {
      await db.query("UPDATE contracts SET status='cancelled' WHERE id=$1", [contract]);
      await db.query('INSERT INTO legal_cases VALUES($1,$2,$3,$4)', [uuid(200), company, contract, status]);
      await rejectsDeletion();
    });
  }
  it('allows a nonlegal deletion with terminal cases only', async () => {
    await db.query("UPDATE contracts SET status='active' WHERE id=$1", [contract]);
    await db.query("INSERT INTO legal_cases VALUES($1,$2,$3,'closed'),($4,$2,$3,'cancelled')", [uuid(200), company, contract, uuid(201)]);
    assert.equal((await remove()).rows.length, 1);
  });
  it('does not let a terminal case override the contract legal status', async () => {
    await db.query("INSERT INTO legal_cases VALUES($1,$2,$3,'closed')", [uuid(200), company, contract]);
    await rejectsDeletion();
  });
  it('rolls back an entire bulk delete when it would remove the last replacement', async () => {
    await insertDocument(101);
    await db.exec('SAVEPOINT bulk_delete');
    await assert.rejects(db.exec('DELETE FROM contract_documents'), /SIGNED_CONTRACT_REPLACEMENT_REQUIRED/);
    await db.exec('ROLLBACK TO SAVEPOINT bulk_delete');
    assert.equal((await db.query('SELECT count(*)::int n FROM contract_documents')).rows[0].n, 2);
  });
  it('does not block truthful mismatch/quarantine updates to the only signed file', async () => {
    await db.query(`UPDATE contract_documents SET legal_identity_match_status='mismatch',
      legal_evidence_state='quarantined',ocr_review_reason='Wrong tenant discovered' WHERE id=$1`, [uuid(100)]);
    const row = (await db.query('SELECT legal_identity_match_status status FROM contract_documents WHERE id=$1', [uuid(100)])).rows[0];
    assert.equal(row.status, 'mismatch');
    await rejectsDeletion();
  });
  for (const assignment of ["file_path='different.pdf'", "document_type='other'", `contract_id='${alias}'`]) {
    it(`retains the existing immutable-binding guard for ${assignment}`, async () => {
      await insertDocument(101);
      await assert.rejects(db.exec(`UPDATE contract_documents SET ${assignment} WHERE id='${uuid(100)}'`), /SIGNED_CONTRACT_EVIDENCE_IMMUTABLE/);
    });
  }
  it('protects a canonical legal contract when its document is on a nonlegal alias', async () => {
    await insertDocument(101, { contract_id: alias });
    await db.query("INSERT INTO contract_document_canonical_links VALUES($1,$2,$3,$4,$5,'confirmed')", [uuid(300), company, uuid(101), alias, contract]);
    await remove(100); // the confirmed alias can be the verified replacement
    await rejectsDeletion(101); // source status active must not bypass target protection
  });
  for (const linkStatus of ['proposed', 'rejected']) {
    it(`does not accept a ${linkStatus} canonical replacement`, async () => {
      await insertDocument(101, { contract_id: alias });
      await db.query('INSERT INTO contract_document_canonical_links VALUES($1,$2,$3,$4,$5,$6)', [uuid(300), company, uuid(101), alias, contract, linkStatus]);
      await rejectsDeletion();
    });
  }
  it('rejects canonical links whose company or source binding disagrees with the document', async () => {
    await insertDocument(101, { contract_id: alias });
    await db.query("INSERT INTO contract_document_canonical_links VALUES($1,$2,$3,$4,$5,'confirmed')", [uuid(300), otherCompany, uuid(101), alias, contract]);
    await rejectsDeletion();
    await db.query('UPDATE contract_document_canonical_links SET company_id=$1,source_contract_id=$2 WHERE id=$3', [company, contract, uuid(300)]);
    await rejectsDeletion();
  });
  it('does not let a case from a different company freeze this contract', async () => {
    await db.query("UPDATE contracts SET status='active' WHERE id=$1", [contract]);
    await db.query("INSERT INTO legal_cases VALUES($1,$2,$3,'active')", [uuid(200), otherCompany, contract]);
    assert.equal((await remove()).rows.length, 1);
  });
  it('retains caller row authorization even though evidence lookups use SECURITY DEFINER', async () => {
    await db.exec(`ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
      GRANT SELECT,DELETE ON contract_documents TO authenticated;
      CREATE POLICY fixture_read ON contract_documents FOR SELECT TO authenticated
        USING(company_id=current_setting('fixture.company')::uuid);
      CREATE POLICY fixture_delete ON contract_documents FOR DELETE TO authenticated
        USING(company_id=current_setting('fixture.company')::uuid);`);
    await db.query("SELECT set_config('fixture.company',$1,true)", [otherCompany]);
    await db.exec('SET LOCAL ROLE authenticated');
    assert.equal((await remove()).rows.length, 0);
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int n FROM contract_documents')).rows[0].n, 1);
  });
  it('does not expose the security-definer trigger as a client RPC', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await db.query("SELECT has_function_privilege($1,'public.protect_last_legal_signed_contract_v1()','EXECUTE') allowed", [role])).rows[0].allowed, false);
    }
  });
});

it('rollback removes only the new guard and reapplication restores it', async () => {
  const isolated = await fixture();
  try {
    await isolated.query("INSERT INTO contract_documents(id,company_id,document_type) VALUES($1,$2,'other')", [uuid(900), company]);
    await isolated.exec(await read(rollbackPath));
    assert.equal((await isolated.query('SELECT id FROM contract_documents')).rows[0].id, uuid(900));
    assert.equal((await isolated.query("SELECT to_regprocedure('public.protect_last_legal_signed_contract_v1()') f")).rows[0].f, null);
    assert.equal((await isolated.query("SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='public.contract_documents'::regclass AND NOT tgisinternal")).rows[0].n, 3);
    await isolated.exec(await read(migrationPath));
    assert.notEqual((await isolated.query("SELECT to_regprocedure('public.protect_last_legal_signed_contract_v1()') f")).rows[0].f, null);
    assert.equal((await isolated.query('SELECT id FROM contract_documents')).rows[0].id, uuid(900));
  } finally { await isolated.close(); }
});
