import { PageCustomizer } from "@/components/PageCustomizer";
import { AuditTrailViewer } from "@/components/finance/AuditTrailViewer";
import { Shield } from "lucide-react";

export default function AuditTrailPage() {
  return (
    <PageCustomizer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            سجل التدقيق الشامل
          </h1>
          <p className="text-muted-foreground mt-1">
            تتبع كامل لجميع التعديلات المحاسبية (Audit Trail) - من قام بماذا ومتى
          </p>
        </div>

        {/* Audit Trail Viewer */}
        <AuditTrailViewer />
      </div>
    </PageCustomizer>
  );
}

