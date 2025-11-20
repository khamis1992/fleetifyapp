/**
 * Financial Audit Hook
 * Provides React hooks for financial audit functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialAuditService } from '@/services/auditService';
import {
  FinancialAuditLog,
  FinancialAuditFilters,
  FinancialAuditSummary,
  TransactionLineage,
  DataIntegrityReport,
  ComplianceReport,
  CreateFinancialAuditLogParams,
  FinancialAuditEventType
} from '@/types/auditLog';
import { toast } from 'sonner';

// Base query key for audit-related queries
const AUDIT_QUERY_KEY = ['financial-audit'];

/**
 * Hook for querying financial audit trail
 */
export function useFinancialAuditTrail(initialFilters: Partial<FinancialAuditFilters> = {}) {
  const [filters, setFilters] = useState<FinancialAuditFilters>({
    limit: 50,
    offset: 0,
    ...initialFilters
  });

  const queryClient = useQueryClient();

  const {
    data: auditData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'trail', filters],
    queryFn: () => financialAuditService.getFinancialAuditTrail(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateFilters = useCallback((newFilters: Partial<FinancialAuditFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      limit: 50,
      offset: 0,
      ...initialFilters
    });
    queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
  }, [initialFilters, queryClient]);

  const loadMore = useCallback(() => {
    if (auditData && auditData.logs.length < auditData.totalCount) {
      setFilters(prev => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 50)
      }));
    }
  }, [auditData]);

  return {
    logs: auditData?.logs || [],
    totalCount: auditData?.totalCount || 0,
    summary: auditData?.summary,
    isLoading,
    error,
    filters,
    updateFilters,
    resetFilters,
    loadMore,
    refetch,
    hasNextPage: (auditData?.logs.length || 0) < (auditData?.totalCount || 0)
  };
}

/**
 * Hook for creating financial audit logs
 */
export function useCreateFinancialAuditLog() {
  const queryClient = useQueryClient();

  const createLogMutation = useMutation({
    mutationFn: (params: CreateFinancialAuditLogParams) =>
      financialAuditService.logFinancialOperation(params),
    onSuccess: (auditLogId) => {
      toast.success('Audit log created successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
      return auditLogId;
    },
    onError: (error) => {
      toast.error('Failed to create audit log');
      console.error('Audit log creation error:', error);
    }
  });

  return {
    createLog: createLogMutation.mutateAsync,
    isCreating: createLogMutation.isPending,
    error: createLogMutation.error
  };
}

/**
 * Hook for transaction lineage tracking
 */
export function useTransactionLineage(transactionId: string | null, companyId: string) {
  const {
    data: lineage,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'lineage', transactionId, companyId],
    queryFn: () => {
      if (!transactionId) return null;
      return financialAuditService.getTransactionLineage(transactionId, companyId);
    },
    enabled: !!transactionId && !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    lineage,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for data integrity verification
 */
export function useDataIntegrityVerification(companyId: string) {
  const [dateRange, setDateRange] = useState<{
    from?: string;
    to?: string;
  }>({});

  const {
    data: integrityReport,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'integrity', companyId, dateRange],
    queryFn: () => financialAuditService.verifyDataIntegrity(companyId, dateRange.from, dateRange.to),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const verifyNow = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    integrityReport,
    isLoading,
    error,
    dateRange,
    setDateRange,
    verifyNow,
    refetch
  };
}

/**
 * Hook for compliance reporting
 */
export function useComplianceReport(companyId: string) {
  const [reportPeriod, setReportPeriod] = useState<{
    start: string;
    end: string;
  }>(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1); // Default to last month

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  const {
    data: complianceReport,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'compliance', companyId, reportPeriod],
    queryFn: () => financialAuditService.generateComplianceReport(
      companyId,
      reportPeriod.start,
      reportPeriod.end
    ),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    complianceReport,
    isLoading,
    error,
    reportPeriod,
    setReportPeriod,
    refetch
  };
}

/**
 * Hook for audit data export
 */
export function useAuditExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(async (
    format: 'csv' | 'excel' | 'pdf' | 'json',
    filters: FinancialAuditFilters,
    options: {
      includeIntegrityData?: boolean;
      includeFinancialData?: boolean;
      anonymizeUserData?: boolean;
      complianceMode?: boolean;
    } = {}
  ) => {
    setIsExporting(true);

    try {
      const exportOptions = {
        format,
        date_range: {
          start: filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: filters.date_to || new Date().toISOString().split('T')[0]
        },
        filters,
        include_integrity_data: options.includeIntegrityData || false,
        include_financial_data: options.includeFinancialData || true,
        anonymize_user_data: options.anonymizeUserData || false,
        compliance_mode: options.complianceMode || false
      };

      const blob = await financialAuditService.exportAuditData(exportOptions);

      if (blob) {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`Audit data exported successfully as ${format.toUpperCase()}`);
      } else {
        throw new Error('Export failed - no data returned');
      }
    } catch (error) {
      toast.error('Failed to export audit data');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportData,
    isExporting
  };
}

