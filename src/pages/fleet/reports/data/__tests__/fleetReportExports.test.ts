import { Blob as NodeBlob, Buffer } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportFleetReport } from '../fleetReportExports';
import type { FleetReportDataset } from '../fleetReportModel';

const dataset = (): FleetReportDataset => ({ companyId: 'company-a', period: { start: '2026-09-01', end: '2026-09-30' }, readAt: '2026-09-30T20:00:00Z', vehicles: Array.from({ length: 24 }, (_, index) => ({ id: `v${index}`, company_id: 'company-a', plate_number: `plate${index}`, make: 'Test', model: 'Car', year: 2023, status: 'out_of_service', is_active: false, vin_number: null, purchase_cost: 100, book_value: index ? 0 : null, accumulated_depreciation: 100, daily_rate: null, monthly_rate: null, notes: null })), maintenance: [], insurance: [], documents: [], ledgerLines: [], monthly: [{ month: '2026-09', revenue: 0, expenses: 0, result: 0, line_count: 0 }], registration: [], vehicleFinancials: [] });

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real complete exports', () => {
  it('generates a readable XLSX with all loaded rows, missing markers and a numeric recorded zero', async () => {
    vi.stubGlobal('Blob', NodeBlob);
    let captured: NodeBlob | undefined;
    vi.stubGlobal('URL', { createObjectURL: (blob: NodeBlob) => { captured = blob; return 'blob:test'; }, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await exportFleetReport(dataset(), 'excel');
    expect(click).toHaveBeenCalledOnce();
    expect(captured).toBeDefined();
    if (!captured) throw new Error('Missing exported file');
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await captured.arrayBuffer()));
    const vehicles = workbook.getWorksheet('المركبات');
    expect(vehicles?.rowCount).toBe(25);
    expect(vehicles?.getCell('B25').value).toBe('plate23');
    expect(vehicles?.getCell('J2').value).toBe('غير متاح');
    expect(vehicles?.getCell('J3').value).toBe(0);
    expect(workbook.worksheets).toHaveLength(7);
    expect(workbook.getWorksheet('نطاق التقرير')?.getCell('B2').value).toBe('company-a');
  }, 20_000);
  it('prints the generated complete dataset rather than a limited UI preview', async () => {
    const popup = { document: { open: vi.fn(), write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    await exportFleetReport(dataset(), 'pdf');
    expect(popup.document.write).toHaveBeenCalledWith(expect.stringContaining('plate23'));
    expect(popup.document.write).toHaveBeenCalledWith(expect.stringContaining('2026-09-30'));
    expect(popup.print).toHaveBeenCalledOnce();
  });
  it('reports a blocked print window as a failure', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    await expect(exportFleetReport(dataset(), 'pdf')).rejects.toThrow('نافذة الطباعة');
  });
});
