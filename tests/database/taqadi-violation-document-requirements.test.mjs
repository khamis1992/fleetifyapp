import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const migration = '../../supabase/migrations/20260907151151_align_taqadi_violation_document_requirements.sql';
const rollback = '../../supabase/rollbacks/20260907151151_align_taqadi_violation_document_requirements.rollback.sql';
const baseKeys = ['memo', 'claims', 'docsList', 'contract', 'commercialRegister', 'ibanCertificate', 'representativeId'];
function payload(withViolations = false) {
  const documents = baseKeys.map(key => ({ key, ready: true, url: `https://example.invalid/${key}.pdf`,
    sourceDocumentId: key === 'contract' ? id(4) : null }));
  if (withViolations) documents.push(
    { key: 'violations', ready: true, htmlContent: '<p>Traffic claim</p>' },
    { key: 'violationsEvidence', ready: true, url: 'https://example.invalid/proof.pdf', sourceDocumentId: id(5) },
  );
  return { case: { title: 'Claim', facts: 'Facts', claims: 'Requests', amount: withViolations ? 27200 : 2500 },
    defendant: { fullName: 'Test Defendant', idNumber: '12345678901', nationality: 'Qatar' }, documents };
}
const validate = async (p = payload(), company = id(1)) => (await db.query(
  'SELECT public.validate_taqadi_filing_payload_v1($1,$2,$3) AS result', [company, id(3), p],
)).rows[0].result;
const proof = () => db.query("INSERT INTO contract_documents VALUES ($1,$2,$3,'violations_proof','proof.pdf','active',null)", [id(5), id(1), id(3)]);

