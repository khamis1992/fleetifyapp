import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const db = supabase as any;

export type ObligationType =
  | "office_rent"
  | "staff_housing"
  | "vehicle_installment"
  | "vehicle_lease"
  | "subscription"
  | "insurance"
  | "other";

export type ObligationAccountingTreatment =
  | "direct_expense"
  | "financing_liability"
  | "fixed_asset_financing"
  | "right_of_use_asset";

export type ObligationStatus = "active" | "paused" | "completed" | "cancelled";
export type ObligationInstallmentStatus = "pending" | "partial" | "paid" | "overdue" | "cancelled";
export type VehicleAmountMode = "total" | "per_vehicle";

export interface MonthlyObligationVehicle {
  id: string;
  company_id: string;
  obligation_id: string;
  vehicle_id: string;
  allocation_amount: number;
  allocation_percentage?: number | null;
  is_primary: boolean;
  notes?: string | null;
  vehicle?: {
    id: string;
    plate_number?: string | null;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
}

export interface MonthlyObligationInstallment {
  id: string;
  company_id: string;
  obligation_id: string;
  installment_number: number;
  period_start: string;
  period_end: string;
  due_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  paid_amount: number;
  status: ObligationInstallmentStatus;
  payment_date?: string | null;
  vendor_payment_id?: string | null;
  bank_transaction_id?: string | null;
  journal_entry_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  obligation?: MonthlyObligation;
}

export interface MonthlyObligation {
  id: string;
  company_id: string;
  obligation_number: string;
  title: string;
  description?: string | null;
  obligation_type: ObligationType;
  accounting_treatment: ObligationAccountingTreatment;
  vendor_id?: string | null;
  vehicle_id?: string | null;
  vehicle_amount_mode?: VehicleAmountMode;
  vehicle_count?: number;
  fixed_asset_id?: string | null;
  cost_center_id?: string | null;
  expense_account_id?: string | null;
  liability_account_id?: string | null;
  asset_account_id?: string | null;
  interest_expense_account_id?: string | null;
  monthly_amount: number;
  principal_amount: number;
  interest_amount: number;
  currency: string;
  start_date: string;
  end_date?: string | null;
  due_day: number;
  auto_generate: boolean;
  next_due_date?: string | null;
  status: ObligationStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    id: string;
    vendor_name: string;
    vendor_name_ar?: string | null;
  } | null;
  vehicle?: {
    id: string;
    plate_number?: string | null;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
  vehicle_links?: MonthlyObligationVehicle[];
  fixed_asset?: {
    id: string;
    asset_code?: string | null;
    asset_name?: string | null;
    asset_name_ar?: string | null;
  } | null;
  installments?: MonthlyObligationInstallment[];
}

export interface CreateMonthlyObligationInput {
  title: string;
  description?: string;
  obligation_type: ObligationType;
  accounting_treatment: ObligationAccountingTreatment;
  vendor_id?: string | null;
  vehicle_id?: string | null;
  vehicle_ids?: string[];
  vehicle_amount_mode?: VehicleAmountMode;
  fixed_asset_id?: string | null;
  cost_center_id?: string | null;
  expense_account_id?: string | null;
  liability_account_id?: string | null;
  asset_account_id?: string | null;
  interest_expense_account_id?: string | null;
  monthly_amount: number;
  principal_amount?: number;
  interest_amount?: number;
  currency?: string;
  start_date: string;
  end_date?: string | null;
  due_day: number;
  months_count?: number;
  auto_generate?: boolean;
  accrue_on_create?: boolean;
  notes?: string;
}

export interface UpdateMonthlyObligationInput extends CreateMonthlyObligationInput {
  id: string;
  status?: ObligationStatus;
}

export interface PayMonthlyObligationInput {
  installment_id: string;
  amount: number;
  payment_date: string;
  bank_id?: string | null;
  cash_account_id?: string | null;
  reference_number?: string;
  notes?: string;
}

interface CompanyUser {
  id?: string;
  profile?: { company_id?: string | null };
  company?: { id?: string | null };
  company_id?: string | null;
}

const getCompanyId = (user: CompanyUser | null | undefined) =>
  user?.profile?.company_id || user?.company?.id || user?.company_id || null;

const cleanId = (value?: string | null) => (!value || value === "none" ? null : value);
const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const uniqueIds = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => !!value && value !== "none")));
let useLegacyObligationSchema = false;
const schemaNeedsLegacyObligationQuery = (error: any) => {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    ["PGRST200", "PGRST201", "PGRST204", "PGRST205", "42703", "42P01"].includes(error?.code) ||
    text.includes("monthly_obligation_vehicles") ||
    text.includes("vehicle_amount_mode") ||
    text.includes("vehicle_count") ||
    text.includes("relationship") ||
    text.includes("schema cache") ||
    text.includes("could not find") ||
    text.includes("does not exist")
  );
};

