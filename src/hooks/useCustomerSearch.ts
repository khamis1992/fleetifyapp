import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import type { Customer } from '@/types/customer';

interface CustomerSearchResult {
  id: string;
  name: string;
  type: 'individual' | 'corporate';
  phone: string | null;
  email: string | null;
  customer_type: 'individual' | 'corporate';
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
}

/**
 * Custom hook for searching customers with type-ahead functionality
 * Performs debounced search across customer names, phone, and email
 *
 * @param searchQuery - The search term (should be debounced externally)
 * @param options - Additional search options
 * @returns Query result with matching customers
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 300);
 * const { data: results, isLoading } = useCustomerSearch(debouncedQuery, { limit: 10 });
 */
export function useCustomerSearch(
  searchQuery: string,
  options: {
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { companyId } = useUnifiedCompanyAccess();
  const { limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: ['customer-search', companyId, searchQuery, limit],
    queryFn: async (): Promise<CustomerSearchResult[]> => {
      if (!companyId || !searchQuery || searchQuery.length < 2) {
        return [];
      }

      // Build search query with OR conditions
      let query = supabase
        .from('customers')
        .select('id, customer_type, first_name, last_name, company_name, phone, email')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(limit);

      // Search across multiple fields
      const searchTerm = `%${searchQuery}%`;

      query = query.or(
        `first_name.ilike.${searchTerm},` +
        `last_name.ilike.${searchTerm},` +
        `company_name.ilike.${searchTerm},` +
        `phone.ilike.${searchTerm},` +
        `email.ilike.${searchTerm}`
      );

      const { data, error } = await query;

      if (error) {
        console.error('Customer search error:', error);
        throw error;
      }

      // Transform results to consistent format
      return (data || []).map((customer) => ({
        id: customer.id,
        name:
          customer.customer_type === 'individual'
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'بدون اسم'
            : customer.company_name || 'بدون اسم',
        type: customer.customer_type,
        phone: customer.phone,
        email: customer.email,
        customer_type: customer.customer_type,
        first_name: customer.first_name,
        last_name: customer.last_name,
        company_name: customer.company_name,
      }));
    },
    enabled: enabled && !!companyId && !!searchQuery && searchQuery.length >= 2,
    staleTime: 30000, // Cache results for 30 seconds
  });
}
