/** Resolve historic links at the route boundary, retaining filters and document IDs. */
export function resolveFinanceLocation(pathname: string, search = ""): string {
  const path = pathname.replace(/\/$/, "") || "/";
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  let target = path;
  if (path === "/finance/billing") {
    const sections: Record<string, string> = {
      invoices: "invoices",
      payments: "payments",
      deposits: "deposits",
      rent: "collections/rent",
      "ai-collections": "collections",
      "excel-import": "payments/import-excel",
    };
    target = `/finance/${sections[tab || "invoices"] || "invoices"}`;
    if (params.has("invoice") || params.get("action") === "new-invoice")
      target = "/finance/invoices";
    params.delete("tab");
  } else if (path === "/finance/accounting") {
    target = `/finance/${
      (
        {
          chart: "chart-of-accounts",
          ledger: "general-ledger",
          entries: "journal-entries",
        } as Record<string, string>
      )[tab || "chart"] || "chart-of-accounts"
    }`;
    params.delete("tab");
  } else if (path === "/finance/budgets-centers") {
    target =
      tab === "cost-centers" ? "/finance/cost-centers" : "/finance/budgets";
    params.delete("tab");
  } else if (path === "/finance/reports-analysis") {
    const sections: Record<string, string> = {
      analysis: "/finance/analysis",
      ratios: "/finance/analysis/ratios",
      calculator: "/finance/tools/calculator",
    };
    const report = params.get("report") || "trial-balance";
    const reports = [
      "trial-balance",
      "income-statement",
      "balance-sheet",
      "cash-flow",
      "receivables",
      "payables",
      "payroll",
      "cost-centers",
    ];
    target =
      sections[tab || "reports"] ||
      (reports.includes(report)
        ? `/finance/reports/${report}`
        : "/finance/reports");
    params.delete("tab");
    params.delete("report");
  } else if (path === "/finance/audit-settings") {
    const sections: Record<string, string> = {
      integrity: "integrity",
      approvals: "approvals",
      close: "close",
      audit: "audit",
      "audit-log": "audit",
      settings: "settings/account-mappings",
      permissions: "settings/permissions",
      wizard: "settings/setup",
    };
    target = `/finance/${sections[tab || "audit"] || "audit"}`;
    params.delete("tab");
  } else if (path === "/finance/treasury" && tab) {
    target =
      tab === "transactions"
        ? "/finance/treasury/transactions"
        : tab === "reconciliation"
        ? "/finance/treasury/reconciliation"
        : path;
    params.delete("tab");
  } else {
    const aliases: Record<string, string> = {
      "/finance": "/finance/overview",
      "/finance/hub": "/finance/overview",
      "/finance/unified": "/finance/overview",
      "/finance/accountant-dashboard": "/finance/overview",
      "/finance/alerts": "/finance/overview?panel=alerts",
      "/finance/ledger": "/finance/general-ledger",
      "/finance/cash-bank": "/finance/treasury",
      "/finance/financial-ratios": "/finance/analysis/ratios",
      "/finance/calculator": "/finance/tools/calculator",
      "/finance/audit-trail": "/finance/audit",
      "/finance/account-mappings": "/finance/settings/account-mappings",
      "/finance/journal-permissions": "/finance/settings/permissions",
      "/finance/new-entry": "/finance/journal-entries?action=new",
      "/finance/monthly-close-audit": "/finance/close/review",
      "/finance/payments-dashboard": "/finance/payments",
      "/finance/unified-payments": "/finance/payments",
      "/finance/unified-reports": "/finance/reports",
      "/finance/payments/quick": "/finance/operations/receive-payment",
      "/finance/monthly-rent-tracking": "/finance/collections/rent",
      "/finance/monthly-rent-redirect": "/finance/collections/rent",
      "/finance/settings-redirect": "/finance/settings/account-mappings",
    };
    const redirectNames = [
      "chart-of-accounts",
      "general-ledger",
      "ledger",
      "journal-entries",
      "deposits",
      "analysis",
      "financial-ratios",
      "calculator",
      "cost-centers",
      "audit-trail",
    ];
    const base = redirectNames.some(
      (name) => path === `/finance/${name}-redirect`
    )
      ? path.slice(0, -9)
      : path;
    target = aliases[path] || aliases[base] || base;
  }
  const [targetPath, targetSearch] = target.split("?");
  for (const [key, value] of new URLSearchParams(targetSearch))
    params.set(key, value);
  const query = params.toString();
  return `${targetPath}${query ? `?${query}` : ""}`;
}
