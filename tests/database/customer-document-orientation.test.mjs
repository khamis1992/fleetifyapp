import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration=new URL('../../supabase/migrations/20260908045230_customer_document_manual_orientation.sql',import.meta.url);
const rollback=new URL('../../supabase/rollbacks/20260908045230_customer_document_manual_orientation.rollback.sql',import.meta.url);
const uuid=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const company=uuid(1),contract=uuid(2),doc=uuid(3),actor=uuid(4),request=uuid(5),customer=uuid(6),second=uuid(7);
const original='customer-documents/'+customer+'/original.pdf';
const path='customer-documents/'+customer+'/orientation/'+doc+'/'+request+'/corrected.pdf';
let db;
const call=async (revision=null,requestId=null,newPath=null,rotations=null,contractId=contract,companyId=company)=>
  (await db.query('SELECT process_customer_document_orientation_v1($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) result',
    [companyId,contractId,doc,actor,revision,requestId,newPath,rotations,newPath?'a'.repeat(64):null,newPath?'b'.repeat(64):null,newPath?200:null])).rows[0].result;
const failed=async(action,pattern)=>{
  await db.exec('SAVEPOINT attempt');await assert.rejects(action,pattern);await db.exec('ROLLBACK TO SAVEPOINT attempt');
};
describe('customer document manual orientation',{concurrency:false},()=>{
  before(async()=>{
    db=new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA document_orientation_private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${actor}'::uuid $$;
      CREATE FUNCTION public.get_user_company(uuid) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${company}'::uuid $$;
      CREATE TABLE profiles(user_id uuid,company_id uuid,is_active boolean,role text);
      CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
      CREATE TABLE customers(id uuid PRIMARY KEY,company_id uuid);
      CREATE TABLE contracts(id uuid PRIMARY KEY,company_id uuid,customer_id uuid);
      CREATE TABLE customer_documents(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,
        document_name text,document_type text,file_path text,file_size bigint,mime_type text,
        notes text,uploaded_at timestamptz,updated_at timestamptz);
      CREATE TABLE legal_cases(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,client_id uuid,
        filing_date date,case_reference text,workflow_stage text);
      CREATE TABLE taqadi_filing_jobs(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,status text,error_code text,result jsonb);
      CREATE TABLE lawsuit_preparations(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,customer_id uuid,
        submitted_at timestamptz,registered_at timestamptz,status text,taqadi_case_number text,taqadi_reference_number text);
      CREATE TABLE audit_logs(company_id uuid,user_id uuid,action text,resource_type text,resource_id uuid,old_values jsonb,new_values jsonb,metadata jsonb);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY test_storage_access ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
      GRANT USAGE ON SCHEMA auth,public,storage,document_orientation_private TO authenticated,service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO service_role;
      GRANT SELECT,UPDATE,DELETE ON storage.objects TO authenticated;`);
    await db.exec(await readFile(migration,'utf8'));
  });
  after(async()=>db.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await db.query("INSERT INTO profiles VALUES($1,$2,true,'manager')",[actor,company]);
    await db.query('INSERT INTO customers VALUES($1,$2)',[customer,company]);
    await db.query('INSERT INTO contracts VALUES($1,$3,$4),($2,$3,$4)',[contract,second,company,customer]);
    await db.query(`INSERT INTO customer_documents VALUES($1,$2,$3,'identity.pdf','id_card',$4,100,'application/pdf','keep notes',now(),now())`,[doc,company,customer,original]);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('documents',$1),('documents',$2)",[original,path]);
    await db.exec('SET LOCAL ROLE service_role');
  });
  afterEach(async()=>db.exec('ROLLBACK'));
  it('preserves customer metadata, original and stable document ID with shared contract refresh',async()=>{
    const old=(await db.query('SELECT * FROM customer_documents')).rows[0];
    const inspection=await call();
    assert.equal(inspection.source_bucket,'documents');assert.equal(inspection.source_owner_id,customer);
    assert.deepEqual(inspection.affected_contract_ids,[contract,second]);
    const saved=await call(inspection.revision,request,path,[180,0]);
    assert.equal(saved.saved,true);assert.deepEqual(saved.affected_contract_ids,[contract,second]);
    const current=(await db.query('SELECT * FROM customer_documents')).rows[0];
    for(const key of ['id','customer_id','document_name','document_type','notes','uploaded_at']) assert.deepEqual(current[key],old[key]);
    assert.equal(current.file_path,path);
    const history=(await db.query('SELECT * FROM customer_document_orientation_revisions')).rows[0];
    assert.equal(history.previous_file_path,original);assert.equal(history.actor_id,actor);
    assert.equal((await db.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,1);
    assert.equal((await db.query('SELECT count(*)::int n FROM storage.objects')).rows[0].n,2);
  });
  it('rejects a different customer/company and unauthorized roles',async()=>{
    await db.query('UPDATE contracts SET customer_id=$1 WHERE id=$2',[uuid(88),second]);
    await failed(()=>call(null,null,null,null,second),/العميل غير متاح/);
    await failed(()=>call(null,null,null,null,contract,uuid(88)),/المخولين/);
    await db.exec("UPDATE profiles SET role='employee'");await failed(()=>call(),/المخولين/);
  });
  it('rejects a document owned by another customer even inside the same company',async()=>{
    await db.query('UPDATE customer_documents SET customer_id=$1',[uuid(88)]);
    await failed(()=>call(),/غير مرتبط بعميل/);
  });
  it('rejects foreign storage paths and stale metadata',async()=>{
    const preview=await call();
    await db.exec("UPDATE customer_documents SET notes='changed'");
    await failed(()=>call(preview.revision,request,path,[180]),/تغير المستند/);
    await db.exec("UPDATE customer_documents SET file_path='foreign/file.pdf'");
    await failed(()=>call(),/مجلد العميل/);
  });
  it('treats a legacy preparation creation date as preparation and still blocks actual filing',async()=>{
    await db.query("INSERT INTO legal_cases VALUES($1,$2,$3,$4,current_date,NULL,'preparation')",[uuid(20),company,contract,customer]);
    assert.equal((await call()).can_save,true);
    await db.exec("UPDATE legal_cases SET case_reference='filed-reference'");
    assert.equal((await call()).can_save,false);
    await failed(async()=>call((await call()).revision,request,path,[180]),/طلب رفع قائم/);
  });
  it('protects filing jobs and submitted preparations on any other contract of this customer',async()=>{
    await db.query("INSERT INTO taqadi_filing_jobs VALUES($1,$2,$3,'queued',NULL,'{}')",[uuid(20),company,second]);
    assert.equal((await call()).can_save,false);
    await db.exec("UPDATE taqadi_filing_jobs SET status='cancelled'");
    assert.equal((await call()).can_save,true);
    await db.query("INSERT INTO lawsuit_preparations(id,company_id,contract_id,customer_id,submitted_at,status) VALUES($1,$2,$3,$4,now(),'closed')",[uuid(21),company,second,customer]);
    assert.equal((await call()).can_save,false);
  });
  it('replays saves once, rejects altered replay and invalid/missing destinations',async()=>{
    const preview=await call();
    await failed(()=>call(preview.revision,request,'foreign.pdf',[180]),/غير صالحة/);
    await failed(()=>call(preview.revision,request,path,[0]),/غير صالحة/);
    await call(preview.revision,request,path,[180]);
    assert.equal((await call(preview.revision,request,path,[180])).replayed,true);
    await failed(()=>call(preview.revision,request,path,[90]),/عملية أخرى/);
    assert.equal((await db.query('SELECT count(*)::int n FROM customer_document_orientation_revisions')).rows[0].n,1);
  });
  it('does not allow clients to call the privileged RPC or overwrite/delete preserved files',async()=>{
    const preview=await call();await call(preview.revision,request,path,[180]);
    await db.exec('SET LOCAL ROLE authenticated');
    await failed(()=>call(),/permission denied/);
    await failed(()=>db.exec('DELETE FROM customer_document_orientation_revisions'),/permission denied/);
    assert.equal((await db.query('DELETE FROM storage.objects RETURNING *')).rows.length,0);
    assert.equal((await db.query("UPDATE storage.objects SET name='overwrite.pdf' RETURNING *")).rows.length,0);
  });
  it('keeps original history and its protections when rolling back an already used feature',async()=>{
    const preview=await call();await call(preview.revision,request,path,[180]);
    await db.exec('RESET ROLE');await db.exec(await readFile(rollback,'utf8'));
    assert.equal((await db.query('SELECT count(*)::int n FROM customer_document_orientation_revisions')).rows[0].n,1);
    await db.exec('SET LOCAL ROLE authenticated');
    assert.equal((await db.query('DELETE FROM storage.objects RETURNING *')).rows.length,0);
  });
});
