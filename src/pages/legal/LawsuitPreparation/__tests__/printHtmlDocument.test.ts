import { afterEach, describe, expect, it, vi } from 'vitest';
import { printHtmlDocumentAsPdf } from '../utils/printHtmlDocument';

describe('printHtmlDocumentAsPdf', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the browser print engine with an A4 document title', async () => {
    vi.useFakeTimers();

    const printDocument = document.implementation.createHTMLDocument();
    Object.defineProperty(printDocument, 'readyState', {
      configurable: true,
      value: 'complete',
    });

    const printWindow = {
      document: printDocument,
      closed: false,
      focus: vi.fn(),
      print: vi.fn(),
      addEventListener: vi.fn(),
    } as unknown as Window;

    vi.spyOn(window, 'open').mockReturnValue(printWindow);

    const result = printHtmlDocumentAsPdf(
      '<!doctype html><html dir="rtl"><head></head><body><h1>كشف المطالبات</h1></body></html>',
      'كشف المطالبات المالية'
    );

    await vi.runAllTimersAsync();

    expect(result).toBe(printWindow);
    expect(printDocument.title).toBe('كشف المطالبات المالية');
    expect(printDocument.body.textContent).toContain('كشف المطالبات');
    expect(printDocument.querySelector('style[data-fleetify-print="true"]')?.textContent).toContain(
      '@page { size: A4 portrait; }'
    );
    expect(printWindow.focus).toHaveBeenCalledOnce();
    expect(printWindow.print).toHaveBeenCalledOnce();
  });
});
