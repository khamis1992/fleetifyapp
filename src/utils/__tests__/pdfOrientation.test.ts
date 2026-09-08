import { describe, expect, it } from 'vitest';
import * as pdfLib from 'pdf-lib';
import { correctPdfOrientation, validatePdfRotations } from '../../../supabase/functions/_shared/pdf-orientation';
import { orientationSuggestion } from '../pdfOrientation';

describe('saved PDF orientation', () => {
  it('rotates each page relative to its existing rotation while preserving content, page geometry and metadata', async () => {
    const source = await pdfLib.PDFDocument.create();
    source.setTitle('Original contract');
    source.addPage([320, 520]).setRotation(pdfLib.degrees(90));
    source.addPage([420, 620]).drawText('Immutable contract 12345');
    const bytes = await source.save();
    const reloadedSource = await pdfLib.PDFDocument.load(bytes);
    const corrected = await pdfLib.PDFDocument.load(await correctPdfOrientation(bytes, [270, 180], pdfLib));
    expect(corrected.getPageCount()).toBe(2);
    expect(corrected.getPages().map((page) => page.getRotation().angle)).toEqual([0, 180]);
    expect(corrected.getPages().map((page) => page.getSize())).toEqual([{ width: 320, height: 520 }, { width: 420, height: 620 }]);
    expect(corrected.getTitle()).toBe('Original contract');
    const before = reloadedSource.getPage(1).node.Contents() as pdfLib.PDFArray;
    const after = corrected.getPage(1).node.Contents() as pdfLib.PDFArray;
    expect(corrected.context.lookup(after.get(0), pdfLib.PDFRawStream).contents)
      .toEqual(reloadedSource.context.lookup(before.get(0), pdfLib.PDFRawStream).contents);
    expect(source.getPage(0).getRotation().angle).toBe(90);
  });
  it.each([[], [0], [45], [-90], [360], [90, null], Array(51).fill(90)])('rejects invalid or unchanged rotations %j', (angles) => {
    expect(() => validatePdfRotations(angles)).toThrow();
  });
  it('rejects page-count mismatch and digital signatures including orphan dictionaries', async () => {
    const source = await pdfLib.PDFDocument.create(); source.addPage();
    await expect(correctPdfOrientation(await source.save(), [90, 90], pdfLib)).rejects.toThrow('عدد الصفحات');
    source.context.register(source.context.obj({ Type: 'Sig', ByteRange: [0, 1, 2, 3] }));
    await expect(correctPdfOrientation(await source.save(), [180], pdfLib)).rejects.toThrow('توقيع رقمي');
  });
  it('leaves low confidence or unrecognized pages for manual review', () => {
    expect(orientationSuggestion(180, 14)).toMatchObject({ rotation: 0, reliable: false });
    expect(orientationSuggestion(null, 22).reliable).toBe(false);
    expect(orientationSuggestion(45, 22).reliable).toBe(false);
    expect(orientationSuggestion(90, NaN).reliable).toBe(false);
    expect(orientationSuggestion(270, 20)).toEqual({ rotation: 270, confidence: 20, reliable: true });
    expect(orientationSuggestion(0, 18).reliable).toBe(true);
  });
});
