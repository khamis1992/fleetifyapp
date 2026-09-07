import { PageCustomizer } from "@/components/PageCustomizer";
import { InvoiceJournalLinkingReport } from "@/components/finance/InvoiceJournalLinkingReport";
import { Link as LinkIcon } from "lucide-react";
import { FinancePageHeader } from '@/components/ui/FinancePageHeader';

export default function InvoiceJournalReport() {
  return (
    <PageCustomizer pageId="invoice-journal-report" title="" titleAr="">
      <div className="space-y-6">
        {/* Header */}
        <FinancePageHeader title="ربط الفواتير بالقيود" description="تتبّع القيد المرتبط بكل فاتورة وراجع الروابط غير المكتملة." icon={LinkIcon} />

        {/* Report Component */}
        <InvoiceJournalLinkingReport />
      </div>
    </PageCustomizer>
  );
}

