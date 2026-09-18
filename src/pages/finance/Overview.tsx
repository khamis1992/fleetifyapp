import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import FinanceWorkspace from "@/components/finance/workspace/FinanceWorkspace";
import { Button } from "@/components/ui/button";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
const Alerts = lazy(() =>
  import("@/components/finance/AccountingAlerts").then((m) => ({
    default: m.AccountingAlerts,
  }))
);
export default function Overview() {
  const [params, setParams] = useSearchParams();
  const open = params.get("panel") === "alerts";
  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-xl border bg-card p-3">
        <Button
          variant="ghost"
          onClick={() =>
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              if (open) next.delete("panel");
              else next.set("panel", "alerts");
              return next;
            })
          }
          aria-expanded={open}
          aria-controls="finance-overview-alerts"
        >
          <Bell className="me-2 h-4 w-4" aria-hidden="true" />
          التنبيهات المالية
          <ChevronDown className={`ms-2 h-4 w-4 ${open ? "rotate-180" : ""}`} />
        </Button>
        <div id="finance-overview-alerts" hidden={!open}>
          {open && (
            <Suspense fallback={<PageSkeletonFallback />}>
              <Alerts />
            </Suspense>
          )}
        </div>
      </div>
      <FinanceWorkspace />
    </div>
  );
}
