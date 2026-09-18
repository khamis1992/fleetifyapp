import { useSearchParams } from 'react-router-dom';
import type { BalanceSheetLocale } from '@/types/balanceSheet';

/** Reports default to Arabic independently of the application's interface language. */
export function useFinancialReportLocale(): BalanceSheetLocale {
  const [params] = useSearchParams();
  return params.get('lang') === 'en' ? 'en' : 'ar';
}

export function FinancialReportLanguage() {
  const [params, setParams] = useSearchParams();
  const locale = useFinancialReportLocale();
  return <label className="flex items-center gap-2 text-sm print:hidden" dir="rtl">
    <span>لغة التقرير / Report language</span>
    <select aria-label="لغة التقرير / Report language" value={locale}
      className="h-10 rounded-md border bg-background px-3 text-foreground"
      onChange={event => {
        const next = new URLSearchParams(params);
        next.set('lang', event.target.value === 'en' ? 'en' : 'ar');
        setParams(next, { replace: true });
      }}>
      <option value="ar">العربية</option>
      <option value="en">English</option>
    </select>
  </label>;
}
