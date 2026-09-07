import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { installIntegrityFixture } from './helpers/financial-integrity-fixture.mjs';
const read = p => readFile(new URL(p, import.meta.url), 'utf8');
const actor = '33333333-3333-4333-8333-333333333333';
const request = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const reason = 'العقد ملغي ولا توجد مطالبات حالية؛ الأقساط المعروضة غير مستحقة.';

test('self-service no-claim closure with real integrity and authorization functions', async t => {
  const db = new PGlite();
  try {
    await installIntegrityFixture(db);
    await db.exec(`ALTER TABLE contracts ADD COLUMN contract_number text,ADD COLUMN end_date date;
      ALTER TABLE invoices ADD COLUMN notes text;ALTER TABLE contract_payment_schedules ADD COLUMN notes text;
      ALTER TABLE financial_data_repair_snapshots ADD COLUMN rolled_back_at timestamptz;
      CREATE TABLE delinquent_customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,is_active boolean,
        overdue_amount numeric,late_penalty numeric,violations_amount numeric,total_debt numeric,months_unpaid integer,days_overdue integer,last_updated_at timestamptz);
      CREATE TABLE penalties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,amount numeric,
        responsibility_party text,status text,payment_status text);
      CREATE TABLE user_roles(user_id uuid,company_id uuid,role text);
      CREATE TABLE user_permissions(user_id uuid,permission_id text,granted boolean);
      CREATE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM public.profiles WHERE user_id=auth.uid() LIMIT 1 $$;`);
    await db.exec(await read('./fixtures/closure-finance-authorization-20260906.sql'));
    await db.exec(await read('./fixtures/closure-impact-20260906.sql'));
    await db.exec((await read('../../supabase/migrations/20260906172916_resolve_reviewed_contract_schedule_projections.sql')).split('CREATE TEMP TABLE reviewed_schedule_plan')[0] + 'COMMIT;');
    const f = JSON.parse(await read('./fixtures/c-alf-0053-no-current-claim-20260906.json'));
    const insert = async (table, row) => { const keys = Object.keys(row); await db.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_, i) => '$' + (i + 1)).join(',')})`, Object.values(row)); };
    await db.query('INSERT INTO companies VALUES($1)', [f.contract.company_id]);
    await db.query('INSERT INTO profiles(user_id,company_id) VALUES($1,$2)', [actor,f.contract.company_id]);
    await db.query("INSERT INTO user_roles VALUES($1,$2,'company_admin')", [actor,f.contract.company_id]);
    await db.query("SELECT set_config('fixture.uid',$1,false),set_config('fixture.role','authenticated',false)", [actor]);
    await db.exec('SET session_replication_role=replica');
    await insert('contracts',f.contract);
    for (const i of f.invoices) {
      await insert('invoices',i);
      if (i.paid_amount>0) await db.query("INSERT INTO payments(company_id,contract_id,invoice_id,amount,payment_status,transaction_type,payment_date) VALUES($1,$2,$3,$4,'completed','receipt','2026-09-01')",[i.company_id,i.contract_id,i.id,i.paid_amount]);
    }
    for (const s of f.schedules) await insert('contract_payment_schedules',s);
    await db.query('SELECT public.recalculate_contract_financial_state($1)',[f.contract.id]);
    await db.exec('SET session_replication_role=origin');
    await db.query("INSERT INTO contract_financial_reconciliation_queue(company_id,contract_id,status) VALUES($1,$2,'review')",[f.contract.company_id,f.contract.id]);
    await db.exec(await read('../../supabase/migrations/20260906192023_contract_no_claim_closure_workflow.sql'));
    await db.exec(await read('../../supabase/migrations/20260906192448_resolve_legacy_no_claim_closure_invoice_evidence.sql'));
    await db.exec(await read('../../supabase/migrations/20260906202626_close_cancelled_schedules_preserving_claims.sql'));
    const args=[f.contract.company_id,f.contract.id];
    const preview=async()=> (await db.query('SELECT public.preview_contract_no_claim_closure_v1($1,$2) v',args)).rows[0].v;
    const close=async(revision,key=request,text=reason)=> (await db.query('SELECT public.close_contract_no_claim_closure_v1($1,$2,$3,$4,$5) v',[...args,revision,key,text])).rows[0].v;
    const financialFacts=async()=> (await db.query("SELECT jsonb_build_object('invoices',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM invoices i),'payments',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM payments p),'allocations',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM payment_allocations a),'journals',(SELECT jsonb_agg(to_jsonb(j) ORDER BY id) FROM journal_entries j)) v")).rows[0].v;
    const facts=await financialFacts();
    await t.test('preview is read-only and keeps original remainder separate from current claims',async()=>{
      const p=await preview();assert.equal(p.eligible,true);assert.equal(p.schedule_count,17);assert.equal(p.review_amount,28050);assert.equal(p.canonical_paid,11550);assert.equal(p.outstanding,0);
      assert.deepEqual(await financialFacts(),facts);
    });
    await t.test('legacy missing links require one exact cancelled invoice and reject ambiguous matches',async()=>{
      await db.exec("UPDATE contract_payment_schedules SET cancelled_invoice_id=NULL,financial_hold_reason='cancelled_contract_obligation_review' WHERE due_date='2025-10-01'");
      const p=await preview();assert.equal(p.eligible,true);assert.equal(p.schedules.find(x=>x.due_date==='2025-10-01').invoice_number,'INV-C-ALF-0053-2025-10');
      await db.exec(`SET session_replication_role=replica;
        INSERT INTO invoices SELECT (jsonb_populate_record(NULL::public.invoices,to_jsonb(i)||jsonb_build_object('id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','invoice_number','DUPLICATE-CANCELLED'))).* FROM invoices i WHERE i.invoice_number='INV-C-ALF-0053-2025-10';
        SET session_replication_role=origin;`);
      assert.equal((await preview()).eligible,false);
      await db.exec("SET session_replication_role=replica;DELETE FROM invoices WHERE invoice_number='DUPLICATE-CANCELLED';SET session_replication_role=origin");
    });
    await t.test('anonymous, foreign company, explicit denial and raw helper access are rejected',async()=>{
      await db.exec('SET ROLE anon');await assert.rejects(preview(),/permission denied/);await db.exec('RESET ROLE');
      await assert.rejects(db.query('SELECT public.preview_contract_no_claim_closure_v1($1,$2)',['77777777-7777-4777-8777-777777777777',f.contract.id]),/صلاحية/);
      await db.query("INSERT INTO user_permissions VALUES($1,'finance.invoice.cancel',false)",[actor]);await assert.rejects(preview(),/صلاحية/);await db.exec('DELETE FROM user_permissions');
      await db.exec('SET ROLE authenticated');
      await assert.rejects(db.query('SELECT * FROM contract_finance_private.no_claim_closures'),/permission denied/);
      await assert.rejects(db.query('SELECT contract_finance_private.no_claim_snapshot($1,$2)',args),/permission denied/);
      assert.equal((await preview()).eligible,true);await db.exec('RESET ROLE');
    });
    await t.test('active contracts and unknown invoice origin are blocked',async()=>{
      await db.query("UPDATE contracts SET status='active' WHERE id=$1",[f.contract.id]);assert.equal((await preview()).eligible,false);
      await db.query("UPDATE contracts SET status='cancelled' WHERE id=$1",[f.contract.id]);
      await db.exec("UPDATE contract_payment_schedules SET financial_hold_reason='rental_invoice_origin_review' WHERE due_date='2025-05-01'");
      assert.equal((await preview()).eligible,false);
      await db.exec("UPDATE contract_payment_schedules SET financial_hold_reason='cancelled_invoice_obligation_review' WHERE due_date='2025-05-01'");
    });
    await t.test('customer penalties, unknown liability and pending receipts block no-claim approval',async()=>{
      await db.query("INSERT INTO penalties(company_id,contract_id,amount,responsibility_party,status,payment_status) VALUES($1,$2,100,'customer','open','unpaid')",args);
      assert.equal((await preview()).eligible,false);
      await db.exec('UPDATE penalties SET responsibility_party=NULL');assert.equal((await preview()).eligible,false);await db.exec('DELETE FROM penalties');
      await db.exec('SET session_replication_role=replica');
      await db.query("INSERT INTO payments(company_id,contract_id,amount,payment_status,transaction_type,payment_date) VALUES($1,$2,100,'pending','receipt','2026-09-01')",args);
      await db.exec('SET session_replication_role=origin');assert.equal((await preview()).eligible,false);
      await db.exec("SET session_replication_role=replica;DELETE FROM payments WHERE payment_status='pending';SET session_replication_role=origin");
    });
    await t.test('an open invoice or missing cancellation reversal blocks closure',async()=>{
      const extra='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      await db.exec('SET session_replication_role=replica');
      await db.query("INSERT INTO invoices(id,company_id,contract_id,invoice_number,invoice_month,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,invoice_type) VALUES($1,$2,$3,'OPEN-REVIEW','2026-09-01','2026-09-01','2026-09-01',100,0,100,'sent','unpaid','service')",[extra,...args]);
      await db.exec('SET session_replication_role=origin');
      const open=await preview();assert.equal(open.eligible,false);assert.ok(open.blockers.some(x=>x.includes('فواتير مفتوحة')));
      await db.exec('SET session_replication_role=replica');await db.query('DELETE FROM invoices WHERE id=$1',[extra]);
      await db.query("UPDATE invoices SET journal_entry_id=$1 WHERE invoice_number='INV-C-ALF-0053-2025-05'",[extra]);
      await db.exec('SET session_replication_role=origin');assert.equal((await preview()).eligible,false);
      await db.exec("SET session_replication_role=replica;UPDATE invoices SET journal_entry_id=NULL WHERE invoice_number='INV-C-ALF-0053-2025-05';SET session_replication_role=origin");
    });
    await t.test('stale preview and missing reason never close any schedule',async()=>{
      const p=await preview();await assert.rejects(close(p.revision,request,'قصير'),/سبب/);
      await db.exec("UPDATE contracts SET end_date='2027-01-31'");await assert.rejects(close(p.revision),/تغيرت/);await db.exec("UPDATE contracts SET end_date='2026-12-31'");
      assert.equal((await db.query('SELECT count(*)::int n FROM contract_finance_private.no_claim_closures')).rows[0].n,0);
    });
    await t.test('a failure halfway through rolls back schedules and all audit rows',async()=>{
      const p=await preview();
      await db.exec(`CREATE FUNCTION public.fail_closure_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='cancelled' AND NEW.due_date='2025-06-01' THEN RAISE EXCEPTION 'injected closure failure';END IF;RETURN NEW;END;$$;
        CREATE TRIGGER fail_closure_fixture BEFORE UPDATE ON contract_payment_schedules FOR EACH ROW EXECUTE FUNCTION fail_closure_fixture();`);
      await assert.rejects(close(p.revision),/injected closure failure/);
      assert.equal((await preview()).schedule_count,17);
      assert.equal((await db.query("SELECT count(*)::int n FROM financial_data_repair_snapshots WHERE migration_version LIKE 'contract_no_claim:%'")).rows[0].n,0);
      await db.exec('DROP TRIGGER fail_closure_fixture ON contract_payment_schedules;DROP FUNCTION fail_closure_fixture()');
    });
    await t.test('schedule-only closure preserves partially paid invoices, penalties and collection records',async()=>{
      const extra='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const preservePreview=async()=> (await db.query('SELECT public.preview_contract_schedule_closure_v1($1,$2) v',args)).rows[0].v;
      const preserveClose=async(revision)=> (await db.query('SELECT public.close_contract_schedule_closure_v1($1,$2,$3,$4,$5) v',[...args,revision,request,'إقفال الأقساط الملغاة مع إبقاء المطالبات والمسددات.'])).rows[0].v;
      const fails=async(action,pattern)=>{
        await db.exec('SAVEPOINT expected_failure');
        await assert.rejects(action(),pattern);
        await db.exec('ROLLBACK TO SAVEPOINT expected_failure; RELEASE SAVEPOINT expected_failure');
      };
      await db.exec('BEGIN');
      try {
        await db.exec('SET session_replication_role=replica');
        await db.query("INSERT INTO invoices(id,company_id,contract_id,invoice_number,invoice_month,invoice_date,due_date,total_amount,paid_amount,balance_due,status,payment_status,invoice_type) VALUES($1,$2,$3,'PARTIAL-RETAINED','2024-01-01','2024-01-01','2024-01-01',1600,1450,150,'overdue','partial','service')",[extra,...args]);
        await db.query("INSERT INTO payments(company_id,contract_id,invoice_id,amount,payment_status,transaction_type,payment_date) VALUES($1,$2,$3,1450,'completed','receipt','2024-01-01')",[...args,extra]);
        await db.query("INSERT INTO contract_payment_schedules(company_id,contract_id,invoice_id,due_date,amount,paid_amount,status) VALUES($1,$2,$3,'2024-01-01',1600,1450,'partial')",[...args,extra]);
        await db.query("INSERT INTO penalties(company_id,contract_id,amount,responsibility_party,status,payment_status) VALUES($1,$2,500,'customer','pending','unpaid')",args);
        await db.query("INSERT INTO delinquent_customers(company_id,contract_id,is_active,overdue_amount,violations_amount,total_debt) VALUES($1,$2,true,150,500,650)",args);
        await db.query('SELECT public.recalculate_contract_financial_state($1)',[f.contract.id]);
        await db.exec('SET session_replication_role=origin');
        const p=await preservePreview();
        assert.equal(p.eligible,true,JSON.stringify(p.blockers));assert.equal(p.closure_mode,'preserve_claims');
        assert.equal(p.outstanding,150);assert.equal(p.open_penalty_amount,500);
        assert.equal((await preview()).eligible,false);
        await db.exec('SET ROLE anon');await fails(preservePreview,/permission denied/);await db.exec('RESET ROLE');
        await db.exec('SET ROLE authenticated');
        await fails(()=>db.query('SELECT contract_finance_private.schedule_closure_snapshot($1,$2,$3)',[...args,'preserve_claims']),/permission denied/);
        await db.exec('RESET ROLE');
        await fails(()=>db.query('SELECT public.preview_contract_schedule_closure_v1($1,$2)',['77777777-7777-4777-8777-777777777777',f.contract.id]),/صلاحية/);
        await db.query("INSERT INTO user_permissions VALUES($1,'finance.invoice.cancel',false)",[actor]);
        await fails(preservePreview,/صلاحية/);await db.exec('DELETE FROM user_permissions');
        await db.exec("UPDATE penalties SET amount=510");
        await fails(()=>preserveClose(p.revision),/تغيرت/);await db.exec('UPDATE penalties SET amount=500');
        const before=await financialFacts();
        const preserved=async()=> (await db.query("SELECT jsonb_build_object('penalties',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM penalties p),'collection',(SELECT jsonb_agg(to_jsonb(d) ORDER BY id) FROM delinquent_customers d)) v")).rows[0].v;
        const priorClaims=await preserved();
        await db.exec("CREATE FUNCTION public.fail_preserve_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='cancelled' AND NEW.due_date='2025-06-01' THEN RAISE EXCEPTION 'injected preserve failure';END IF;RETURN NEW;END;$$; CREATE TRIGGER fail_preserve_fixture BEFORE UPDATE ON contract_payment_schedules FOR EACH ROW EXECUTE FUNCTION fail_preserve_fixture();");
        await fails(()=>preserveClose(p.revision),/injected preserve failure/);
        assert.equal((await preservePreview()).schedule_count,17);
        assert.equal((await db.query('SELECT count(*)::int n FROM contract_finance_private.no_claim_closures')).rows[0].n,0);
        await db.exec('DROP TRIGGER fail_preserve_fixture ON contract_payment_schedules;DROP FUNCTION fail_preserve_fixture()');
        await db.exec('SET ROLE authenticated');
        const result=await preserveClose(p.revision);const replay=await preserveClose(p.revision);
        assert.equal(result.closed_count,17);assert.equal(result.retained_invoice_amount,150);assert.equal(result.retained_penalty_amount,500);
        assert.equal(result.canonical_paid,p.canonical_paid);assert.equal(replay.closure_id,result.closure_id);assert.equal(replay.replayed,true);
        await fails(()=>close(p.revision,request,'إقفال الأقساط الملغاة مع إبقاء المطالبات والمسددات.'),/قرار مختلف/);
        await db.exec('RESET ROLE');
        assert.deepEqual(await financialFacts(),before);assert.deepEqual(await preserved(),priorClaims);
        const after=(await db.query('SELECT public.contract_financial_integrity_snapshot_internal_v1($1,$2) v',args)).rows[0].v;
        assert.equal(after.review_amount,0);assert.equal(after.outstanding,150);assert.equal(after.canonical_paid,p.canonical_paid);
        await fails(()=>db.exec("UPDATE contract_payment_schedules SET status='pending' WHERE due_date='2025-05-01'"),/مراجعة موثقة/);
        await fails(()=>db.query("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status) VALUES($1,$2,'2025-05-01',1650,0,'pending')",args),/مراجعة موثقة/);
        await db.exec((await read('../../supabase/rollbacks/20260906202626_close_cancelled_schedules_preserving_claims.rollback.sql')).replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
        assert.equal((await db.query('SELECT count(*)::int n FROM contract_finance_private.no_claim_closures')).rows[0].n,1);
        await fails(()=>db.exec("UPDATE contract_payment_schedules SET status='pending' WHERE due_date='2025-05-01'"),/مراجعة موثقة/);
      } finally { await db.exec('ROLLBACK'); }
    });
    await t.test('authorized approval is atomic, replay-safe, preserves financial facts and prevents rebilling',async()=>{
      const p=await preview();await db.exec('SET ROLE authenticated');const result=await close(p.revision);const replay=await close(p.revision);await db.exec('RESET ROLE');
      assert.equal(result.closed_count,17);assert.equal(result.canonical_paid,11550);assert.equal(replay.replayed,true);assert.equal(result.closure_id,replay.closure_id);
      await assert.rejects(close(p.revision,request,'سبب آخر مختلف مع استخدام رقم الطلب نفسه.'),/قرار مختلف/);
      assert.deepEqual(await financialFacts(),facts);
      const state=(await db.query('SELECT public.contract_financial_integrity_snapshot_internal_v1($1,$2) v',args)).rows[0].v;
      assert.equal(state.review_amount,0);assert.equal(state.outstanding,0);assert.equal(state.canonical_paid,11550);
      await assert.rejects(db.exec("UPDATE contract_payment_schedules SET status='pending' WHERE due_date='2025-05-01'"),/مراجعة موثقة/);
      await assert.rejects(db.query("INSERT INTO contract_payment_schedules(company_id,contract_id,due_date,amount,paid_amount,status) VALUES($1,$2,'2025-05-01',1650,0,'pending')",args),/مراجعة موثقة/);
      assert.ok((await db.query("SELECT cancelled_invoice_id FROM contract_payment_schedules WHERE due_date='2025-10-01'")).rows[0].cancelled_invoice_id);
      await db.exec(await read('../../supabase/rollbacks/20260906202626_close_cancelled_schedules_preserving_claims.rollback.sql'));
      await db.exec(await read('../../supabase/rollbacks/20260906192448_resolve_legacy_no_claim_closure_invoice_evidence.rollback.sql'));
      await db.exec(await read('../../supabase/rollbacks/20260906192023_contract_no_claim_closure_workflow.rollback.sql'));
      assert.equal((await db.query('SELECT count(*)::int n FROM contract_finance_private.no_claim_closures')).rows[0].n,1);
      await assert.rejects(db.exec("UPDATE contract_payment_schedules SET status='pending' WHERE due_date='2025-05-01'"),/مراجعة موثقة/);
    });
  } finally { await db.close(); }
});
