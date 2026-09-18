import assert from 'node:assert/strict';
import {before,after,beforeEach,afterEach,it} from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {setupFullMemoDb} from './fixtures/setup-full-memo-db.mjs';
const company='22222222-2222-4222-8222-222222222222',contract='55555555-5555-4555-8555-555555555555',user='33333333-3333-4333-8333-333333333333',other='77777777-7777-4777-8777-777777777777',proof='88888888-8888-4888-8888-888888888888';
let db;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const read=async p=>(await readFile(new URL(p,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const statement=async()=> (await q("select calculate_legal_claim_statement_v4($1,$2,'2026-09-09','full_outstanding','{}') s",[company,contract]))[0].s;
const item=async({disposition='alternative',status='reviewed',kind='rental_opportunity',evidence=proof}={})=> (await q(`insert into legal_case_claim_items(company_id,contract_id,kind,disposition,description,period_from,period_to,requested_amount,avoided_costs,third_party_recovery,evidence_ids,calculation_basis,causation_notes,alternative_to,independence_notes,opportunity_reference,review_status,overlap_group,recovery_reference,opportunity_requested_on,opportunity_probability,alternative_unavailable_reason)
 values($1,$2,$3,$4,'طلب اصطناعي موثق','2026-08-01','2026-08-31',500,50,25,ARRAY[$5::uuid],'صافي العرض بعد المصروفات','تعذر التسليم بسبب احتباس المركبة','rent_due','ضرر مستقل موثق لم يدرج في أي مطالبة أخرى','حجز اصطناعي للاختبار',$6,'منفعة موثقة','مرجع اختباري','2026-07-31','حجز مؤكد','لا مركبة متاحة') returning id`,[company,contract,kind,disposition,evidence,status]))[0].id;
before(async()=>{
 db=new PGlite(); await setupFullMemoDb(db);
 await db.exec(`create table companies(id uuid primary key); alter table legal_cases add primary key(id);
 alter table contract_documents add column legal_identity_match_status text default 'matched';
 create schema contract_finance_private; create table contract_finance_private.no_claim_closures(company_id uuid,contract_id uuid);
 alter table legal_case_litigation_profile add column legal_review_status text default 'draft',add column approved_by uuid,add column approved_at timestamptz,add column approval_source text,add column approval_job_id uuid,add column approval_worker_id text,add column case_id uuid,add unique(company_id,contract_id);
 create function public.invalidate_legal_memo_approval() returns trigger language plpgsql as $$begin
 update public.legal_case_litigation_profile set legal_review_status='draft',approved_by=null,approved_at=null,approval_source=null,approval_job_id=null,approval_worker_id=null where company_id=new.company_id and contract_id=new.contract_id;return new;end $$;`);
 await db.exec(await read('../../supabase/migrations/20260909133621_legal_claim_register.sql'));
 await db.exec(await read('../../supabase/migrations/20260909134727_legal_claim_register_presentation.sql'));
});
after(async()=>db?.close());
beforeEach(async()=>{
 await db.exec('BEGIN');await q("select set_config('fixture.role','service_role',true)");
 await q('insert into companies values($1),($2)',[company,other]);
 await q("insert into contracts(id,company_id,customer_id,contract_number,start_date,end_date,status,monthly_amount,vehicle_returned) values($1,$2,$3,'TEST','2024-01-01','2028-12-31','under_legal_procedure',1700,true)",[contract,company,user]);
 await q("insert into contract_documents(id,company_id,contract_id,document_type,file_path) values($1,$2,$3,'signed_contract','synthetic.pdf')",[proof,company,contract]);
 await q("insert into invoices(id,company_id,contract_id,customer_id,invoice_number,invoice_type,total_amount,balance_due,paid_amount,invoice_month,due_date,status,payment_status) values($1,$2,$3,$4,'TEST','sales',1700,1700,0,'2026-08-01','2026-08-01','sent','unpaid')",[other,company,contract,user]);
});
afterEach(async()=>db.exec('ROLLBACK'));
it('discloses rent gross and allocated payments and omits periods for zero base claims',async()=>{
 const s=await statement();const rent=s.claim_register.rows.find(row=>row.key==='rent_due');
 assert.equal(rent.gross_amount,1700);assert.equal(rent.deductions,0);assert.equal(rent.amount,1700);
 for(const row of s.claim_register.rows.filter(row=>!row.custom&&row.amount===0)){assert.equal(row.period_from,null);assert.equal(row.period_to,null);}
 assert.equal(s.claim_register.rows.find(row=>row.key==='damages').basis,'صافي الأضرار والمصاريف المثبتة بعد الاستهلاك والتأمين');
});
it('rolls back the display projection without dropping recorded requests',async()=>{
 const id=await item();const sql=await read('../../supabase/rollbacks/20260909134727_legal_claim_register_presentation.rollback.sql');
 await db.exec(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const hash=(await q("select md5(prosrc) hash from pg_proc where oid='legal_memo_calc_private.claim_register(uuid,uuid,date,jsonb)'::regprocedure"))[0].hash;
 assert.equal(hash,'a9c1c3ff2d65c906bbc002c2f7fc3da4');assert.equal((await q('select id from legal_case_claim_items where id=$1',[id])).length,1);
});
it('keeps an evidenced alternative visible without increasing principal',async()=>{await item();const s=await statement();assert.equal(s.total,1700);assert.equal(s.claim_register.additional_primary,0);assert.equal(s.claim_register.rows.at(-1).amount,425);assert.equal(s.claim_register.rows.at(-1).status,'ready');});
it('includes only a reviewed independent primary net of recoveries',async()=>{await item({disposition:'primary'});const s=await statement();assert.equal(s.total,2125);assert.equal(s.components.damages,425);assert.equal(s.claim_register.primary_total,2125);});
it('does not sum conditional reputation relief',async()=>{await item({kind:'reputation_reserve',disposition:'subsidiary'});const s=await statement();assert.equal(s.total,1700);assert.equal(s.claim_register.rows.at(-1).disposition,'subsidiary');});
it('exposes incomplete selected requests without assuming a debt',async()=>{await item({status:'draft'});const s=await statement();assert.equal(s.total,1700);assert.ok(s.claim_register.issues.length);assert.equal(s.claim_register.rows.at(-1).status,'incomplete');});
it('rechecks replaced evidence on every statement',async()=>{await item({disposition:'primary'});await q("update contract_documents set legal_evidence_state='superseded' where id=$1",[proof]);const s=await statement();assert.equal(s.total,1700);assert.ok(s.claim_register.issues.some(x=>x.includes('أدلة نشطة')));});
it('detects a duplicate opportunity for the same period and evidence',async()=>{await item();await item();const s=await statement();assert.equal(s.claim_register.rows.filter(r=>r.custom&&r.status==='ready').length,0);assert.ok(s.claim_register.issues.some(x=>x.includes('طلب آخر')));});
it('keeps no-claim closures closed even with a newly entered claim',async()=>{await item({disposition:'primary'});await q('insert into contract_finance_private.no_claim_closures values($1,$2)',[company,contract]);const s=await statement();assert.equal(s.total,0);assert.ok(s.claim_register.issues.some(x=>x.includes('مقفل بلا مطالبات')));});
it('requires an exclusion reason and retains the excluded row',async()=>{const id=await item();await q("update legal_case_claim_items set review_status='excluded',exclusion_reason='غير منطبق' where id=$1",[id]);const s=await statement();assert.equal(s.claim_register.rows.at(-1).status,'excluded');assert.equal(s.claim_register.issues.length,0);});
it('rejects cross-company evidence',async()=>{await q('update contract_documents set company_id=$1 where id=$2',[other,proof]);await assert.rejects(item(),/المستند|مستند/);});
it('denies direct private helpers and anonymous table reads',async()=>{assert.equal((await q("select has_function_privilege('authenticated','legal_memo_calc_private.claim_register(uuid,uuid,date,jsonb)','EXECUTE') ok"))[0].ok,false);assert.equal((await q("select has_table_privilege('anon','public.legal_case_claim_items','SELECT') ok"))[0].ok,false);});
it('enforces company RLS for reads and writes',async()=>{
 await item();await q('insert into profiles values($1,$2,true)',[user,other]);await q("select set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[user,other]);
 await db.exec('grant select on profiles to authenticated; SET LOCAL ROLE authenticated');
 assert.equal((await q('select * from legal_case_claim_items')).length,0);await assert.rejects(item(),/row-level security|permission denied/);
});
it('preserves historical daily retention after documented return',async()=>{
 await q("insert into legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status,vehicle_custody,vehicle_returned_at,vehicle_return_document_id,retention_daily_rate,retention_rate_source,retention_rate_source_ref,retention_rate_source_document_id) values($1,$2,'2026-08-31','confirmed','returned','2026-09-05',$3,50,'recent_contracts','عقد موثق',$3)",[company,contract,proof]);
 const s=await statement();assert.equal(s.components.retention,250);assert.equal(s.total,1950);
});
it('calculates monthly retention using actual month days',async()=>{
 await q("insert into legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status,vehicle_custody,retention_rate_source_ref,retention_rate_source_document_id,retention_calculation_basis) values($1,$2,'2026-08-31','confirmed','with_defendant','الأجرة الشهرية للعقد',$3,'contract_monthly')",[company,contract,proof]);
 const s=await statement();assert.equal(s.components.retention,510);assert.equal(s.claim_register.retention_monthly_rate,1700);assert.equal(s.total,2210);
});
it('retains an immutable audit record and clears prior approval on edits',async()=>{
 await q("insert into legal_case_litigation_profile(company_id,contract_id,legal_review_status) values($1,$2,'approved')",[company,contract]);
 const id=await item();await q("update legal_case_claim_items set description='وصف معدل' where id=$1",[id]);
 const history=await q('select before_value,after_value from legal_case_claim_item_revisions where claim_item_id=$1 order by id',[id]);
 assert.equal(history.length,2);assert.equal(history[0].before_value,null);assert.equal(history[1].before_value.description,'طلب اصطناعي موثق');
 assert.equal((await q('select legal_review_status from legal_case_litigation_profile'))[0].legal_review_status,'draft');
 assert.equal((await q("select has_table_privilege('authenticated','legal_case_claim_item_revisions','UPDATE') ok"))[0].ok,false);
});
it('rejects overlapping primary harms even when their type and proof differ',async()=>{
 await item({disposition:'primary'});await q("insert into contract_documents(id,company_id,contract_id,document_type,file_path) values($1,$2,$3,'other','other.pdf')",[user,company,contract]);
 await item({disposition:'primary',kind:'reputation_material',evidence:user});
 const s=await statement();assert.equal(s.total,1700);assert.ok(s.claim_register.issues.some(x=>x.includes('تكررت المنفعة')));
});
it('excludes claims belonging to a different case of the same contract',async()=>{
 const id=await item();await q('insert into legal_cases(id,company_id,contract_id) values($1,$2,$3)',[user,company,contract]);
 const s=await statement();assert.ok(!s.claim_register.rows.some(row=>row.key===id));
});
it('makes incomplete register rows visible to the readiness queue',async()=>{
 await item({status:'draft'});const result=(await q("select legal_memo_calc_private.readiness_financials($1,$2,'2026-09-09') s",[company,contract]))[0].s;
 assert.equal(result.financial_context.rent_requires_review,true);assert.ok(result.financial_context.rent_review_reasons.some(x=>x.includes('يحتاج مراجعة')));
});
it('does not retain an old positive retention amount when its proof is replaced',async()=>{
 await q("insert into legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status,vehicle_custody,retention_daily_rate,retention_rate_source,retention_rate_source_ref,retention_rate_source_document_id) values($1,$2,'2026-08-31','confirmed','with_defendant',50,'recent_contracts','عقد موثق',$3)",[company,contract,proof]);
 await q("update contract_documents set legal_evidence_state='superseded' where id=$1",[proof]);const s=await statement();assert.equal(s.components.retention,0);assert.ok(s.claim_register.issues.some(x=>x.includes('مصدر تقدير')));
});
it('computes a complete 31-day month once with the documented 30-day convention',async()=>{
 await q('delete from invoices');
 await q("insert into legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status,vehicle_custody,vehicle_returned_at,vehicle_return_document_id,retention_rate_source_ref,retention_rate_source_document_id,retention_calculation_basis,retention_proration_basis) values($1,$2,'2026-07-31','confirmed','returned','2026-08-31',$3,'أساس موثق',$3,'contract_monthly','thirty_days')",[company,contract,proof]);
 assert.equal((await statement()).components.retention,1700);
});
const freeze=async()=>{
 const s=await statement(), c=s.components, invoices=s.included_invoices;
 const format=value=>value?.split('-').reverse().join('/');
 const retention=s.claim_register.rows.find(row=>row.key==='retention');
 const memo={claimScope:s.claim_scope,customer:{overdue_amount:c.rent_due+c.legal_extension_rent,late_penalty:c.contractual_compensation,violations_amount:c.traffic_violations,total_debt:s.total},damages:c.damages,
   grossInvoicesTotal:invoices.reduce((sum,row)=>sum+row.total_amount,0),paidTotal:invoices.reduce((sum,row)=>sum+row.paid_amount,0),
   unpaidPeriodFrom:format(invoices.map(row=>row.service_period_start).sort()[0]),unpaidPeriodTo:format(invoices.map(row=>row.service_period_end).sort().at(-1)),claimRegister:s.claim_register,
   ...(c.retention>0?{retentionClaim:{amount:c.retention,from:retention.period_from,to:retention.period_to,days:(Date.parse(retention.period_to)-Date.parse(retention.period_from))/86400000+1},retentionRate:{daily:0,sourceRef:'العقد'}}:{})};
 await q('insert into legal_case_memo_snapshots(id,company_id,contract_id,version,payload) values($1,$2,$3,1,$4)',[other,company,contract,memo]);
};
const gate=async(withProof=true)=>{
 const s=await statement();return(await q('select legal_memo_calc_private.validate_snapshot_statement($1,$2,$3,$4) missing',[company,contract,{memoSnapshotId:other,case:{amount:s.total},documents:withProof?[{sourceDocumentId:proof,ready:true,url:'https://example.test/proof'}]:[]},s]))[0].missing;
};
const installFixedCompensation = async () => db.exec(await read('../../supabase/migrations/20260909184802_fixed_legal_compensation_request.sql'));
const enableFixedCompensation = async () => q(`insert into legal_case_litigation_profile(company_id,contract_id,fixed_compensation_requested) values($1,$2,true)
 on conflict(company_id,contract_id) do update set fixed_compensation_requested=true`,[company,contract]);
it('leaves every existing request unchanged until fixed compensation is explicitly selected', async () => {
 await q('insert into legal_case_litigation_profile(company_id,contract_id) values($1,$2)',[company,contract]);
 const before=await statement();await installFixedCompensation();
 assert.deepEqual(await statement(),before);
 await enableFixedCompensation();assert.equal((await statement()).total,11700);
 await q('update legal_case_litigation_profile set fixed_compensation_requested=false where company_id=$1 and contract_id=$2',[company,contract]);
 assert.deepEqual(await statement(),before);
 await enableFixedCompensation();
 await q('update legal_case_litigation_profile set case_id=$1',[other]);
 assert.deepEqual(await statement(),before);
});
it('adds fixed requested compensation once to the canonical amount and frozen filing package', async () => {
 await installFixedCompensation();await enableFixedCompensation();
 const first=await statement(),second=await statement();
 assert.deepEqual(first,second);
 const fixed=first.claim_register.rows.filter(row=>row.key==='fixed_general_compensation');
 assert.equal(fixed.length,1);assert.equal(fixed[0].amount,10000);assert.equal(fixed[0].disposition,'primary');
 assert.equal(fixed[0].period_from,null);assert.deepEqual(fixed[0].evidence_ids,[]);
 assert.equal(first.components.rent_due,1700);assert.equal(first.components.damages,10000);
 assert.equal(first.total,11700);assert.equal(first.claim_register.primary_total,11700);assert.equal(first.claim_register.additional_primary,10000);
 await freeze();assert.deepEqual(await gate(),[]);
 await q("update legal_case_memo_snapshots set payload=jsonb_set(payload,'{claimRegister,rows}',(select jsonb_agg(r) from jsonb_array_elements(payload#>'{claimRegister,rows}') r where r->>'key'<>'fixed_general_compensation'))");
 assert.ok((await gate()).includes('memoSnapshot.claim_register_changed'));
});
it('adds the fixed request alongside existing independent claims without duplicating costs', async () => {
 await item({disposition:'primary'});await installFixedCompensation();await enableFixedCompensation();
 const s=await statement();assert.equal(s.total,12125);assert.equal(s.components.damages,10425);
 assert.equal(s.claim_register.rows.find(row=>row.key==='damages').amount,0);
 assert.equal(s.claim_register.additional_primary,10425);
});
it('never adds fixed compensation to traffic-only claims, zero claims or no-claim closures', async () => {
 await installFixedCompensation();await enableFixedCompensation();
 const traffic=(await q("select calculate_legal_claim_statement_v4($1,$2,'2026-09-09','traffic_violations_only','{}') s",[company,contract]))[0].s;
 assert.ok(!traffic.claim_register.rows.some(row=>row.key==='fixed_general_compensation'));
 await q('insert into contract_finance_private.no_claim_closures values($1,$2)',[company,contract]);
 assert.equal((await statement()).total,0);
 await q('delete from contract_finance_private.no_claim_closures');await q('delete from invoices');
 const empty=await statement();assert.equal(empty.total,0);assert.equal(empty.claim_register.additional_primary,0);
});
it('retains authorization and private function grants after the fixed compensation change', async () => {
 await installFixedCompensation();
 assert.equal((await q("select has_function_privilege('authenticated','legal_memo_calc_private.claim_register(uuid,uuid,date,jsonb)','EXECUTE') ok"))[0].ok,false);
 await q('insert into profiles values($1,$2,true)',[user,other]);
 await q("select set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[user,other]);
 await assert.rejects(statement(),/Not authorized/);
});
it('rejects old snapshots and restores the prior calculation exactly on rollback', async () => {
 await q('insert into legal_case_litigation_profile(company_id,contract_id) values($1,$2)',[company,contract]);
 const id=await item();await freeze();await installFixedCompensation();await enableFixedCompensation();
 assert.ok((await gate()).includes('memoSnapshot.claim_register_changed'));
 const sql=await read('../../supabase/rollbacks/20260909184802_fixed_legal_compensation_request.rollback.sql');
 await db.exec(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 assert.equal((await statement()).total,1700);assert.deepEqual(await gate(),[]);
 assert.equal((await q('select id from legal_case_claim_items where id=$1',[id])).length,1);
});
it('accepts the current frozen register and rejects changed alternatives at the same primary total',async()=>{
 const id=await item();await freeze();assert.deepEqual(await gate(),[]);
 await q('update legal_case_claim_items set requested_amount=600 where id=$1',[id]);assert.equal((await statement()).total,1700);assert.ok((await gate()).includes('memoSnapshot.claim_register_changed'));
});
it('requires alternative evidence in the filing package even though it adds no debt',async()=>{
 await item();await freeze();assert.deepEqual(await gate(),[]);assert.ok((await gate(false)).includes('documents.claim_evidence_missing'));
});
it('validates frozen monthly retention without requiring a fictitious daily rate',async()=>{
 await q("insert into legal_case_litigation_profile(company_id,contract_id,termination_date,termination_date_status,vehicle_custody,retention_rate_source_ref,retention_rate_source_document_id,retention_calculation_basis) values($1,$2,'2026-08-31','confirmed','with_defendant','العقد',$3,'contract_monthly')",[company,contract,proof]);
 await freeze();assert.deepEqual(await gate(),[]);
 await q('update contracts set monthly_amount=1800 where id=$1',[contract]);assert.ok((await gate()).includes('memoSnapshot.claim_register_changed'));
});
it('marks monthly retention with no proven start as incomplete instead of hiding it',async()=>{
 await q("insert into legal_case_litigation_profile(company_id,contract_id,vehicle_custody,retention_rate_source_ref,retention_rate_source_document_id,retention_calculation_basis) values($1,$2,'with_defendant','العقد',$3,'contract_monthly')",[company,contract,proof]);
 const s=await statement();assert.equal(s.components.retention,0);assert.equal(s.claim_register.rows.find(row=>row.key==='retention').status,'incomplete');
});
it('rejects selecting another company even through the security-definer gateway',async()=>{
 await q('insert into profiles values($1,$2,true)',[user,other]);await q("select set_config('fixture.role','authenticated',true),set_config('fixture.uid',$1,true),set_config('fixture.company',$2,true)",[user,other]);
 await assert.rejects(statement(),/Not authorized/);
});
it('rolls back calculation functions exactly while retaining claim items and revisions',async()=>{
 const id=await item();const sql=await read('../../supabase/rollbacks/20260909133621_legal_claim_register.rollback.sql');await db.exec(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const hashes=await q("select proname,md5(prosrc) hash from pg_proc where oid in ('legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[])'::regprocedure,'legal_memo_calc_private.validate_snapshot_statement(uuid,uuid,jsonb,jsonb)'::regprocedure,'legal_memo_calc_private.readiness_financials(uuid,uuid,date)'::regprocedure)");
 assert.deepEqual(hashes.map(row=>row.hash).sort(),['64f75fbbc42bf31bcf6ae54a2d2524f8','d7d849ff0ff802139def07de74685c7b','eab4cd2db7da25ce5d866d6f3ebf6e06'].sort());
 assert.equal((await q('select id from legal_case_claim_items where id=$1',[id])).length,1);assert.equal((await q('select * from legal_case_claim_item_revisions')).length,1);
});
