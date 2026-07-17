import { describe, expect, it } from 'vitest';
import { agentPlanReviewReasons, applyAgentEffectiveRows, buildExcelImportAgentRows } from '../excelImportAgent';

describe('Excel import execution agent helpers', () => {
  it('normalizes month keys and preserves source text', () => {
    const rows = buildExcelImportAgentRows({
      id: 'hash',
      fileName: 'test.xlsx',
      rows: [{
        rowNumber: 7,
        month: '03/2026',
        paymentAmount: 1600,
        remainingAmount: 0,
        maintenanceAmount: 0,
        delayDays: 0,
        delayValue: 0,
        trafficAmount: 0,
        sourceText: 'دفعة شهر مارس',
      }],
    });
    expect(rows[0]).toMatchObject({ monthKey: '2026-03', sourceText: 'دفعة شهر مارس' });
  });

  it('keeps October through December in their actual months', () => {
    const rows = buildExcelImportAgentRows({
      id: 'hash',
      fileName: 'test.xlsx',
      rows: ['10-2025', '11/2025', '2025-12'].map((month, index) => ({
        rowNumber: index + 1,
        month,
        paymentAmount: 0,
        remainingAmount: 0,
        maintenanceAmount: 0,
        delayDays: 0,
        delayValue: 0,
        trafficAmount: 0,
      })),
    });

    expect(rows.map((row) => row.monthKey)).toEqual(['2025-10', '2025-11', '2025-12']);
  });

  it('uses only the positive differences returned by the agent', () => {
    const original = [{
      rowNumber: 7,
      paymentAmount: 1500,
      maintenanceAmount: 300,
      delayDays: 0,
      delayValue: 0,
      trafficAmount: 500,
      trafficAmounts: [500],
    }];
    const effective = applyAgentEffectiveRows(original, [{
      rowNumber: 7,
      month: '03/2026',
      monthKey: '2026-03',
      paymentAmount: 500,
      remainingAmount: 0,
      maintenanceAmount: 0,
      delayDays: 0,
      delayValue: 0,
      trafficAmount: 0,
      sourceText: '',
    }]);
    expect(effective).toHaveLength(1);
    expect(effective[0]).toMatchObject({ paymentAmount: 500, maintenanceAmount: 0, trafficAmount: 0, trafficAmounts: [] });
  });

  it('explains reductions as review-only actions', () => {
    const reasons = agentPlanReviewReasons({
      ok: true,
      exactDuplicate: false,
      versionId: 'v1',
      summary: { unchanged: false, executable: 0, review: 1, actions: 1 },
      effectiveRows: [],
      actions: [{
        id: 'a1',
        rowKey: '2026-03',
        command: 'excel_import.reverse_payment',
        field: 'paymentAmount',
        delta: -500,
        riskLevel: 'high',
        approvalRequired: true,
        confidence: 1,
        status: 'review',
      }],
    });
    expect(reasons[0]).toContain('500');
    expect(reasons[0]).toContain('حركة عكسية');
  });
});