const obligationSelect = `
  *,
  vendor:vendors(id, vendor_name, vendor_name_ar),
  vehicle:vehicles(id, plate_number, make, model, year),
  vehicle_links:monthly_obligation_vehicles(
    *,
    vehicle:vehicles(id, plate_number, make, model, year)
  ),
  fixed_asset:fixed_assets(id, asset_code, asset_name, asset_name_ar),
  installments:monthly_obligation_installments(*)
`;

const legacyObligationSelect = `
  *,
  vendor:vendors(id, vendor_name, vendor_name_ar),
  vehicle:vehicles(id, plate_number, make, model, year),
  fixed_asset:fixed_assets(id, asset_code, asset_name, asset_name_ar),
  installments:monthly_obligation_installments(*)
`;

const installmentSelect = `
  *,
  obligation:monthly_obligations(
    *,
    vendor:vendors(id, vendor_name, vendor_name_ar),
    vehicle:vehicles(id, plate_number, make, model, year),
    vehicle_links:monthly_obligation_vehicles(
      *,
      vehicle:vehicles(id, plate_number, make, model, year)
    ),
    fixed_asset:fixed_assets(id, asset_code, asset_name, asset_name_ar)
  )
`;

const legacyInstallmentSelect = `
  *,
  obligation:monthly_obligations(
    *,
    vendor:vendors(id, vendor_name, vendor_name_ar),
    vehicle:vehicles(id, plate_number, make, model, year),
    fixed_asset:fixed_assets(id, asset_code, asset_name, asset_name_ar)
  )
`;

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const lastDayOfMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const buildInstallments = (
  obligation: MonthlyObligation,
  input: CreateMonthlyObligationInput,
  companyId: string
) => {
  const start = new Date(`${input.start_date}T00:00:00`);
  const end = input.end_date ? new Date(`${input.end_date}T00:00:00`) : null;
  const fallbackMonths = Math.max(1, Math.min(input.months_count || 12, 120));
  const rows = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  let index = 1;

  while (index <= 120) {
    if (!end && index > fallbackMonths) break;
    if (end && cursor > end) break;

    const dueDay = Math.min(input.due_day || 1, lastDayOfMonth(cursor.getFullYear(), cursor.getMonth()));
    const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), dueDay);
    const periodStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const periodEnd = new Date(cursor.getFullYear(), cursor.getMonth(), lastDayOfMonth(cursor.getFullYear(), cursor.getMonth()));
    const principal = money(input.principal_amount || 0);
    const interest = money(input.interest_amount || 0);

    rows.push({
      company_id: companyId,
      obligation_id: obligation.id,
      installment_number: index,
      period_start: formatDate(periodStart),
      period_end: formatDate(periodEnd),
      due_date: formatDate(dueDate),
      amount: money(input.monthly_amount),
      principal_amount:
        input.accounting_treatment === "direct_expense"
          ? 0
          : principal > 0
            ? principal
            : money(input.monthly_amount - interest),
      interest_amount: input.accounting_treatment === "direct_expense" ? 0 : interest,
      paid_amount: 0,
      status: "pending",
    });

    cursor = addMonths(cursor, 1);
    index += 1;
  }

  return rows;
};

export const useMonthlyObligations = () => {
  const { user } = useAuth();
  const companyId = getCompanyId(user as CompanyUser);

  return useQuery({
    queryKey: ["monthly-obligations", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const query = () =>
        db
          .from("monthly_obligations")
          .select(obligationSelect)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

      const legacyQuery = () =>
        db
          .from("monthly_obligations")
          .select(legacyObligationSelect)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

      if (useLegacyObligationSchema) {
        const { data: legacyData, error: legacyError } = await legacyQuery();
        if (legacyError) throw legacyError;
        return (legacyData || []) as MonthlyObligation[];
      }

      const { data, error } = await query();

      if (error && schemaNeedsLegacyObligationQuery(error)) {
        useLegacyObligationSchema = true;
        const { data: legacyData, error: legacyError } = await legacyQuery();
        if (legacyError) throw legacyError;
        return (legacyData || []) as MonthlyObligation[];
      }

      if (error) throw error;
      useLegacyObligationSchema = false;
      return (data || []) as MonthlyObligation[];
    },
  });
};

