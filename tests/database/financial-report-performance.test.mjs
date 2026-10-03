// Synthetic SQL equivalence and scaling checks. Never accepts a remote database URL.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { beforeEach,afterEach,describe,it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { startTemporaryPostgres } from './helpers/temporary-postgres.mjs';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const company='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222';
const maker='33333333-3333-4333-8333-333333333333',reviewer='44444444-4444-4444-8444-444444444444';
const cash='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',revenue='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const capital='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',expense='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const fixed='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',liability='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
const retained='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',reserve='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8';
const migration='20260917235336_financial_statement_packages';
const review={classifications:true,policies:true,reconciliations:true,disclosures:true,periodCutoff:true};
let db,config;
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
const val=async(sql,args=[])=>(await query(sql,args))[0].value;
const admin=()=>db.exec('RESET ROLE');
async function auth(id=maker,tenant=company,role='authenticated'){
 await admin();await db.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[id||'',tenant||'']);
 await db.exec(`SET ROLE ${role}`);
}
const get=(configuration=config,tenant=company)=>val('SELECT public.get_financial_statement_package_v1($1,$2) value',[tenant,configuration]);
const save=(configuration=config)=>val('SELECT public.save_financial_statement_package_v1($1,$2) value',[company,configuration]);
const approve=id=>val('SELECT public.approve_financial_statement_package_v1($1,$2,$3) value',[id,'Reviewed sources, classifications, disclosures and all reconciliations.',review]);
const codes=r=>r.findings.filter(f=>f.severity==='error').map(f=>f.code);
const row=(r,s,k)=>r.statements.find(x=>x.key===s).rows.find(x=>x.key===k).values;
const mapping=(accountId,positionLine=null,incomeLine=null,cashFlowCategory=null,isCashEquivalent=false)=>({accountId,positionLine,comparisonPositionLine:null,thirdPositionLine:null,incomeLine,cashFlowCategory,isCashEquivalent,currentSplit:null,comparisonSplit:null,thirdSplit:null});
function configuration(){return {version:1,kind:'interim',scope:'individual_entity',framework:'IFRS',legalForm:'llc',
 periodStart:'2026-01-01',periodEnd:'2026-08-31',positionComparisonDate:'2025-12-31',comparativePeriodStart:'2025-01-01',comparativePeriodEnd:'2025-08-31',
 thirdPositionDate:null,requiresThirdPosition:false,accountMappings:[mapping(cash,'cash',null,null,true),mapping(revenue,null,'rental_revenue','operating'),
 mapping(capital,'share_capital',null,'financing'),mapping(expense,null,'administrative_expenses','operating'),mapping(fixed,'property_equipment',null,'investing'),
 mapping(liability,'current_borrowings',null,'financing'),mapping(retained,'retained_earnings',null,'financing'),mapping(reserve,'other_reserves',null,'financing')],journalOverrides:[],
 notes:['entity','basis','policies','estimates','assets','receivables','liabilities','equity','related_parties','commitments','subsequent_events','going_concern','noncash_transactions','interim_changes']
 .map((code,i)=>({code,number:i+1,titleAr:'إيضاح '+code,titleEn:'Note '+code,status:'complete',text:'Synthetic reviewed disclosure contents for this test company only.',evidence:'Synthetic fixture evidence'})),preparationNotes:'Synthetic testing only'};}
