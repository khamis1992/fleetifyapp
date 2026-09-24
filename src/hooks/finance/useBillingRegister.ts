/**
 * Server-side paginated billing register readers.
 * Replaces the previous all-pages download (7k+ invoice rows) with
 * one 50-row page per request plus an aggregated stats RPC.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useDebounce } from '@/hooks/useDebounce';

export const BILLING_PAGE_SIZE = 50;

export interface BillingRegisterFilters {
  search: string;
  status: string;
  page: number;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number | null;
  balance_due: number | null;
  currency: string | null;
  status: string;
  payment_status: string;
  company_id: string;
  customer_id: string | null;
  vendor_id: string | null;
  contract_id: string | null;
  customers: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
}

export interface PaymentRow {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  reference_number: string | null;
  check_number?: string | null;
  bank_account?: string | null;
  currency?: string | null;
  notes?: string | null;
  customers: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    phone: string;
  } | null;
  invoices: {
    invoice_number: string;
  } | null;
  contracts?: {
    contract_number: string;
  } | null;
}

export interface BillingRegisterPage<T> {
  rows: T[];
  total: number;
}

export interface BillingRegisterStats {
  invoices_total: number;
  invoices_paid: number;
  invoices_pending: number;
  invoices_count: number;
  payments_month_total: number;
  payments_month_count: number;
  payments_completed_count: number;
  payments_pending_count: number;
}

const INVOICE_LIST_FIELDS = `
  id,
  invoice_number,
  invoice_date,
  due_date,
  total_amount,
  paid_amount,
  balance_due,
  currency,
  status,
  payment_status,
  company_id,
  customer_id,
  vendor_id,
  contract_id,
  customers:customer_id (
    first_name,
    last_name,
    company_name
  )
`;

const PAYMENT_LIST_FIELDS = `
  id,
  payment_number,
  payment_date,
  amount,
  payment_method,
  payment_status,
  reference_number,
  check_number,
  bank_account,
  currency,
  notes,
  customers:payments_customer_id_fkey (
    first_name,
    last_name,
    company_name,
    phone
  ),
  invoices:payments_invoice_id_fkey (
    invoice_number
  ),
  contracts!fk_payments_contract_id (
    contract_number
  )
`;

const escapeSearch = (term: string) => term.replace(/[%,()]/g, ' ').trim();

type SupabaseFilter = {
  eq: (column: string, value: string) => SupabaseFilter;
  or: (query: string) => SupabaseFilter;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseFilter;
  range: (from: number, to: number) => SupabaseFilter;
  select: (fields: string, options?: { count?: 'exact' }) => SupabaseFilter;
};

const withStatusFilter = (query: SupabaseFilter, table: 'invoices' | 'payments', status: string): SupabaseFilter => {
  if (!status || status === 'all') return query;
  if (table === 'invoices') {
    return status === 'overdue'
      ? query.eq('status', 'overdue')
      : query.eq('payment_status', status);
  }
  return query.eq('payment_status', status);
};

const withSearchFilter = (query: SupabaseFilter, table: 'invoices' | 'payments', rawSearch: string): SupabaseFilter => {
  const search = escapeSearch(rawSearch);
  if (!search) return query;
  const like = `%${search}%`;
  if (table === 'invoices') {
    return query.or(
      `invoice_number.ilike.${like},` +
        `customers.company_name.ilike.${like},` +
        `customers.first_name.ilike.${like},` +
        `customers.last_name.ilike.${like}`
    );
  }
  return query.or(
    `payment_number.ilike.${like},` +
      `customers.company_name.ilike.${like},` +
      `customers.first_name.ilike.${like},` +
      `customers.last_name.ilike.${like}`
  );
};

const paginate = (query: SupabaseFilter, table: 'invoices' | 'payments', page: number) =>
  query
    .order(table === 'invoices' ? 'invoice_date' : 'payment_date', { ascending: false })
    .order('id')
    .range((page - 1) * BILLING_PAGE_SIZE, page * BILLING_PAGE_SIZE - 1);

const buildRegisterQuery = (
  table: 'invoices' | 'payments',
  companyId: string,
  search: string,
  status: string,
  page: number,
): SupabaseFilter => {
  const fields = table === 'invoices' ? INVOICE_LIST_FIELDS : PAYMENT_LIST_FIELDS;
  // The supabase builder union over both tables explodes the inferred type;
  // cast once at the entry point to the narrow filter chain we actually use.
  const reader = supabase.from(table) as unknown as {
    select: (fields: string, options?: { count?: 'exact' }) => SupabaseFilter;
  };
  let query = reader.select(fields, { count: 'exact' }).eq('company_id', companyId);
  query = withStatusFilter(query, table, status);
  query = withSearchFilter(query, table, search);
  return paginate(query, table, page);
};

interface RegisterPageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

const executePage = async <T,>(query: SupabaseFilter): Promise<RegisterPageResult<T>> =>
  (await (query as unknown as PromiseLike<RegisterPageResult<T>>)) as RegisterPageResult<T>;

/**
 * Reads every matching register page for CSV export.
 * Same filters/ordering as the paginated table; the server still sends
 * at most BILLING_PAGE_SIZE rows per request.
 */
