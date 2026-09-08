import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = new URL('../../supabase/migrations/20260907133016_manual_contract_identity_review.sql', import.meta.url);
const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const company = uuid(1), contract = uuid(2), customer = uuid(3), document = uuid(4), actor = uuid(5), profile = uuid(6);
const approveReason = 'راجعت النسخة الموقعة وتحققت من رقم المستأجر';
let db;
const rpc = async (revision = null, observed = null, reason = null, confirmed = false, companyId = company, documentId = document) =>
  (await db.query('SELECT public.review_contract_document_identity_v1($1,$2,$3,$4,$5,$6,$7) result', [companyId, contract, documentId, revision, observed, reason, confirmed])).rows[0].result;
const failed = async (action, pattern) => {
  await db.exec('SAVEPOINT attempt');
  await assert.rejects(action, pattern);
  await db.exec('ROLLBACK TO SAVEPOINT attempt');
};

describe('manual signed-contract identity review in PostgreSQL', { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,user_id uuid,company_id uuid,role text,is_active boolean);
      CREATE TABLE public.user_roles(user_id uuid,company_id uuid,role text);
      CREATE TABLE public.customers(id uuid PRIMARY KEY,company_id uuid,national_id text,first_name text,last_name text,first_name_ar text,last_name_ar text);
      CREATE TABLE public.contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_number text,vehicle_id uuid,start_date date);
      CREATE TABLE public.contract_documents(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,document_name text,
        document_type text,file_path text,mime_type text,legal_evidence_state text,legal_identity_match_status text,
        legal_identity_checked_at timestamptz,legal_identity_expected_id text,legal_identity_extracted_id text,
        legal_identity_extracted_name text,legal_identity_match_reason text,verified_by uuid,verified_at timestamptz,
        notes text,legal_identity_details jsonb,legal_identity_expires_at timestamptz);
      CREATE TABLE public.audit_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,user_id uuid,action text,
        resource_type text,resource_id uuid,old_values jsonb,new_values jsonb,metadata jsonb);`);
    await db.exec(await readFile(migration, 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/20260907203102_allow_manual_review_of_unverified_quarantined_contracts.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/20260908114123_align_manual_identity_review_reasons.sql',import.meta.url),'utf8'));
  });
  after(async () => { await db.close(); });
  beforeEach(async () => {
    await db.exec('BEGIN');
    await db.query("SELECT set_config('test.actor',$1,true)", [actor]);
    await db.query('INSERT INTO profiles VALUES($1,$2,$3,$4,true)', [profile,actor,company,'manager']);
    await db.query('INSERT INTO customers VALUES($1,$2,$3,$4,$5,$6,$7)', [customer,company,'29900000001','Test','Customer','عميل','تجريبي']);
    await db.query('INSERT INTO contracts VALUES($1,$2,$3,$4,NULL,$5)', [contract,company,customer,'TEST-LEASE','2026-01-01']);
    await db.query(`INSERT INTO contract_documents(id,company_id,contract_id,document_name,document_type,file_path,mime_type,
      legal_evidence_state,legal_identity_match_status,legal_identity_checked_at,legal_identity_expected_id,legal_identity_extracted_id,
      legal_identity_extracted_name,legal_identity_match_reason) VALUES($1,$2,$3,'test.pdf','signed_contract','test/file.pdf','application/pdf',
      'active','mismatch',now(),'29900000001','29900000002','قراءة خاطئة','Old OCR mismatch')`, [document,company,contract]);
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('persists the human observation and reviewer atomically, retaining the original OCR in the review and audit', async () => {
    const preview = await rpc();
    assert.equal(preview.extracted_id,'29900000002');
    const approved = await rpc(preview.revision,'٢٩٩٠٠٠٠٠٠٠١',approveReason,true);
    assert.equal(approved.status,'matched');
    const doc = (await db.query('SELECT * FROM contract_documents')).rows[0];
    assert.equal(doc.verified_by,profile);
    assert.equal(doc.legal_identity_extracted_id,'29900000001');
    assert.equal(doc.legal_identity_extracted_name,'قراءة خاطئة');
    assert.equal(doc.file_path,'test/file.pdf');
    const review = (await db.query('SELECT * FROM legal_evidence_private.identity_reviews')).rows[0];
    assert.equal(review.old_values.legal_identity_extracted_id,'29900000002');
    assert.equal(review.actor_id,actor);
    assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,1);
  });
  it('rejects anonymous, inactive, employee and null-role callers', async () => {
    await db.query("SELECT set_config('test.actor','',true)");
    await failed(() => rpc(),/تسجيل الدخول/);
    await db.query("SELECT set_config('test.actor',$1,true)",[actor]);
    for (const role of ['employee', null]) {
      await db.query('UPDATE profiles SET role=$1',[role]);
      await failed(() => rpc(),/متاحة للإدارة/);
    }
    await db.exec("UPDATE profiles SET role='manager',is_active=false");
    await failed(() => rpc(),/متاحة للإدارة/);
  });
  it('rejects another company or a document outside the selected contract', async () => {
    await failed(() => rpc(null,null,null,false,uuid(10)),/متاحة للإدارة/);
    await failed(() => rpc(null,null,null,false,company,uuid(11)),/المستند غير مرتبط/);
  });
  it('rejects stale customer data and does not save an approval', async () => {
    const preview = await rpc();
    await db.exec("UPDATE customers SET national_id='29900000009'");
    await failed(() => rpc(preview.revision,'29900000001',approveReason,true),/تغيرت بيانات/);
    assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,0);
  });
  it('requires a complete matching number, a reason and the explicit attestation', async () => {
    const {revision} = await rpc();
    for (const input of ['29900000002','12345','abc29900000001']) {
      await failed(() => rpc(revision,input,approveReason,true),/الرقم المقروء/);
    }
    await failed(() => rpc(revision,'29900000001',approveReason,false),/أكد معاينة/);
    await failed(() => rpc(revision,'29900000001','قصير',true),/أكد معاينة/);
  });
  it('does not accept quarantined evidence or silently choose between two approved copies', async () => {
    await db.exec("UPDATE contract_documents SET legal_evidence_state='quarantined'");
    await failed(() => rpc(),/نسخة عقد موقعة/);
    await db.exec("UPDATE contract_documents SET legal_evidence_state='active'");
    const {revision} = await rpc();
    await db.query(`INSERT INTO contract_documents(id,company_id,contract_id,document_type,legal_evidence_state,legal_identity_match_status)
      VALUES($1,$2,$3,'signed_contract','active','matched')`,[uuid(99),company,contract]);
    await failed(() => rpc(revision,'29900000001',approveReason,true),/نسخة موقعة أخرى/);
  });
  it('replays the same save without duplicate approvals or audit events', async () => {
    const {revision} = await rpc();
    const first = await rpc(revision,'29900000001',approveReason,true);
    const second = await rpc(revision,'29900000001',approveReason,true);
    assert.equal(second.review_id,first.review_id);
    assert.equal(second.replayed,true);
    assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,1);
  });
  it('protects the approved identity from a late OCR result while allowing unrelated document notes', async () => {
    const {revision} = await rpc();
    await rpc(revision,'29900000001',approveReason,true);
    await failed(() => db.exec("UPDATE contract_documents SET legal_identity_match_status='mismatch',legal_identity_extracted_id='29900000002'"),/MANUAL_IDENTITY_REVIEW_PROTECTED/);
    await db.exec("UPDATE contract_documents SET notes='updated note'");
    assert.equal((await db.query('SELECT legal_identity_match_status FROM contract_documents')).rows[0].legal_identity_match_status,'matched');
  });
  it('allows an authorized session through the RPC without granting access to private review rows', async () => {
    await db.exec('SET LOCAL ROLE authenticated');
    const {revision} = await rpc();
    const result = await rpc(revision,'29900000001',approveReason,true);
    assert.equal(result.status,'matched');
    await failed(() => db.exec('SELECT * FROM legal_evidence_private.identity_reviews'),/permission denied/);
    await db.exec('RESET ROLE');
  });
  it('lets an authorized reviewer inspect unreadable quarantined evidence without approving it during preview', async () => {
    await db.exec(`UPDATE contract_documents SET legal_evidence_state='quarantined',legal_identity_match_status='unverified',
      legal_identity_extracted_id=NULL,legal_identity_details='{"reasonCode":"insufficient_identity_evidence"}',legal_identity_expires_at=now()`);
    const {revision}=await rpc();
    assert.equal((await db.query('SELECT legal_evidence_state FROM contract_documents')).rows[0].legal_evidence_state,'quarantined');
    await failed(() => rpc(revision,'29900000002',approveReason,true),/الرقم المقروء/);
    const result=await rpc(revision,'29900000001',approveReason,true);
    assert.equal(result.status,'matched');
    const doc=(await db.query('SELECT * FROM contract_documents')).rows[0];
    assert.equal(doc.legal_evidence_state,'active');assert.equal(doc.legal_identity_expires_at,null);
    const review=(await db.query('SELECT * FROM legal_evidence_private.identity_reviews')).rows[0];
    assert.equal(review.old_values.legal_evidence_state,'quarantined');
    assert.equal((await db.query('SELECT new_values FROM audit_logs')).rows[0].new_values.legal_evidence_state,'active');
    assert.equal((await rpc(revision,'29900000001',approveReason,true)).replayed,true);
    // A newer signed copy must still be able to supersede this reviewed copy.
    await db.exec("UPDATE contract_documents SET legal_evidence_state='superseded'");
  });
  it('does not admit quarantine for mismatches, missing reasons or replaced copies', async () => {
    await db.exec(`UPDATE contract_documents SET legal_evidence_state='quarantined',legal_identity_match_status='unverified'`);
    await failed(() => rpc(),/نسخة عقد موقعة/);
    await db.exec(`UPDATE contract_documents SET legal_identity_details='{"reasonCode":"identity_conflict"}'`);
    await failed(() => rpc(),/نسخة عقد موقعة/);
    await db.exec(`UPDATE contract_documents SET legal_identity_details='{"reasonCode":"ambiguous_evidence"}'`);
    await failed(() => rpc(),/نسخة عقد موقعة/);
    await db.exec(`UPDATE contract_documents SET legal_identity_details='{"reasonCode":"insufficient_identity_evidence"}',legal_identity_match_status='mismatch'`);
    await failed(() => rpc(),/نسخة عقد موقعة/);
    await db.exec(`UPDATE contract_documents SET legal_identity_match_status='unverified',legal_evidence_state='superseded'`);
    await failed(() => rpc(),/نسخة عقد موقعة/);
  });
  for (const reasonCode of ['tenant_name_conflict','low_ocr_confidence','incomplete_scan']) {
    it(`allows human review for ${reasonCode} while preserving approval requirements`, async () => {
      await db.query(`UPDATE contract_documents SET legal_evidence_state='quarantined',legal_identity_match_status='unverified',
        legal_identity_extracted_id=NULL,legal_identity_details=$1::jsonb`,[JSON.stringify({reasonCode})]);
      const {revision}=await rpc();
      assert.equal((await db.query('SELECT legal_evidence_state FROM contract_documents')).rows[0].legal_evidence_state,'quarantined');
      assert.equal((await db.query('SELECT count(*)::int n FROM legal_evidence_private.identity_reviews')).rows[0].n,0);
      await failed(() => rpc(revision,'29900000002',approveReason,true),/الرقم المقروء/);
      await failed(() => rpc(revision,'29900000001',approveReason,false),/أكد معاينة/);
      const result=await rpc(revision,'29900000001',approveReason,true);
      assert.equal(result.status,'matched');
      assert.equal((await db.query('SELECT legal_evidence_state FROM contract_documents')).rows[0].legal_evidence_state,'active');
      assert.equal((await db.query('SELECT old_values FROM legal_evidence_private.identity_reviews')).rows[0].old_values.legal_identity_details.reasonCode,reasonCode);
    });
  }
  it('restores the old reason policy on rollback without undoing a saved human review', async () => {
    await db.exec(`UPDATE contract_documents SET legal_evidence_state='quarantined',legal_identity_match_status='unverified',
      legal_identity_details='{"reasonCode":"tenant_name_conflict"}'`);
    const {revision}=await rpc(); await rpc(revision,'29900000001',approveReason,true);
    const rollback=await readFile(new URL('../../supabase/rollbacks/20260908114123_align_manual_identity_review_reasons.rollback.sql',import.meta.url),'utf8');
    await db.exec(rollback.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
    assert.equal((await db.query('SELECT legal_identity_match_status FROM contract_documents')).rows[0].legal_identity_match_status,'matched');
    assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,1);
    await db.query(`INSERT INTO contract_documents(id,company_id,contract_id,document_type,file_path,legal_evidence_state,legal_identity_match_status,legal_identity_details)
      VALUES($1,$2,$3,'signed_contract','other.pdf','quarantined','unverified','{"reasonCode":"tenant_name_conflict"}')`,[uuid(99),company,contract]);
    await failed(() => rpc(null,null,null,false,company,uuid(99)),/نسخة عقد موقعة/);
  });
  it('rolls back the expanded eligibility without deleting already reviewed evidence', async () => {
    const {revision}=await rpc();await rpc(revision,'29900000001',approveReason,true);
    // Strip the transaction wrapper because this test already owns a transaction.
    const currentRollback=await readFile(new URL('../../supabase/rollbacks/20260908114123_align_manual_identity_review_reasons.rollback.sql',import.meta.url),'utf8');
    await db.exec(currentRollback.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
    const rollback=(await readFile(new URL('../../supabase/rollbacks/20260907203102_allow_manual_review_of_unverified_quarantined_contracts.rollback.sql',import.meta.url),'utf8'))
      .replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
    await db.exec(rollback);
    assert.equal((await db.query('SELECT legal_identity_match_status FROM contract_documents')).rows[0].legal_identity_match_status,'matched');
    assert.equal((await db.query('SELECT count(*)::int n FROM legal_evidence_private.identity_reviews')).rows[0].n,1);
  });
});
