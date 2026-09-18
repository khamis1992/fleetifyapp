import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = new URL('../../supabase/migrations/20260907193009_contract_document_orientation_revisions.sql', import.meta.url);
const rollback = new URL('../../supabase/rollbacks/20260907193009_contract_document_orientation_revisions.rollback.sql', import.meta.url);
const uuid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const company=uuid(1),contract=uuid(2),document=uuid(3),actor=uuid(4),request=uuid(5);
const original='original.pdf', path=`${contract}/orientation/${document}/${request}/corrected.pdf`;
let db;
const call = async (revision=null, requestId=null, newPath=null, rotations=null, companyId=company) =>
  (await db.query('SELECT process_contract_document_orientation_v1($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) result',
    [companyId,contract,document,actor,revision,requestId,newPath,rotations,newPath?'a'.repeat(64):null,newPath?'b'.repeat(64):null,newPath?200:null])).rows[0].result;
const failed = async (action, pattern) => {
  await db.exec('SAVEPOINT attempt'); await assert.rejects(action,pattern); await db.exec('ROLLBACK TO SAVEPOINT attempt');
};
describe('saved document orientation transaction', { concurrency:false }, () => {
  before(async () => {
    db=new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${actor}'::uuid $$;
      CREATE FUNCTION public.get_user_company(uuid) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${company}'::uuid $$;
      CREATE FUNCTION public.normalize_legal_party_name_v1(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce($1,'') $$;
      CREATE TABLE profiles(id uuid,user_id uuid,company_id uuid,is_active boolean,role text);
      CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid);
      CREATE TABLE customers(id uuid,company_id uuid,national_id text,first_name text,last_name text,first_name_ar text,last_name_ar text,company_name text,company_name_ar text);
      CREATE TABLE contract_documents(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,document_name text,
        document_type text,file_path text,file_size bigint,mime_type text,legal_evidence_state text,updated_at timestamptz,
        legal_identity_match_status text,legal_identity_checked_at timestamptz,legal_identity_expected_name text,
        legal_identity_extracted_name text,legal_identity_expected_id text,legal_identity_extracted_id text);
      CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,filing_date date,case_reference text,workflow_stage text);
      CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,status text,error_code text,result jsonb);
      CREATE TABLE lawsuit_preparations(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,source_document_id uuid,status text,submitted_at timestamptz,
        registered_at timestamptz,taqadi_case_number text,taqadi_reference_number text,contract_copy_url text,updated_at timestamptz);
      CREATE TABLE audit_logs(id uuid DEFAULT gen_random_uuid(),company_id uuid,user_id uuid,action text,resource_type text,resource_id uuid,old_values jsonb,new_values jsonb,metadata jsonb);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY test_storage_access ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
      GRANT USAGE ON SCHEMA auth,public,storage TO authenticated,service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO service_role;
      GRANT SELECT,UPDATE,DELETE ON contract_documents,storage.objects TO authenticated;`);
    const old = await readFile(rollback,'utf8');
    await db.exec(old.slice(old.indexOf('CREATE OR REPLACE FUNCTION')));
    await db.exec(`CREATE TRIGGER signed_immutable BEFORE UPDATE OF file_path ON contract_documents FOR EACH ROW EXECUTE FUNCTION guard_signed_contract_evidence_integrity_v1()`);
    await db.exec(await readFile(migration,'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/20260907195142_allow_orientation_review_for_quarantined_documents.sql',import.meta.url),'utf8'));
    await db.exec(`ALTER TABLE contract_documents ADD COLUMN superseded_by_document_id uuid, ADD COLUMN created_at timestamptz DEFAULT now();
      ALTER TABLE storage.objects ADD COLUMN updated_at timestamptz DEFAULT now();
      CREATE TABLE agent_safety_policies(agent_id text PRIMARY KEY,display_name text,execution_mode text,risk_level text,conflict_group text,
        max_runtime_seconds int,minimum_confidence numeric,evidence_policy jsonb,max_mutations_per_run int,
        execution_ledger_enabled boolean,requires_before_after boolean,requires_postcondition boolean,data_classification text,
        enabled boolean DEFAULT true,updated_at timestamptz);
      CREATE TABLE agent_invocation_leases(company_id uuid,agent_id text,request_id text,expires_at timestamptz);
      CREATE TABLE agent_execution_runs(company_id uuid,agent_id text,request_id text,status text,mutation_count int DEFAULT 0);
      CREATE TABLE system_agent_controls(company_id uuid,enabled boolean,paused boolean,kill_switch boolean,
        paused_at timestamptz,pause_reason text);
      CREATE FUNCTION record_agent_mutation_v1(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,boolean) RETURNS jsonb
        LANGUAGE plpgsql AS $$ BEGIN
          IF EXISTS(SELECT 1 FROM public.agent_execution_runs WHERE request_id=$3 AND mutation_count>=1) THEN RETURN '{"blocked":true}'; END IF;
          UPDATE public.agent_execution_runs SET mutation_count=mutation_count+1 WHERE request_id=$3;
          RETURN '{"recorded":true}'; END; $$;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
    await db.exec(await readFile(new URL('../../supabase/migrations/20260907202529_automatic_contract_document_orientation.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/20260908042549_enable_daily_orientation_during_approved_pause.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/20260908043146_restrict_orientation_scan_to_linked_contracts.sql',import.meta.url),'utf8'));
  });
  after(async()=>{await db.close();});
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await db.query("INSERT INTO profiles VALUES($1,$2,$3,true,'manager')",[uuid(10),actor,company]);
    await db.query('INSERT INTO contracts VALUES($1,$2,NULL)',[contract,company]);
    await db.query(`INSERT INTO contract_documents(id,company_id,contract_id,document_name,document_type,file_path,file_size,mime_type,
      legal_evidence_state,updated_at,legal_identity_match_status) VALUES($1,$2,$3,'original.pdf','signed_contract',$4,100,'application/pdf','active',now(),'matched')`,[document,company,contract,original]);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('contract-documents',$1),('contract-documents',$2)",[original,path]);
    await db.exec('SET LOCAL ROLE service_role');
  });
  afterEach(async()=>{await db.exec('ROLLBACK');});
  it('preserves identity and original, updates the same document and audits atomically',async()=>{
    const preview=await call();
    const saved=await call(preview.revision,request,path,[180]);
    assert.equal(saved.saved,true);
    const row=(await db.query('SELECT * FROM contract_documents')).rows[0];
    assert.equal(row.id,document); assert.equal(row.file_path,path); assert.equal(row.legal_identity_match_status,'matched');
    const history=(await db.query('SELECT * FROM contract_document_orientation_revisions')).rows[0];
    assert.equal(history.previous_file_path,original); assert.equal(history.previous_document.file_size,100);
    assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,1);
    assert.equal((await db.query('SELECT count(*)::int n FROM storage.objects')).rows[0].n,2);
  });
  it('replays the same request once and rejects changed request parameters',async()=>{
    const preview=await call(); await call(preview.revision,request,path,[90]);
    assert.equal((await call(preview.revision,request,path,[90])).replayed,true);
    await failed(()=>call(preview.revision,request,path,[180]),/عملية أخرى/);
    assert.equal((await db.query('SELECT count(*)::int n FROM contract_document_orientation_revisions')).rows[0].n,1);
  });
  it('corrects quarantined files without changing identity or evidence status',async()=>{
    await db.exec("UPDATE contract_documents SET legal_evidence_state='quarantined',legal_identity_match_status='unverified'");
    const preview=await call(); await call(preview.revision,request,path,[180]);
    const row=(await db.query('SELECT * FROM contract_documents')).rows[0];
    assert.equal(row.legal_evidence_state,'quarantined'); assert.equal(row.legal_identity_match_status,'unverified');
    assert.equal(row.file_path,path);
  });
  it('rejects stale metadata and rolls back without changing the current file',async()=>{
    const preview=await call(); await db.exec("UPDATE contract_documents SET document_name='new name'");
    await failed(()=>call(preview.revision,request,path,[180]),/تغير المستند/);
    assert.equal((await db.query('SELECT file_path FROM contract_documents')).rows[0].file_path,original);
  });
  it('rejects another company, inactive profile and unprivileged role',async()=>{
    await failed(()=>call(null,null,null,null,uuid(9)),/المخولين/);
    await db.exec("UPDATE profiles SET role='employee'"); await failed(()=>call(),/المخولين/);
    await db.exec("UPDATE profiles SET role='manager',is_active=false"); await failed(()=>call(),/المخولين/);
  });
  it('blocks pending automation and filed preparations even if the case is closed',async()=>{
    await db.query("INSERT INTO taqadi_filing_jobs VALUES($1,$2,$3,'queued',NULL,'{}')",[uuid(20),company,contract]);
    assert.equal((await call()).can_save,false);
    await failed(async()=>call((await call()).revision,request,path,[180]),/طلب رفع قائم/);
    await db.exec("UPDATE taqadi_filing_jobs SET status='cancelled'");
    await db.query("INSERT INTO lawsuit_preparations(id,company_id,contract_id,submitted_at,status) VALUES($1,$2,$3,now(),'closed')",[uuid(21),company,contract]);
    assert.equal((await call()).can_save,false);
    await failed(async()=>call((await call()).revision,request,path,[180]),/طلب رفع قائم/);
  });
  it('rejects unchanged/invalid rotations, missing storage and foreign destination',async()=>{
    const preview=await call();
    for(const angles of [[0],[45],[null]]) await failed(()=>call(preview.revision,request,path,angles),/غير صالحة/);
    await failed(()=>call(preview.revision,request,'foreign.pdf',[180]),/غير صالحة/);
    await db.exec('DELETE FROM storage.objects');
    await failed(()=>call(preview.revision,request,path,[180]),/التخزين/);
  });
  it('refreshes unsubmitted preparation URLs for the same evidence',async()=>{
    await db.query("INSERT INTO lawsuit_preparations(id,company_id,contract_id,source_document_id,contract_copy_url,status) VALUES($1,$2,$3,$4,$5,'draft')",
      [uuid(25),company,contract,document,'https://example.supabase.co/storage/v1/object/public/contract-documents/'+original]);
    const preview=await call(); await call(preview.revision,request,path,[180]);
    assert.ok((await db.query('SELECT contract_copy_url FROM lawsuit_preparations')).rows[0].contract_copy_url.endsWith(path));
  });
  it('does not let authenticated clients invoke the RPC, forge provenance, or edit original/corrected storage',async()=>{
    const preview=await call(); await call(preview.revision,request,path,[180]);
    await db.exec('SET LOCAL ROLE authenticated');
    await failed(()=>call(),/permission denied/);
    await failed(()=>db.query('UPDATE contract_document_orientation_revisions SET transaction_id=txid_current()'),/permission denied/);
    await failed(()=>db.query("UPDATE contract_documents SET file_path='forged.pdf'"),/SIGNED_CONTRACT_EVIDENCE_IMMUTABLE/);
    assert.equal((await db.query('DELETE FROM storage.objects RETURNING *')).rows.length,0);
    assert.equal((await db.query("UPDATE storage.objects SET name='overwrite.pdf' RETURNING *")).rows.length,0);
  });
  const machineCompany='24bc0b21-4e2d-4413-9842-31719a3669f4';
  const evidence=[{page:1,first:{rotation:180,confidence:25},second:{rotation:180,confidence:24},verification:{rotation:0,confidence:26},rotation:180,needsReview:false}];
  const startMachine=async()=>{
    await db.query('UPDATE contracts SET company_id=$1;',[machineCompany]);
    await db.query('UPDATE contract_documents SET company_id=$1;',[machineCompany]);
    await db.query("INSERT INTO agent_invocation_leases VALUES($1,'contract-document-orientation-agent',$2,now()+interval '10 minutes')",[machineCompany,request]);
    await db.query("INSERT INTO agent_execution_runs(company_id,agent_id,request_id,status) VALUES($1,'contract-document-orientation-agent',$2,'running')",[machineCompany,request]);
  };
  const autoCall=async(revision=null,newPath=null,pageEvidence=evidence)=> (await db.query(
    'SELECT process_automatic_contract_orientation_v1($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9,$10,$11,$12) result',
    [machineCompany,contract,document,revision,newPath?request:null,newPath,newPath?[180]:null,newPath?'a'.repeat(64):null,
      newPath?'b'.repeat(64):null,newPath?200:null,request,pageEvidence])).rows[0].result;
  it('records an explicit machine actor and verified page evidence without a human profile',async()=>{
    await startMachine(); const preview=await autoCall(); await autoCall(preview.revision,path);
    const history=(await db.query('SELECT * FROM contract_document_orientation_revisions')).rows[0];
    assert.equal(history.actor_id,null); assert.equal(history.agent_id,'contract-document-orientation-agent');
    assert.equal(history.agent_request_id,request); assert.deepEqual(history.orientation_evidence,evidence);
    assert.equal((await autoCall(preview.revision,path)).replayed,true);
  });
  it('fails closed for paused company, disabled policy or expired lease',async()=>{
    await startMachine();
    await db.query('INSERT INTO system_agent_controls(company_id,enabled,paused,kill_switch) VALUES($1,true,true,false)',[machineCompany]);
    await failed(()=>autoCall(),/PAUSED_OR_DISABLED/);
    await db.exec('UPDATE system_agent_controls SET paused=false; UPDATE agent_safety_policies SET enabled=false');
    await failed(()=>autoCall(),/PAUSED_OR_DISABLED/);
    await db.exec("UPDATE agent_safety_policies SET enabled=true; UPDATE agent_invocation_leases SET expires_at=now()-interval '1 second'");
    await failed(()=>autoCall(),/LEASE_REQUIRED/);
  });
  it('rejects insufficient page evidence without changing the original or audit',async()=>{
    await startMachine(); const preview=await autoCall();
    await failed(()=>autoCall(preview.revision,path,[]),/EVIDENCE_REQUIRED/);
    for(const changes of [{first:{rotation:180,confidence:19}},{second:{rotation:90,confidence:25}},{verification:{rotation:180,confidence:25}}]) {
      await failed(()=>autoCall(preview.revision,path,[{...evidence[0],...changes}]),/EVIDENCE_NOT_VERIFIED/);
    }
    assert.equal((await db.query('SELECT file_path FROM contract_documents')).rows[0].file_path,original);
    assert.equal((await db.query('SELECT count(*)::int n FROM contract_document_orientation_revisions')).rows[0].n,0);
  });
  it('allows only the explicitly approved pause and preserves future stops',async()=>{
    await startMachine();
    await db.query("INSERT INTO system_agent_controls VALUES($1,true,true,false,now(),'communication pause')",[machineCompany]);
    await failed(()=>autoCall(),/PAUSED_OR_DISABLED/);
    await db.exec(`UPDATE agent_safety_policies SET evidence_policy=evidence_policy || jsonb_build_object('approved_pause',
      (SELECT jsonb_build_object('company_id',company_id,'paused_at_epoch',extract(epoch FROM paused_at),'pause_reason',pause_reason) FROM system_agent_controls))
      WHERE agent_id='contract-document-orientation-agent'`);
    assert.equal((await autoCall()).can_save,true);
    const row=(await db.query('SELECT * FROM system_agent_controls')).rows[0];
    assert.equal(row.paused,true);
    await db.exec('UPDATE system_agent_controls SET kill_switch=true');
    await failed(()=>autoCall(),/PAUSED_OR_DISABLED/);
    await db.exec('UPDATE system_agent_controls SET kill_switch=false,enabled=false');
    await failed(()=>autoCall(),/PAUSED_OR_DISABLED/);
    await db.exec("UPDATE system_agent_controls SET enabled=true,paused_at=paused_at+interval '1 second'");
    await failed(()=>autoCall(),/PAUSED_OR_DISABLED/);
  });
  it('rejects automatic correction after filing or source revision changes',async()=>{
    await startMachine(); const preview=await autoCall();
    await db.query("INSERT INTO legal_cases VALUES($1,$2,$3,now(),'FILED','closed')",[uuid(40),machineCompany,contract]);
    await failed(()=>autoCall(preview.revision,path),/طلب رفع قائم/);
    await db.exec("DELETE FROM legal_cases; UPDATE contract_documents SET document_name='changed'");
    await failed(()=>autoCall(preview.revision,path),/تغير المستند/);
  });
  it('preserves a human-reviewed corrected version',async()=>{
    const preview=await call(); await call(preview.revision,request,path,[180]);
    await startMachine();
    await db.query('UPDATE contract_document_orientation_revisions SET company_id=$1',[machineCompany]);
    await failed(()=>autoCall(),/HUMAN_REVIEWED_ORIENTATION_PRESERVED/);
  });
  it('does not expose machine RPC or scan candidates to authenticated clients',async()=>{
    await startMachine(); await db.exec('SET LOCAL ROLE authenticated');
    await failed(()=>autoCall(),/permission denied/);
    await failed(()=>db.query('SELECT * FROM contract_orientation_candidates_v1($1)',[machineCompany]),/permission denied/);
  });
  it('reuses unchanged file results and retries changed bytes or due failures',async()=>{
    const candidates=async()=> (await db.query('SELECT * FROM contract_orientation_candidates_v1($1)',[company])).rows;
    const [candidate]=await candidates(); assert.equal(candidate.document_id,document);
    await db.query(`INSERT INTO contract_document_orientation_checks(document_id,company_id,contract_id,file_path,source_fingerprint,detector_version,status)
      VALUES($1,$2,$3,$4,$5,'tesseract-osd-dual-scale-v1','upright')`,[document,company,contract,original,candidate.source_fingerprint]);
    assert.equal((await candidates()).length,0);
    await db.exec("UPDATE storage.objects SET updated_at=now()+interval '1 second'");
    assert.equal((await candidates()).length,1);
    await db.exec('UPDATE storage.objects SET updated_at=now()');
    await db.exec("UPDATE contract_document_orientation_checks SET status='failed',retry_after=now()+interval '1 day'");
    assert.equal((await candidates()).length,0);
    await db.exec("UPDATE contract_document_orientation_checks SET retry_after=now()-interval '1 second'");
    assert.equal((await candidates()).length,1);
  });
  it('excludes legacy uploads without a same-company contract',async()=>{
    const candidates=async()=> (await db.query('SELECT * FROM contract_orientation_candidates_v1($1)',[company])).rows;
    assert.equal((await candidates()).length,1);
    // This fixture permits setting up legacy rows independently of the actual
    // application's contract ownership mutation guards.
    await db.exec('UPDATE contract_documents SET contract_id=NULL');
    assert.equal((await candidates()).length,0);
    await db.query('UPDATE contract_documents SET contract_id=$1',[contract]);
    await db.query('UPDATE contracts SET company_id=$1',[uuid(99)]);
    assert.equal((await candidates()).length,0);
  });
});
