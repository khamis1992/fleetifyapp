import { PageCustomizer } from "@/components/PageCustomizer";
import { JournalEntryPermissionsManager } from "@/components/finance/JournalEntryPermissionsManager";
import { Shield } from "lucide-react";

export default function JournalPermissions() {
  return (
    <PageCustomizer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            صلاحيات القيود المحاسبية
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض وإدارة صلاحيات مراحل القيود المحاسبية (Workflow Permissions)
          </p>
        </div>

        {/* Permissions Manager */}
        <JournalEntryPermissionsManager />
      </div>
    </PageCustomizer>
  );
}

