import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  renderHook,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fetchCustomerCollectionSummary,
  parseCustomerCollectionSummary,
} from "../customerCollectionSummary";
import { useCustomerCollectionSummary } from "@/hooks/finance/useCustomerCollectionSummary";
import { CustomerCollectionCards } from "@/pages/financial-tracking/CustomerCollectionCards";
import MonthlyRevenueTab from "@/pages/financial-tracking/MonthlyRevenueTab";
import { CustomerOpenInvoices } from "@/pages/financial-tracking/CustomerOpenInvoices";
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  companyId: "own" as string | null,
  user: { id: "actor" } as { id: string } | null,
  initializing: false,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: state.rpc },
}));
vi.mock("@/hooks/useUnifiedCompanyAccess", () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: state.companyId,
    user: state.user,
    isInitializing: state.initializing,
  }),
}));
const row = {
  total: 620,
  rent: 500,
  fines: 120,
  advances: 0,
  other: 0,
  count: 1,
};
const customer = {
  ...row,
  customer_id: "66666666-6666-4666-8666-666666666666",
  pending: 1000,
  partial_count: 1,
  last_payment_date: "2026-09-03",
};
const data = {
  company_id: "own",
  as_of: "2026-09-06",
  currency: "QAR",
  complete: true,
  open_invoices: [
    {
      invoice_id: "11111111-1111-4111-8111-111111111111",
      customer_id: customer.customer_id,
      invoice_number: "TEST-1",
      due_date: "2026-09-01",
      balance: 1000,
      partial: true,
    },
  ],
  monthly: [{ ...row, month_key: "2026-09" }],
  customers: [customer],
};
describe("collection reporting reads and presentation", () => {
  it("shows remaining invoices separately and counts overdue days across months", () => {
    render(
      <CustomerOpenInvoices
        invoices={[{ ...data.open_invoices[0], due_date: "2026-06-01" }]}
        asOf="2026-09-06"
      />
    );
    expect(screen.getByText("97")).toBeInTheDocument();
    expect(screen.getByText("TEST-1")).toBeInTheDocument();
  });
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.companyId = "own";
    state.user = { id: "actor" };
    state.initializing = false;
  });
  it("uses the scoped snapshot RPC and validates its balanced result", async () => {
    state.rpc.mockResolvedValue({ data, error: null });
    expect(await fetchCustomerCollectionSummary("own", "2026-09-06")).toEqual(
      data
    );
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith(
      "get_customer_collection_summary_v1",
      { p_company_id: "own", p_as_of: "2026-09-06" }
    );
  });
  it("keeps missing backend and permission errors visible without a legacy fallback", async () => {
    state.rpc.mockResolvedValue({
      data: null,
      error: { message: "Reader not installed" },
    });
    await expect(
      fetchCustomerCollectionSummary("own", "2026-09-06")
    ).rejects.toThrow("Reader not installed");
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });
  for (const [name, change] of [
    ["company", { company_id: "other" }],
    ["period", { as_of: "2026-08-06" }],
    ["currency", { currency: "USD" }],
    ["completion", { complete: false }],
  ] as const)
    it(`rejects an invalid ${name} acknowledgement`, () =>
      expect(() =>
        parseCustomerCollectionSummary(
          { ...data, ...change },
          "own",
          "2026-09-06"
        )
      ).toThrow());
  it("rejects duplicate months, malformed money and incomplete customer totals", () => {
    for (const changed of [
      { ...data, monthly: [...data.monthly, ...data.monthly] },
      { ...data, monthly: [{ ...data.monthly[0], rent: NaN }] },
      { ...data, monthly: [{ ...data.monthly[0], total: 620.005 }] },
      { ...data, customers: [] },
    ])
      expect(() =>
        parseCustomerCollectionSummary(changed, "own", "2026-09-06")
      ).toThrow();
  });
  it("accepts a confirmed empty dataset as zero activity", () => {
    expect(
      parseCustomerCollectionSummary(
        { ...data, monthly: [], customers: [], open_invoices: [] },
        "own",
        "2026-09-06"
      ).monthly
    ).toEqual([]);
  });
  it("shows a read failure instead of stale customer amounts", () => {
    const retry = vi.fn();
    render(
      <CustomerCollectionCards
        totals={customer}
        loading={false}
        error={new Error("فشل الاتصال")}
        onRetry={retry}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("فشل الاتصال");
    expect(screen.queryByText(/620/)).not.toBeInTheDocument();
    screen.getByRole("button", { name: "إعادة المحاولة" }).click();
    expect(retry).toHaveBeenCalledOnce();
  });
  it("shows monthly failures separately from an empty month", () => {
    render(
      <MonthlyRevenueTab
        loading={false}
        error={new Error("فشل القراءة")}
        onRetry={() => {}}
        monthlySummary={[]}
        filteredMonthlySummary={[]}
        selectedMonthFilter="all"
        onMonthFilterChange={() => {}}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("فشل القراءة");
    expect(
      screen.queryByText("لا توجد بيانات شهرية بعد")
    ).not.toBeInTheDocument();
  });
  it("blocks the reader until the user and company are ready", async () => {
    state.initializing = true;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      () => useCustomerCollectionSummary(),
      { wrapper }
    );
    expect(state.rpc).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    state.initializing = false;
    state.user = null;
    rerender();
    expect(state.rpc).not.toHaveBeenCalled();
    client.clear();
  });
  it("clears visible totals immediately on company change", async () => {
    state.rpc.mockImplementation((_name, args) =>
      Promise.resolve({
        data: { ...data, company_id: args.p_company_id, as_of: args.p_as_of },
        error: null,
      })
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender, unmount } = renderHook(
      () => useCustomerCollectionSummary(),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data?.company_id).toBe("own"));
    state.rpc.mockImplementation(() => new Promise(() => {}));
    state.companyId = "other";
    rerender();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    unmount();
    client.clear();
  });
});
