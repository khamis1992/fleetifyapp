import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

// Isolated PostgreSQL integration test. No production connection or customer data.
const db = new PGlite();
const company = '00000000-0000-0000-0000-000000000001';
const customer = '00000000-0000-0000-0000-000000000002';
const contract = '00000000-0000-0000-0000-000000000003';
const document = '00000000-0000-0000-0000-000000000004';
const otherCompany = '00000000-0000-0000-0000-000000000005';
let passed = 0;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.get_user_company(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.company',true)::uuid $$;
    CREATE FUNCTION public.normalize_legal_party_name_v1(text) RETURNS text LANGUAGE sql AS $$ SELECT coalesce($1,'') $$;
    CREATE TABLE public.customers(id uuid PRIMARY KEY, company_id uuid, national_id text, first_name_ar text,last_name_ar text, first_name text,last_name text,company_name_ar text,company_name text);
    CREATE TABLE public.contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid);
    CREATE TABLE public.contract_documents(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,document_type text,file_path text,
      legal_evidence_state text DEFAULT 'active',legal_identity_checked_at timestamptz,legal_identity_expires_at timestamptz,
      legal_identity_match_status text DEFAULT 'pending',legal_identity_expected_name text,legal_identity_extracted_name text,
      legal_identity_expected_id text,legal_identity_extracted_id text,legal_identity_match_reason text);
    INSERT INTO customers(id,company_id,national_id,first_name_ar,last_name_ar) VALUES('${customer}','${company}','29900000001','عبدالله','علي أحمد');
    INSERT INTO contracts VALUES('${contract}','${company}','${customer}');
    INSERT INTO contract_documents(id,company_id,contract_id,document_type,file_path) VALUES('${document}','${company}','${contract}','signed_contract','test/contract.pdf');
  `);
  const migration = readFileSync(new URL('../../supabase/migrations/20260907132349_contract_identity_evidence_audit.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(`CREATE TRIGGER guard_identity BEFORE INSERT OR UPDATE ON contract_documents FOR EACH ROW EXECUTE FUNCTION guard_signed_contract_evidence_integrity_v1();`);
  const revision = async () => (await db.query('SELECT contract_identity_revision_v2($1,$2) AS revision', [company,document])).rows[0].revision;
  const assessment = { status: 'matched', expectedName: 'عبدالله علي أحمد', extractedName: 'عبد الله علي أحمد', expectedId: '29900000001', extractedId: '29900000001', reason: 'complete exact QID', reasonCode: 'exact_identity_number', engineVersion: '2026-09-07.2', details: { scan: { complete: true } } };
  const record = (token, data = assessment, scope = company) => db.query('SELECT record_contract_identity_assessment_v2($1,$2,$3,$4::jsonb)', [scope,document,token,JSON.stringify(data)]);
  const token = await revision();
  await record(token);
  assert.equal((await db.query('SELECT legal_identity_match_status FROM contract_documents')).rows[0].legal_identity_match_status, 'matched');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM contract_identity_assessments')).rows[0].count,1); passed++;
  await assert.rejects(record(token), /IDENTITY_CONTEXT_CHANGED/); passed++;
  await assert.rejects(record(await revision(), { ...assessment, extractedId: '29900000002' }), /IDENTITY_MATCH_REQUIRES_COMPLETE_CUSTOMER_ID/);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM contract_identity_assessments')).rows[0].count,1); passed++;
  await assert.rejects(record(await revision(), assessment, otherCompany), /IDENTITY_DOCUMENT_NOT_FOUND/); passed++;
  const beforeCustomerChange = await revision();
  await db.exec(`UPDATE customers SET national_id='29900000003' WHERE id='${customer}'`);
  assert.equal((await db.query('SELECT legal_identity_match_status FROM contract_documents')).rows[0].legal_identity_match_status, 'unverified');
  await assert.rejects(record(beforeCustomerChange), /IDENTITY_CONTEXT_CHANGED/); passed++;
  await db.exec(`UPDATE customers SET national_id='٢٩٩٠٠٠٠٠٠٠١' WHERE id='${customer}'`);
  await record(await revision()); passed++;
  await db.exec(`SET ROLE authenticated; SET test.company='${company}';`);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM contract_identity_assessments')).rows[0].count,3);
  await assert.rejects(record('fake'), /permission denied/);
  await assert.rejects(db.exec('DELETE FROM contract_identity_assessments'), /permission denied/); passed++;
  await db.exec(`SET test.company='${otherCompany}';`);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM contract_identity_assessments')).rows[0].count,0); passed++;
  await db.exec('RESET ROLE');
  await db.exec(readFileSync(new URL('../../supabase/rollbacks/20260907132349_contract_identity_evidence_audit.rollback.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query('SELECT count(*)::int AS count FROM contract_identity_assessments')).rows[0].count,3); passed++;
  console.log(`PASS: ${passed} PostgreSQL integration checks (atomic audit, stale decisions, QID conflict, company scope, Unicode, permissions, rollback).`);
} catch (error) {
  console.error(`FAIL after ${passed} checks: ${error.message}\n${error.detail || ''}\n${error.where || ''}`);
  process.exitCode = 1;
} finally { await db.close(); }
