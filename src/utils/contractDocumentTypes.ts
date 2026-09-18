// Share the choices between uploading a document and changing its classification.
export const contractDocumentTypes = [
  { value: 'general', label: 'عام' },
  { value: 'contract', label: 'عقد' },
  { value: 'signed_contract', label: 'عقد موقع' },
  { value: 'draft_contract', label: 'مسودة عقد' },
  { value: 'condition_report', label: 'تقرير حالة المركبة' },
  { value: 'signature', label: 'توقيع' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'identity', label: 'هوية' },
  { value: 'license', label: 'رخصة' },
  { value: 'receipt', label: 'إيصال' },
  { value: 'violations_proof', label: 'إثبات مخالفات مرورية' },
  { value: 'other', label: 'أخرى' },
];

// Keep legacy image records intact: legal filing still accepts their stored type.
// Only normalize the visible selection so existing files retain a selected label.
export const getContractDocumentTypeSelection = (type: string): string =>
  type === 'signed_contract_image' ? 'signed_contract' : type;