export const readAllBillingRegisterRows = async <T,>(
  table: 'invoices' | 'payments',
  companyId: string,
  search: string,
  status: string,
): Promise<T[]> => {
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const { data, error, count } = await executePage<T>(
      buildRegisterQuery(table, companyId, search, status, page));
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return rows;
    rows.push(...data);
    if (count != null ? rows.length >= count : data.length < BILLING_PAGE_SIZE) return rows;
    page += 1;
  }
};

export const useBillingInvoices = (filters: BillingRegisterFilters) => {
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const debouncedSearch = useDebounce(filters.search, 300);

  return useQuery({
    queryKey: ['billing-register', 'invoices', companyId, debouncedSearch, filters.status, filters.page],
    queryFn: async (): Promise<BillingRegisterPage<InvoiceRow>> => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');
      const query = buildRegisterQuery('invoices', companyId, debouncedSearch, filters.status, filters.page);

      const { data, error, count } = await executePage<InvoiceRow>(query);
      if (error) throw new Error(error.message);
      return { rows: data || [], total: count || 0 };
    },
    enabled: !!companyId && !isAuthenticating,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

export const useBillingPayments = (filters: BillingRegisterFilters) => {
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const debouncedSearch = useDebounce(filters.search, 300);

  return useQuery({
    queryKey: ['billing-register', 'payments', companyId, debouncedSearch, filters.status, filters.page],
    queryFn: async (): Promise<BillingRegisterPage<PaymentRow>> => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');
      const query = buildRegisterQuery('payments', companyId, debouncedSearch, filters.status, filters.page);

      const { data, error, count } = await executePage<PaymentRow>(query);
      if (error) throw new Error(error.message);
      return { rows: data || [], total: count || 0 };
    },
    enabled: !!companyId && !isAuthenticating,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

export const useBillingRegisterStats = () => {
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['billing-register', 'stats', companyId],
    queryFn: async (): Promise<BillingRegisterStats> => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');
      const { data, error } = await supabase.rpc('get_billing_register_stats', {
        p_company_id: companyId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        invoices_total: Number(row?.invoices_total || 0),
        invoices_paid: Number(row?.invoices_paid || 0),
        invoices_pending: Number(row?.invoices_pending || 0),
        invoices_count: Number(row?.invoices_count || 0),
        payments_month_total: Number(row?.payments_month_total || 0),
        payments_month_count: Number(row?.payments_month_count || 0),
        payments_completed_count: Number(row?.payments_completed_count || 0),
        payments_pending_count: Number(row?.payments_pending_count || 0),
      };
    },
    enabled: !!companyId && !isAuthenticating,
    staleTime: 60 * 1000,
  });
};