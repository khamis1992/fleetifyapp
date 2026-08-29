import { describe, expect, it } from 'vitest';
import { buildBatchCandidates } from '../batchFiling';

const baseCustomer = {
  id: 'cust-1',
  first_name: null,
  first_name_ar: 'أحمد',
  last_name: null,
  last_name_ar: 'محمد',
  customer_type: 'individual' as const,
  company_name: null,
  company_name_ar: null,
  national_id: '29012345678',
};

describe('buildBatchCandidates', () => {
  it('groups overdue remaining amounts per contract and sorts by debt', () => {
    const candidates = buildBatchCandidates({
      invoices: [
        { contract_id: 'c1', total_amount: 1000, paid_amount: 0 },
        { contract_id: 'c1', total_amount: 1000, paid_amount: 400 },
        { contract_id: 'c2', total_amount: 5000, paid_amount: 0 },
        // مسددة بالكامل — لا تُحسب
        { contract_id: 'c2', total_amount: 500, paid_amount: 500 },
        // بلا عقد — تُستبعد
        { contract_id: null, total_amount: 9000, paid_amount: 0 },
      ],
      contracts: [
        { id: 'c1', contract_number: 'C-101', status: 'active', customer_id: 'cust-1' },
        { id: 'c2', contract_number: 'C-102', status: 'active', customer_id: 'cust-1' },
      ],
      customers: [baseCustomer],
      documents: [],
    });

    expect(candidates).toHaveLength(2);
    // الأعلى مديونية أولًا
    expect(candidates[0].contractId).toBe('c2');
    expect(candidates[0].totalRemaining).toBe(5000);
    expect(candidates[0].overdueInvoicesCount).toBe(1);
    expect(candidates[1].contractId).toBe('c1');
    expect(candidates[1].totalRemaining).toBe(1600);
    expect(candidates[1].overdueInvoicesCount).toBe(2);
  });

  it('excludes contracts with no overdue remaining balance', () => {
    const candidates = buildBatchCandidates({
      invoices: [{ contract_id: 'c1', total_amount: 100, paid_amount: 100 }],
      contracts: [{ id: 'c1', contract_number: 'C-101', status: 'active', customer_id: null }],
      customers: [],
      documents: [],
    });
    expect(candidates).toEqual([]);
  });

  it('flags missing national id and missing signed contract', () => {
    const candidates = buildBatchCandidates({
      invoices: [{ contract_id: 'c1', total_amount: 1000, paid_amount: 0 }],
      contracts: [{ id: 'c1', contract_number: 'C-101', status: 'active', customer_id: 'cust-2' }],
      customers: [{ ...baseCustomer, id: 'cust-2', national_id: null }],
      documents: [],
    });
    expect(candidates[0].hasNationalId).toBe(false);
    expect(candidates[0].hasSignedContract).toBe(false);
  });

  it('detects a signed contract via the shared document selection rules', () => {
    const candidates = buildBatchCandidates({
      invoices: [{ contract_id: 'c1', total_amount: 1000, paid_amount: 0 }],
      contracts: [{ id: 'c1', contract_number: 'C-101', status: 'active', customer_id: 'cust-1' }],
      customers: [baseCustomer],
      documents: [
        {
          id: 'doc-1',
          contract_id: 'c1',
          document_name: 'عقد إيجار موقع',
          document_type: 'signed_contract',
          file_path: 'c1/contract.pdf',
          mime_type: 'application/pdf',
          legal_identity_match_status: 'matched',
        },
        // مستند عقد لعقد آخر — لا يؤثر
        {
          id: 'doc-2',
          contract_id: 'c9',
          document_name: 'عقد',
          document_type: 'signed_contract',
          file_path: 'c9/contract.pdf',
          mime_type: 'application/pdf',
          legal_identity_match_status: 'matched',
        },
      ],
    });
    expect(candidates[0].hasSignedContract).toBe(true);
  });

  it('ignores document rows without a file path when checking the signed contract', () => {
    const candidates = buildBatchCandidates({
      invoices: [{ contract_id: 'c1', total_amount: 1000, paid_amount: 0 }],
      contracts: [{ id: 'c1', contract_number: 'C-101', status: 'active', customer_id: 'cust-1' }],
      customers: [baseCustomer],
      documents: [
        {
          id: 'doc-1',
          contract_id: 'c1',
          document_name: 'عقد إيجار موقع',
          document_type: 'signed_contract',
          file_path: null,
          mime_type: 'application/pdf',
        },
      ],
    });
    expect(candidates[0].hasSignedContract).toBe(false);
  });

  it('falls back to a placeholder when the customer is missing', () => {
    const candidates = buildBatchCandidates({
      invoices: [{ contract_id: 'c1', total_amount: 1000, paid_amount: 0 }],
      contracts: [{ id: 'c1', contract_number: 'C-101', status: 'active', customer_id: null }],
      customers: [],
      documents: [],
    });
    expect(candidates[0].customerName).toBe('عميل غير محدد');
  });
});
