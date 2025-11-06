import { PageCustomizer } from "@/components/PageCustomizer";
import { InvoiceJournalLinkingReport } from "@/components/finance/InvoiceJournalLinkingReport";
import { Link as LinkIcon } from "lucide-react";

export default function InvoiceJournalReport() {
  return (
    <PageCustomizer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LinkIcon className="h-8 w-8 text-primary" />
            تقرير ربط الفواتير بالقيود المحاسبية
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض شامل لجميع الفواتير وقيودها المحاسبية المرتبطة مع إحصائيات تفصيلية
          </p>
        </div>

        {/* Report Component */}
        <InvoiceJournalLinkingReport />
      </div>
    </PageCustomizer>
  );
}

