import { describe, expect, it } from 'vitest';
import { buildBatchCandidates } from '../batchFiling';
import type { QueueClaimResult } from '../../../utils/legalQueueClaims';
const customer = { id:'customer',first_name:null,first_name_ar:'أحمد',last_name:null,last_name_ar:'محمد',customer_type:'individual' as const,company_name:null,company_name_ar:null,national_id:'29012345678' };
const contract = (id:string) => ({ id,contract_number:id,status:'active',customer_id:'customer' });
const amount = (rent:number,traffic=0,damage=0,retention=0,deposit=0):QueueClaimResult => ({ error:null,amounts:{overdueRent:rent,lateFees:0,damagesFee:damage,violationsFines:traffic,retentionCompensation:retention,securityDepositDeduction:deposit,total:Math.max(0,rent+traffic+damage+retention-deposit)} });
const build = (claims: [string,QueueClaimResult][]) => buildBatchCandidates({ claims:new Map(claims),contracts:claims.map(([id])=>contract(id)),customers:[customer],documents:[] });
describe('canonical batch candidates',()=>{
 it('shows the complete memo amount including damage, retention and deposit',()=>{
  const rows=build([['lower',amount(1000)],['higher',amount(1200,300,400,50,100)]]);
  expect(rows.map(row=>row.contractId)).toEqual(['higher','lower']);
  expect(rows[0].totalRemaining).toBe(1850); expect(rows[0].overdueRent).toBe(1200);
 });
 it('includes traffic-only claims without rental invoices',()=>{
  const rows=build([['traffic',amount(0,500)]]);expect(rows).toHaveLength(1);expect(rows[0].totalRemaining).toBe(500);
 });
 it('excludes verified zero claims but retains reconciliation failures with unknown amounts',()=>{
  const rows=build([['settled',amount(0)],['review',{amounts:null,error:'أقساط تحتاج مطابقة'}],['valid',amount(1700)]]);
  expect(rows.map(row=>row.contractId)).toEqual(['valid','review']);
  expect(rows[1].totalRemaining).toBeNull();expect(rows[1].financialReview).toBe('أقساط تحتاج مطابقة');
 });
 it('treats a missing statement as review instead of an estimated or zero debt',()=>{
  const rows=buildBatchCandidates({claims:new Map(),contracts:[contract('missing')],customers:[],documents:[]});
  expect(rows[0].totalRemaining).toBeNull();expect(rows[0].financialReview).toBeTruthy();expect(rows[0].customerName).toBe('عميل غير محدد');
 });
 it('uses verified signed contract selection and preserves national identity readiness',()=>{
  const input={claims:new Map([['c1',amount(1000)]]),contracts:[contract('c1')],customers:[customer],documents:[{id:'doc',contract_id:'c1',document_name:'عقد موقع',document_type:'signed_contract',file_path:'contract.pdf',mime_type:'application/pdf',legal_identity_match_status:'matched'}]};
  const rows=buildBatchCandidates(input);expect(rows[0].hasSignedContract).toBe(true);expect(rows[0].hasNationalId).toBe(true);
  expect(buildBatchCandidates({...input,documents:[{...input.documents[0],file_path:null}]})[0].hasSignedContract).toBe(false);
 });
 it('does not round away fractional receipt settlement in the selection amount',()=>{
  expect(build([['c1',amount(1700.25,300.5,0,0,100.1)]])[0].totalRemaining).toBeCloseTo(1900.65,2);
 });
});
