import assert from 'node:assert/strict';
import { before,after,describe,it } from 'node:test';
import pg from 'pg';
import { startTemporaryPostgres } from './helpers/temporary-postgres.mjs';
import { installIntegrityFixture,seedIntegrityFixture,snapshot } from './helpers/financial-integrity-fixture.mjs';
import { ids,collect,configureSession } from './helpers/collected-fee-fixture.mjs';
describe('native integrity concurrency',{concurrency:false},()=>{
 let cluster,admin;
 before(async()=>{cluster=await startTemporaryPostgres();admin=new pg.Client(cluster.config);await admin.connect();admin.exec=sql=>admin.query(sql);await installIntegrityFixture(admin);await seedIntegrityFixture(admin);});
 after(async()=>{await admin?.end();await cluster?.close();});
 it('a busy receipt causes a bounded retry, not a queue/invoice deadlock',async()=>{
  const writer=new pg.Client(cluster.config);await writer.connect();await configureSession(writer);
  try {
   await writer.query('BEGIN');await collect(writer,{key:'writer'});
   const result=await admin.query('SELECT public.process_contract_financial_reconciliation_v1(20) result');
   // An uncommitted receipt also owns the queue row: SKIP LOCKED skips it.
   assert.equal(result.rows[0].result.processed,0);
   await writer.query('COMMIT');
   await admin.query('SELECT public.process_contract_financial_reconciliation_v1(20)');
   assert.equal((await snapshot(admin)).stored_paid,500);
   assert.equal((await snapshot(admin)).header_mismatch,false);
  } finally {await writer.query('ROLLBACK');await writer.end();}
 });
 it('two workers claim each contract once',async()=>{
  await admin.query('SELECT public.enqueue_contract_financial_reconciliation_v1($1,$2)',[ids.company,ids.contract]);
  const second=new pg.Client(cluster.config);await second.connect();
  try {
   const results=await Promise.all([admin.query('SELECT public.process_contract_financial_reconciliation_v1(20) r'),second.query('SELECT public.process_contract_financial_reconciliation_v1(20) r')]);
   assert.equal(results.reduce((n,r)=>n+r.rows[0].r.processed,0),1);
  } finally {await second.end();}
 });
 it('private repair helpers are unavailable to an authenticated session',async()=>{
  await admin.query('SET ROLE authenticated');
  try {await assert.rejects(()=>admin.query('SELECT public.process_contract_financial_reconciliation_v1(20)'),/permission denied/);}
  finally {await admin.query('RESET ROLE');}
 });
});
