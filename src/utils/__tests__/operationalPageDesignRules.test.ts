import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const operationalPages = [
  "src/pages/finance/Vendors.tsx",
  "src/pages/finance/MonthlyRentTracking.tsx",
  "src/pages/finance/Reports.tsx",
  "src/pages/finance/FinancialAnalysis.tsx",
  "src/pages/finance/FinancialRatios.tsx",
  "src/components/finance/MonthlyRentTracker.tsx",
  "src/pages/finance/MonthlyObligations.tsx",
  "src/pages/finance/PurchaseOrders.tsx",
  "src/pages/finance/MonthlyCloseAudit.tsx",
  "src/pages/finance/Calculator.tsx",
  "src/pages/finance/FinanceHub.tsx",
  "src/pages/finance/operations/ReceivePaymentWorkflow.tsx",
  "src/pages/finance/FixedAssets.tsx",
  "src/pages/fleet/MaintenanceRedesigned.tsx",
  "src/pages/fleet/FleetPageRedesigned.tsx",
  "src/pages/legal/LegalCasesTracking.tsx",
  "src/pages/legal/LawsuitPreparation/index.tsx",
] as const;

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("operational page design rules", () => {
  it.each(operationalPages)("uses the approved canvas in %s", (path) => {
    const source = readProjectFile(path);

    expect(source).toContain("bg-[#F6F8FB]");
    expect(source).not.toMatch(/bg-\[#f0efed\]/i);
    expect(source).not.toContain("bg-[#F4F7FA]");
  });

  it("keeps the shared card surface and geometry canonical", () => {
    const source = readProjectFile("src/components/ui/card.tsx");

    expect(source).toContain("!rounded-lg !shadow-sm");
    expect(source).toContain("border border-border bg-card text-card-foreground");
  });

  it("scopes the approved operational palette to finance, fleet, and legal routes", () => {
    const source = readProjectFile("src/components/layouts/BentoLayout.tsx");

    expect(source).toContain("['/finance', '/fleet', '/legal']");
    expect(source).toContain('usesCanonicalOperationalPalette && "dashboard-system-colors bg-[#F6F8FB]"');
  });
});