/**
 * Hook for real-time audit monitoring
 */
export function useRealtimeAuditMonitoring(companyId: string, options: {
  onHighRiskTransaction?: (log: FinancialAuditLog) => void;
  onComplianceViolation?: (log: FinancialAuditLog) => void;
  onTamperDetection?: (log: FinancialAuditLog) => void;
} = {}) {
  const [recentAlerts, setRecentAlerts] = useState<FinancialAuditLog[]>([]);

  useEffect(() => {
    if (!companyId) return;

    // Subscribe to real-time audit log changes
    const channel = financialAuditService.subscribeToRealtimeUpdates(companyId, (log) => {
      // Check for conditions that trigger alerts
      if (log.severity === 'critical' || log.severity === 'high') {
        options.onHighRiskTransaction?.(log);
      }

      if (log.compliance_flags && log.compliance_flags.length > 0) {
        options.onComplianceViolation?.(log);
      }

      if (log.verification_status === 'tampered') {
        options.onTamperDetection?.(log);
      }

      // Add to recent alerts
      setRecentAlerts(prev => [log, ...prev.slice(0, 9)]); // Keep last 10
    });

    return () => {
      channel?.unsubscribe();
    };
  }, [companyId, options]);

  const clearAlerts = useCallback(() => {
    setRecentAlerts([]);
  }, []);

  return {
    recentAlerts,
    clearAlerts
  };
}

/**
 * Hook for audit statistics and metrics
 */
