export interface PackageDocument {
  title: string;
  sourceId?: string;
  sourceType?: string;
  status: 'included_generated' | 'recorded_not_included' | 'missing' | 'failed';
  included: boolean;
  originalIncluded: false;
  fileName?: string;
  error?: string;
}

export interface RecordedDocument { id: string; title: string; type: string; hasReference: boolean }

export function recordedPackageDocuments(documents: RecordedDocument[], requiredTypes: Array<{ type: string; title: string }> = []): PackageDocument[] {
  const entries: PackageDocument[] = documents.map(document => ({
    title: document.title, sourceId: document.id, sourceType: document.type,
    status: document.hasReference ? 'recorded_not_included' : 'missing', included: false, originalIncluded: false,
  }));
  for (const required of requiredTypes) {
    if (!documents.some(document => document.type === required.type)) entries.push({ title: required.title, sourceType: required.type, status: 'missing', included: false, originalIncluded: false });
  }
  return entries;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const statusLabels: Record<PackageDocument['status'], string> = {
  included_generated: 'مضمن بالحزمة: نسخة مولدة', recorded_not_included: 'له مرجع ملف في النظام؛ لم يُنزّل ولم يُضم للحزمة',
  missing: 'ناقص: لا يوجد سجل أو مرجع ملف', failed: 'فشل التوليد؛ غير مضمن',
};

export function renderLawsuitPackageManifest(title: string, documents: PackageDocument[]) {
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>فهرس حالة المستندات</title><style>body{font:16px Arial;line-height:1.8;margin:32px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:10px;text-align:right;overflow-wrap:anywhere}</style><h1>${escapeHtml(title)}</h1><p>هذه الحزمة مواد مولدة وفهرس معلومات. لا تشمل أصول المستندات أو صورها المخزنة في النظام؛ وجود المرجع لا يؤكد سلامة الملف أو اكتمال الحافظة أو جاهزيتها للتقديم.</p><table><thead><tr><th>المستند</th><th>حالة التضمين</th><th>مرجع السجل / الملف داخل الحزمة</th><th>سبب الفشل</th></tr></thead><tbody>${documents.map(document => `<tr><td>${escapeHtml(document.title)}</td><td>${statusLabels[document.status]}</td><td>${escapeHtml(document.sourceId || document.fileName || '')}</td><td>${escapeHtml(document.error || '')}</td></tr>`).join('')}</tbody></table></html>`;
}

export async function generatePackageDocument(title: string, fileName: string, generate: () => Promise<string>, write: (name: string, content: string) => void): Promise<PackageDocument> {
  try {
    const html = await generate();
    if (!html.trim()) throw new Error('أرجع مولد المستند محتوى فارغًا');
    write(fileName, html);
    return { title, fileName, status: 'included_generated', included: true, originalIncluded: false };
  } catch (error) {
    return { title, status: 'failed', included: false, originalIncluded: false, error: error instanceof Error ? error.message : 'فشل إنشاء المستند' };
  }
}
