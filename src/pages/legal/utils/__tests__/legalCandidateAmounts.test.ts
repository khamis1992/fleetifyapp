import { describe,it,expect } from 'vitest';
import { legalCandidateAmounts } from '../legalCandidateAmounts';
const amounts={overdueRent:1700.25,lateFees:100,violationsFines:300.50,damagesFee:200,retentionCompensation:50,securityDepositDeduction:100,total:2250.75};
describe('manual candidate claim amounts',()=>{
 it('carries every authoritative component and exact total to conversion and printing',()=>{
  const value=legalCandidateAmounts({amounts,error:null});
  expect(value).toMatchObject({overdueRent:1700.25,lateFees:100,trafficViolations:300.50,damages:200,retention:50,depositDeduction:100,amount:2250.75,detailedClaimTotal:2250.75,canConvert:true,financialReview:null});
 });
 it('keeps a failed or missing statement unknown instead of treating it as zero',()=>{
  const value=legalCandidateAmounts({amounts:null,error:'راجع تخصيصات الدفعات'});
  expect(value.detailedClaimTotal).toBeNull();expect(value.overdueRent).toBeNull();expect(value.canConvert).toBe(false);expect(value.financialReview).toBe('راجع تخصيصات الدفعات');
  expect(legalCandidateAmounts().financialReview).toBeTruthy();
 });
 it('does not enable conversion for an explicitly verified zero claim',()=>{
  const value=legalCandidateAmounts({amounts:{...amounts,total:0},error:null});
  expect(value.canConvert).toBe(false);expect(value.detailedClaimTotal).toBe(0);expect(value.financialReview).toBeNull();
 });
});