export const useMonthlyObligationInstallments = () => {
  const { user } = useAuth();
  const companyId = getCompanyId(user as CompanyUser);

  return useQuery({
    queryKey: ["monthly-obligation-installments", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const query = () =>
        db
          .from("monthly_obligation_installments")
          .select(installmentSelect)
          .eq("company_id", companyId)
          .order("due_date", { ascending: true });

      const legacyQuery = () =>
        db
          .from("monthly_obligation_installments")
          .select(legacyInstallmentSelect)
          .eq("company_id", companyId)
          .order("due_date", { ascending: true });

      if (useLegacyObligationSchema) {
        const { data: legacyData, error: legacyError } = await legacyQuery();
        if (legacyError) throw legacyError;
        return (legacyData || []) as MonthlyObligationInstallment[];
      }

      const { data, error } = await query();

      if (error && schemaNeedsLegacyObligationQuery(error)) {
        useLegacyObligationSchema = true;
        const { data: legacyData, error: legacyError } = await legacyQuery();
        if (legacyError) throw legacyError;
        return (legacyData || []) as MonthlyObligationInstallment[];
      }

      if (error) throw error;
      useLegacyObligationSchema = false;
      return (data || []) as MonthlyObligationInstallment[];
    },
  });
};

export const useMonthlyObligationSummary = () => {
  const obligations = useMonthlyObligations();
  const installments = useMonthlyObligationInstallments();

  const summary = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const allInstallments = installments.data || [];
    const activeObligations = (obligations.data || []).filter((item) => item.status === "active");
    const activeRecurringObligations = activeObligations.filter((item) => item.auto_generate !== false);
    const openInstallments = allInstallments.filter((item) => !["paid", "cancelled"].includes(item.status));
    const oneTimeOpenInstallments = openInstallments.filter((item) => item.obligation?.auto_generate === false);
    const dueThisMonth = openInstallments.filter((item) => {
      const due = new Date(`${item.due_date}T00:00:00`);
      return due >= monthStart && due <= monthEnd;
    });
    const overdue = openInstallments.filter((item) => new Date(`${item.due_date}T00:00:00`) < today);
    const paidThisMonth = allInstallments.filter((item) => {
      if (!item.payment_date) return false;
      const paid = new Date(`${item.payment_date}T00:00:00`);
      return paid >= monthStart && paid <= monthEnd;
    });

    return {
      activeCount: activeObligations.length,
      monthlyCommittedAmount: activeRecurringObligations.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0),
      oneTimeOutstandingAmount: oneTimeOpenInstallments.reduce(
        (sum, item) => sum + Number(item.amount || 0) - Number(item.paid_amount || 0),
        0
      ),
      dueThisMonthAmount: dueThisMonth.reduce((sum, item) => sum + Number(item.amount || 0) - Number(item.paid_amount || 0), 0),
      overdueAmount: overdue.reduce((sum, item) => sum + Number(item.amount || 0) - Number(item.paid_amount || 0), 0),
      paidThisMonthAmount: paidThisMonth.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0),
      upcomingInstallments: openInstallments.slice(0, 12),
    };
  }, [installments.data, obligations.data]);

  return {
    data: summary,
    isLoading: obligations.isLoading || installments.isLoading,
    error: obligations.error || installments.error,
  };
};