export function useAuditMetrics(companyId: string, days: number = 30) {
  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...AUDIT_QUERY_KEY, 'metrics', companyId, days],
    queryFn: async () => {
      // Use the audit trail hook to get summary
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const filters: FinancialAuditFilters = {
        company_id: companyId,
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString(),
        limit: 10000 // Get all records for metrics
      };

      const { summary } = await financialAuditService.getFinancialAuditTrail(filters);

      return {
        ...summary,
        period: {
          days,
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        calculated: {
          average_transaction_value: summary.total_transactions > 0
            ? summary.total_amount / summary.total_transactions
            : 0,
          success_rate: summary.total_transactions > 0
            ? ((summary.total_transactions - summary.failed_operations) / summary.total_transactions) * 100
            : 100,
          risk_score: summary.total_transactions > 0
            ? (summary.high_risk_operations / summary.total_transactions) * 100
            : 0,
          compliance_score: summary.compliance_violations > 0
            ? Math.max(0, 100 - (summary.compliance_violations / summary.total_transactions) * 100)
            : 100
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return {
    metrics,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for audit search functionality
 */
export function useAuditSearch(companyId: string) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FinancialAuditLog[]>([]);

  const search = useCallback(async (term: string, options: {
    entity_type?: string;
    date_range?: { start: string; end: string };
    limit?: number;
  } = {}) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchTerm(term);

    try {
      const filters: FinancialAuditFilters = {
        company_id: companyId,
        search: term,
        limit: options.limit || 100,
        date_from: options.date_range?.start,
        date_to: options.date_range?.end,
        ...(options.entity_type && { resource_type: options.entity_type as any })
      };

      const { logs } = await financialAuditService.getFinancialAuditTrail(filters);
      setSearchResults(logs);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [companyId]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  return {
    searchTerm,
    searchResults,
    isSearching,
    search,
    clearSearch
  };
}

/**
 * Enhanced financial audit logging hook with automatic context
 */
export function useFinancialAuditLogger() {
  const { createLog } = useCreateFinancialAuditLog();

  const logPayment = useCallback(async (
    action: FinancialAuditEventType,
    paymentId: string,
    paymentData: any,
    oldData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ) => {
    const params: CreateFinancialAuditLogParams = {
      event_type: action,
      resource_type: 'payment',
      resource_id: paymentId,
      entity_name: paymentData.payment_number || `Payment-${paymentId}`,
      old_values: oldData,
      new_values: paymentData,
      changes_summary: generatePaymentSummary(action, oldData, paymentData),
      financial_data: {
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        payment_method: paymentData.payment_method,
        reference_number: paymentData.payment_number,
        transaction_date: paymentData.payment_date,
        customer_id: paymentData.customer_id,
        balance: paymentData.balance
      },
      notes: options.notes,
      severity: options.severity
    };

    return await createLog(params);
  }, [createLog]);

  const logContract = useCallback(async (
    action: FinancialAuditEventType,
    contractId: string,
    contractData: any,
    oldData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ) => {
    const params: CreateFinancialAuditLogParams = {
      event_type: action,
      resource_type: 'contract',
      resource_id: contractId,
      entity_name: contractData.contract_number || `Contract-${contractId}`,
      old_values: oldData,
      new_values: contractData,
      changes_summary: generateContractSummary(action, oldData, contractData),
      financial_data: {
        amount: contractData.monthly_rent,
        currency: contractData.currency || 'USD',
        reference_number: contractData.contract_number,
        transaction_date: contractData.start_date,
        customer_id: contractData.customer_id
      },
      notes: options.notes,
      severity: options.severity
    };

    return await createLog(params);
  }, [createLog]);

  const logInvoice = useCallback(async (
    action: FinancialAuditEventType,
    invoiceId: string,
    invoiceData: any,
    oldData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ) => {
    const params: CreateFinancialAuditLogParams = {
      event_type: action,
      resource_type: 'invoice',
      resource_id: invoiceId,
      entity_name: invoiceData.invoice_number || `Invoice-${invoiceId}`,
      old_values: oldData,
      new_values: invoiceData,
      changes_summary: generateInvoiceSummary(action, oldData, invoiceData),
      financial_data: {
        amount: invoiceData.total_amount,
        currency: invoiceData.currency || 'USD',
        reference_number: invoiceData.invoice_number,
        transaction_date: invoiceData.invoice_date,
        customer_id: invoiceData.customer_id,
        tax_amount: invoiceData.tax_amount,
        discount_amount: invoiceData.discount_amount
      },
      notes: options.notes,
      severity: options.severity
    };

    return await createLog(params);
  }, [createLog]);

  const logJournalEntry = useCallback(async (
    action: FinancialAuditEventType,
    entryId: string,
    entryData: any,
    oldData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ) => {
    const params: CreateFinancialAuditLogParams = {
      event_type: action,
      resource_type: 'journal_entry',
      resource_id: entryId,
      entity_name: entryData.entry_number || `JE-${entryId}`,
      old_values: oldData,
      new_values: entryData,
      changes_summary: generateJournalEntrySummary(action, oldData, entryData),
      financial_data: {
        amount: entryData.total_amount,
        reference_number: entryData.entry_number,
        transaction_date: entryData.entry_date,
        account_code: entryData.account_code
      },
      notes: options.notes,
      severity: options.severity || 'high' // Journal entries are high severity by default
    };

    return await createLog(params);
  }, [createLog]);

  return {
    logPayment,
    logContract,
    logInvoice,
    logJournalEntry,
    logGeneric: createLog
  };
}

// Helper functions for generating summaries
function generatePaymentSummary(action: FinancialAuditEventType, oldData?: any, newData?: any): string {
  switch (action) {
    case 'payment_created':
      return `Payment of ${newData?.amount} ${newData?.currency} created via ${newData?.payment_method}`;
    case 'payment_updated':
      return `Payment updated: ${describeChanges(oldData, newData)}`;
    case 'payment_deleted':
      return `Payment of ${oldData?.amount} ${oldData?.currency} deleted`;
    case 'payment_approved':
      return `Payment of ${newData?.amount} ${newData?.currency} approved`;
    case 'payment_refunded':
      return `Payment of ${newData?.amount} ${newData?.currency} refunded`;
    default:
      return `Payment ${action.replace('payment_', '')}`;
  }
}

function generateContractSummary(action: FinancialAuditEventType, oldData?: any, newData?: any): string {
  switch (action) {
    case 'contract_created':
      return `Contract created with monthly rent ${newData?.monthly_rent} ${newData?.currency}`;
    case 'contract_updated':
      return `Contract updated: ${describeChanges(oldData, newData)}`;
    case 'contract_cancelled':
      return `Contract cancelled: ${oldData?.contract_number}`;
    case 'contract_terminated':
      return `Contract terminated: ${oldData?.contract_number}`;
    default:
      return `Contract ${action.replace('contract_', '')}`;
  }
}

function generateInvoiceSummary(action: FinancialAuditEventType, oldData?: any, newData?: any): string {
  switch (action) {
    case 'invoice_created':
      return `Invoice ${newData?.invoice_number} created for ${newData?.total_amount} ${newData?.currency}`;
    case 'invoice_updated':
      return `Invoice updated: ${describeChanges(oldData, newData)}`;
    case 'invoice_paid':
      return `Invoice ${newData?.invoice_number} marked as paid`;
    case 'invoice_written_off':
      return `Invoice ${newData?.invoice_number} written off`;
    default:
      return `Invoice ${action.replace('invoice_', '')}`;
  }
}

function generateJournalEntrySummary(action: FinancialAuditEventType, oldData?: any, newData?: any): string {
  switch (action) {
    case 'journal_entry_created':
      return `Journal entry created: ${newData?.description}`;
    case 'journal_entry_posted':
      return `Journal entry posted: ${newData?.entry_number}`;
    case 'journal_entry_reversed':
      return `Journal entry reversed: ${newData?.entry_number}`;
    default:
      return `Journal entry ${action.replace('journal_entry_', '')}`;
  }
}

function describeChanges(oldData?: any, newData?: any): string {
  if (!oldData || !newData) return 'No previous data available';

  const changes = [];
  const fields = ['amount', 'status', 'payment_method', 'due_date', 'customer_id'];

  fields.forEach(field => {
    if (oldData[field] !== newData[field]) {
      changes.push(`${field}: ${oldData[field]} → ${newData[field]}`);
    }
  });

  return changes.length > 0 ? changes.join(', ') : 'No significant changes';
}