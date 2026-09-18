// Real SQL, isolated synthetic company. Never connects to a remote database.
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
 await db.exec(await read('../../supabase/migrations/20260918005000_financial_report_calculation_performance.sql')); 
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
describe('financial statement packages: source computation and protected review',{concurrency:false},()=>{
 beforeEach(async()=>setup());afterEach(async()=>db?.close());
 it('calculates all five statements with current and comparative reconciliation',async()=>{
   const r=await get();assert.deepEqual(codes(r),[]);assert.equal(r.statements.length,5);
   assert.deepEqual(row(r,'position','assets_total'),[1550,1200]);assert.deepEqual(row(r,'profit_loss_oci','profit'),[350,200]);
   assert.deepEqual(row(r,'cash_flow','operating'),[350,200]);assert.deepEqual(row(r,'cash_flow','financing'),[0,1000]);
   assert.deepEqual(row(r,'cash_flow','difference'),[0,0]);assert.ok(row(r,'equity_current','difference').every(x=>x===0));
   assert.deepEqual(row(r,'equity_current','closing'),[1000,0,550,0,0,1550]);
   assert.equal(r.configuration.scope,'individual_entity');assert.equal(r.company.currency,'QAR');
   if(process.env.WRITE_FINANCIAL_STATEMENT_SQL_FIXTURE==='1'){
     await mkdir(new URL('../fixtures/',import.meta.url),{recursive:true});
     await writeFile(new URL('../fixtures/financial-statement-package-sql.json',import.meta.url),JSON.stringify(r,null,2)+'\n');
   }
 });
 it('keeps gross receipts/payments separate, cash transfers excluded, and classification labels required',async()=>{
   let r=await get();const rows=r.statements.find(s=>s.key==='cash_flow').rows;
   assert.equal(rows.find(r=>r.key===`operating_receipts_${revenue}`).values[0],400);
   assert.equal(rows.find(r=>r.key===`operating_payments_${expense}`).values[0],-50);
   const bank='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9';await admin();
   await db.query(`INSERT INTO chart_of_accounts(id,company_id,account_code,account_name,account_type,account_subtype,account_level,is_header,is_active) VALUES($1,$2,'bank','Bank','asset','current_asset',3,false,true)`,[bank,company]);
   config.accountMappings.push(mapping(bank,'cash',null,null,true));await journal({debits:[[bank,100]],credits:[[cash,100]]});
   r=await get();assert.deepEqual(codes(r),[]);assert.deepEqual(row(r,'cash_flow','operating'),[350,200]);
   const id=await journal({debits:[[fixed,50]],credits:[[cash,20],[liability,30]]});override(id,null,[{category:'investing',amount:-20,label:''}]);
   await assert.rejects(get(),/Invalid cash flow allocation/);
 });
 it('requires exact gross flows with explicit internal-transfer allocation for mixed directions',async()=>{
   const id=await journal({debits:[[cash,200]],credits:[[cash,100],[revenue,100]]});
   override(id,null,[{category:'operating',amount:100,label:'Customer receipts'}]);
   assert.ok(codes(await get()).includes('cash_flow_allocation_mismatch'));
   config.journalOverrides.at(-1).cashFlows.push({category:'operating',amount:100,label:'More receipts'},{category:'operating',amount:-100,label:'Actual payments'});
   assert.deepEqual(codes(await get()),[]);
   config.journalOverrides.at(-1).cashFlows=[{category:'operating',amount:100,label:'Customer receipts'}];
   config.journalOverrides.at(-1).internalCashTransfer=100;assert.deepEqual(codes(await get()),[]);
   config.journalOverrides.at(-1).internalCashTransfer=101;assert.ok(codes(await get()).includes('cash_flow_allocation_mismatch'));
 });
 it('does not apply prior year-end liability splits to unused opening/comparative performance dates',async()=>{
   await journal({date:'2025-02-01',debits:[[cash,100]],credits:[[liability,100]]});
   await journal({date:'2025-12-01',debits:[[cash,200]],credits:[[liability,200]]});
   config.accountMappings.find(m=>m.accountId===liability).comparisonSplit={line:'noncurrent_borrowings',amount:200};
   const r=await get();assert.deepEqual(codes(r),[]);assert.deepEqual(row(r,'position','current_borrowings'),[300,100]);
   assert.deepEqual(row(r,'position','noncurrent_borrowings'),[0,200]);
 });
 it('reconciles dated equity presentation splits as zero-total transfers without reusing year-end amounts at interim cutoffs',async()=>{
   const m=config.accountMappings.find(m=>m.accountId===capital);
   m.currentSplit={line:'other_equity',amount:300};m.comparisonSplit={line:'other_equity',amount:200};
   const r=await get();assert.deepEqual(codes(r),[]);
   assert.deepEqual(row(r,'equity_current','opening'),[800,0,200,0,200,1200]);
   assert.deepEqual(row(r,'equity_current','transfers'),[-100,0,0,0,100,0]);
   assert.deepEqual(row(r,'equity_current','closing'),[700,0,550,0,300,1550]);
   assert.deepEqual(row(r,'equity_comparative','closing'),[1000,0,200,0,0,1200]);
 });
 it('rejects external equity funding mislabeled as a transfer between components',async()=>{
   const id=await journal({debits:[[cash,100]],credits:[[capital,100]]});override(id,'transfers');
   assert.ok(codes(await get()).includes('invalid_equity_transfer'));
   config.journalOverrides.at(-1).equityCategory='contributions';assert.deepEqual(codes(await get()),[]);
 });
 it('rejects malformed or oversized configurations before they can break saved history',async()=>{
   await assert.rejects(save({...config,unexpected:true}),/configuration keys/);
   await assert.rejects(save({...config,version:'1'}),/configuration/);
   for(const [key,value] of [['number',100],['number','1'],['text',null],['text','x'.repeat(20001)],['evidence','x'.repeat(4001)]]){
     const bad=structuredClone(config);bad.notes[0][key]=value;await assert.rejects(save(bad),/disclosure note/);
   }
   const bad=structuredClone(config);bad.accountMappings[0].unexpected=true;await assert.rejects(save(bad),/mapping keys/);
   const longReason=structuredClone(config);longReason.journalOverrides[0].reason='x'.repeat(2001);await assert.rejects(save(longReason),/classification/);
   const huge=JSON.stringify(config).replace('"internalCashTransfer":0','"internalCashTransfer":1e400');
   await assert.rejects(val('SELECT public.save_financial_statement_package_v1($1,$2::jsonb) value',[company,huge]),/classification/);
   const split=structuredClone(config);split.accountMappings.find(m=>m.accountId===capital).currentSplit={line:'other_equity',amount:1e100};await assert.rejects(save(split),/position split/);
   assert.deepEqual(await val('SELECT public.list_financial_statement_packages_v1($1) value',[company]),[]);
 });
 it('shows unclassified amounts in drafts and groups maturity subtotals without hiding totals',async()=>{
   config.accountMappings.find(m=>m.accountId===revenue).incomeLine=null;
   config.accountMappings=config.accountMappings.filter(m=>m.accountId!==capital);
   const r=await get();assert.deepEqual(row(r,'profit_loss_oci','unclassified_income'),[400,200]);
   assert.deepEqual(row(r,'position','unclassified_equity'),[1000,1000]);assert.deepEqual(row(r,'position','current_assets_total'),[1550,1200]);
   const keys=r.statements.find(s=>s.key==='position').rows.map(r=>r.key);
   assert.ok(keys.indexOf('assets_total')<keys.indexOf('current_liabilities'));
   assert.ok(keys.indexOf('liabilities_total')<keys.indexOf('equity'));
   assert.ok(codes(r).includes('income_mapping_missing'));assert.ok(codes(r).includes('position_mapping_missing'));
 });
 it('uses explicit reviewed package mappings when legacy chart maturity is absent',async()=>{
   await admin();await db.query('UPDATE chart_of_accounts SET account_subtype=NULL WHERE id=$1',[cash]);await auth();
   const r=await get();assert.ok(r.position.checks.some(c=>c.code==='unclassified_accounts'));assert.deepEqual(codes(r),[]);
 });
 it('aggregates more than 1000 lines without dropping rows, including inactive accounts and later cutoffs',async()=>{
   await admin();await db.query(`WITH entries AS(INSERT INTO journal_entries(company_id,entry_date,status,total_debit,total_credit)
     SELECT $1,'2026-04-01','posted',1,1 FROM generate_series(1,600) RETURNING id)
     INSERT INTO journal_entry_lines(journal_entry_id,account_id,line_number,debit_amount,credit_amount)
     SELECT id,$2::uuid,1,1,0 FROM entries UNION ALL SELECT id,$3::uuid,2,0,1 FROM entries`,[company,cash,revenue]);
   await db.query('UPDATE chart_of_accounts SET is_active=false WHERE id=$1',[revenue]);await auth();
   await journal({date:'2026-09-01',debits:[[cash,999]],credits:[[revenue,999]]});
   const r=await get();assert.deepEqual(row(r,'profit_loss_oci','profit'),[950,200]);assert.deepEqual(row(r,'cash_flow','closing'),[2150,1200]);
   assert.equal(r.journals.length,604);assert.deepEqual(codes(r),[]);
 });
 it('excludes closing and its reversal chain from performance, preserving equity and historical cutoffs',async()=>{
   const close=await journal({date:'2026-06-30',debits:[[revenue,400]],credits:[[expense,50],[retained,350]],referenceType:'annual_close'});
   let r=await get();assert.deepEqual(row(r,'profit_loss_oci','profit'),[350,200]);assert.deepEqual(codes(r),[]);
   assert.equal(r.journals.find(j=>j.id===close).effectiveTreatment,'closing');assert.equal(r.journals.find(j=>j.id===close).isCanonicalClosing,true);
   override(close);await assert.rejects(get(),/Canonical closing/);config.journalOverrides.pop();
   const reversal=await journal({date:'2026-07-01',debits:[[expense,50],[retained,350]],credits:[[revenue,400]],referenceType:'journal_reversal',referenceId:close});
   await journal({date:'2026-07-02',debits:[[revenue,400]],credits:[[expense,50],[retained,350]],referenceType:'reversal',referenceId:reversal});
   r=await get();assert.deepEqual(row(r,'profit_loss_oci','profit'),[350,200]);assert.ok(row(r,'equity_current','difference').every(x=>x===0));assert.deepEqual(codes(r),[]);
 });
 it('blocks an inappropriate closing override and annual carryforward journals',async()=>{
   const id=await journal();override(id,null,[],'closing');assert.ok(codes(await get()).includes('invalid_closing_journal'));
   await journal({debits:[[cash,100]],credits:[[capital,100]],referenceType:'annual_close_opening'});
   assert.ok(codes(await get()).includes('carryforward_requires_review'));
 });
 it('rejects contradictory regular overrides on reversals of manually reviewed closing entries',async()=>{
   const close=await journal({debits:[[revenue,400]],credits:[[expense,50],[retained,350]]});override(close,null,[],'closing');
   const reversal=await journal({debits:[[expense,50],[retained,350]],credits:[[revenue,400]],referenceType:'reversal',referenceId:close});
   let r=await get();assert.equal(r.journals.find(j=>j.id===reversal).effectiveTreatment,'closing');assert.deepEqual(codes(r),[]);
   override(reversal);await assert.rejects(get(),/selected closing families/);
 });
 it('requires explicit mixed cash/noncash allocation and rejects invented offsetting amounts',async()=>{
   const id=await journal({debits:[[fixed,1000]],credits:[[cash,100],[liability,900]]});
   let r=await get();assert.ok(codes(r).includes('complex_cash_flow_requires_allocation'));assert.ok(codes(r).includes('cash_flow_reconciliation_difference'));
   override(id,null,[{category:'investing',amount:-100}]);r=await get();assert.deepEqual(codes(r),[]);assert.deepEqual(row(r,'cash_flow','investing'),[-100,0]);
   config.journalOverrides.at(-1).cashFlows=[{category:'investing',amount:-1000000,label:'Vehicle purchase'},{category:'financing',amount:999900,label:'Loan proceeds'}];
   assert.ok(codes(await get()).includes('cash_flow_allocation_mismatch'));
 });
 it('retains signed contra balances and permits only conserving signed presentation splits',async()=>{
   await journal({debits:[[cash,300]],credits:[[liability,300]]});
   const m=config.accountMappings.find(x=>x.accountId===liability);m.currentSplit={line:'noncurrent_borrowings',amount:200};
   let r=await get();assert.deepEqual(row(r,'position','current_borrowings'),[100,0]);assert.deepEqual(row(r,'position','noncurrent_borrowings'),[200,0]);assert.deepEqual(codes(r),[]);
   m.currentSplit.amount=301;assert.ok(codes(await get()).includes('position_split_exceeds_balance'));
   m.currentSplit.amount=-1;assert.ok(codes(await get()).includes('position_split_exceeds_balance'));
 });
 it('handles OCI and reviewed owner distributions in the equity matrix',async()=>{
   const oci=await journal({debits:[[fixed,25]],credits:[[reserve,25]]});override(oci,'oci_nonreclassifiable');
   const distribution=await journal({debits:[[retained,40]],credits:[[cash,40]]});override(distribution,'distributions');
   const r=await get();assert.deepEqual(codes(r),[]);assert.deepEqual(row(r,'profit_loss_oci','total_comprehensive_income'),[375,200]);
   assert.equal(row(r,'equity_current','oci').at(-1),25);assert.equal(row(r,'equity_current','distributions').at(-1),-40);assert.ok(row(r,'equity_current','difference').every(x=>x===0));
 });
 it('blocks incomplete legal form/disclosures/third position and missing comparative evidence',async()=>{
   config.legalForm='unspecified';config.notes.find(x=>x.code==='equity').status='pending';config.requiresThirdPosition=true;
   const r=await get();for(const code of ['legal_form_required','disclosure_equity_incomplete','third_position_required'])assert.ok(codes(r).includes(code));
   config=configuration();config.periodStart='2025-01-01';config.periodEnd='2025-08-31';config.positionComparisonDate='2024-12-31';config.comparativePeriodStart='2024-01-01';config.comparativePeriodEnd='2024-08-31';
   assert.ok(codes(await get()).includes('comparison_source_missing'));
 });
 it('requires matching annual/YTD comparisons and verifies third opening position',async()=>{
   config.kind='annual';await assert.rejects(get(),/Reporting dates/);
   config.kind='interim';config.comparativePeriodEnd='2025-07-31';await assert.rejects(get(),/Reporting dates/);
   config.comparativePeriodEnd='2025-08-31';config.thirdPositionDate='2024-12-31';config.requiresThirdPosition=true;
   const r=await get();assert.equal(r.statements[0].columns.length,3);assert.deepEqual(row(r,'position','assets_total'),[1550,1200,0]);
 });
 it('rejects tenant mismatch, foreign account/overrides, duplicate and mistyped mappings, and anonymous callers',async()=>{
   await assert.rejects(get(config,foreign),/Not authorized/);
   config.accountMappings[0].accountId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa99';await assert.rejects(get(),/Mapping account/);
   config=configuration();config.accountMappings.push(config.accountMappings[0]);await assert.rejects(get(),/Duplicate/);
   config=configuration();config.accountMappings[0].positionLine='share_capital';await assert.rejects(get(),/incompatible/);
   config=configuration();await auth(null,null,'anon');await assert.rejects(get(),/permission denied/);
 });
 it('server computes immutable saved records and requires independent fresh-source approval',async()=>{
   const s=await save();assert.equal(s.status,'draft');assert.equal(s.payload.fingerprint,s.source_fingerprint);
   await assert.rejects(approve(s.id),/Generator cannot approve/);
   await auth(reviewer);const approved=await approve(s.id);assert.equal(approved.status,'approved');
   await assert.rejects(db.query("UPDATE professional_financial_statement_packages SET status='draft' WHERE id=$1",[s.id]),/permission denied/);
   await admin();await assert.rejects(db.query("UPDATE professional_financial_statement_packages SET payload='{}' WHERE id=$1",[s.id]),/immutable/);
   await assert.rejects(db.query('DELETE FROM professional_financial_statement_packages WHERE id=$1',[s.id]),/cannot be deleted/);
   await auth();const stale=await save();await journal({date:'2025-03-01'});await auth(reviewer);await assert.rejects(approve(stale.id),/source changed/);
   assert.deepEqual((await val('SELECT payload value FROM professional_financial_statement_packages WHERE id=$1',[s.id])),s.payload);
 });
 it('enforces explicit permission denial and blocking review findings on approval',async()=>{
   config.notes[0].status='pending';const s=await save();await auth(reviewer);await assert.rejects(approve(s.id),/blocking review findings/);
   await admin();await db.query("INSERT INTO user_permissions VALUES($1,'finance.reports.view',false)",[reviewer]);await auth(reviewer);await assert.rejects(get(),/Not authorized/);
 });
 it('rejects approval from a fixed repeatable-read transaction snapshot',async()=>{
   const s=await save();await auth(reviewer);await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
   await assert.rejects(approve(s.id),/requires read committed isolation/);await db.exec('ROLLBACK');
 });
 it('voids without rewriting approved history and rollback preserves snapshots and events',async()=>{
   const s=await save();await auth(reviewer);await approve(s.id);
   const v=await val('SELECT public.void_financial_statement_package_v1($1,$2) value',[s.id,'Superseded by a new reviewed version']);
   assert.equal(v.status,'voided');assert.equal(v.approved_by,reviewer);assert.deepEqual(v.payload,s.payload);
   await admin();await db.exec(await read(`../../supabase/rollbacks/${migration}.rollback.sql`));
   assert.equal((await query('SELECT count(*) n FROM professional_financial_statement_packages'))[0].n,1);
   assert.equal((await query('SELECT count(*) n FROM financial_statement_private.report_events'))[0].n,3);
 });
});

