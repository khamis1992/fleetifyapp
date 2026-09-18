// Synthetic SQL equivalence and scaling checks. Never accepts a remote database URL.
import assert from 'node:assert/strict';
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
const migration='20260918002000_financial_statement_packages';
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
 await db.exec(await read('../../supabase/migrations/20260918001000_professional_balance_sheets.sql'));
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

const performanceMigration='20260918005000_financial_report_calculation_performance';
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
