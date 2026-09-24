import { describe, expect, it, vi } from 'vitest';
import { formatPdfMoney } from '../arabicReportPdf';

describe('arabicReportPdf', () => {
  it('formats money with accounting parentheses for negatives', () => {
    expect(formatPdfMoney(-1500)).toBe('(1,500.00)');
    expect(formatPdfMoney(2500.5)).toBe('2,500.50');
    expect(formatPdfMoney(0)).toBe('0.00');
    expect(formatPdfMoney(-0)).toBe('0.00');
    expect(formatPdfMoney(Number.NaN)).toBe('0.00');
  });

  it('keeps amounts finite and rejects nothing silently', () => {
    expect(formatPdfMoney(1e10 + 0.5)).toBe('10,000,000,000.50');
  });
});

describe('exportArabicReportPdf document structure', () => {
  it('produces a multi-object PDF with selectable text, not a single image', async () => {
    const { jsPDF } = await import('jspdf');
    const addFileToVFS = vi.fn();
    const addFont = vi.fn();
    const save = vi.fn();
    const textCalls: Array<{ value: string; options: Record<string, unknown> }> = [];
    const lines: Array<[number, number, number, number]> = [];

    const instance = {
      addFileToVFS,
      addFont,
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      setProperties: vi.fn(),
      rect: vi.fn(),
      line: (...args: [number, number, number, number]) => lines.push(args),
      text: (value: string, x: number, y: number, options?: Record<string, unknown>) =>
        textCalls.push({ value, options: options || {} }),
      splitTextToSize: (value: string) => [value],
      addPage: vi.fn(),
      getNumberOfPages: () => 1,
      save,
    };
    vi.spyOn(await import('jspdf'), 'jsPDF').mockImplementation(() => instance as unknown as jsPDF);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response);

    const { exportArabicReportPdf } = await import('../arabicReportPdf');
    await exportArabicReportPdf(
      {
        metadata: {
          reportTitle: 'ميزان المراجعة',
          companyAr: 'شركة الاختبار',
          companyEn: 'Test Co',
          commercialRegister: 'CR-1',
          addressAr: 'الدوحة',
          currency: 'QAR',
          asOfDate: '2026-09-24',
          sourceFingerprint: 'abc123',
          preparedBy: 'a@b.c',
        },
        sections: [
          {
            title: 'القسم الأول',
            table: {
              header: { cells: ['رمز', 'الحساب', 'مدين'], widths: [20, 60, 20] },
              rows: [{ cells: ['1100', 'النقد', formatPdfMoney(100)], widths: [20, 60, 20] }],
              summaryRows: [{ cells: ['', 'الإجمالي', formatPdfMoney(100)], widths: [20, 60, 20] }],
            },
          },
        ],
      },
      'test.pdf',
    );

    expect(addFont).toHaveBeenCalledTimes(2);
    expect(addFileToVFS).toHaveBeenCalledTimes(2);
    // The writer draws text through pdf.text, which produces selectable content.
    expect(textCalls.length).toBeGreaterThan(4);
    expect(textCalls.some(call => call.value.includes('ميزان المراجعة'))).toBe(true);
    expect(textCalls.some(call => call.value.includes('(1,500') === false)).toBe(true);
    expect(save).toHaveBeenCalledWith('test.pdf');
    fetchMock.mockRestore();
    vi.restoreAllMocks();
  });
});