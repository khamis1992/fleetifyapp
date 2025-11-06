import { PageCustomizer } from "@/components/PageCustomizer";
import { AccountingAlerts } from "@/components/finance/AccountingAlerts";
import { AlertTriangle } from "lucide-react";

export default function AlertsPage() {
  return (
    <PageCustomizer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-primary" />
            التنبيهات المحاسبية
          </h1>
          <p className="text-muted-foreground mt-1">
            مراقبة تلقائية لجميع الأخطاء والمشاكل المحاسبية المحتملة
          </p>
        </div>

        {/* Alerts Component */}
        <AccountingAlerts />
      </div>
    </PageCustomizer>
  );
}

