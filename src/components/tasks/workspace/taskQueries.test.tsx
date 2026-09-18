import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { useTasks } from "@/hooks/useTasks";
const db = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  abortSignal: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: db.from },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { profile: { id: "profile", company_id: "company" } },
  }),
}));
describe("task query pagination", () => {
  it("loads later pages with company and assignment filters instead of silently truncating the workspace", async () => {
    for (const method of [db.from, db.select, db.eq, db.order, db.range])
      method.mockReturnValue(db);
    db.abortSignal
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, id) => ({ id: String(id) })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: "older-task" }], error: null });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useTasks({ assigned_to: "profile" }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(501);
    expect(result.current.data?.[500].id).toBe("older-task");
    expect(db.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(db.eq.mock.calls.filter(([key]) => key === "company_id")).toEqual([
      ["company_id", "company"],
      ["company_id", "company"],
    ]);
    expect(db.eq.mock.calls.filter(([key]) => key === "assigned_to")).toEqual([
      ["assigned_to", "profile"],
      ["assigned_to", "profile"],
    ]);
    expect(db.abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
    client.clear();
  });
});
