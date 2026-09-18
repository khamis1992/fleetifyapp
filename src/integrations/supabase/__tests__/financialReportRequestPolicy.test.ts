import { describe, expect, it } from 'vitest';
import { getFinancialReportRequestPolicy } from '../financialReportRequestPolicy';

const rpc = (name: string) => `https://project.supabase.co/rest/v1/rpc/${name}`;

describe('financial report request policy', () => {
  it.each(['professional_balance_sheet', 'financial_statement_package'])('allows longer calculation reads for %s while retaining retries', family => {
    expect(getFinancialReportRequestPolicy(rpc(`get_${family}_v1`))).toEqual({ timeoutMs: 60000, disableRetry: false });
  });

  it.each([
    'save_professional_balance_sheet_v1', 'approve_professional_balance_sheet_v1',
    'save_financial_statement_package_v1', 'approve_financial_statement_package_v1',
  ])('allows a longer calculation but never automatically replays %s', command => {
    expect(getFinancialReportRequestPolicy(rpc(command))).toEqual({ timeoutMs: 60000, disableRetry: true });
  });

  it.each([
    'void_professional_balance_sheet_v1', 'void_financial_statement_package_v1',
    'lock_financial_reporting_period_v1', 'unlock_financial_reporting_period_v1',
  ])('keeps the existing timeout while disabling replay of %s', command => {
    expect(getFinancialReportRequestPolicy(rpc(command))).toEqual({ disableRetry: true });
  });

  it.each([
    'list_professional_balance_sheets_v1', 'list_financial_statement_packages_v1',
    'list_financial_reporting_period_locks_v1', 'restart_taqadi_filing_job_v2',
    'record_external_legal_filing_v2', 'create_payment',
  ])('leaves the existing request policy unchanged for %s', command => {
    expect(getFinancialReportRequestPolicy(rpc(command))).toEqual({ disableRetry: false });
  });

  it.each([
    'https://project.supabase.co/auth/v1/token',
    'https://project.supabase.co/functions/v1/contract-id-scanner',
    'https://project.supabase.co/rest/v1/rpc/other?url=/rest/v1/rpc/save_professional_balance_sheet_v1',
    'https://project.supabase.co/rest/v1/rpc/other#/rest/v1/rpc/approve_financial_statement_package_v1',
    'https://project.supabase.co/rest/v1/rpc/save_professional_balance_sheet_v1_suffix',
    'https://project.supabase.co/rest/v1/rpc/save_professional_balance_sheet_v1/other',
    'https://project.supabase.co/rest/v1/rpc/save_professional_balance_sheet_v1/',
    'https://project.supabase.co/prefix/rest/v1/rpc/save_professional_balance_sheet_v1',
    'https://project.supabase.co/rest/v1/rpc%2Fsave_professional_balance_sheet_v1',
    'https://project.supabase.co/rest/v1/rpc/SAVE_professional_balance_sheet_v1',
    'ftp://project.supabase.co/rest/v1/rpc/save_professional_balance_sheet_v1',
    'http://[', '',
  ])('does not select reporting rules from an unrelated or spoofed path', url => {
    expect(getFinancialReportRequestPolicy(url)).toEqual({ disableRetry: false });
  });

  it('accepts real reporting query parameters and relative REST paths', () => {
    expect(getFinancialReportRequestPolicy(`${rpc('get_financial_statement_package_v1')}?select=*`)).toEqual({ timeoutMs: 60000, disableRetry: false });
    expect(getFinancialReportRequestPolicy('/rest/v1/rpc/void_financial_statement_package_v1?select=*')).toEqual({ disableRetry: true });
  });
});
