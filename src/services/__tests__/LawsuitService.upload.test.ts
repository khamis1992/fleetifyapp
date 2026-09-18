import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lawsuitService, type LegalDocumentType } from '../LawsuitService';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn(), publicUrl: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ upload: mocks.upload, getPublicUrl: mocks.publicUrl }) },
    from: () => ({
      insert: mocks.insert,
      update: () => ({ eq: () => ({ eq: () => ({ neq: async () => ({ error: null }) }) }) }),
    }),
  },
}));

describe('legal document upload names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reproduce the reported storage rejection, rather than accepting every key.
    mocks.upload.mockImplementation(async (path: string) => {
      if (!/^[a-zA-Z0-9/_.-]+$/.test(path)) return { data: null, error: new Error('Invalid key') };
      return { data: { path }, error: null };
    });
    mocks.publicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://example.invalid/${path}` } }));
    mocks.insert.mockImplementation((record) => ({
      select: () => ({ single: async () => ({ data: { ...record, id: 'new-document' }, error: null }) }),
    }));
  });

  it.each([
    ['commercial_register', 'السجل التجاري.pdf'],
    ['establishment_record', 'قيد المنشأة (نسخة جديدة).PDF'],
    ['representative_id', 'هوية 🪪 / نسخة #1.pdf'],
    ['iban_certificate', 'شهادة البنك'],
    ['authorization_letter', `${'تفويض'.repeat(300)}.pdf`],
  ] as const)('uploads %s while retaining its original Arabic name', async (type: LegalDocumentType, name) => {
    const file = new File(['%PDF-1.4 test-only'], name, { type: 'application/pdf' });
    const company = '24bc0b21-4e2d-4413-9842-31719a3669f4';
    const result = await lawsuitService.uploadLegalDocument(company, type, file);
    const [path, body, options] = mocks.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${company}/${type}/[a-zA-Z0-9-]+\\.pdf$`));
    expect(path.length).toBeLessThan(200);
    expect(body).toBe(file);
    expect(options).toEqual({ contentType: 'application/pdf', upsert: false });
    expect(result.document_name).toBe(name);
    expect(result.file_url).toBe(`https://example.invalid/${path}`);
    expect(mocks.publicUrl).toHaveBeenCalledWith(path);
  });
});
