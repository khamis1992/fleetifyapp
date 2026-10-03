import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { financeToday } from '@/services/financialReporting';
import type { BalanceSheetLocale } from '@/types/balanceSheet';
import type { FinancialStatementConfiguration, ProfessionalFinancialStatementPackage } from '@/types/financialStatementPackage';
import { FinancialStatementImportError, financialStatementImportMaxBytes, financialStatementImportScopeFromReport, parseFinancialStatementConfigurationImport } from '@/utils/financialStatementConfigurationImport';

type Props = { companyId: string; report?: ProfessionalFinancialStatementPackage; locale: BalanceSheetLocale; disabled?: boolean; onApply: (configuration: FinancialStatementConfiguration) => void };

export function FinancialStatementConfigurationImport({ companyId, report, locale, disabled, onApply }: Props) {
  const inputId = useId(), request = useRef(0);
  const [preview, setPreview] = useState<{ text: string; configuration: FinancialStatementConfiguration } | null>(null);
  const [reading, setReading] = useState(false), [error, setError] = useState<string>('');
  const tr = (ar: string, en: string) => locale === 'ar' ? ar : en;
  const unavailable = disabled || !report || report.company.id !== companyId || report.position.company.id !== companyId;
  const parse = (text: string) => {
    if (!report) throw new FinancialStatementImportError('wrong_company');
    return parseFinancialStatementConfigurationImport(text, financialStatementImportScopeFromReport(companyId, report, financeToday()));
  };
  const describeError = (failure: unknown) => {
    if (failure instanceof FinancialStatementImportError) {
      switch (failure.code) {
        case 'too_large': return tr('حجم الملف يتجاوز 1 ميغابايت.', 'The file exceeds 1 MiB.');
        case 'wrong_company': return tr('الملف يخص شركة أخرى. اختر ملف هذه الشركة.', 'This file belongs to another company. Choose this company’s file.');
        case 'unknown_account': return tr('يحتوي الملف على حساب غير موجود في تقرير الشركة المحمل.', 'The file includes an account absent from the loaded company report.');
        case 'unknown_journal': return tr('يحتوي الملف على قيد غير موجود في تقرير الشركة المحمل.', 'The file includes a journal absent from the loaded company report.');
        case 'invalid_json': return tr('تعذر قراءة الملف بصيغة JSON.', 'The file could not be read as JSON.');
      }
    }
    return tr('راجع صيغة الإعدادات والتواريخ. لم تُطبق الإعدادات.', 'Check the settings format and dates. Settings have not been applied.');
  };
  const selectFile = async (file?: File) => {
    const token = ++request.current;
    setPreview(null); setError(''); setReading(false);
    if (!file || unavailable) return;
    setReading(true);
    try {
      if (file.size > financialStatementImportMaxBytes) throw new FinancialStatementImportError('too_large');
      const text = await file.text(), configuration = parse(text);
      if (token === request.current) setPreview({ text, configuration });
    } catch (failure) { if (token === request.current) setError(describeError(failure)); }
    finally { if (token === request.current) setReading(false); }
  };
  const apply = () => {
    if (!preview || unavailable || reading) return;
    try { onApply(parse(preview.text)); setPreview(null); setError(''); }
    catch (failure) { setPreview(null); setError(describeError(failure)); }
  };
  return <div className="space-y-3 rounded-md border p-3">
    <Label htmlFor={inputId}>{tr('استيراد إعدادات الحزمة من ملف', 'Import package settings from a file')}</Label>
    <input id={inputId} type="file" accept=".json,application/json" disabled={Boolean(unavailable) || reading} className="block w-full text-sm" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void selectFile(file); }} />
    <p className="text-xs text-muted-foreground">{tr('حتى 1 ميغابايت. عاين الإعدادات ثم طبقها على المسودة الجديدة؛ الحساب والحفظ يتمان بزر حساب الحزمة.', 'Up to 1 MiB. Preview and apply settings to the new draft; use Calculate package to calculate and save it.')}</p>
    {reading && <p role="status">{tr('جارٍ قراءة الإعدادات…', 'Reading settings…')}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {preview && <div className="space-y-2 text-sm" role="status">
      <p>{tr('الفترة:', 'Period:')} <bdi>{preview.configuration.periodStart} — {preview.configuration.periodEnd}</bdi></p>
      <p>{tr('تصنيفات الحسابات:', 'Account mappings:')} {preview.configuration.accountMappings.length} · {tr('معالجات القيود:', 'Journal treatments:')} {preview.configuration.journalOverrides.length}</p>
      <p>{tr('الإيضاحات:', 'Disclosures:')} {preview.configuration.notes.length} · {tr('قيد الاستكمال:', 'Pending:')} {preview.configuration.notes.filter(note => note.status === 'pending').length}</p>
      <Button type="button" variant="outline" disabled={Boolean(unavailable) || reading} onClick={apply}>{tr('تطبيق الإعدادات على المسودة', 'Apply settings to the draft')}</Button>
    </div>}
  </div>;
}
