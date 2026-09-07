import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {installIntegrityFixture,seedIntegrityFixture} from './helpers/financial-integrity-fixture.mjs';
import {ids} from './helpers/collected-fee-fixture.mjs';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('confirmed rent replaces two unpaid invoices with exact reversals and balanced 1700 journals',async()=>{
 const db=new PGlite();const priorCompany=ids.company;ids.company='24bc0b21-4e2d-4413-9842-31719a3669f4';
 try{
  await installIntegrityFixture(db);await seedIntegrityFixture(db);
  await db.exec(`ALTER TABLE public.companies ADD COLUMN currency text DEFAULT 'QAR';
   ALTER TABLE public.contracts ADD COLUMN contract_number text,ADD COLUMN start_date date,ADD COLUMN end_date date,ADD COLUMN cost_center_id uuid,ADD COLUMN customer_id uuid;
   ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text,ADD COLUMN IF NOT EXISTS subtotal numeric,ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,ADD COLUMN IF NOT EXISTS currency text DEFAULT 'QAR',ADD COLUMN IF NOT EXISTS cost_center_id uuid,ADD COLUMN IF NOT EXISTS created_by uuid;
   ALTER TABLE public.invoices ALTER COLUMN id SET DEFAULT gen_random_uuid();
   ALTER TABLE public.contract_payment_schedules ADD COLUMN notes text;
   ALTER TABLE public.financial_data_repair_snapshots ADD COLUMN rolled_back_at timestamptz;
   CREATE TABLE public.invoice_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid,line_number integer,item_description text,item_description_ar text,
     quantity numeric,unit_price numeric,line_total numeric,tax_rate numeric,tax_amount numeric,cost_center_id uuid);`);
  const revenue=(await db.query("INSERT INTO chart_of_accounts(company_id,account_name,account_type,balance_type,is_active,is_header,account_level) VALUES($1,'Rental revenue','revenue','credit',true,false,3) RETURNING id",[ids.company])).rows[0].id;
  const type=(await db.query("INSERT INTO default_account_types(type_code) VALUES('RENTAL_REVENUE') RETURNING id")).rows[0].id;
  await db.query('INSERT INTO account_mappings(company_id,chart_of_accounts_id,default_account_type_id,is_active) VALUES($1,$2,$3,true)',[ids.company,revenue,type]);
  for(const f of JSON.parse(await read('./fixtures/reviewed-invoice-generation-functions-20260906.json')))await db.exec(f.definition+';');
  await db.exec('CREATE TRIGGER trg_invoice_journal_entry BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION trg_invoice_journal_entry_fn();');
  const mr=JSON.parse(await read('./fixtures/reviewed-schedule-projections-20260906.json')).find(c=>c.contract.contract_number==='MR202467');
  const insert=async(table,row)=>{const cols=Object.keys(row);await db.query('INSERT INTO '+table+'('+cols.join(',')+') VALUES('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));};
  await insert('contracts',{...mr.contract,start_date:'2024-11-05',customer_id:ids.customer,total_paid:0,balance_due:19500});
  for(const i of mr.invoices)await insert('invoices',{...i,subtotal:i.total_amount});
  for(const s of mr.schedules)await insert('contract_payment_schedules',{...s,status:s.due_date==='2025-12-01'?'cancelled':s.status,financial_hold_reason:[300,6000].includes(s.amount)?'rental_invoice_origin_review':null});
  await db.query("INSERT INTO contract_financial_reconciliation_queue(company_id,contract_id,status) VALUES($1,$2,'review') ON CONFLICT DO NOTHING",[ids.company,mr.contract.id]);
  const originalLines=(await db.query('SELECT id,debit_amount,credit_amount FROM journal_entry_lines ORDER BY id')).rows;
  await db.exec(await read('../../scripts/sql/reissue-reviewed-unpaid-rental-invoice.sql'));
  await assert.rejects(db.query('SELECT pg_temp.reissue_reviewed_unpaid_rental_invoice($1,$2,$3,299,1700,$4)',
   [ids.company,mr.contract.id,'INV-202506-00004','Reject a stale invoice amount before any financial write']),/no longer matches/);
  assert.deepEqual((await db.query('SELECT id,debit_amount,credit_amount FROM journal_entry_lines ORDER BY id')).rows,originalLines);
  const apply=await read('../../supabase/migrations/20260906180953_correct_mr202467_reviewed_rent.sql');
  await db.exec(apply);
  const state=(await db.query('SELECT public.contract_financial_integrity_snapshot_internal_v1($1,$2) s',[ids.company,mr.contract.id])).rows[0].s;
  assert.equal(state.outstanding,18400);assert.equal(state.review_amount,0);assert.deepEqual(state.issues,[]);
  assert.equal((await db.query("SELECT count(*)::int n FROM invoices WHERE contract_id=$1 AND total_amount=1700 AND status<>'cancelled'",[mr.contract.id])).rows[0].n,2);
  // Posted originals stay in the ledger alongside their exact posted reversals.
  const reversalPairs=async()=> (await db.query("SELECT count(*)::int n FROM journal_entries j WHERE j.status='posted' AND j.reversal_entry_id IS NOT NULL AND public.journal_entries_are_exact_reversals(j.id,j.reversal_entry_id)")).rows[0].n;
  const netRevenue=async()=>Number((await db.query('SELECT sum(credit_amount-debit_amount) net FROM journal_entry_lines l JOIN journal_entries j ON j.id=l.journal_entry_id WHERE l.account_id=$1 AND j.status=\'posted\'',[revenue])).rows[0].net);
  assert.equal(await reversalPairs(),2);
  assert.equal(await netRevenue(),18400);
  for(const old of originalLines)assert.deepEqual((await db.query('SELECT id,debit_amount,credit_amount FROM journal_entry_lines WHERE id=$1',[old.id])).rows[0],old);
  const snapshots=(await db.query("SELECT metadata FROM financial_data_repair_snapshots WHERE migration_version='20260906180050'")).rows;
  for(const x of snapshots)assert.equal((await db.query('SELECT public.system_invoice_has_single_balanced_posted_journal($1,$2,1700) ok',[ids.company,x.metadata.correction.replacement_invoice_id])).rows[0].ok,true);
  await db.exec(await read('../../supabase/rollbacks/20260906180953_correct_mr202467_reviewed_rent.rollback.sql'));
  const restored=(await db.query("SELECT total_amount::float8 amount FROM invoices WHERE contract_id=$1 AND invoice_month IN('2025-06-01','2025-09-01') AND status<>'cancelled' ORDER BY invoice_month",[mr.contract.id])).rows;
  assert.deepEqual(restored,[{amount:300},{amount:6000}]);
  assert.equal(await reversalPairs(),4);
  assert.equal(await netRevenue(),21300);
 }finally{ids.company=priorCompany;await db.close();}
});
