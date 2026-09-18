import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const company='22222222-2222-4222-8222-222222222222', customer='33333333-3333-4333-8333-333333333333';
const contract='55555555-5555-4555-8555-555555555555', invoice='11111111-1111-4111-8111-111111111111';
const other='77777777-7777-4777-8777-777777777777';
const migration='20260906223503_align_legal_claim_service_rent_classification';
const read=async path=>(await readFile(new URL(path,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
let db;
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
const claim=async(excluded=[]) => (await rows('SELECT public.calculate_legal_claim_statement_v4($1,$2,$3,$4,$5::uuid[]) value',
  [company,contract,'2026-09-07','full_outstanding',excluded]))[0].value;

describe('service rent classification in the deployed legal claim bodies',()=>{
  before(async()=>{
    db=new PGlite();
    const audit=await read('./legal-claim-source-audit.test.mjs');
    const start=audit.indexOf('CREATE ROLE authenticated;');
    await db.exec(audit.slice(start,audit.indexOf('`);',start)));
    await db.exec(await read('./fixtures/legal-claim-classification-baseline-20260907.sql'));
    await db.exec(`REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid,uuid,date) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[]) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_breakdown_v3(uuid,uuid,date) TO authenticated,service_role;
      GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[]) TO authenticated,service_role;`);
    await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
  });
  after(async()=>db?.close());
  beforeEach(async()=>{
    await db.exec('BEGIN');
    await rows("INSERT INTO contracts VALUES($1,$2,$3,'TEST','2024-01-01','2028-12-31','under_legal_procedure',2100,true,0)",[contract,company,customer]);
    await rows(`INSERT INTO invoices VALUES($1,$2,$3,$4,'2026-08-01','2026-08-01','2026-08-01','RENT','service',null,2100,0,2100,'unpaid','sent')`,[invoice,company,contract,customer]);
    await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status,invoice_id) VALUES($1,$2,'2026-08-01',2100,0,'pending',$3)",[company,contract,invoice]);
  });
  afterEach(async()=>db.exec('ROLLBACK'));

  it('includes proven service rent in both the total and disclosed invoice list',async()=>{
    const result=await claim();
    assert.equal(result.total,2100); assert.equal(result.excluded_amounts.non_rent_invoices,0);
    assert.deepEqual(result.included_invoices.map(i=>i.id),[invoice]);
  });
  it('preserves the unpaid remainder rather than adding a full installment',async()=>{
    await db.exec('UPDATE invoices SET balance_due=600,paid_amount=1500');
    assert.equal((await claim()).total,600);
  });
  it('does not count the linked installment twice',async()=>{
    assert.equal((await claim()).components.rent_due,2100);
  });
  it('keeps manual invoice exclusions effective for service rent',async()=>{
    const result=await claim([invoice]); assert.equal(result.total,0);
    assert.equal(result.excluded_amounts.manual_invoice_exclusions,2100);
  });
  it('keeps future service rent separate',async()=>{
    await db.exec("UPDATE invoices SET due_date='2026-10-01',invoice_month='2026-10-01'; UPDATE contract_payment_schedules SET due_date='2026-10-01'");
    const result=await claim(); assert.equal(result.total,0); assert.equal(result.excluded_amounts.future_rent,2100);
  });
  for(const [name,sql] of [
    ['missing link','DELETE FROM contract_payment_schedules'],
    ['wrong amount','UPDATE contract_payment_schedules SET amount=2000'],
    ['wrong month',"UPDATE contract_payment_schedules SET due_date='2026-07-01'"],
    ['wrong contract',`UPDATE contract_payment_schedules SET contract_id='${other}'`],
    ['wrong company',`UPDATE contract_payment_schedules SET company_id='${other}'`],
    ['cancelled link',"UPDATE contract_payment_schedules SET status='cancelled'"],
    ['inactive link',"UPDATE contract_payment_schedules SET status='inactive'"],
    ['duplicate links','INSERT INTO contract_payment_schedules SELECT gen_random_uuid(),company_id,contract_id,due_date,amount,paid_amount,status,invoice_id FROM contract_payment_schedules'],
    ['unrelated service type',"UPDATE invoices SET invoice_type='purchase'"],
    ['TV prefix',"UPDATE invoices SET invoice_number=' tv-123 '"]
  ]) it(`rejects ambiguous or non-rent evidence: ${name}`,async()=>{
    await db.exec(sql); assert.equal((await claim()).total,0);
  });
  it('excludes penalty-linked invoices',async()=>{
    await rows('UPDATE invoices SET penalty_id=$1',[other]); assert.equal((await claim()).total,0);
  });
  it('keeps ordinary sales invoices valid without a schedule',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='sales'; DELETE FROM contract_payment_schedules");
    assert.equal((await claim()).total,2100);
  });
  it('does not count a TV-prefixed sales invoice as rental debt',async()=>{
    await db.exec("UPDATE invoices SET invoice_type='sales',invoice_number='TV-123'");
    assert.equal((await claim()).total,0);
  });
  it('does not change recorded invoices or installment amounts',async()=>{
    const before=await rows('SELECT to_jsonb(i) value FROM invoices i'); await claim();
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
  });
  it('preserves invoker privileges and refuses anonymous execution',async()=>{
    assert.equal((await rows("SELECT bool_and(NOT prosecdef) safe FROM pg_proc WHERE proname IN ('calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4')"))[0].safe,true);
    assert.equal((await rows("SELECT has_function_privilege('anon','public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)','EXECUTE') allowed"))[0].allowed,false);
  });
  it('matches the reviewed calculator bodies after applying the patch',async()=>{
    const hashes=await rows("SELECT proname,md5(prosrc) hash FROM pg_proc WHERE proname IN ('calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4') ORDER BY proname");
    assert.deepEqual(hashes,[{"proname":"calculate_legal_claim_breakdown_v3","hash":"5c5211093c5cd8d6fae58618cde44462"},{"proname":"calculate_legal_claim_statement_v4","hash":"5ca5b12767113a97b0e841198b878357"}]);
  });

  for (const [name,sales,services,traffic,expected] of [
    ['LTO202429',38900,[600,2100,2100],3800,47500],
    ['LTO202436',33600,[2100],15100,50800],
  ]) it(`matches the reported ${name} claim including proven service rent`,async()=>{
    await db.exec('DELETE FROM invoices; DELETE FROM contract_payment_schedules');
    await rows("INSERT INTO invoices(company_id,contract_id,invoice_number,invoice_type,total_amount,balance_due,due_date) VALUES($1,$2,'SALES','sales',$3,$3,'2026-01-01')",[company,contract,sales]);
    for (const [index,balance] of services.entries()) {
      const date=`2026-0${index+2}-01`;
      const [{id}]=await rows("INSERT INTO invoices(company_id,contract_id,invoice_number,invoice_type,total_amount,balance_due,due_date,invoice_month) VALUES($1,$2,$3,'service',2100,$4,$5,$5) RETURNING id",[company,contract,`SERVICE-${index}`,balance,date]);
      await rows("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,invoice_id) VALUES($1,$2,$3,2100,$4)",[company,contract,date,id]);
    }
    await rows("INSERT INTO penalties(company_id,contract_id,amount,payment_status) VALUES($1,$2,$3,'unpaid')",[company,contract,traffic]);
    await rows("INSERT INTO contract_documents VALUES($1,$2,'violations_proof','evidence.pdf')",[company,contract]);
    assert.equal((await claim()).total,expected);
  });
  it('rolls back the definitions without touching business rows or permissions',async()=>{
    const before=await rows('SELECT to_jsonb(i) value FROM invoices i');
    const rollback=(await read(`../../supabase/rollbacks/${migration}.rollback.sql`))
      .replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
    await db.exec(rollback);
    assert.deepEqual(await rows('SELECT to_jsonb(i) value FROM invoices i'),before);
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE proname='calculate_legal_claim_breakdown_v3'"))[0].hash,'4a27cf9dcd1bfd202ffb80834de3f1a9');
    assert.equal((await rows("SELECT md5(prosrc) hash FROM pg_proc WHERE proname='calculate_legal_claim_statement_v4'"))[0].hash,'36b78342a4ecc47adcdc6f9c5825f641');
    assert.equal((await rows("SELECT has_function_privilege('anon','public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)','EXECUTE') allowed"))[0].allowed,false);
  });
});
