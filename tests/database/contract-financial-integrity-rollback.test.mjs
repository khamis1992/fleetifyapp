import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { installIntegrityFixture } from './helpers/financial-integrity-fixture.mjs';
test('runtime rollback restores the exact original financial trigger graph',async()=>{
 const db=new PGlite();
 try {
  await installIntegrityFixture(db);
  const rollback=await readFile(new URL('../../supabase/rollbacks/20260906165231_contract_financial_integrity_runtime.rollback.sql',import.meta.url),'utf8');
  await db.exec(rollback);
  const live=JSON.parse(await readFile(new URL('./fixtures/financial-integrity-live-20260906.json',import.meta.url),'utf8'));
  const wanted=live.triggers.filter(t=>['payments_update_contract_balance','contract_payment_insert_trigger','trg_sync_receipt_on_invoice_update'].includes(t.name));
  for(const t of wanted){
   const restored=(await db.query(`SELECT pg_get_triggerdef(oid) definition FROM pg_trigger WHERE tgname=$1 AND tgrelid=('public.'||$2)::regclass`,[t.name,t.table])).rows[0];
   assert.equal(restored.definition,t.definition);
  }
 } finally {await db.close();}
});
