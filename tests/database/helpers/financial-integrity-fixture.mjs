import { readFile } from 'node:fs/promises';
import { installFinancialLifecycleFixture, seedFinancialLifecycleFixture } from './financial-lifecycle-fixture.mjs';
import { ids } from './collected-fee-fixture.mjs';
const read = p=>readFile(new URL(p,import.meta.url),'utf8');
export const runtimeMigration = ()=>read('../../../supabase/migrations/20260906165231_contract_financial_integrity_runtime.sql');
export async function installIntegrityFixture(db) {
 await installFinancialLifecycleFixture(db);
 await db.exec(`CREATE TABLE public.companies(id uuid PRIMARY KEY);
  CREATE TABLE public.profiles(user_id uuid,company_id uuid,is_active boolean DEFAULT true);
  ALTER TABLE public.contracts ADD COLUMN status text DEFAULT 'active';
  ALTER TABLE public.invoices ADD COLUMN invoice_number text DEFAULT 'INV-TEST', ADD COLUMN invoice_type text DEFAULT 'service';`);
 const live=JSON.parse(await read('../fixtures/financial-integrity-live-20260906.json'));
 const extra=JSON.parse(await read('../fixtures/financial-integrity-extra-20260906.json'));
 for(const name of ['sync_receipt_on_invoice_update','cancel_contract_future_schedules','detach_schedules_on_invoice_cancel','reconcile_contract_schedules_v1','auto_link_invoice_to_schedule','contract_financial_self_healing_sweep','generate_due_contract_invoices_v1']) {
  const f=[...live.functions,...extra.functions].find(x=>x.name===name);
  await db.exec(f.definition+';');
 }
 for(const name of ['trg_sync_receipt_on_invoice_update','trg_cancel_contract_future_schedules','trg_detach_schedules_on_invoice_cancel','trigger_auto_link_invoice'])
  await db.exec(live.triggers.find(x=>x.name===name).definition+';');
 await db.exec(await runtimeMigration());
}
export async function seedIntegrityFixture(db) {
 await db.query('INSERT INTO public.companies VALUES($1)',[ids.company]);
 await db.query('INSERT INTO public.profiles(user_id,company_id) VALUES($1,$2)',[ids.actor,ids.company]);
 await seedFinancialLifecycleFixture(db);
 await db.query('INSERT INTO public.contract_financial_reconciliation_controls(company_id,enabled,auto_repair) VALUES($1,true,true)',[ids.company]);
}
export const snapshot = async db=>(await db.query('SELECT public.contract_financial_integrity_snapshot_internal_v1($1,$2) value',[ids.company,ids.contract])).rows[0].value;
