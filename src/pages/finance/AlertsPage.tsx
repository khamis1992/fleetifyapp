import { PageCustomizer } from "@/components/PageCustomizer";
import { AccountingAlerts } from "@/components/finance/AccountingAlerts";
import { AlertTriangle } from "lucide-react";
import { FinancePageHeader } from '@/components/ui/FinancePageHeader';

export default function AlertsPage() {
  return (
    <PageCustomizer pageId="finance-alerts" title="" titleAr="">
      <div className="space-y-6">
        {/* Header */}
        <FinancePageHeader title="التنبيهات المحاسبية" description="راجع التنبيهات والفروقات التي تحتاج إلى متابعة." icon={AlertTriangle} />

        {/* Alerts Component */}
        <AccountingAlerts />
      </div>
    </PageCustomizer>
  );
}

