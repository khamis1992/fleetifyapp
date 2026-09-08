export const MAX_ORIENTATION_PAGES = 50;
export const MAX_ORIENTATION_BYTES = 25 * 1024 * 1024;

export function validatePdfRotations(value: unknown): number[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ORIENTATION_PAGES
    || value.some((angle) => !Number.isInteger(angle) || ![0, 90, 180, 270].includes(angle))
    || !value.some((angle) => angle !== 0)) {
    throw new Error('حدد اتجاهًا جديدًا لصفحة واحدة على الأقل؛ الحد الأقصى 50 صفحة');
  }
  return value;
}

// Inject pdf-lib so the same transformation can be tested under Node and Deno.
export async function correctPdfOrientation(
  bytes: Uint8Array, rotations: unknown, library: typeof import('pdf-lib'),
): Promise<Uint8Array> {
  const angles = validatePdfRotations(rotations);
  if (bytes.length > MAX_ORIENTATION_BYTES) throw new Error('الحد الأقصى لتصحيح الملف 25 ميجابايت');
  const pdf = await library.PDFDocument.load(bytes, { updateMetadata: false });
  if (pdf.getPageCount() !== angles.length) throw new Error('عدد الصفحات تغير؛ افتح المستند مجددًا');
  // Include orphan signature dictionaries, not only fields exposed by getForm().
  const digitallySigned = pdf.context.enumerateIndirectObjects().some(([, object]) =>
    object instanceof library.PDFDict && (
      object.has(library.PDFName.of('ByteRange'))
      || object.get(library.PDFName.of('FT'))?.toString() === '/Sig'
      || object.get(library.PDFName.of('Type'))?.toString() === '/Sig'
    ));
  if (digitallySigned) throw new Error('هذا PDF يحتوي على توقيع رقمي؛ لا يمكن تعديل اتجاهه مع الحفاظ على صلاحية التوقيع');
  pdf.getPages().forEach((page, i) => page.setRotation(library.degrees((page.getRotation().angle + angles[i]) % 360)));
  const output = await pdf.save();
  if (output.length > MAX_ORIENTATION_BYTES) throw new Error('حجم النسخة المصححة يتجاوز 25 ميجابايت');
  return output;
}
