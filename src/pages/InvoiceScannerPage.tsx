/**
 * Invoice Scanner Page
 * OCR scanning with intelligent customer matching
 * Route: /finance/invoice-scanner
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FinancePageHeader } from '@/components/ui/FinancePageHeader';
import { FinanceSectionTabs } from '@/components/finance/workspace/FinanceSectionTabs';
import IntelligentInvoiceScanner from '@/components/IntelligentInvoiceScanner';
import InvoiceScannerAnalytics from '@/components/InvoiceScannerAnalytics';
import { PageHelp } from '@/components/help';
import { ScanLine, BarChart3, History, Sparkles, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

import { useFleetifyTranslation } from '@/hooks/useTranslation';

interface ScanResult {
  id: string;
  data: {
    customer_name?: string;
  };
  matching: {
    best_match?: { name?: string };
    total_confidence: number;
  };
  processing_info: {
    ocr_confidence: number;
    language_detected: string;
  };
}

const sections = [
  { id: 'scan', label: 'مسح الفواتير', icon: ScanLine },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3 },
  { id: 'history', label: 'سجل الجلسة', icon: History },
];

const MAX_RECENT_SCANS = 10;

const InvoiceScannerPage: React.FC = () => {
  const { t } = useFleetifyTranslation('ui');
  const [params, setParams] = useSearchParams();
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);

  const requested = params.get('tab') || 'scan';
  const activeTab = sections.some((s) => s.id === requested) ? requested : 'scan';

  const changeTab = (tab: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('tab', tab);
      return next;
    });

  const handleScanComplete = (result: ScanResult) => {
    setRecentScans((prev) => [result, ...prev.slice(0, MAX_RECENT_SCANS - 1)]);
    changeTab('history');
  };

  const stats = {
    totalScans: recentScans.length,
    autoAssigned: recentScans.filter((s) => s.matching.total_confidence >= 85).length,
    needsReview: recentScans.filter((s) => s.matching.total_confidence >= 70 && s.matching.total_confidence < 85).length,
    manualReview: recentScans.filter((s) => s.matching.total_confidence < 70).length,
    avgOcrConfidence: recentScans.length > 0
      ? Math.round(recentScans.reduce((sum, s) => sum + (s.processing_info.ocr_confidence || 0), 0) / recentScans.length)
      : 0,
  };

  const sessionSummary = [
    { id: 'total', label: 'مسحات الجلسة', value: stats.totalScans, icon: ScanLine, tone: 'text-primary' },
    { id: 'auto', label: 'مطابقة تلقائية', value: stats.autoAssigned, icon: CheckCircle2, tone: 'text-emerald-600' },
    { id: 'review', label: 'تحتاج مراجعة', value: stats.needsReview, icon: Clock, tone: 'text-amber-600' },
    { id: 'manual', label: 'مراجعة يدوية', value: stats.manualReview, icon: AlertTriangle, tone: 'text-red-600' },
  ];

  return (
    <section aria-label="ماسح الفواتير الذكي">
      <FinancePageHeader
        title="ماسح الفواتير الذكي"
        description="حوّل صور الفواتير إلى بيانات منظمة مع مطابقة تلقائية للعملاء بالعربية والإنجليزية."
        icon={ScanLine}
        actions={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('aipowered')}
          </Badge>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {sessionSummary.map(({ id, label, value, icon: Icon, tone }) => (
            <div key={id} className="flex items-center gap-3 rounded-xl border border-[var(--finance-border)] bg-[var(--finance-paper)] px-4 py-3">
              <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
                <p className="mt-1 truncate text-xs text-[var(--finance-muted)]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </FinancePageHeader>

      <Tabs value={activeTab} onValueChange={changeTab}>
        <FinanceSectionTabs items={sections} label="أقسام ماسح الفواتير" />

        <TabsContent value="scan">
          <IntelligentInvoiceScanner onScanComplete={handleScanComplete} />
        </TabsContent>

        <TabsContent value="analytics">
          <InvoiceScannerAnalytics />
        </TabsContent>

        <TabsContent value="history">
          {recentScans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--finance-border)] bg-[var(--finance-paper)] py-16 text-center">
              <History className="h-10 w-10 text-[var(--finance-muted)] opacity-60" aria-hidden="true" />
              <div>
                <p className="font-medium">لا توجد عمليات مسح في هذه الجلسة</p>
                <p className="mt-1 text-sm text-[var(--finance-muted)]">
                  ابدأ بمسح أول فاتورة وستظهر النتائج هنا تلقائياً.
                </p>
              </div>
              <button
                type="button"
                onClick={() => changeTab('scan')}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[var(--finance-border)] bg-[var(--finance-paper)] px-4 py-2 text-sm font-medium hover:bg-[var(--finance-wash)]"
              >
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                الانتقال إلى المسح
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan, index) => {
                const confidence = scan.matching.total_confidence;
                return (
                  <article
                    key={scan.id}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--finance-border)] bg-[var(--finance-paper)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--finance-wash)] text-xs font-bold tabular-nums text-[var(--finance-muted)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {scan.data.customer_name || 'اسم عميل غير مستخرج'}
                        </p>
                        <p className="truncate text-xs text-[var(--finance-muted)]">
                          أفضل تطابق: {scan.matching.best_match?.name || 'لا يوجد'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {scan.processing_info.language_detected}
                      </Badge>
                      {confidence >= 85 ? (
                        <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          تم التطابق
                        </Badge>
                      ) : confidence >= 70 ? (
                        <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          يحتاج مراجعة
                        </Badge>
                      ) : (
                        <Badge className="gap-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-50">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          مراجعة يدوية
                        </Badge>
                      )}
                      <span className="text-sm font-bold tabular-nums">{Math.round(confidence)}%</span>
                    </div>
                  </article>
                );
              })}
              <button
                type="button"
                onClick={() => setRecentScans([])}
                className="inline-flex items-center gap-2 text-sm text-[var(--finance-muted)] underline-offset-4 hover:text-[var(--finance-ink)] hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                تفريغ سجل الجلسة
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PageHelp
        title="دليل استخدام ماسح الفواتير"
        description="ارفع صورة فاتورة أو التقطها بالكاميرا، وسيتولى النظام استخراج البيانات ومطابقة العميل تلقائياً."
      >
        <ul className="list-disc ps-5 text-sm leading-7">
          <li>الفواتير عالية الثقة (85% فأكثر) تُطابق تلقائياً ويمكن تأكيدها بضغطة واحدة.</li>
          <li>ما بين 70% و85% يحتاج مراجعة سريعة للتطابق المقترح.</li>
          <li>استخدم «رفع متعدد» لمعالجة حتى 10 فواتير في الخلفية دفعة واحدة.</li>
          <li>تبويب «سجل الجلسة» يجمع نتائج هذه الجلسة مع ملخص المطابقة.</li>
        </ul>
      </PageHelp>
    </section>
  );
};

export default InvoiceScannerPage;