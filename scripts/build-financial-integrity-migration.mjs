import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const live = JSON.parse(await read('tests/database/fixtures/financial-integrity-live-20260906.json'));
const extra = JSON.parse(await read('tests/database/fixtures/financial-integrity-extra-20260906.json'));
let sql = await read('supabase/migrations/20260906081942_canonical_settlement_trigger_writers.sql');
const begin = sql.indexOf("  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.invoices'");
const end = sql.indexOf("  IF (SELECT md5(prosrc)", begin);
sql = sql.slice(0, begin) + `  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.sync_receipt_on_invoice_update()'))
      IS DISTINCT FROM '330e1ba91be25f6b05f7c265d4e59484' THEN
    RAISE EXCEPTION 'Historical receipt writer differs from inspected schema';
  END IF;
` + sql.slice(end);
sql = sql.replace('-- Deployment candidate. Retire the invoice -> historical receipt writer first.', '-- Production-compatible integrity repair; no new fee policy or fee command dependency.');
sql = sql.replace('DROP TRIGGER contract_payment_delete_trigger', 'DROP TRIGGER trg_sync_receipt_on_invoice_update ON public.invoices RESTRICT;\nDROP TRIGGER contract_payment_delete_trigger');
// The existing canonical helper is hardened below, so every caller shares it.
sql = sql.replace(/\nCOMMIT;\s*$/, '\n');
sql += await read('scripts/sql/contract-financial-integrity-runtime.sql');
const changedFunctions=['cancel_contract_future_schedules','detach_schedules_on_invoice_cancel','auto_link_invoice_to_schedule','reconcile_contract_schedules_v1','contract_financial_self_healing_sweep','generate_due_contract_invoices_v1'];
const checkedFunctions=changedFunctions.map(name=>[...live.functions,...extra.functions].find(x=>x.name===name));
const expectedValues=checkedFunctions.map(f=>`('${f.name}','${f.hash}')`).join(',\n');
sql=sql.replace('DO $preflight$',`DO $integrity_preflight$
DECLARE item record;
BEGIN
 FOR item IN SELECT * FROM (VALUES ${expectedValues}) f(name,hash) LOOP
  IF (SELECT md5(prosrc) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=item.name) IS DISTINCT FROM item.hash THEN
   RAISE EXCEPTION 'Integrity function % changed since inspection',item.name;
  END IF;
 END LOOP;
END;
$integrity_preflight$;
DO $preflight$`);
const generator = extra.functions.find(x=>x.name==='generate_due_contract_invoices_v1');
const guardedGenerator = generator.definition.replaceAll('AND schedule.invoice_id IS NULL', 'AND schedule.financial_hold_reason IS NULL\n        AND schedule.invoice_id IS NULL');
if(guardedGenerator===generator.definition) throw Error('Invoice generation candidate guard not installed');
sql=sql.replace(/COMMIT;\s*$/,guardedGenerator+';\nCOMMIT;\n');
await writeFile(new URL('supabase/migrations/20260906165231_contract_financial_integrity_runtime.sql', root), sql);
const restoredNames = ['auto_link_invoice_to_schedule','cancel_contract_future_schedules','detach_schedules_on_invoice_cancel','reconcile_contract_rental_schedule_invoice_state','reconcile_contract_schedules_v1','contract_financial_self_healing_sweep','update_invoice_on_payment_completion','generate_due_contract_invoices_v1'];
let rollback = 'BEGIN;\nSET LOCAL lock_timeout = \'5s\';\nLOCK TABLE public.payments, public.invoices, public.contract_payment_schedules, public.contracts IN ACCESS EXCLUSIVE MODE;\n';
rollback += `-- Operational rollback preserves reconciliation history and held obligations.
-- Release holds only through an independently reviewed resolution; never silently restore billing.
`;
rollback += await read('scripts/sql/contract-financial-integrity-rollback.sql');
for(const name of restoredNames) {
 const f = [...live.functions,...extra.functions].find(x=>x.name===name);
 if(!f) throw Error(name);
 rollback += f.definition.trimEnd() + ';\n';
}
const removed = ['contract_payment_delete_trigger','contract_payment_insert_trigger','contract_payment_update_trigger','invoice_payment_delete_trigger','invoice_payment_insert_trigger','invoice_payment_update_trigger','payments_update_contract_balance','trg_sync_payment_invoice','trigger_update_invoice_on_payment','trigger_update_schedule_on_payment','trg_sync_receipt_on_invoice_update'];
for(const name of removed) rollback += live.triggers.find(x=>x.name===name).definition+';\n';
rollback += 'COMMIT;\n';
await writeFile(new URL('supabase/rollbacks/20260906165231_contract_financial_integrity_runtime.rollback.sql', root), rollback);
