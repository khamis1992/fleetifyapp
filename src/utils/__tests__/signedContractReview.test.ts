import { File as NodeFile } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { applySignedContractRotations, contractQrPayload, readContractQr, extractLabeledContractNumbers, findMismatchedContractPage } from '../signedContractReview';

describe('signed contract review', () => {
  it('round trips contract identifiers without customer personal data', () => {
    expect(readContractQr(contractQrPayload('LTO/2026-١٢٣'))).toBe('LTO/2026-١٢٣');
    expect(readContractQr('https://example.com/')).toBeNull();
    expect(() => readContractQr('FLEETIFY:CONTRACT:1:%XX')).toThrow();
  });
  it('blocks one foreign page even if the other pages match', () => {
    const base = { image: '', width: 1, height: 1 };
    expect(findMismatchedContractPage([
      { ...base, contractNumber: 'LTO-123' }, { ...base, contractNumber: 'LTO-456' },
    ], 'LTO-123')).toBe(1);
    expect(findMismatchedContractPage([{ ...base, contractNumber: null }], 'LTO-123')).toBe(-1);
    expect(findMismatchedContractPage([{ ...base, contractNumber: 'lto-١٢٣' }], 'LTO-123')).toBe(-1);
  });
  it('uses labeled contract numbers, never arbitrary dates or identity numbers', () => {
    expect(extractLabeledContractNumbers('رقم العقد: LTO2024284 رقم الهوية: 12345678901')).toEqual(['LTO2024284']);
    expect(extractLabeledContractNumbers('Contract No. ١٢٣٤')).toEqual(['1234']);
    expect(extractLabeledContractNumbers('2026-09-06 ID 12345678901')).toEqual([]);
    expect(findMismatchedContractPage([{ image: '', width: 1, height: 1, contractNumber: null, textContractNumbers: ['456'] }], '123')).toBe(0);
  });
  it('saves per-page rotations without rasterizing or losing pages and dimensions', async () => {
    const source = await PDFDocument.create();
    source.addPage([300, 500]).setRotation(degrees(90));
    source.addPage([400, 600]).drawText('Contract No. ABC123');
    const file = new NodeFile([new Uint8Array(await source.save())], 'contract.pdf', { type: 'application/pdf' }) as unknown as File;
    const originalFile = globalThis.File;
    globalThis.File = NodeFile as unknown as typeof File;
    try {
    const output = await applySignedContractRotations(file, [90, 180]);
    const result = await PDFDocument.load(new Uint8Array(await output.arrayBuffer()));
    expect(result.getPages().map((page) => page.getRotation().angle)).toEqual([180, 180]);
    expect(result.getPages().map((page) => page.getSize())).toEqual([{ width: 300, height: 500 }, { width: 400, height: 600 }]);
    expect(await applySignedContractRotations(file, [0, 360])).toBe(file);
    await expect(applySignedContractRotations(file, [90])).rejects.toThrow('عدد الصفحات');
    } finally { globalThis.File = originalFile; }
  });
});
