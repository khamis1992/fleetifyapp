import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireFinanceCompany } from "./financialReporting";

const money = z
  .number()
  .finite()
  .nonnegative()
  .refine(
    (value) =>
      Number.isSafeInteger(Math.round(value * 100)) &&
      Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
const count = z.number().int().nonnegative().safe();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const milliseconds = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString().slice(0, 10) === value
    );
  });
const amounts = {
  total: money,
  rent: money,
  fines: money,
  advances: money,
  other: money,
  count,
};
const balanced = (row: {
  total: number;
  rent: number;
  fines: number;
  advances: number;
  other: number;
}) =>
  Math.round(row.total * 100) ===
  [row.rent, row.fines, row.advances, row.other].reduce(
    (sum, value) => sum + Math.round(value * 100),
    0
  );
const schema = z.object({
  company_id: z.string(),
  as_of: date,
  currency: z.literal("QAR"),
  complete: z.literal(true),
  open_invoices: z.array(
    z.object({
      invoice_id: z.string().uuid(),
      customer_id: z.string().uuid(),
      invoice_number: z.string().min(1),
      due_date: date.nullable(),
      balance: money,
      partial: z.boolean(),
    })
  ),
  monthly: z.array(
    z
      .object({
        ...amounts,
        month_key: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      })
      .refine(balanced)
  ),
  customers: z.array(
    z
      .object({
        ...amounts,
        customer_id: z.string().uuid(),
        pending: money,
        partial_count: count,
        last_payment_date: date.nullable(),
      })
      .refine(balanced)
  ),
});
export type CustomerCollectionSummary = z.infer<typeof schema>;
export type CustomerCollectionTotals =
  CustomerCollectionSummary["customers"][number];
export type OpenCustomerInvoice =
  CustomerCollectionSummary["open_invoices"][number];

export function parseCustomerCollectionSummary(
  data: unknown,
  companyId: string,
  asOf: string
): CustomerCollectionSummary {
  const result = schema.safeParse(data);
  if (
    !result.success ||
    result.data.company_id !== companyId ||
    result.data.as_of !== asOf
  )
    throw new Error("تعذر التحقق من اكتمال ملخص التحصيل ونطاقه.");
  const summary = result.data;
  if (
    new Set(summary.open_invoices.map((row) => row.invoice_id)).size !==
      summary.open_invoices.length ||
    summary.open_invoices.some(
      (row) =>
        !summary.customers.some(
          (customer) => customer.customer_id === row.customer_id
        )
    )
  )
    throw new Error("تعذر مطابقة قائمة الفواتير مع العملاء.");
  for (const customer of summary.customers) {
    const invoices = summary.open_invoices.filter(
      (row) => row.customer_id === customer.customer_id
    );
    const pending = invoices.reduce(
      (sum, row) => sum + Math.round(row.balance * 100),
      0
    );
    if (
      !Number.isSafeInteger(pending) ||
      pending !== Math.round(customer.pending * 100) ||
      invoices.filter((row) => row.partial).length !== customer.partial_count
    )
      throw new Error("لم تتطابق أرصدة الفواتير مع ملخص العميل.");
  }
  if (
    new Set(summary.monthly.map((row) => row.month_key)).size !==
      summary.monthly.length ||
    new Set(summary.customers.map((row) => row.customer_id)).size !==
      summary.customers.length ||
    summary.monthly.some((row) => row.month_key > asOf.slice(0, 7))
  )
    throw new Error("تكرار أو فترة غير صحيحة في ملخص التحصيل.");
  for (const key of [
    "total",
    "rent",
    "fines",
    "advances",
    "other",
    "count",
  ] as const) {
    const multiplier = key === "count" ? 1 : 100;
    const total = (rows: Array<Record<typeof key, number>>) =>
      rows.reduce((sum, row) => sum + Math.round(row[key] * multiplier), 0);
    if (
      !Number.isSafeInteger(total(summary.monthly)) ||
      total(summary.monthly) !== total(summary.customers)
    )
      throw new Error(
        "لم تتطابق مجاميع الأشهر والعملاء؛ لا يمكن اعتماد تقرير جزئي."
      );
  }
  return summary;
}

export async function fetchCustomerCollectionSummary(
  companyId: string,
  asOf: string
) {
  requireFinanceCompany(companyId);
  const client = supabase as unknown as {
    rpc(
      name: string,
      args: Record<string, string>
    ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc(
    "get_customer_collection_summary_v1",
    { p_company_id: companyId, p_as_of: asOf }
  );
  if (error)
    throw new Error(`تعذر تحميل ملخص التحصيل من الدفعات. ${error.message}`);
  return parseCustomerCollectionSummary(data, companyId, asOf);
}
