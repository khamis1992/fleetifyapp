import { describe,expect,it } from 'vitest';
import { parseFinancialIntegrity, parseNoClaimClosurePreview, parsePreservedClaimsClosurePreview } from '../contractFinancialIntegrity';
const company='22222222-2222-4222-8222-222222222222';
const contract='55555555-5555-4555-8555-555555555555';
const data={ version:1,company_id:company,contract_id:contract,contract_status:'cancelled',canonical_paid:9000,
 stored_paid:10476,original_amount:54000,original_remaining:45000,outstanding:0,active_invoice_total:9000,due_now:0,
 review_amount:45000,header_mismatch:true,checked_at:'2026-09-06T16:00:00Z',issues:[],reconciliation:null };
describe('financial snapshot boundary',()=>{
 it('keeps open invoices separate from the original contract difference',()=>{
  const result=parseFinancialIntegrity(data,company,contract);
  expect(result.outstanding).toBe(0);expect(result.original_remaining).toBe(45000);expect(result.canonical_paid).toBe(9000);
 });
 it('rejects another company and malformed monetary evidence',()=>{
  expect(()=>parseFinancialIntegrity(data,contract,contract)).toThrow();
  expect(()=>parseFinancialIntegrity({...data,canonical_paid:'9000'},company,contract)).toThrow();
 });
});

describe('no-claim preview validation',()=>{
 const value={version:1,company_id:company,contract_id:contract,contract_number:'TEST',contract_status:'cancelled',eligible:true,
  blockers:[],canonical_paid:9000,outstanding:0,review_amount:1500,schedule_count:1,revision:'a'.repeat(32),open_penalty_amount:0,pending_payment_count:0,
  schedules:[{id:contract,due_date:'2025-05-01',amount:1500,invoice_id:contract,invoice_number:'INV',eligible:true}]};
 it('accepts the exact reviewed scope and rejects another contract or an inconsistent total',()=>{
  expect(parseNoClaimClosurePreview(value,company,contract).review_amount).toBe(1500);
  expect(()=>parseNoClaimClosurePreview(value,company,company)).toThrow();
  expect(()=>parseNoClaimClosurePreview({...value,review_amount:3000},company,contract)).toThrow();
  expect(()=>parseNoClaimClosurePreview({...value,blockers:['Needs review']},company,contract)).toThrow();
 });
 it('requires a preview for the selected preserve-claims decision',()=>{
  const preserving={...value,closure_mode:'preserve_claims',outstanding:150,open_penalty_amount:500};
  expect(parsePreservedClaimsClosurePreview(preserving,company,contract).outstanding).toBe(150);
  expect(()=>parsePreservedClaimsClosurePreview(value,company,contract)).toThrow();
  expect(()=>parsePreservedClaimsClosurePreview({...preserving,closure_mode:'no_claim'},company,contract)).toThrow();
 });
});
