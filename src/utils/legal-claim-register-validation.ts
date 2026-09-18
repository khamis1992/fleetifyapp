import type { LegalClaimRegister } from "@/types/legalClaimRegister";

export function monthlyRetentionAmount(
  from: string,
  to: string,
  rate: number,
  basis: "calendar_days" | "thirty_days"
): number {
  const start = new Date(`${from}T00:00:00Z`),
    end = new Date(`${to}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start.toISOString().slice(0, 10) !== from ||
    end.toISOString().slice(0, 10) !== to ||
    end < start ||
    !Number.isFinite(rate) ||
    rate <= 0
  )
    throw new Error("فترة الاحتباس أو الأجرة الشهرية غير صالحة");
  let amount = 0;
  for (
    let month = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    month <= end.getTime();

  ) {
    const date = new Date(month);
    const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    const last = next - 86400000;
    const days =
      (Math.min(end.getTime(), last) - Math.max(start.getTime(), month)) /
        86400000 +
      1;
    const full = start.getTime() <= month && end.getTime() >= last;
    amount +=
      rate *
      (full
        ? 1
        : Math.min(
            1,
            days / (basis === "thirty_days" ? 30 : (next - month) / 86400000)
          ));
    month = next;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function assertClaimRegisterConsistent(
  register: LegalClaimRegister
): void {
  if (
    register.issues.length ||
    register.rows.some((row) => row.status === "incomplete")
  )
    throw new Error(
      register.issues.join("؛ ") || "سجل المطالبات يحتاج استكمالًا"
    );
  const ready = register.rows.filter((row) => row.status === "ready");
  if (
    new Set(register.rows.map((row) => row.key)).size !==
      register.rows.length ||
    ready.some((row) => row.amount == null || !Number.isFinite(row.amount))
  )
    throw new Error("بنود سجل المطالبات غير صالحة");
  for (const row of ready.filter(
    (row) => row.custom || (row.key === "rent_due" && row.gross_amount != null)
  )) {
    if (
      row.amount! < 0 ||
      Math.round((Number(row.gross_amount) - Number(row.deductions)) * 100) !==
        Math.round(row.amount! * 100)
    )
      throw new Error("صافي الطلب لا يطابق المبلغ والخصومات");
  }
  const total = Math.max(
    0,
    ready
      .filter((row) => row.disposition === "primary")
      .reduce((sum, row) => sum + Math.round(row.amount! * 100), 0)
  );
  const extra = ready
    .filter((row) => row.custom && row.disposition === "primary")
    .reduce((sum, row) => sum + Math.round(row.amount! * 100), 0);
  if (
    total !== Math.round(register.primary_total * 100) ||
    extra !== Math.round(register.additional_primary * 100)
  )
    throw new Error("إجمالي سجل المطالبات لا يطابق بنوده الأصلية");
  const retention = ready.find((row) => row.key === "retention");
  if (
    retention &&
    register.retention_basis === "contract_monthly" &&
    (!retention.period_from ||
      !retention.period_to ||
      monthlyRetentionAmount(
        retention.period_from,
        retention.period_to,
        Number(register.retention_monthly_rate),
        register.retention_proration || "calendar_days"
      ) !== retention.amount)
  )
    throw new Error("الاحتباس لا يطابق الأجرة الشهرية وفترته");
}