describe('financial statement package native PostgreSQL source locking',{skip:process.env.FINANCIAL_STATEMENT_NATIVE_CONCURRENCY!=='1'},()=>{
 it('checks newly committed sources after waiting and blocks concurrent source writes until approval commits',async()=>{
   let cluster,owner,writer,approver;
   try{
     cluster=await startTemporaryPostgres();owner=new pg.Client(cluster.config);writer=new pg.Client(cluster.config);approver=new pg.Client(cluster.config);
     await Promise.all([owner.connect(),writer.connect(),approver.connect()]);owner.exec=sql=>owner.query(sql);await setup(owner);
     const original=await save();await approver.query("SELECT set_config('test.uid',$1,false),set_config('test.company',$2,false)",[reviewer,company]);await approver.query('SET ROLE authenticated');await admin();
     const waitForLock=async client=>{
       for(let n=0;n<100;n++){
         const result=await owner.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[client.processID]);
         if(result.rows[0]?.wait_event_type==='Lock')return;await new Promise(resolve=>setTimeout(resolve,20));
       }
       assert.fail('Expected a source table lock wait');
     };
     await writer.query('BEGIN');await writer.query("UPDATE journal_entry_lines SET line_description='Source update concurrent with review' WHERE account_id=$1",[cash]);
     const waiting=approver.query('SELECT public.approve_financial_statement_package_v1($1,$2,$3) value',[original.id,'Reviewed all statements and source reconciliations.',review]).then(result=>({result}),error=>({error}));
     await waitForLock(approver);await writer.query('COMMIT');assert.equal((await waiting).error?.code,'40001');
     await auth();const fresh=await save();await admin();await approver.query('BEGIN');
     const approved=await approver.query('SELECT public.approve_financial_statement_package_v1($1,$2,$3) value',[fresh.id,'Reviewed all statements and source reconciliations.',review]);
     assert.equal(approved.rows[0].value.status,'approved');
     const changed=writer.query("UPDATE journal_entry_lines SET line_description='Later ledger update' WHERE account_id=$1",[cash]);
     await waitForLock(writer);await approver.query('COMMIT');await changed;
     const retained=(await owner.query('SELECT payload FROM professional_financial_statement_packages WHERE id=$1',[fresh.id])).rows[0].payload;
     assert.deepEqual(retained,fresh.payload);
   }finally{
     await Promise.allSettled([writer?.end(),approver?.end(),owner?.end()]);await cluster?.close();
   }
 });
});
