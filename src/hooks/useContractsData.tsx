import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { queryKeys } from '@/utils/queryKeys';

// Extend the contract type to include vehicle data
interface ContractWithVehicle extends Record<string, any> {
  id: string;
  company_id: string;
  customer_id: string;
  vehicle_id?: string | null;
  contract_number: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  monthly_amount: number;
  status: string;
  contract_type: string;
  description?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  cost_center_id?: string;
  account_id?: string;
  journal_entry_id?: string;
  auto_renew_enabled?: boolean;
  renewal_terms?: any;
  vehicle_returned?: boolean;
  last_renewal_check?: string;
  last_payment_check_date?: string;
  suspension_reason?: string;
  expired_at?: string;
  created_by?: string;
  total_paid?: number;
  balance_due?: number;
  linked_payments_amount?: number;
  customers?: {
    id: string;
    first_name_ar?: string;
    last_name_ar?: string;
    first_name?: string;
    last_name?: string;
    company_name_ar?: string;
    company_name?: string;
    customer_type?: string;
  };
  cost_center?: {
    id: string;
    center_code?: string;
    center_name?: string;
    center_name_ar?: string;
  };
  vehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year?: number;
    status: string;
  };
}

const normalizeSearchText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildCustomerSearchText = (customer: Record<string, any>): string =>
  normalizeSearchText([
    customer.first_name,
    customer.last_name,
    customer.first_name_ar,
    customer.last_name_ar,
    customer.company_name,
    customer.company_name_ar,
    customer.phone,
    customer.national_id,
  ].filter(Boolean).join(' '));