async function journal({date='2026-02-01',debits=[[cash,100]],credits=[[revenue,100]],referenceType=null,referenceId=null,status='posted'}={}){
 await admin();const id=(await query(`INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit,reference_type,reference_id)
 VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[company,date,status,debits.reduce((s,x)=>s+x[1],0),credits.reduce((s,x)=>s+x[1],0),referenceType,referenceId]))[0].id;
 let n=0;for(const [a,d] of debits)await db.query('INSERT INTO journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount) VALUES($1,$2,$3,$4,0)',[id,a,++n,d]);
 for(const [a,c] of credits)await db.query('INSERT INTO journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount) VALUES($1,$2,$3,0,$4)',[id,a,++n,c]);
 await auth();return id;
}
function override(id,equityCategory=null,cashFlows=[],treatment='regular'){
 config.journalOverrides.push({journalId:id,treatment,internalCashTransfer:0,equityCategory,cashFlows:cashFlows.map(f=>({...f,label:f.label??'Reviewed synthetic cash flow'})),reason:'Reviewed classification against synthetic supporting source.'});
}
async function setup(instance=new PGlite()){
 db=instance;
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.company',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE companies(id uuid PRIMARY KEY,name text,name_ar text,commercial_register text,currency text,address text,address_ar text);
 CREATE TABLE profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,company_id uuid,is_active boolean,first_name text,last_name text,first_name_ar text,last_name_ar text);
 CREATE TABLE employees(user_id uuid,company_id uuid,is_active boolean,has_system_access boolean,account_status text);
 CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);CREATE TABLE user_permissions(user_id uuid,permission_id text,granted boolean);
 CREATE TABLE chart_of_accounts(id uuid PRIMARY KEY,company_id uuid,account_code text,account_name text,account_name_ar text,account_type text,account_subtype text,balance_type text,account_level int,is_header boolean,is_active boolean,parent_account_id uuid,parent_account_code text);
 CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,entry_number text DEFAULT 'TEST',description text DEFAULT 'Synthetic journal',entry_date date,status text,total_debit numeric,total_credit numeric,posted_at timestamptz,reversed_at timestamptz,reversal_entry_id uuid,reference_type text,reference_id uuid);
 CREATE TABLE journal_entry_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journal_entry_id uuid,account_id uuid,line_number int,debit_amount numeric,credit_amount numeric,line_description text);
 CREATE TABLE vehicles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,is_active boolean,purchase_cost numeric,purchase_date date);`);
 const baseline=await read('../../supabase/migrations/20260712052300_atomic_payment_cancellation_and_contract_totals.sql');
 const start=baseline.indexOf('CREATE OR REPLACE FUNCTION public.is_finance_action_authorized(');
 await db.exec(baseline.slice(start,baseline.indexOf('CREATE OR REPLACE FUNCTION public.canonical_contract_paid_amount',start)));
 await db.exec(await read('../../supabase/migrations/20260917235302_professional_balance_sheets.sql'));
 await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
 await db.query(`INSERT INTO companies VALUES($1,'Synthetic company','شركة اختبار','TEST-CR','QAR','Doha','الدوحة'),($2,'Other company','شركة أخرى','OTHER','QAR','Doha','الدوحة')`,[company,foreign]);
 await db.query(`INSERT INTO profiles(user_id,company_id,is_active,first_name,last_name) VALUES($1,$3,true,'Maker','Accountant'),($2,$3,true,'Reviewer','Accountant')`,[maker,reviewer,company]);
 await db.query(`INSERT INTO user_roles VALUES($1,$3,'accountant'),($2,$3,'accountant')`,[maker,reviewer,company]);
 for(const [id,name,type,subtype] of [[cash,'cash','asset','current_asset'],[revenue,'revenue','revenue',null],[capital,'capital','equity',null],
 [expense,'expense','expenses',null],[fixed,'vehicle','asset','fixed_asset'],[liability,'loan','liability','current_liability'],[retained,'retained','equity',null],[reserve,'reserve','equity',null]]){
 await db.query(`INSERT INTO chart_of_accounts(id,company_id,account_code,account_name,account_type,account_subtype,account_level,is_header,is_active) VALUES($1,$2,$3,$3,$4,$5,3,false,true)`,[id,company,name,type,subtype]);}
 config=configuration();await auth();
 // Opening comparison legitimately zero. Comparative and current period each have actual ledger evidence.
 const initial=await journal({date:'2025-01-01',debits:[[cash,1000]],credits:[[capital,1000]]});override(initial,'contributions');
 await journal({date:'2025-06-01',debits:[[cash,200]],credits:[[revenue,200]]});
 await journal({date:'2026-02-01',debits:[[cash,400]],credits:[[revenue,400]]});
 await journal({date:'2026-03-01',debits:[[expense,50]],credits:[[cash,50]]});
}

const performanceMigration='20260918014423_financial_report_calculation_performance';
const stripTimes=value=>Array.isArray(value)?value.map(stripTimes):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='generatedAt').map(([key,item])=>[key,stripTimes(item)])):value;
const install=async()=>{await admin();await db.exec(await read('../../supabase/migrations/'+performanceMigration+'.sql'));await auth();};
async function manyJournals(n){
 await admin();await db.query(`WITH entries AS(INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit)
 SELECT $1,'2026-04-01','posted',1,1 FROM generate_series(1,$4::int) RETURNING id)
 INSERT INTO journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount)
 SELECT id,$2::uuid,1,1,0 FROM entries UNION ALL SELECT id,$3::uuid,2,0,1 FROM entries`,[company,cash,revenue,n]);await auth();
}
describe('financial reporting performance migration',{concurrency:false},()=>{
 beforeEach(async()=>setup());afterEach(async()=>db?.close());
 it('preserves all payload fields, source hashes and ordered findings/journals across interim, annual and third-position cases',async()=>{
   await manyJournals(300);
   const configurations=[structuredClone(config),{...structuredClone(config),accountMappings:[]}];
   const third=structuredClone(config);third.requiresThirdPosition=true;third.thirdPositionDate='2024-12-31';configurations.push(third);
   const annual=structuredClone(config);annual.kind='annual';annual.periodEnd='2026-12-31';
   // Use the already completed 2025 year: valid independently of the current 2026 cutoff.
   Object.assign(annual,{periodStart:'2025-01-01',periodEnd:'2025-12-31',positionComparisonDate:'2024-12-31',comparativePeriodStart:'2024-01-01',comparativePeriodEnd:'2024-12-31'});configurations.push(annual);
   const annualThird=structuredClone(annual);annualThird.requiresThirdPosition=true;annualThird.thirdPositionDate='2023-12-31';configurations.push(annualThird);
   const before=[];for(const c of configurations)before.push(stripTimes(await get(c)));
   const balanceBefore=stripTimes(await val("SELECT public.get_professional_balance_sheet_v1($1,'2026-08-31',NULL) value",[company]));
   await install();
   for(let i=0;i<configurations.length;i++)assert.deepEqual(stripTimes(await get(configurations[i])),before[i]);
   assert.deepEqual(stripTimes(await val("SELECT public.get_professional_balance_sheet_v1($1,'2026-08-31',NULL) value",[company])),balanceBefore);
   await admin();
   for(const role of ['anon','authenticated','service_role'])assert.equal(await val("SELECT has_function_privilege($1,'balance_sheet_private.assemble_report(uuid,date,date,jsonb,jsonb)','EXECUTE') value",[role]),false);
   await db.exec(await read('../../supabase/rollbacks/'+performanceMigration+'.rollback.sql'));await auth();
   assert.deepEqual(stripTimes(await get(configurations[0])),before[0]);
 });
 it('reads each unique cutoff once: four for interim and three for annual, even with a third position',async()=>{
   await install();await admin();
   await db.exec(`ALTER FUNCTION balance_sheet_private.period(uuid,date) RENAME TO original_period_for_test;
   CREATE FUNCTION balance_sheet_private.period(p_company uuid,p_date date) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
   BEGIN
     PERFORM set_config('test.period_calls',COALESCE(current_setting('test.period_calls',true),'')||p_date::text||',',false);
     RETURN balance_sheet_private.original_period_for_test(p_company,p_date);
   END;$$;
   REVOKE ALL ON FUNCTION balance_sheet_private.period(uuid,date) FROM PUBLIC,anon,authenticated,service_role;`);
   await auth();
   const annual=structuredClone(config);Object.assign(annual,{kind:'annual',periodStart:'2025-01-01',periodEnd:'2025-12-31',positionComparisonDate:'2024-12-31',comparativePeriodStart:'2024-01-01',comparativePeriodEnd:'2024-12-31',thirdPositionDate:'2023-12-31',requiresThirdPosition:true});
   const interim=structuredClone(config);Object.assign(interim,{thirdPositionDate:'2024-12-31',requiresThirdPosition:true});
   for(const [c,expected] of [[interim,4],[annual,3]]){
     await db.query("SELECT set_config('test.period_calls','',false)");await get(c);
     const calls=(await val("SELECT current_setting('test.period_calls') value")).split(',').filter(Boolean);
     assert.equal(calls.length,expected);assert.equal(new Set(calls).size,expected);
   }
 });
});