export const useCreateMonthlyObligation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMonthlyObligationInput) => {
      const companyId = getCompanyId(user as CompanyUser);
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      if (!input.title.trim()) throw new Error("اسم الالتزام مطلوب");
      if (!input.start_date) throw new Error("تاريخ البداية مطلوب");
      if (!input.monthly_amount || input.monthly_amount <= 0) throw new Error("المبلغ الشهري مطلوب");

      const selectedVehicleIds = uniqueIds([...(input.vehicle_ids || []), input.vehicle_id]);
      const vehicleCount = selectedVehicleIds.length;
      if (["vehicle_installment", "vehicle_lease"].includes(input.obligation_type) && vehicleCount === 0) {
        throw new Error("يجب ربط التزام المركبات بمركبة واحدة على الأقل");
      }
      const vehicleAmountMode = input.vehicle_amount_mode || "total";
      const amountMultiplier = vehicleAmountMode === "per_vehicle" ? Math.max(vehicleCount, 1) : 1;
      const effectiveMonthlyAmount = money(input.monthly_amount * amountMultiplier);
      const effectivePrincipalAmount = money((input.principal_amount || 0) * amountMultiplier);
      const effectiveInterestAmount = money((input.interest_amount || 0) * amountMultiplier);
      const effectiveInput: CreateMonthlyObligationInput = {
        ...input,
        vehicle_id: selectedVehicleIds[0] || null,
        monthly_amount: effectiveMonthlyAmount,
        principal_amount: effectivePrincipalAmount,
        interest_amount: effectiveInterestAmount,
      };
      const obligationNumber = `OBL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insertPayload = {
        company_id: companyId,
        obligation_number: obligationNumber,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        obligation_type: input.obligation_type,
        accounting_treatment: input.accounting_treatment,
        vendor_id: cleanId(input.vendor_id),
        vehicle_id: selectedVehicleIds[0] || null,
        vehicle_amount_mode: vehicleAmountMode,
        vehicle_count: vehicleCount,
        fixed_asset_id: cleanId(input.fixed_asset_id),
        cost_center_id: cleanId(input.cost_center_id),
        expense_account_id: cleanId(input.expense_account_id),
        liability_account_id: cleanId(input.liability_account_id),
        asset_account_id: cleanId(input.asset_account_id),
        interest_expense_account_id: cleanId(input.interest_expense_account_id),
        monthly_amount: effectiveMonthlyAmount,
        principal_amount: effectivePrincipalAmount,
        interest_amount: effectiveInterestAmount,
        currency: input.currency || "QAR",
        start_date: input.start_date,
        end_date: input.end_date || null,
        due_day: input.due_day || 1,
        auto_generate: input.auto_generate ?? true,
        next_due_date: input.start_date,
        status: "active",
        notes: input.notes?.trim() || null,
        created_by: user?.id || null,
      };
      const legacyInsertPayload = { ...insertPayload };
      delete (legacyInsertPayload as Record<string, unknown>).vehicle_amount_mode;
      delete (legacyInsertPayload as Record<string, unknown>).vehicle_count;

      let usedLegacyVehicleLinking = useLegacyObligationSchema;
      let obligation: any = null;
      let error: any = null;

      if (useLegacyObligationSchema) {
        const legacyResult = await db
          .from("monthly_obligations")
          .insert(legacyInsertPayload)
          .select("*")
          .single();
        obligation = legacyResult.data;
        error = legacyResult.error;
      } else {
        const insertResult = await db
          .from("monthly_obligations")
          .insert(insertPayload)
          .select("*")
          .single();
        obligation = insertResult.data;
        error = insertResult.error;
      }

      if (error && schemaNeedsLegacyObligationQuery(error)) {
        usedLegacyVehicleLinking = true;
        useLegacyObligationSchema = true;
        const legacyResult = await db
          .from("monthly_obligations")
          .insert(legacyInsertPayload)
          .select("*")
          .single();
        obligation = legacyResult.data;
        error = legacyResult.error;
      }

      if (error) throw error;
      if (!obligation) throw new Error("تعذر إنشاء الالتزام");
      if (!usedLegacyVehicleLinking) useLegacyObligationSchema = false;

      if (selectedVehicleIds.length && !usedLegacyVehicleLinking) {
        const allocationAmount =
          vehicleAmountMode === "per_vehicle"
            ? money(input.monthly_amount)
            : money(effectiveMonthlyAmount / selectedVehicleIds.length);
        const allocationPercentage = money(100 / selectedVehicleIds.length);

        const { error: vehicleError } = await db.from("monthly_obligation_vehicles").insert(
          selectedVehicleIds.map((vehicleId, index) => ({
            company_id: companyId,
            obligation_id: obligation.id,
            vehicle_id: vehicleId,
            allocation_amount: allocationAmount,
            allocation_percentage: allocationPercentage,
            is_primary: index === 0,
          }))
        );

        if (vehicleError && schemaNeedsLegacyObligationQuery(vehicleError)) {
          usedLegacyVehicleLinking = true;
          useLegacyObligationSchema = true;
          console.warn("[useMonthlyObligations] Vehicle link table is not available; saved primary vehicle only.", vehicleError);
        } else if (vehicleError) {
          throw vehicleError;
        }
      }

      const rows = buildInstallments(obligation as MonthlyObligation, effectiveInput, companyId);
      if (rows.length) {
        const { error: installmentError } = await db
          .from("monthly_obligation_installments")
          .insert(rows);
        if (installmentError) throw installmentError;
      }

      if (input.accrue_on_create && input.expense_account_id && input.liability_account_id) {
        const { data: entryNumberData } = await db.rpc("generate_journal_entry_number", {
          company_id_param: companyId,
        });

        const { data: journalEntry, error: journalEntryError } = await db
          .from("journal_entries")
          .insert({
            company_id: companyId,
            entry_number: entryNumberData || `JE-OBL-ACCR-${Date.now()}`,
            entry_date: input.start_date,
            description: `تسجيل التزام غير مدفوع: ${input.title.trim()}`,
            reference_type: "monthly_obligation_accrual",
            reference_id: obligation.id,
            total_debit: effectiveMonthlyAmount,
            total_credit: effectiveMonthlyAmount,
            status: "posted",
            created_by: user?.id || null,
            posted_by: user?.id || null,
            posted_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (journalEntryError) throw journalEntryError;

        const { error: lineError } = await db.from("journal_entry_lines").insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: input.expense_account_id,
            debit_amount: effectiveMonthlyAmount,
            credit_amount: 0,
            line_description: `مصروف مستحق: ${input.title.trim()}`,
            line_number: 1,
            cost_center_id: cleanId(input.cost_center_id),
            asset_id: cleanId(input.fixed_asset_id),
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: input.liability_account_id,
            debit_amount: 0,
            credit_amount: effectiveMonthlyAmount,
            line_description: `التزام غير مدفوع: ${input.title.trim()}`,
            line_number: 2,
            cost_center_id: cleanId(input.cost_center_id),
            asset_id: cleanId(input.fixed_asset_id),
          },
        ]);

        if (lineError) throw lineError;
      }

      return obligation as MonthlyObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-obligation-installments"] });
      toast.success("تم إنشاء الالتزام وجدولة دفعاته");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الالتزام");
    },
  });
};

export const useUpdateMonthlyObligation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMonthlyObligationInput) => {
      const companyId = getCompanyId(user as CompanyUser);
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      if (!input.id) throw new Error("الالتزام مطلوب");
      if (!input.title.trim()) throw new Error("اسم الالتزام مطلوب");
      if (!input.start_date) throw new Error("تاريخ البداية مطلوب");
      if (!input.monthly_amount || input.monthly_amount <= 0) throw new Error("المبلغ الشهري مطلوب");

      const selectedVehicleIds = uniqueIds([...(input.vehicle_ids || []), input.vehicle_id]);
      const vehicleCount = selectedVehicleIds.length;
      if (["vehicle_installment", "vehicle_lease"].includes(input.obligation_type) && vehicleCount === 0) {
        throw new Error("يجب ربط التزام المركبات بمركبة واحدة على الأقل");
      }

      const vehicleAmountMode = input.vehicle_amount_mode || "total";
      const amountMultiplier = vehicleAmountMode === "per_vehicle" ? Math.max(vehicleCount, 1) : 1;
      const effectiveMonthlyAmount = money(input.monthly_amount * amountMultiplier);
      const effectivePrincipalAmount = money((input.principal_amount || 0) * amountMultiplier);
      const effectiveInterestAmount = money((input.interest_amount || 0) * amountMultiplier);
      const installmentPrincipal =
        input.accounting_treatment === "direct_expense"
          ? 0
          : effectivePrincipalAmount > 0
            ? effectivePrincipalAmount
            : money(effectiveMonthlyAmount - effectiveInterestAmount);
      const installmentInterest = input.accounting_treatment === "direct_expense" ? 0 : effectiveInterestAmount;

      const updatePayload = {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        obligation_type: input.obligation_type,
        accounting_treatment: input.accounting_treatment,
        vendor_id: cleanId(input.vendor_id),
        vehicle_id: selectedVehicleIds[0] || null,
        vehicle_amount_mode: vehicleAmountMode,
        vehicle_count: vehicleCount,
        fixed_asset_id: cleanId(input.fixed_asset_id),
        cost_center_id: cleanId(input.cost_center_id),
        expense_account_id: cleanId(input.expense_account_id),
        liability_account_id: cleanId(input.liability_account_id),
        asset_account_id: cleanId(input.asset_account_id),
        interest_expense_account_id: cleanId(input.interest_expense_account_id),
        monthly_amount: effectiveMonthlyAmount,
        principal_amount: effectivePrincipalAmount,
        interest_amount: effectiveInterestAmount,
        currency: input.currency || "QAR",
        start_date: input.start_date,
        end_date: input.end_date || null,
        due_day: input.due_day || 1,
        auto_generate: input.auto_generate ?? true,
        status: input.status || "active",
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const legacyUpdatePayload = { ...updatePayload };
      delete (legacyUpdatePayload as Record<string, unknown>).vehicle_amount_mode;
      delete (legacyUpdatePayload as Record<string, unknown>).vehicle_count;

      let usedLegacyVehicleLinking = useLegacyObligationSchema;
      let obligation: any = null;
      let error: any = null;

      if (useLegacyObligationSchema) {
        const legacyResult = await db
          .from("monthly_obligations")
          .update(legacyUpdatePayload)
          .eq("id", input.id)
          .eq("company_id", companyId)
          .select("*")
          .single();
        obligation = legacyResult.data;
        error = legacyResult.error;
      } else {
        const updateResult = await db
          .from("monthly_obligations")
          .update(updatePayload)
          .eq("id", input.id)
          .eq("company_id", companyId)
          .select("*")
          .single();
        obligation = updateResult.data;
        error = updateResult.error;
      }

      if (error && schemaNeedsLegacyObligationQuery(error)) {
        usedLegacyVehicleLinking = true;
        useLegacyObligationSchema = true;
        const legacyResult = await db
          .from("monthly_obligations")
          .update(legacyUpdatePayload)
          .eq("id", input.id)
          .eq("company_id", companyId)
          .select("*")
          .single();
        obligation = legacyResult.data;
        error = legacyResult.error;
      }

      if (error) throw error;
      if (!obligation) throw new Error("تعذر تعديل الالتزام");
      if (!usedLegacyVehicleLinking) useLegacyObligationSchema = false;

      if (!usedLegacyVehicleLinking) {
        const { error: deleteLinksError } = await db
          .from("monthly_obligation_vehicles")
          .delete()
          .eq("company_id", companyId)
          .eq("obligation_id", input.id);

        if (deleteLinksError && schemaNeedsLegacyObligationQuery(deleteLinksError)) {
          usedLegacyVehicleLinking = true;
          useLegacyObligationSchema = true;
        } else if (deleteLinksError) {
          throw deleteLinksError;
        }

        if (selectedVehicleIds.length && !usedLegacyVehicleLinking) {
          const allocationAmount =
            vehicleAmountMode === "per_vehicle"
              ? money(input.monthly_amount)
              : money(effectiveMonthlyAmount / selectedVehicleIds.length);
          const allocationPercentage = money(100 / selectedVehicleIds.length);

          const { error: vehicleError } = await db.from("monthly_obligation_vehicles").insert(
            selectedVehicleIds.map((vehicleId, index) => ({
              company_id: companyId,
              obligation_id: input.id,
              vehicle_id: vehicleId,
              allocation_amount: allocationAmount,
              allocation_percentage: allocationPercentage,
              is_primary: index === 0,
            }))
          );

          if (vehicleError && schemaNeedsLegacyObligationQuery(vehicleError)) {
            useLegacyObligationSchema = true;
          } else if (vehicleError) {
            throw vehicleError;
          }
        }
      }

      const { data: openInstallments, error: installmentQueryError } = await db
        .from("monthly_obligation_installments")
        .select("id, period_start")
        .eq("company_id", companyId)
        .eq("obligation_id", input.id)
        .in("status", ["pending", "overdue"]);

      if (installmentQueryError) throw installmentQueryError;

      const installmentUpdateResults = await Promise.all(
        (openInstallments || []).map((installment: { id: string; period_start: string }) => {
          const periodStart = new Date(`${installment.period_start}T00:00:00`);
          const dueDay = Math.min(input.due_day || 1, lastDayOfMonth(periodStart.getFullYear(), periodStart.getMonth()));
          const dueDate = formatDate(new Date(periodStart.getFullYear(), periodStart.getMonth(), dueDay));

          return db
            .from("monthly_obligation_installments")
            .update({
              due_date: dueDate,
              amount: effectiveMonthlyAmount,
              principal_amount: installmentPrincipal,
              interest_amount: installmentInterest,
            })
            .eq("id", installment.id)
            .eq("company_id", companyId);
        })
      );

      const installmentUpdateError = installmentUpdateResults.find((result: any) => result?.error)?.error;
      if (installmentUpdateError) throw installmentUpdateError;

      return obligation as MonthlyObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-obligation-installments"] });
      toast.success("تم تعديل الالتزام");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تعديل الالتزام");
    },
  });
};

export const usePayMonthlyObligationInstallment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PayMonthlyObligationInput) => {
      const companyId = getCompanyId(user as CompanyUser);
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      if (!input.installment_id) throw new Error("القسط مطلوب");
      if (!input.amount || input.amount <= 0) throw new Error("مبلغ السداد مطلوب");

      const { data: installment, error: installmentError } = await db
        .from("monthly_obligation_installments")
        .select("*, obligation:monthly_obligations(*)")
        .eq("id", input.installment_id)
        .eq("company_id", companyId)
        .single();

      if (installmentError) throw installmentError;
      if (!installment?.obligation) throw new Error("لم يتم العثور على الالتزام المرتبط");

      const obligation = installment.obligation as MonthlyObligation;
      const paidBefore = Number(installment.paid_amount || 0);
      const remaining = Number(installment.amount || 0) - paidBefore;
      const amount = money(Math.min(Number(input.amount), remaining));
      if (amount <= 0) throw new Error("هذا القسط مسدد بالكامل");

      let vendorPaymentId: string | null = null;
      let bankTransactionId: string | null = null;
      let journalEntryId: string | null = null;

      if (obligation.vendor_id) {
        const { data: vendorPayment, error: vendorPaymentError } = await db
          .from("vendor_payments")
          .insert({
            company_id: companyId,
            vendor_id: obligation.vendor_id,
            amount,
            payment_date: input.payment_date,
            payment_method: input.bank_id ? "bank_transfer" : "cash",
            payment_number: `VP-OBL-${Date.now().toString().slice(-8)}`,
            reference_number: input.reference_number || `OBL:${installment.id}`,
            description: `سداد ${obligation.title} - ${installment.period_start}`,
            notes: input.notes || null,
            currency: obligation.currency || "QAR",
            bank_id: cleanId(input.bank_id),
            status: "completed",
            created_by: user?.id,
          })
          .select("id")
          .single();

        if (vendorPaymentError) throw vendorPaymentError;
        vendorPaymentId = vendorPayment.id;
      }

      if (input.bank_id) {
        const { data: bank, error: bankError } = await db
          .from("banks")
          .select("id, current_balance")
          .eq("id", input.bank_id)
          .eq("company_id", companyId)
          .single();

        if (bankError) throw bankError;
        const balanceAfter = money(Number(bank.current_balance || 0) - amount);

        const { data: bankTransaction, error: bankTransactionError } = await db
          .from("bank_transactions")
          .insert({
            company_id: companyId,
            bank_id: input.bank_id,
            transaction_number: `BT-OBL-${Date.now().toString().slice(-8)}`,
            transaction_date: input.payment_date,
            transaction_type: "withdrawal",
            amount,
            balance_after: balanceAfter,
            description: `سداد ${obligation.title} - ${installment.period_start}`,
            reference_number: input.reference_number || `OBL:${installment.id}`,
            status: "completed",
            reconciled: false,
            created_by: user?.id || null,
          })
          .select("id")
          .single();

        if (bankTransactionError) throw bankTransactionError;
        bankTransactionId = bankTransaction.id;

        const { error: bankUpdateError } = await db
          .from("banks")
          .update({ current_balance: balanceAfter, updated_at: new Date().toISOString() })
          .eq("id", input.bank_id)
          .eq("company_id", companyId);

        if (bankUpdateError) throw bankUpdateError;
      }

      if (input.cash_account_id) {
        const treatment = obligation.accounting_treatment;
        const lines: Array<{
          account_id: string;
          debit_amount: number;
          credit_amount: number;
          line_description: string;
          cost_center_id?: string | null;
          asset_id?: string | null;
        }> = [];

        if (treatment === "direct_expense") {
          if (!obligation.expense_account_id) throw new Error("اختر حساب المصروف للالتزام قبل السداد");
          lines.push({
            account_id: obligation.expense_account_id,
            debit_amount: amount,
            credit_amount: 0,
            line_description: `مصروف ${obligation.title}`,
            cost_center_id: obligation.cost_center_id || null,
          });
        } else {
          if (!obligation.liability_account_id) throw new Error("اختر حساب الالتزام قبل السداد");
          const installmentInterest = Number(installment.interest_amount || obligation.interest_amount || 0);
          const interestAmount = money(Math.min(amount, installmentInterest));
          const principalAmount = money(amount - interestAmount);

          if (principalAmount > 0) {
            lines.push({
              account_id: obligation.liability_account_id,
              debit_amount: principalAmount,
              credit_amount: 0,
              line_description: `سداد أصل ${obligation.title}`,
              cost_center_id: obligation.cost_center_id || null,
              asset_id: obligation.fixed_asset_id || null,
            });
          }

          if (interestAmount > 0) {
            if (!obligation.interest_expense_account_id) {
              throw new Error("اختر حساب مصروف الفوائد قبل سداد قسط يحتوي على فوائد");
            }
            lines.push({
              account_id: obligation.interest_expense_account_id,
              debit_amount: interestAmount,
              credit_amount: 0,
              line_description: `مصروف فوائد ${obligation.title}`,
              cost_center_id: obligation.cost_center_id || null,
            });
          }
        }

        lines.push({
          account_id: input.cash_account_id,
          debit_amount: 0,
          credit_amount: amount,
          line_description: `خروج نقد لسداد ${obligation.title}`,
          cost_center_id: obligation.cost_center_id || null,
        });

        const { data: entryNumberData } = await db.rpc("generate_journal_entry_number", {
          company_id_param: companyId,
        });

        const { data: journalEntry, error: journalEntryError } = await db
          .from("journal_entries")
          .insert({
            company_id: companyId,
            entry_number: entryNumberData || `JE-OBL-${Date.now()}`,
            entry_date: input.payment_date,
            description: `سداد التزام شهري: ${obligation.title}`,
            reference_type: "monthly_obligation",
            reference_id: installment.id,
            total_debit: amount,
            total_credit: amount,
            status: "posted",
            created_by: user?.id || null,
            posted_by: user?.id || null,
            posted_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (journalEntryError) throw journalEntryError;
        journalEntryId = journalEntry.id;

        const { error: lineError } = await db.from("journal_entry_lines").insert(
          lines.map((line, index) => ({
            journal_entry_id: journalEntry.id,
            account_id: line.account_id,
            debit_amount: line.debit_amount,
            credit_amount: line.credit_amount,
            line_description: line.line_description,
            line_number: index + 1,
            cost_center_id: line.cost_center_id || null,
            asset_id: line.asset_id || null,
          }))
        );

        if (lineError) throw lineError;

        if (vendorPaymentId) {
          await db
            .from("vendor_payments")
            .update({ journal_entry_id: journalEntryId })
            .eq("id", vendorPaymentId)
            .eq("company_id", companyId);
        }

        if (bankTransactionId) {
          await db
            .from("bank_transactions")
            .update({ journal_entry_id: journalEntryId })
            .eq("id", bankTransactionId)
            .eq("company_id", companyId);
        }
      }

      const newPaidAmount = money(paidBefore + amount);
      const newStatus: ObligationInstallmentStatus =
        newPaidAmount >= Number(installment.amount || 0) ? "paid" : "partial";

      const { data: updatedInstallment, error: updateError } = await db
        .from("monthly_obligation_installments")
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          payment_date: input.payment_date,
          vendor_payment_id: vendorPaymentId,
          bank_transaction_id: bankTransactionId,
          journal_entry_id: journalEntryId,
          reference_number: input.reference_number || null,
          notes: input.notes || null,
        })
        .eq("id", installment.id)
        .eq("company_id", companyId)
        .select("*")
        .single();

      if (updateError) throw updateError;
      return updatedInstallment as MonthlyObligationInstallment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-obligation-installments"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-summary"] });
      toast.success("تم تسجيل السداد وربطه مالياً");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل السداد");
    },
  });
};