export const useContractsData = (filters: any = {}) => {
  const { filter, getQueryKey, user, isBrowsingMode, browsedCompany, actualUserCompanyId } = useUnifiedCompanyAccess();

  // Debug: log filters received
  if (filters?.search) {
    console.log('📦 [CONTRACTS_DATA] Received filters with search:', filters.search);
  }

  // Fetch statistics separately (all contracts for accurate counts)
  const { data: allContractsForStats } = useQuery({
    queryKey: [...queryKeys.contracts.lists(), 'all-for-stats', filter?.company_id],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      try {
        const companyId = filter?.company_id || null;
        
        // التحقق من صحة companyId
        if (!companyId || companyId === '__loading__') {
          console.warn('⚠️ [CONTRACTS_STATS] No company ID available, skipping stats fetch');
          return [];
        }

        console.log('📊 [CONTRACTS_STATS] Fetching all contracts for statistics', { companyId });

        let query = supabase
          .from('contracts')
          .select('id, status, contract_amount, monthly_amount')
          .abortSignal(signal!);

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ [CONTRACTS_STATS] Error fetching stats:', error);
          return [];
        }

        console.log('✅ [CONTRACTS_STATS] Fetched contracts for stats:', data?.length || 0);
        return data || [];
      } catch (err) {
        console.error('❌ [CONTRACTS_STATS] Exception in stats fetch:', err);
        return [];
      }
    },
    enabled: !!user?.id && !!filter?.company_id && filter?.company_id !== '__loading__',
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 1,
  });

  // Fetch contracts with customer data (paginated)
  // استخدام getQueryKey مثل useCustomers لضمان إعادة الجلب عند تغير البحث
  const { data: contractsResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: getQueryKey(['contracts'], [
      filters?.page,
      filters?.pageSize,
      filters?.status,
      filters?.legal_status,
      filters?.contract_type,
      filters?.customer_id,
      filters?.cost_center_id,
      filters?.search // البحث كجزء من queryKey
    ]),
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      try {
        const companyId = filter?.company_id || null;
        
        // التحقق من صحة companyId
        if (!companyId || companyId === '__loading__') {
          console.warn('⚠️ [CONTRACTS_QUERY] No company ID available or still loading');
          return [];
        }

        console.log('🔍 [CONTRACTS_QUERY] Fetching contracts', {
          companyId,
          isBrowsingMode,
          browsedCompanyId: browsedCompany?.id,
          actualUserCompanyId,
          page: filters?.page,
          pageSize: filters?.pageSize,
          statusFilter: filters?.status,
          searchTerm: filters?.search,
          allFilters: filters
        });

      // البحث في قاعدة البيانات - إذا كان هناك نص بحث
      const searchTerm = filters?.search?.trim() || '';
      let customerIds: string[] = [];
      
      // إذا كان هناك نص بحث، نبحث أولاً عن العملاء المطابقين
      if (searchTerm) {
        // تقسيم كلمة البحث إلى كلمات منفصلة للبحث الأفضل
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
        
        // Build a more comprehensive OR query for customer search
        // This handles cases where users search for "عمارة الخروبي" which is stored as first_name + last_name
        let customerSearchConditions: string[] = [];
        
        // Search each word in first_name, last_name, phone, and national_id fields
        for (const word of searchWords) {
          customerSearchConditions.push(`first_name.ilike.%${word}%`);
          customerSearchConditions.push(`last_name.ilike.%${word}%`);
          customerSearchConditions.push(`first_name_ar.ilike.%${word}%`);
          customerSearchConditions.push(`last_name_ar.ilike.%${word}%`);
          customerSearchConditions.push(`company_name.ilike.%${word}%`);
          customerSearchConditions.push(`company_name_ar.ilike.%${word}%`);
          customerSearchConditions.push(`phone.ilike.%${word}%`);
          customerSearchConditions.push(`national_id.ilike.%${word}%`);
        }
        
        // Also search the full term
        customerSearchConditions.push(`first_name.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`last_name.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`first_name_ar.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`last_name_ar.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`company_name.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`company_name_ar.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`phone.ilike.%${searchTerm}%`);
        customerSearchConditions.push(`national_id.ilike.%${searchTerm}%`);
        
        const { data: matchingCustomers } = await supabase
          .from('customers')
          .select('id, first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, phone, national_id')
          .eq('company_id', companyId)
          .or(customerSearchConditions.join(','))
          .abortSignal(signal!);
        
        if (matchingCustomers && matchingCustomers.length > 0) {
          const normalizedWords = searchWords.map(normalizeSearchText).filter(Boolean);
          customerIds = matchingCustomers
            .filter((customer) => {
              const customerText = buildCustomerSearchText(customer);
              return normalizedWords.every((word) => customerText.includes(word));
            })
            .map(c => c.id);
        }
        console.log('🔍 [CONTRACTS_QUERY] Found matching customers:', customerIds.length, 'for search words:', searchWords);
      }

      // Get total count if pagination is requested
      let totalCount = 0;
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 50;

      if (filters?.page || filters?.pageSize) {
        let countQuery = supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .abortSignal(signal!);

        if (companyId) {
          countQuery = countQuery.eq('company_id', companyId);
        }

        // Apply status filter to count query as well
        if (filters?.status && filters.status !== 'all' && filters.status !== '') {
          if (filters.status !== 'expiring_soon') {
            countQuery = countQuery.eq('status', filters.status);
          }
        }

        // Apply search filter to count query
        if (searchTerm) {
          if (customerIds.length > 0) {
            countQuery = countQuery.or(`contract_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,terms.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%,customer_id.in.(${customerIds.join(',')})`);
          } else {
            countQuery = countQuery.or(`contract_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,terms.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%`);
          }
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          console.error('❌ [CONTRACTS_QUERY] Error fetching count:', countError);
        } else {
          totalCount = count || 0;
        }
      }

      let query = supabase
        .from('contracts')
        .select(`
          *,
          customers(
            id,
            first_name_ar,
            last_name_ar,
            first_name,
            last_name,
            company_name_ar,
            company_name,
            customer_type,
            phone,
            national_id
          ),
          vehicles(
            id,
            plate_number,
            make,
            model,
            year,
            status,
            daily_rate
          ),
          cost_center:cost_centers(
            id,
            center_code,
            center_name,
            center_name_ar
          )
        `)
        .abortSignal(signal!);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Apply status filter BEFORE pagination (at database level)
      if (filters?.status && filters.status !== 'all' && filters.status !== '') {
        if (filters.status === 'expiring_soon') {
          // Special handling for expiring_soon - handled in frontend filtering
        } else {
          query = query.eq('status', filters.status);
        }
      }

      // Apply legal_status filter at database level
      if (filters?.legal_status && filters.legal_status !== '') {
        query = query.eq('legal_status', filters.legal_status);
      }

      // Apply search filter at database level
      if (searchTerm) {
        if (customerIds.length > 0) {
          query = query.or(`contract_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,terms.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%,customer_id.in.(${customerIds.join(',')})`);
        } else {
          query = query.or(`contract_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,terms.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%`);
        }
      }

      // Apply pagination
      if (filters?.page || filters?.pageSize) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ [CONTRACTS_QUERY] Error fetching contracts:', error);
        throw error;
      }
      
      // If we have contracts, fetch vehicle data separately to avoid PostgREST relationship issues
      if (data && data.length > 0) {
        // Extract unique vehicle IDs (filter out null/undefined values)
        const vehicleIds = [...new Set(
          data
            .filter((contract: any) => contract.vehicle_id)
            .map((contract: any) => contract.vehicle_id)
            .filter((id: any) => id != null)
        )];
        
        console.log('🔍 [CONTRACTS_QUERY] Found vehicle IDs to fetch:', vehicleIds.length);
        
        if (vehicleIds.length > 0) {
          // Fetch vehicles in a separate query
          const { data: vehiclesData, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, plate_number, make, model, year, status')
            .in('id', vehicleIds)
            .abortSignal(signal!);
          
          if (!vehiclesError && vehiclesData) {
            console.log('✅ [CONTRACTS_QUERY] Successfully fetched vehicles:', vehiclesData.length);
            
            // Create a map for quick lookup
            const vehiclesMap = new Map(vehiclesData.map((vehicle: any) => [vehicle.id, vehicle]));
            
            // Attach vehicle data to contracts
            data.forEach((contract: any) => {
              if (contract.vehicle_id && vehiclesMap.has(contract.vehicle_id)) {
                contract.vehicle = vehiclesMap.get(contract.vehicle_id);
              }
            });
          } else if (vehiclesError) {
            console.error('❌ [CONTRACTS_QUERY] Error fetching vehicles:', vehiclesError);
          }
        }
      }

      console.log('✅ [CONTRACTS_QUERY] Successfully fetched contracts with vehicle data:', data?.length || 0);

        // Return with pagination info if pagination is requested
        if (filters?.page || filters?.pageSize) {
          return {
            data: data || [],
            pagination: {
              page,
              pageSize,
              totalCount,
              totalPages: Math.ceil(totalCount / pageSize),
              hasMore: (page * pageSize) < totalCount
            }
          };
        }

        return data || [];
      } catch (err) {
        console.error('❌ [CONTRACTS_QUERY] Exception in contracts fetch:', err);
        return [];
      }
    },
    enabled: !!user?.id && !!filter?.company_id && filter?.company_id !== '__loading__',
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30 * 1000, // 30 ثانية - نفس صفحة العملاء
    gcTime: 5 * 60 * 1000, // Cache لمدة 5 دقائق
    refetchOnWindowFocus: false, // منع إعادة الجلب عند التركيز على النافذة
    refetchOnMount: true, // إعادة الجلب عند التحميل
    // Provide placeholder data to prevent loading flash during search
    placeholderData: (previousData) => previousData,
  });

  // Extract contracts from response (handle both array and paginated response)
  const contracts = useMemo(() => {
    if (!contractsResponse) return [];
    if (Array.isArray(contractsResponse)) return contractsResponse;
    if (contractsResponse && typeof contractsResponse === 'object' && 'data' in contractsResponse) {
      return Array.isArray(contractsResponse.data) ? contractsResponse.data : [];
    }
    return [];
  }, [contractsResponse]);

  // Extract pagination info if available
  const paginationInfo = useMemo(() => {
    if (contractsResponse && typeof contractsResponse === 'object' && 'pagination' in contractsResponse) {
      return contractsResponse.pagination;
    }
    return undefined;
  }, [contractsResponse]);

  // Contract statistics - Use allContractsForStats for accurate counts
  const statistics = useMemo(() => {
    const statsContracts = allContractsForStats || [];
    
    if (!statsContracts || statsContracts.length === 0) return {
      activeContracts: [],
      draftContracts: [],
      underReviewContracts: [],
      expiredContracts: [],
      suspendedContracts: [],
      cancelledContracts: [],
      legalProcedureContracts: [],
      totalRevenue: 0
    };

    // Function to check if contract amounts are zero or invalid
    const isZeroAmount = (c: any) => {
      const ca = c?.contract_amount;
      const ma = c?.monthly_amount;
      const caNum = ca === undefined || ca === null || ca === '' ? null : Number(ca);
      const maNum = ma === undefined || ma === null || ma === '' ? null : Number(ma);
      
      // Consider as zero amount only if both are explicitly zero
      return (caNum === 0 && maNum === 0);
    };

    // Active contracts should not be filtered by zero amounts
    const activeContracts = statsContracts.filter((c: any) => c.status === 'active');
    const underReviewContracts = statsContracts.filter((c: any) => c.status === 'under_review' && !isZeroAmount(c));
    const draftContracts = statsContracts.filter((c: any) => c.status === 'draft' || (isZeroAmount(c) && !['cancelled','expired','suspended','under_review', 'active'].includes(c.status)));
    const expiredContracts = statsContracts.filter((c: any) => c.status === 'expired');
    const suspendedContracts = statsContracts.filter((c: any) => c.status === 'suspended');
    const cancelledContracts = statsContracts.filter((c: any) => c.status === 'cancelled');
    
    // Incomplete contracts (missing data or zero amounts)
    const incompleteContracts = statsContracts.filter((c: any) => {
      const hasZeroAmount = isZeroAmount(c);
      const missingCustomer = !c.customer_id;
      const missingVehicle = !c.vehicle_id;
      const isExpiredActive = c.end_date && new Date(c.end_date) < new Date() && c.status === 'active';
      return hasZeroAmount || missingCustomer || missingVehicle || isExpiredActive;
    });
    
    // --- Detailed Legal Analysis ---
    // 1. Contracts specifically in 'under_legal_procedure' status
    const legalStatusContracts = statsContracts.filter((c: any) => c.status === 'under_legal_procedure');
    
    // 2. Contracts that are Active BUT have a legal_status flag (High Risk)
    const activeWithLegalIssues = activeContracts.filter((c: any) => c.legal_status && c.legal_status !== '');
    
    // 3. Cancelled/Expired contracts that have legal issues
    const cancelledWithLegalIssues = cancelledContracts.filter((c: any) => c.legal_status && c.legal_status !== '');
    const expiredWithLegalIssues = expiredContracts.filter((c: any) => c.legal_status && c.legal_status !== '');

    // 4. Total Legal Cases (Union of all legal situations)
    // Includes: status='under_legal_procedure' OR (any status + has legal_status)
    const totalLegalCases = statsContracts.filter((c: any) => 
      c.status === 'under_legal_procedure' || (c.legal_status && c.legal_status !== '')
    );
    
    // Include both active and under_review contracts in revenue calculation
    // Use monthly_amount for monthly revenue, not contract_amount (total contract value)
    const totalRevenue = [...activeContracts, ...underReviewContracts].reduce((sum, contract: any) => sum + (contract.monthly_amount || 0), 0);

    console.log('📊 [CONTRACTS_STATS] Statistics calculated:', {
      total: statsContracts.length,
      active: activeContracts.length,
      activeWithLegal: activeWithLegalIssues.length,
      legalStatus: legalStatusContracts.length,
      totalLegal: totalLegalCases.length,
      totalRevenue
    });

    return {
      activeContracts,
      draftContracts,
      underReviewContracts,
      expiredContracts,
      suspendedContracts,
      cancelledContracts,
      incompleteContracts, // New: contracts with missing data
      legalProcedureContracts: legalStatusContracts, // Keep backward compatibility
      
      // New Detailed Stats
      activeWithLegalIssues,
      cancelledWithLegalIssues,
      expiredWithLegalIssues,
      totalLegalCases,
      
      totalRevenue
    };
  }, [allContractsForStats]);

  // Apply filters to contracts - محسّن لمنع الفلترة الزائدة
  const filteredContracts = useMemo(() => {
    // منع logs المفرطة - log فقط إذا تغير البحث فعلياً
    if (filters.search) {
      console.log('🔍 [CONTRACTS_FILTER] Applying filters', { 
        filtersApplied: Object.keys(filters).length > 0,
        searchTerm: filters.search,
        contractsLength: contracts?.length 
      });
    }
    
    if (!contracts || contracts.length === 0) {
      console.log('🔍 [CONTRACTS_FILTER] No contracts data available');
      return [];
    }
    
    // Enhance contracts with flattened customer data for easier access
    const enhancedContracts = contracts.map(contract => ({
      ...contract,
      customer_name: contract.customers?.customer_type === 'corporate' 
        ? (contract.customers?.company_name_ar || contract.customers?.company_name)
        : `${contract.customers?.first_name_ar || contract.customers?.first_name || ''} ${contract.customers?.last_name_ar || contract.customers?.last_name || ''}`.trim(),
      customer_phone: contract.customers?.phone
    }));
    
    // If no filters are applied, return all enhanced contracts
    if (!filters || Object.keys(filters).length === 0) {
      console.log('🔍 [CONTRACTS_FILTER] No filters applied, returning all contracts:', enhancedContracts.length);
      return enhancedContracts;
    }
    
    const result = enhancedContracts.filter((contract: any) => {
      // Database search already includes contract fields and matching customer IDs.
      // Keep local search opt-in only to avoid hiding customer-name matches.
      if (filters.applyLocalSearch && filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim();
        
        // Split search into words for better matching (e.g., "عمارة الخروبي" -> ["عمارة", "الخروبي"])
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
        
        // Build customer name from contract.customers data
        let customerName = '';
        if (contract.customers) {
          const customer = contract.customers;
          if (customer.customer_type === 'individual' || !customer.company_name) {
            customerName = `${customer.first_name || ''} ${customer.last_name || ''} ${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
          } else {
            customerName = `${customer.company_name || ''} ${customer.company_name_ar || ''}`.trim();
          }
        }
        
        const searchableText = [
          contract.contract_number || '',
          contract.description || '',
          contract.terms || '',
          customerName,
          contract.customers?.phone || '',
          contract.customers?.national_id || '',
          contract.vehicle?.plate_number || contract.license_plate || '',
          contract.vehicle?.make || contract.make || '',
          contract.vehicle?.model || contract.model || ''
        ].join(' ').toLowerCase();
        
        // Check if ALL search words are found (for multi-word searches like "عمارة الخروبي")
        const allWordsFound = searchWords.every(word => 
          searchableText.includes(word.toLowerCase())
        );
        
        if (!allWordsFound) {
          return false;
        }
      }

      // Special filter for draft-like contracts (matches statistics logic)
      if (filters.showDraftLike) {
        const isZeroAmount = (contract.contract_amount === 0 || contract.contract_amount === null) && 
                             (contract.monthly_amount === 0 || contract.monthly_amount === null);
        const isDraftStatus = contract.status === 'draft';
        const isNotFinalStatus = !['cancelled', 'expired', 'suspended', 'under_review'].includes(contract.status);
        
        // Include: explicit draft status OR (zero amount AND not in final cancelled/expired/suspended status)
        if (!(isDraftStatus || (isZeroAmount && isNotFinalStatus))) {
          return false;
        }
      }
      
      // Special filter for incomplete contracts (missing data or zero amounts)
      if (filters.showIncomplete) {
        const isZeroAmount = (contract.contract_amount === 0 || contract.contract_amount === null) && 
                             (contract.monthly_amount === 0 || contract.monthly_amount === null);
        const missingCustomer = !contract.customer_id;
        const missingVehicle = !contract.vehicle_id;
        const isExpired = contract.end_date && new Date(contract.end_date) < new Date() && contract.status === 'active';
        
        if (!(isZeroAmount || missingCustomer || missingVehicle || isExpired)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        if (contract.status !== filters.status) {
          return false;
        }
      }

      // Legal status filter
      if (filters.legal_status && filters.legal_status !== '') {
        if (contract.legal_status !== filters.legal_status) {
          return false;
        }
      }

      // Contract type filter
      if (filters.contract_type && filters.contract_type !== 'all' && filters.contract_type !== '') {
        if (contract.contract_type !== filters.contract_type) {
          return false;
        }
      }

      // Customer filter
      if (filters.customer_id && filters.customer_id !== 'all' && filters.customer_id !== '') {
        if (contract.customer_id !== filters.customer_id) {
          return false;
        }
      }

      // Cost center filter
      if (filters.cost_center_id && filters.cost_center_id !== 'all' && filters.cost_center_id !== '') {
        if (contract.cost_center_id !== filters.cost_center_id) {
          return false;
        }
      }

      // Vehicle filter
      if (filters.vehicle_id && filters.vehicle_id !== 'all' && filters.vehicle_id !== '') {
        if (contract.vehicle_id !== filters.vehicle_id) {
          return false;
        }
      }

      // Date range filters
      if (filters.start_date && filters.start_date !== '') {
        const contractStartDate = new Date(contract.start_date);
        const filterStartDate = new Date(filters.start_date);
        if (contractStartDate < filterStartDate) {
          return false;
        }
      }

      if (filters.end_date && filters.end_date !== '') {
        const contractEndDate = new Date(contract.end_date);
        const filterEndDate = new Date(filters.end_date);
        if (contractEndDate > filterEndDate) {
          return false;
        }
      }

      // Amount range filters
      if (filters.min_amount && filters.min_amount !== '') {
        const minAmount = parseFloat(filters.min_amount);
        if (!isNaN(minAmount) && contract.contract_amount < minAmount) {
          return false;
        }
      }

      if (filters.max_amount && filters.max_amount !== '') {
        const maxAmount = parseFloat(filters.max_amount);
        if (!isNaN(maxAmount) && contract.contract_amount > maxAmount) {
          return false;
        }
      }

      return true;
    });
    
    console.log('🔍 [CONTRACTS_FILTER] Final filtered results:', result.length, 'out of', contracts.length);
    return result;
  }, [
    contracts, 
    filters.search, 
    filters.status, 
    filters.legal_status,
    filters.contract_type, 
    filters.customer_id, 
    filters.cost_center_id, 
    filters.vehicle_id,
    filters.start_date,
    filters.end_date,
    filters.min_amount,
    filters.max_amount
  ]); // استخدام القيم الفردية بدلاً من الكائن الكامل

  return {
    contracts,
    filteredContracts,
    isLoading,
    isFetching,
    refetch,
    statistics,
    pagination: paginationInfo
  };
};