before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql SET search_path = public AS $$SELECT '${id(2)}'::uuid$$;
    CREATE TABLE user_roles(user_id uuid,role text);
    CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean);
    CREATE TABLE contract_documents(id uuid,company_id uuid,contract_id uuid,document_type text,file_path text,legal_evidence_state text,legal_identity_match_status text);
    CREATE TABLE penalties(company_id uuid,contract_id uuid,status text,payment_status text,amount numeric);
    CREATE TABLE claim_scope(company_id uuid,contract_id uuid,scope text);
    CREATE FUNCTION can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql SET search_path = public AS $$
      SELECT EXISTS(SELECT 1 FROM profiles WHERE company_id=$1 AND user_id=auth.uid() AND is_active)$$;
    CREATE FUNCTION get_direct_signed_contract_evidence_state_v1(uuid,uuid) RETURNS jsonb LANGUAGE sql SET search_path = public AS $$
      SELECT jsonb_build_object('ready',EXISTS(SELECT 1 FROM contract_documents WHERE company_id=$1 AND contract_id=$2
        AND document_type='signed_contract' AND legal_identity_match_status='matched' AND legal_evidence_state='active'))$$;
    -- Model the canonical calculator boundary from persisted rows, not the request.
    -- The package validator and signed-contract wrapper below are production SQL.
    CREATE FUNCTION calculate_legal_claim_statement_v4(uuid,uuid,date,text) RETURNS jsonb LANGUAGE sql SET search_path = public AS $$
      WITH proof AS (SELECT EXISTS(SELECT 1 FROM contract_documents WHERE company_id=$1 AND contract_id=$2
        AND document_type='violations_proof' AND nullif(btrim(file_path),'') IS NOT NULL) AS ready),
      traffic AS (SELECT count(*) AS count,coalesce(sum(amount),0) AS amount FROM penalties
        WHERE company_id=$1 AND contract_id=$2 AND lower(coalesce(payment_status,''))<>'paid'
        AND lower(coalesce(status,'')) NOT IN ('cancelled','canceled','void','voided','reversed','deleted'))
      SELECT jsonb_build_object('claim_scope',coalesce($4,(SELECT scope FROM claim_scope WHERE company_id=$1 AND contract_id=$2),'full_outstanding'),
        'violation_count',traffic.count,'violations_proof_ready',proof.ready,
        'components',jsonb_build_object('traffic_violations',CASE WHEN proof.ready THEN traffic.amount ELSE 0 END)) FROM proof,traffic$$;`);
  await db.exec(await read(rollback));
  const containment = await read('../../supabase/migrations/20260828113000_agent_failure_containment_and_escalation.sql');
  const wrapper = containment.match(/CREATE (?:OR REPLACE )?FUNCTION public\.validate_taqadi_filing_payload_v1\([\s\S]*?\$function\$;/)?.[0];
  assert.ok(wrapper, 'production signed-contract wrapper found');
  await db.exec(wrapper);
});
beforeEach(async () => {
  await db.exec(await read(migration));
  await db.exec(`TRUNCATE profiles,user_roles,contract_documents,penalties,claim_scope;
    INSERT INTO profiles VALUES ('${id(2)}','${id(1)}',true);
    INSERT INTO contract_documents VALUES ('${id(4)}','${id(1)}','${id(3)}','signed_contract','signed.pdf','active','matched');
    INSERT INTO penalties SELECT '${id(1)}','${id(3)}','pending','unpaid',CASE WHEN n=49 THEN 700 ELSE 500 END FROM generate_series(1,49) n;`);
});
after(() => db.close());

it('regression: accepts seven rental documents while 49 unsupported penalties remain excluded', async () => {
  const result = await validate();
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
  assert.equal(result.violation_count, 49);
  assert.equal(result.violation_documents_required, false);
  assert.equal((await db.query('SELECT count(*) AS count,sum(amount) AS amount FROM penalties')).rows[0].amount, '24700');
});
it('requires both documents when the server includes evidenced violations, regardless of a client zero', async () => {
  await proof();
  const p = { ...payload(), violationsCount: 0, claimScope: 'rent_only' };
  assert.deepEqual((await validate(p)).missing, ['documents.violations', 'documents.violationsEvidence']);
});
it('accepts a supported traffic claim with a generated statement and its registered proof', async () => {
  await proof();
  assert.equal((await validate(payload(true))).ready, true);
});
it('rejects a claimed traffic document and fabricated proof when the database has no official evidence', async () => {
  assert.deepEqual((await validate(payload(true))).missing, ['documents.violationsEvidence']);
});
it('does not let evidence from another contract or tenant satisfy the requirement', async () => {
  await proof();
  await db.query('UPDATE contract_documents SET contract_id=$1 WHERE id=$2', [id(90), id(5)]);
  assert.equal((await validate(payload(true))).ready, false);
  await db.query('UPDATE contract_documents SET contract_id=$1,company_id=$2 WHERE id=$3', [id(3), id(90), id(5)]);
  assert.equal((await validate(payload(true))).ready, false);
});
it('rejects a mismatched source ID even if other valid proof exists for the contract', async () => {
  await proof();
  const p = payload(true); p.documents.at(-1).sourceDocumentId = id(99);
  assert.deepEqual((await validate(p)).missing, ['documents.violationsEvidence']);
});
it('keeps legacy evidence payloads compatible when registered official proof exists', async () => {
  await proof();
  const p = payload(true); p.documents.at(-1).sourceDocumentId = null;
  assert.equal((await validate(p)).ready, true);
});
it('requires an actual proof URL; HTML, an empty path or an unready document cannot replace it', async () => {
  await proof();
  const p = payload(true); p.documents.at(-1).url = null; p.documents.at(-1).htmlContent = '<p>not proof</p>';
  assert.equal((await validate(p)).ready, false);
  await db.exec("UPDATE contract_documents SET file_path=' ' WHERE document_type='violations_proof'");
  assert.equal((await validate(payload(true))).ready, false);
});
it('does not block rental-only claims for settled, cancelled, voided or zero-value violations', async () => {
  await proof();
  for (const status of ['cancelled','canceled','void','voided','reversed','deleted']) {
    await db.query('UPDATE penalties SET status=$1', [status]);
    assert.equal((await validate()).ready, true);
  }
  await db.exec("UPDATE penalties SET status='pending',payment_status='paid'");
  assert.equal((await validate()).ready, true);
  await db.exec("UPDATE penalties SET payment_status='unpaid',amount=0");
  assert.equal((await validate()).ready, true);
});
it('keeps evidence mandatory for traffic-only cases even before their proof is uploaded', async () => {
  await db.query("INSERT INTO claim_scope VALUES ($1,$2,'traffic_violations_only')", [id(1), id(3)]);
  assert.deepEqual((await validate()).missing, ['documents.violations', 'documents.violationsEvidence']);
});
it('preserves other required documents, signed-contract identity checks and tenant authorization', async () => {
  const p = payload(); p.documents = p.documents.filter(d => d.key !== 'memo');
  assert.ok((await validate(p)).missing.includes('documents.memo'));
  await db.exec("UPDATE contract_documents SET legal_identity_match_status='mismatch' WHERE document_type='signed_contract'");
  assert.equal((await validate()).ready, false);
  await assert.rejects(validate(payload(), id(99)), /COMPANY_SCOPE_DENIED/);
  const acl = (await db.query("SELECT has_function_privilege('anon','public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)','EXECUTE') AS anon")).rows[0];
  assert.equal(acl.anon, false);
});
it('rolls back to the original validation behavior without changing financial records', async () => {
  await db.exec(await read(rollback));
  assert.deepEqual((await validate()).missing, ['documents.violations', 'documents.violationsEvidence']);
  assert.equal((await db.query('SELECT count(*) AS count FROM penalties')).rows[0].count, 49);
});
