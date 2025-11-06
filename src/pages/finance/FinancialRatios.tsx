import { PageCustomizer } from "@/components/PageCustomizer";
import { AdvancedFinancialRatios } from "@/components/finance/AdvancedFinancialRatios";
import { Activity } from "lucide-react";

export default function FinancialRatios() {
  return (
    <PageCustomizer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            التحليلات المالية المتقدمة
          </h1>
          <p className="text-muted-foreground mt-1">
            النسب والمؤشرات المالية الرئيسية (الربحية، السيولة، النشاط، المديونية)
          </p>
        </div>

        {/* Ratios Component */}
        <AdvancedFinancialRatios />
      </div>
    </PageCustomizer>
  );
}

