import { PageCustomizer } from "@/components/PageCustomizer";
import { AuditTrailViewer } from "@/components/finance/AuditTrailViewer";

export default function AuditTrailPage() {
  return (
    <PageCustomizer>
      <AuditTrailViewer />
    </PageCustomizer>
  );
}