const diagnosticMigration='20261001020219_diagnostic_scope_after_source_fingerprint';
const assemblySignature='balance_sheet_private.assemble_report(uuid,date,date,jsonb,jsonb)';
const normalizeDefinition=definition=>definition.replace(/\r\n/g,'\n');
const functionMetadata=signature=>query(`SELECT p.oid,p.proowner,p.proacl,p.proconfig,p.provolatile,p.prosecdef,
 pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.oid=$1::regprocedure`,[signature]);
const omitChecks=report=>Object.fromEntries(Object.entries(stripTimes(report)).filter(([key])=>key!=='checks'));
async function installFingerprintCalculationChain(){
 await admin();
 // The governance migration's fixture dependency is unrelated to this calculator.
 await db.exec(`CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN NEW.updated_at=now();RETURN NEW;END;$$;`);
 for(const name of [performanceMigration,'20260921120100_balance_sheet_governance','20260923161547_balance_sheet_source_fingerprint'])
   await db.exec(await read('../../supabase/migrations/'+name+'.sql'));
 await auth();
}
const installDiagnosticScope=async()=>{await admin();await db.exec(await read('../../supabase/migrations/'+diagnosticMigration+'.sql'));await auth();};

describe('diagnostic scopes after the source-fingerprint migration',{concurrency:false},()=>{
 beforeEach(async()=>{await setup();await installFingerprintCalculationChain();});
 afterEach(async()=>db?.close());
 it('preserves payloads, source fingerprints and function privileges while attributing and merging checks',async()=>{
   await admin();
   await db.query(`INSERT INTO vehicles(company_id,is_active,purchase_cost,purchase_date)
     VALUES($1,true,0,NULL),($2,true,0,NULL)`,[company,foreign]);
   const current={accounts:[{id:cash,code:'cash',balance:10}],totals:{assets:10},sourceFingerprint:'current-source',checks:[
     {code:'shared_check',severity:'error',count:2,asOfDate:'2026-08-31',detail:[{id:cash,code:'cash'}]},
     {code:'changed_count',severity:'warning',count:1,asOfDate:'2026-08-31',detail:[]}]};
   const comparison={accounts:[{id:cash,code:'cash',balance:4}],totals:{assets:4},sourceFingerprint:'comparison-source',checks:[
     {code:'shared_check',severity:'error',count:2,asOfDate:'2025-12-31',detail:[{id:cash,code:'cash'}]},
     {code:'changed_count',severity:'warning',count:3,asOfDate:'2025-12-31',detail:[{id:revenue,code:'revenue'}]},
     {code:'comparison_error',severity:'error',count:1,asOfDate:'2025-12-31',detail:[{id:capital,code:'capital'}]}]};
   const assemble=()=>val(`SELECT ${assemblySignature.split('(')[0]}($1,'2026-08-31','2025-12-31',$2,$3) value`,[company,current,comparison]);
   const before=await assemble(),metadataBefore=(await functionMetadata(assemblySignature))[0];
   const periodBefore=(await functionMetadata('balance_sheet_private.period(uuid,date)'))[0];
   assert.equal(before.checks.filter(c=>c.code==='shared_check').length,2);
   await installDiagnosticScope();await admin();
   const after=await assemble(),metadataAfter=(await functionMetadata(assemblySignature))[0];
   assert.deepEqual(omitChecks(after),omitChecks(before));
   assert.equal(after.fingerprint,before.fingerprint);
   assert.equal(after.accounts[0].comparisonBalance,4);
   assert.deepEqual({...metadataAfter,definition:null},{...metadataBefore,definition:null});
   assert.deepEqual((await functionMetadata('balance_sheet_private.period(uuid,date)'))[0],periodBefore);
   assert.deepEqual(after.checks.filter(c=>c.code==='shared_check'),[{...current.checks[0],scope:'as_of'}]);
   assert.deepEqual(after.checks.filter(c=>c.code==='changed_count').sort((a,b)=>a.scope.localeCompare(b.scope)),[
     {...current.checks[1],scope:'as_of'},{...comparison.checks[1],scope:'comparison_only'}]);
   assert.deepEqual(after.checks.find(c=>c.code==='comparison_error'),{...comparison.checks[2],scope:'comparison_only'});
   for(const code of ['current_vehicles_missing_cost','current_vehicles_missing_purchase_date']){
     const check=after.checks.find(c=>c.code===code);
     assert.equal(check.scope,'current_register');assert.equal(check.count,1);assert.deepEqual(check.detail,[]);
   }
   // Exercise this function's fingerprint contract independently of the source
   // aggregation helper, which this narrow migration intentionally does not replace.
   current.sourceFingerprint='changed-current-source';const changedCurrent=await assemble();
   assert.notEqual(changedCurrent.fingerprint,after.fingerprint);
   assert.deepEqual(changedCurrent.accounts,after.accounts);assert.deepEqual(changedCurrent.current,after.current);
   current.sourceFingerprint='current-source';comparison.sourceFingerprint='changed-comparison-source';
   assert.notEqual((await assemble()).fingerprint,after.fingerprint);
   comparison.sourceFingerprint='comparison-source';assert.equal((await assemble()).fingerprint,after.fingerprint);
   await db.query("UPDATE companies SET name='',name_ar=NULL,commercial_register='',currency='' WHERE id=$1",[company]);
   const missingIdentity=await assemble();
   for(const code of ['missing_company_identity','missing_company_currency']){
     const check=missingIdentity.checks.find(c=>c.code===code);
     assert.equal(check.scope,'as_of');assert.equal(check.severity,'error');assert.deepEqual(check.detail,[]);
   }
 });
 it('preserves the real ledger payload and fingerprint, company authorization and date validation after the full calculation chain',async()=>{
   const report=()=>val("SELECT public.get_professional_balance_sheet_v1($1,'2026-08-31','2025-12-31') value",[company]);
   const before=await report();await installDiagnosticScope();const after=await report();
   assert.deepEqual(omitChecks(after),omitChecks(before));assert.equal(after.fingerprint,before.fingerprint);
   assert.equal(after.company.id,company);
   assert.ok(after.checks.every(c=>['as_of','comparison_only','current_register'].includes(c.scope)));
   await assert.rejects(()=>val("SELECT public.get_professional_balance_sheet_v1($1,'2026-08-31',NULL) value",[foreign]),e=>e.code==='42501');
   await admin();
   for(const role of ['anon','authenticated','service_role'])
     assert.equal(await val('SELECT has_function_privilege($1,$2,\'EXECUTE\') value',[role,assemblySignature]),false);
   await assert.rejects(()=>val("SELECT balance_sheet_private.assemble_report($1,'2026-08-31','2026-08-31','{}','{}') value",[company]),e=>e.code==='22023');
   await assert.rejects(()=>val("SELECT balance_sheet_private.assemble_report($1,'2026-08-31',NULL,'{}','{}') value",['99999999-9999-4999-8999-999999999999']),e=>e.code==='22023');
 });
 it('rolls back to the exact previous function definition, OID, ACL and payload',async()=>{
   await admin();const metadataBefore=(await functionMetadata(assemblySignature))[0];await auth();
   const report=()=>val("SELECT public.get_professional_balance_sheet_v1($1,'2026-08-31','2025-12-31') value",[company]);
   const before=await report();await installDiagnosticScope();await admin();
   assert.notEqual(normalizeDefinition((await functionMetadata(assemblySignature))[0].definition),normalizeDefinition(metadataBefore.definition));
   await db.exec(await read('../../supabase/rollbacks/'+diagnosticMigration+'.rollback.sql'));
   const metadataAfter=(await functionMetadata(assemblySignature))[0];
   assert.deepEqual({...metadataAfter,definition:normalizeDefinition(metadataAfter.definition)},
     {...metadataBefore,definition:normalizeDefinition(metadataBefore.definition)});
   await auth();assert.deepEqual(stripTimes(await report()),stripTimes(before));
 });
});

