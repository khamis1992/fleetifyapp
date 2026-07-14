import { PageCustomizer } from "@/components/PageCustomizer";
import { AuditTrailViewer } from "@/components/finance/AuditTrailViewer";

export default function AuditTrailPage() {
  return (
    <PageCustomizer pageId="finance-audit-trail" title="" titleAr="">
      <AuditTrailViewer />
    </PageCustomizer>
  );
}
