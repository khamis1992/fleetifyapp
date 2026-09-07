import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCreateAccountMapping,
  useDeleteAccountMapping,
  useUpdateAccountMapping,
} from "../useAccountMappings";

const state = vi.hoisted(() => ({
  companyId: "own" as string | null,
  from: vi.fn(),
  accountLevel: 3,
  missing: false,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: state.from },
}));
vi.mock("@/hooks/useUnifiedCompanyAccess", () => ({
  useUnifiedCompanyAccess: () => ({ companyId: state.companyId }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/services/financialReporting", () => ({
  readFinancialPages: vi.fn(),
}));

describe("account mapping commands", () => {
  const requests: Array<{
    table: string;
    write: boolean;
    filters: Array<[string, unknown]>;
  }> = [];
  beforeEach(() => {
    vi.clearAllMocks();
    requests.length = 0;
    state.companyId = "own";
    state.accountLevel = 3;
    state.missing = false;
    state.from.mockImplementation((table: string) => {
      const request = {
        table,
        write: false,
        filters: [] as Array<[string, unknown]>,
      };
      requests.push(request);
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((key: string, value: unknown) => {
          request.filters.push([key, value]);
          return query;
        }),
        update: vi.fn(() => {
          request.write = true;
          return query;
        }),
        insert: vi.fn(() => {
          request.write = true;
          return query;
        }),
        single: vi.fn(async () => ({
          error:
            state.missing && table === "account_mappings"
              ? new Error("No company mapping")
              : null,
          data:
            table === "chart_of_accounts"
              ? {
                  company_id: "own",
                  account_type: "revenue",
                  balance_type: "credit",
                  account_level: state.accountLevel,
                  is_header: false,
                  is_active: true,
                }
              : table === "default_account_types"
              ? { account_category: "revenue", type_code: "LATE_FEE_REVENUE" }
              : { id: "mapping", default_account_type_id: "fee-type" },
        })),
      };
      return query;
    });
  });
  const mount = <T,>(hook: () => T) =>
    renderHook(hook, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { mutations: { retry: false } } })
          }
        >
          {children}
        </QueryClientProvider>
      ),
    });
  it("checks both the existing mapping and update against the selected company", async () => {
    const hook = mount(useUpdateAccountMapping);
    await hook.result.current.mutateAsync({
      id: "mapping",
      chart_of_accounts_id: "fee-account",
    });
    const mappingRequests = requests.filter(
      (r) => r.table === "account_mappings"
    );
    expect(mappingRequests).toHaveLength(2);
    for (const request of mappingRequests)
      expect(request.filters).toEqual(
        expect.arrayContaining([
          ["company_id", "own"],
          ["is_active", true],
        ])
      );
  });
  it("rejects level-two account creation before writing a mapping", async () => {
    state.accountLevel = 2;
    const hook = mount(useCreateAccountMapping);
    await expect(
      hook.result.current.mutateAsync({
        default_account_type_id: "fee-type",
        chart_of_accounts_id: "fee-account",
      })
    ).rejects.toThrow("المستوى الثالث");
    expect(requests.some((r) => r.write)).toBe(false);
  });
  it("does not update an absent or foreign mapping", async () => {
    state.missing = true;
    const hook = mount(useUpdateAccountMapping);
    await expect(
      hook.result.current.mutateAsync({
        id: "foreign",
        chart_of_accounts_id: "fee-account",
      })
    ).rejects.toThrow("No company mapping");
    expect(requests.some((r) => r.write)).toBe(false);
  });
  it("scopes deactivation and rejects a zero-row result instead of claiming success", async () => {
    state.missing = true;
    const hook = mount(useDeleteAccountMapping);
    await expect(hook.result.current.mutateAsync("foreign")).rejects.toThrow(
      "No company mapping"
    );
    expect(requests[0].filters).toEqual(
      expect.arrayContaining([
        ["id", "foreign"],
        ["company_id", "own"],
      ])
    );
  });
  it("blocks commands while the company is unavailable", async () => {
    state.companyId = null;
    const hook = mount(useDeleteAccountMapping);
    await expect(hook.result.current.mutateAsync("mapping")).rejects.toThrow(
      "Company ID"
    );
    expect(state.from).not.toHaveBeenCalled();
  });
});