const xorMigration='20261001021004_xor_source_fingerprint_after_diagnostic_scope';
const sourceFingerprintSignature='balance_sheet_private.source_fingerprint(uuid,date)';
const capturedSourceDefinitionSha='ad9fb83231735f096e11af002a98c284a9cb1caf109af071c1216ef8a94261fb';
const sourceHash=(tenant=company,cutoff='2026-08-31')=>val('SELECT balance_sheet_private.source_fingerprint($1,$2) value',[tenant,cutoff]);
const liveBalance=()=>val("SELECT public.get_professional_balance_sheet_v1($1,'2026-08-31','2025-12-31') value",[company]);
const installXorSource=async()=>{await admin();await db.exec(await read('../../supabase/migrations/'+xorMigration+'.sql'));await auth();};

describe('source fingerprint XOR fold after diagnostic scopes',{concurrency:false},()=>{
 beforeEach(async()=>{
   await setup();await installFingerprintCalculationChain();await installDiagnosticScope();await admin();
   // Model the inspected deployment, whose scalar-subquery/null literal spelling
   // differs from the historical local artifact. Its independent capture hash
   // guards the canonical fixture rather than accepting an arbitrary rollback.
   await db.exec(await read('./fixtures/source-fingerprint-live-before-xor.sql'));
   const definition=normalizeDefinition((await functionMetadata(sourceFingerprintSignature))[0].definition);
   assert.equal(createHash('sha256').update(definition).digest('hex'),capturedSourceDefinitionSha);
   await auth();
 });
 afterEach(async()=>db?.close());
 it('detects changed descriptions and balanced gross movements across many rows without changing account totals',async()=>{
   await manyJournals(40);await admin();const oldHash=await sourceHash();
   const line=(await query(`SELECT l.id FROM journal_entry_lines l JOIN journal_entries e ON e.id=l.journal_entry_id
     WHERE e.company_id=$1 AND e.entry_date<='2026-08-31' ORDER BY l.id LIMIT 1`,[company]))[0].id;
   await db.query("UPDATE journal_entry_lines SET line_description='First source-only edit' WHERE id=$1",[line]);
   assert.equal(await sourceHash(),oldHash,'Reproduce the saturated bit_or defect before installing XOR');
   await auth();const before=await liveBalance();await installXorSource();const after=await liveBalance();
   assert.deepEqual(after.accounts,before.accounts);assert.deepEqual(after.current,before.current);assert.deepEqual(after.checks,before.checks);
   assert.notEqual(after.fingerprint,before.fingerprint);
   await admin();const first=await sourceHash();
   await db.query("UPDATE journal_entry_lines SET line_description='Second source-only edit' WHERE id=$1",[line]);
   assert.notEqual(await sourceHash(),first);await auth();const descriptionChanged=await liveBalance();
   assert.notEqual(descriptionChanged.fingerprint,after.fingerprint);assert.deepEqual(descriptionChanged.current,after.current);
   const a=await journal({debits:[[cash,100]],credits:[[revenue,100]]});
   const b=await journal({debits:[[cash,200]],credits:[[revenue,200]]});
   const grossBefore=await liveBalance();await admin();const grossHash=await sourceHash();
   for(const [id,delta] of [[a,10],[b,-10]]){
     await db.query(`UPDATE journal_entry_lines SET
       debit_amount=CASE WHEN debit_amount>0 THEN debit_amount+$2 ELSE debit_amount END,
       credit_amount=CASE WHEN credit_amount>0 THEN credit_amount+$2 ELSE credit_amount END
       WHERE journal_entry_id=$1`,[id,delta]);
     await db.query('UPDATE journal_entries SET total_debit=total_debit+$2,total_credit=total_credit+$2 WHERE id=$1',[id,delta]);
   }
   assert.notEqual(await sourceHash(),grossHash);await auth();const grossAfter=await liveBalance();
   assert.notEqual(grossAfter.fingerprint,grossBefore.fingerprint);
   assert.deepEqual(grossAfter.current,grossBefore.current);assert.deepEqual(grossAfter.accounts,grossBefore.accounts);
 });
 it('is invariant to physical row order and excludes other companies and entries after the cutoff',async()=>{
   await manyJournals(12);await installXorSource();await admin();const baseline=await sourceHash();
   const physicalOrder=()=>val('SELECT jsonb_agg(id ORDER BY ctid) value FROM journal_entry_lines');
   const orderBefore=await physicalOrder();
   await db.exec(`CREATE TEMP TABLE reordered_source_lines AS SELECT * FROM journal_entry_lines ORDER BY ctid;
     DELETE FROM journal_entry_lines;
     INSERT INTO journal_entry_lines SELECT * FROM reordered_source_lines ORDER BY ctid DESC;`);
   assert.deepEqual(await physicalOrder(),[...orderBefore].reverse());assert.equal(await sourceHash(),baseline);
   const otherBefore=await sourceHash(foreign);
   await db.query(`INSERT INTO chart_of_accounts(id,company_id,account_code,account_name,account_type,account_subtype,account_level,is_header,is_active)
     VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',$1,'OTHER_CASH','Other cash','asset','current_asset',3,false,true),
       ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',$1,'OTHER_REVENUE','Other revenue','revenue',NULL,3,false,true)`,[foreign]);
   const foreignEntry=(await query(`INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit)
     VALUES($1,'2026-02-01','posted',77,77) RETURNING id`,[foreign]))[0].id;
   await db.query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount)
     VALUES($1,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',1,77,0),($1,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',2,0,77)`,[foreignEntry]);
   assert.equal(await sourceHash(),baseline);assert.notEqual(await sourceHash(foreign),otherBefore);
   await journal({date:'2027-01-01',debits:[[cash,999]],credits:[[revenue,999]]});await admin();
   assert.equal(await sourceHash(),baseline);assert.notEqual(await sourceHash(company,'2027-01-01'),baseline);
 });
 it('keeps the empty-source fallback and distinguishes NULL from empty descriptions',async()=>{
   await installXorSource();await admin();
   assert.equal(await sourceHash('99999999-9999-4999-8999-999999999999'),createHash('sha256').update('none').digest('hex'));
   const original=await sourceHash();const id=(await query('SELECT id FROM journal_entry_lines ORDER BY id LIMIT 1'))[0].id;
   await db.query("UPDATE journal_entry_lines SET line_description='' WHERE id=$1",[id]);assert.notEqual(await sourceHash(),original);
   await db.query('UPDATE journal_entry_lines SET line_description=NULL WHERE id=$1',[id]);assert.equal(await sourceHash(),original);
 });
 it('preserves OID, ACL and adjacent functions and restores the exact captured live definition on rollback',async()=>{
   await admin();const before=(await functionMetadata(sourceFingerprintSignature))[0];
   const unchanged=['balance_sheet_private.record_hash(text)','balance_sheet_private.period(uuid,date)',assemblySignature];
   const adjacentBefore=[];for(const name of unchanged)adjacentBefore.push((await functionMetadata(name))[0]);
   const hashBefore=await sourceHash();await installXorSource();await admin();const after=(await functionMetadata(sourceFingerprintSignature))[0];
   assert.deepEqual({...after,definition:null},{...before,definition:null});
   assert.equal(normalizeDefinition(after.definition).replace('bit_xor(','bit_or('),normalizeDefinition(before.definition));
   for(let i=0;i<unchanged.length;i++)assert.deepEqual((await functionMetadata(unchanged[i]))[0],adjacentBefore[i]);
   for(const role of ['anon','authenticated','service_role'])
     assert.equal(await val('SELECT has_function_privilege($1,$2,\'EXECUTE\') value',[role,sourceFingerprintSignature]),false);
   await db.exec(await read('../../supabase/rollbacks/'+xorMigration+'.rollback.sql'));
   const rolledBack=(await functionMetadata(sourceFingerprintSignature))[0];
   assert.deepEqual({...rolledBack,definition:normalizeDefinition(rolledBack.definition)},
     {...before,definition:normalizeDefinition(before.definition)});assert.equal(await sourceHash(),hashBefore);
 });
});

describe('financial report native PostgreSQL benchmark',{skip:process.env.FINANCIAL_REPORT_NATIVE_PERFORMANCE!=='1'},()=>{
 it('keeps 4000-journal activity byte-equivalent and removes quadratic accumulation',async()=>{
   let cluster,client;try{
     cluster=await startTemporaryPostgres();client=new pg.Client({...cluster.config,statement_timeout:120000});await client.connect();client.exec=sql=>client.query(sql);await setup(client);
     await manyJournals(4000);await admin();await db.exec('SET jit=off');
     const sql="SELECT financial_statement_private.activity($1,'2026-01-01','2026-08-31',$2) value";
     const baselineStart=performance.now();const before=await val(sql,[company,config]);const baseline=performance.now()-baselineStart;
     await install();await admin();const improvedStart=performance.now();const after=await val(sql,[company,config]);const improved=performance.now()-improvedStart;
     assert.deepEqual(after,before);assert.ok(improved<baseline/3,`Expected >3x improvement; before=${baseline}ms after=${improved}ms`);
     assert.ok(improved<5000,`Activity exceeded 5s synthetic budget: ${improved}ms`);
     console.log(JSON.stringify({benchmark:'synthetic activity',postgres:cluster.version,journals:after.journals.length,beforeMs:Math.round(baseline),afterMs:Math.round(improved),speedup:Math.round(baseline/improved)}));
   }finally{await client?.end();await cluster?.close();}
 });
});
