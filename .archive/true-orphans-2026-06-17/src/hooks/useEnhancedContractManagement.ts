/**
 * Enhanced Contract Management Hook
 *
 * Integrates enhanced contract calculations, workflow management,
 * compliance validation, and analytics into a unified interface.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Import enhanced contract libraries
import {
  calculateEnhancedPayment,
  getCalculationMetrics,
  clearCalculationCache,
  Contract,
  BillingFrequency,
  PricingModel,
  EnhancedPaymentResult,
  CalculationMetrics
} from '@/lib/contract-calculations';

import {
  ContractWorkflowEngine,
  createRenewalWorkflow,
  createTerminationWorkflow,
  createComplianceCheckWorkflow,
  ContractWorkflow,
  WorkflowStatus,
  ContractWorkflowConfig
} from '@/lib/contract-workflow';

import {
  ContractComplianceEngine,
  ComplianceReport,
  ComplianceRule,
  defaultComplianceEngine,
  ComplianceSeverity
} from '@/lib/contract-compliance';

import {
  ContractAnalyticsEngine,
  ContractAnalytics,
  ContractPerformanceReport,
  defaultAnalyticsEngine,
  CustomReportConfig
} from '@/lib/contract-analytics';

interface UseEnhancedContractManagementOptions {
  contractId?: string;
  enableCalculations?: boolean;
  enableWorkflows?: boolean;
  enableCompliance?: boolean;
  enableAnalytics?: boolean;
  workflowConfig?: Partial<ContractWorkflowConfig>;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface EnhancedContractState {
  contract: Contract | null;
  calculationResult: EnhancedPaymentResult | null;
  calculationMetrics: CalculationMetrics | null;
  workflows: ContractWorkflow[];
  complianceReport: ComplianceReport | null;
  analytics: ContractAnalytics | null;
  performanceReport: ContractPerformanceReport | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface ContractActionOptions {
  billingPeriod?: {
    start_date: string;
    end_date: string;
    days: number;
  };
  usageData?: { [unit: string]: number };
  discounts?: Array<{ type: string; rate: number; description: string }>;
  workflowType?: 'renewal' | 'termination' | 'amendment' | 'compliance_check';
  workflowMetadata?: Record<string, any>;
  complianceRules?: string[];
  analyticsPeriod?: {
    start_date: string;
    end_date: string;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
}

/**
 * Enhanced Contract Management Hook
 */
export function useEnhancedContractManagement(
  options: UseEnhancedContractManagementOptions = {}
) {
  const {
    contractId,
    enableCalculations = true,
    enableWorkflows = true,
    enableCompliance = true,
    enableAnalytics = true,
    workflowConfig,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const queryClient = useQueryClient();
  const [state, setState] = useState<EnhancedContractState>({
    contract: null,
    calculationResult: null,
    calculationMetrics: null,
    workflows: [],
    complianceReport: null,
    analytics: null,
    performanceReport: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  // Initialize engines
  const [workflowEngine] = useState(() => new ContractWorkflowEngine(workflowConfig));
  const [complianceEngine] = useState(() => defaultComplianceEngine);
  const [analyticsEngine] = useState(() => defaultAnalyticsEngine);

  // Fetch contract data
  const {
    data: contract,
    isLoading: contractLoading,
    error: contractError,
    refetch: refetchContract
  } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      if (!contractId) return null;
      // This would integrate with your existing contract API
      const response = await fetch(`/api/contracts/${contractId}`);
      if (!response.ok) throw new Error('Failed to fetch contract');
      return response.json();
    },
    enabled: !!contractId,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Update state when contract data changes
  useEffect(() => {
    if (contract) {
      setState(prev => ({
        ...prev,
        contract,
        lastUpdated: new Date()
      }));

      // Trigger dependent calculations and validations
      if (enableCalculations) {
        performEnhancedCalculation(contract);
      }

      if (enableCompliance) {
        performComplianceCheck(contract);
      }
    }
  }, [contract, enableCalculations, enableCompliance]);

  // Enhanced contract calculation
  const performEnhancedCalculation = useCallback(async (
    contractData: Contract,
    options?: ContractActionOptions
  ) => {
    if (!enableCalculations) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const result = calculateEnhancedPayment(
        contractData,
        options?.billingPeriod,
        options?.usageData,
        options?.discounts
      );

      const metrics = getCalculationMetrics();

      setState(prev => ({
        ...prev,
        calculationResult: result,
        calculationMetrics: metrics,
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Calculation failed',
        isLoading: false
      }));
    }
  }, [enableCalculations]);

  // Compliance validation
  const performComplianceCheck = useCallback(async (
    contractData: Contract,
    ruleIds?: string[]
  ) => {
    if (!enableCompliance) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const report = await complianceEngine.validateContract(
        contractData.id,
        contractData,
        ruleIds
      );

      setState(prev => ({
        ...prev,
        complianceReport: report,
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Compliance check failed',
        isLoading: false
      }));
    }
  }, [enableCompliance, complianceEngine]);

  // Workflow management
  const createWorkflow = useCallback(async (
    workflowType: ContractActionOptions['workflowType'],
    metadata?: Record<string, any>
  ) => {
    if (!enableWorkflows || !contract) return null;

    try {
      let workflowData: Partial<ContractWorkflow>;

      switch (workflowType) {
        case 'renewal':
          workflowData = createRenewalWorkflow(
            contract.id,
            contract.end_date,
            'system'
          );
          break;

        case 'termination':
          workflowData = createTerminationWorkflow(
            contract.id,
            new Date().toISOString(),
            'system',
            metadata?.reason || 'User requested termination'
          );
          break;

        case 'compliance_check':
          workflowData = createComplianceCheckWorkflow(contract.id, 'system');
          break;

        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }

      if (metadata) {
        workflowData.metadata = { ...workflowData.metadata, ...metadata };
      }

      const workflow = workflowEngine.createWorkflow(workflowData);

      setState(prev => ({
        ...prev,
        workflows: [...prev.workflows, workflow]
      }));

      return workflow;

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Workflow creation failed'
      }));
      return null;
    }
  }, [enableWorkflows, contract, workflowEngine]);

  // Execute workflow
  const executeWorkflow = useCallback(async (workflowId: string) => {
    if (!enableWorkflows) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const executions = await workflowEngine.executeWorkflow(workflowId);

      // Update workflow in state
      setState(prev => ({
        ...prev,
        workflows: prev.workflows.map(w =>
          w.id === workflowId
            ? { ...w, status: executions.some(e => e.status === 'failed') ? 'failed' as WorkflowStatus : 'completed' as WorkflowStatus }
            : w
        ),
        isLoading: false
      }));

      // Refetch contract data as workflow might have updated it
      await refetchContract();

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Workflow execution failed',
        isLoading: false
      }));
    }
  }, [enableWorkflows, workflowEngine, refetchContract]);

  // Generate analytics
  const generateAnalytics = useCallback(async (
    period?: ContractActionOptions['analyticsPeriod']
  ) => {
    if (!enableAnalytics || !contract) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Load contract data for analytics
      await analyticsEngine.loadData([contract]);

      const analytics = await analyticsEngine.generateAnalytics(period);

      setState(prev => ({
        ...prev,
        analytics,
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Analytics generation failed',
        isLoading: false
      }));
    }
  }, [enableAnalytics, contract, analyticsEngine]);

  // Generate performance report
  const generatePerformanceReport = useCallback(async () => {
    if (!enableAnalytics || !contract) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const report = await analyticsEngine.generateContractPerformanceReport(contract.id);

      setState(prev => ({
        ...prev,
        performanceReport: report,
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Performance report generation failed',
        isLoading: false
      }));
    }
  }, [enableAnalytics, contract, analyticsEngine]);

  // Custom report generation
  const generateCustomReport = useCallback(async (config: CustomReportConfig) => {
    if (!enableAnalytics) return null;

    try {
      return await analyticsEngine.generateCustomReport(config);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Custom report generation failed'
      }));
      return null;
    }
  }, [enableAnalytics, analyticsEngine]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await refetchContract();
    if (contract) {
      if (enableCalculations) {
        await performEnhancedCalculation(contract);
      }
      if (enableCompliance) {
        await performComplianceCheck(contract);
      }
    }
  }, [contract, refetchContract, enableCalculations, enableCompliance, performEnhancedCalculation, performComplianceCheck]);

  // Clear caches
  const clearCaches = useCallback(() => {
    clearCalculationCache();
    complianceEngine.clearContractResults(contractId || '');
    queryClient.invalidateQueries({ queryKey: ['contract'] });
  }, [contractId, complianceEngine, queryClient]);

  // Memoized computed values
  const isCompliant = useMemo(() => {
    return state.complianceReport?.overall_status === 'compliant';
  }, [state.complianceReport]);

  const hasCriticalIssues = useMemo(() => {
    return state.complianceReport?.critical_issues > 0;
  }, [state.complianceReport]);

  const performanceScore = useMemo(() => {
    return state.performanceReport?.performance_score || 0;
  }, [state.performanceReport]);

  const profitability = useMemo(() => {
    return state.performanceReport?.profitability || 0;
  }, [state.performanceReport]);

  // Mutations for contract updates
  const updateContractMutation = useMutation({
    mutationFn: async (updates: Partial<Contract>) => {
      if (!contractId) throw new Error('Contract ID is required');

      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update contract');
      return response.json();
    },
    onSuccess: (updatedContract) => {
      queryClient.setQueryData(['contract', contractId], updatedContract);
      setState(prev => ({ ...prev, contract: updatedContract }));
    }
  });

  // Export functionality
  const exportReport = useCallback(async (
    format: 'pdf' | 'excel' | 'csv',
    reportType: 'analytics' | 'compliance' | 'performance' | 'custom',
    config?: CustomReportConfig
  ) => {
    try {
      let data: any;
      let filename: string;

      switch (reportType) {
        case 'analytics':
          data = state.analytics;
          filename = `contract-analytics-${contractId}`;
          break;
        case 'compliance':
          data = state.complianceReport;
          filename = `compliance-report-${contractId}`;
          break;
        case 'performance':
          data = state.performanceReport;
          filename = `performance-report-${contractId}`;
          break;
        case 'custom':
          data = config ? await generateCustomReport(config) : null;
          filename = `custom-report-${contractId}`;
          break;
        default:
          throw new Error('Unknown report type');
      }

      if (!data) throw new Error('No data to export');

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, format, filename })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed'
      }));
    }
  }, [contractId, state.analytics, state.complianceReport, state.performanceReport, generateCustomReport]);

  return {
    // State
    ...state,

    // Computed values
    isCompliant,
    hasCriticalIssues,
    performanceScore,
    profitability,

    // Actions
    performEnhancedCalculation,
    performComplianceCheck,
    createWorkflow,
    executeWorkflow,
    generateAnalytics,
    generatePerformanceReport,
    generateCustomReport,
    refresh,
    clearCaches,
    exportReport,

    // Mutations
    updateContract: updateContractMutation.mutate,

    // Engines access
    workflowEngine,
    complianceEngine,
    analyticsEngine,

    // Loading states
    isCalculating: state.isLoading && enableCalculations,
    isCheckingCompliance: state.isLoading && enableCompliance,
    isGeneratingAnalytics: state.isLoading && enableAnalytics,

    // Error states
    hasError: !!state.error,
    errorMessage: state.error
  };
}

/**
 * Hook for managing multiple contracts
 */
export function useMultipleContractManagement(
  contractIds: string[],
  options: Omit<UseEnhancedContractManagementOptions, 'contractId'> = {}
) {
  const queryClient = useQueryClient();
  const [bulkResults, setBulkResults] = useState<{
    calculations: Array<{ contractId: string; result: EnhancedPaymentResult | null; error?: string }>;
    compliance: Array<{ contractId: string; report: ComplianceReport | null; error?: string }>;
    workflows: Array<{ contractId: string; workflows: ContractWorkflow[]; error?: string }>;
  }>({
    calculations: [],
    compliance: [],
    workflows: []
  });

  // Fetch multiple contracts
  const {
    data: contracts,
    isLoading: contractsLoading,
    refetch: refetchContracts
  } = useQuery({
    queryKey: ['contracts', 'bulk', contractIds],
    queryFn: async () => {
      if (contractIds.length === 0) return [];

      const response = await fetch('/api/contracts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_ids: contractIds })
      });

      if (!response.ok) throw new Error('Failed to fetch contracts');
      return response.json();
    },
    enabled: contractIds.length > 0
  });

  // Bulk calculation
  const performBulkCalculations = useCallback(async (
    calculationOptions?: ContractActionOptions
  ) => {
    if (!contracts) return;

    const results = await Promise.allSettled(
      contracts.map(async (contract) => {
        try {
          const result = calculateEnhancedPayment(
            contract,
            calculationOptions?.billingPeriod,
            calculationOptions?.usageData,
            calculationOptions?.discounts
          );
          return { contractId: contract.id, result, error: undefined };
        } catch (error) {
          return {
            contractId: contract.id,
            result: null,
            error: error instanceof Error ? error.message : 'Calculation failed'
          };
        }
      })
    );

    const calculationResults = results.map(result =>
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean) as Array<{ contractId: string; result: EnhancedPaymentResult | null; error?: string }>;

    setBulkResults(prev => ({
      ...prev,
      calculations: calculationResults
    }));

    return calculationResults;
  }, [contracts]);

  // Bulk compliance check
  const performBulkComplianceCheck = useCallback(async (ruleIds?: string[]) => {
    if (!contracts) return;

    const complianceEngine = defaultComplianceEngine;
    const results = await Promise.allSettled(
      contracts.map(async (contract) => {
        try {
          const report = await complianceEngine.validateContract(
            contract.id,
            contract,
            ruleIds
          );
          return { contractId: contract.id, report, error: undefined };
        } catch (error) {
          return {
            contractId: contract.id,
            report: null,
            error: error instanceof Error ? error.message : 'Compliance check failed'
          };
        }
      })
    );

    const complianceResults = results.map(result =>
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean) as Array<{ contractId: string; report: ComplianceReport | null; error?: string }>;

    setBulkResults(prev => ({
      ...prev,
      compliance: complianceResults
    }));

    return complianceResults;
  }, [contracts]);

  // Bulk workflow creation
  const createBulkWorkflows = useCallback(async (
    workflowType: 'renewal' | 'termination' | 'compliance_check',
    metadata?: Record<string, any>
  ) => {
    if (!contracts) return;

    const workflowEngine = new ContractWorkflowEngine();
    const results: Array<{ contractId: string; workflows: ContractWorkflow[]; error?: string }> = [];

    for (const contract of contracts) {
      try {
        let workflowData: Partial<ContractWorkflow>;

        switch (workflowType) {
          case 'renewal':
            workflowData = createRenewalWorkflow(
              contract.id,
              contract.end_date,
              'system'
            );
            break;
          case 'termination':
            workflowData = createTerminationWorkflow(
              contract.id,
              new Date().toISOString(),
              'system',
              metadata?.reason || 'Bulk termination'
            );
            break;
          case 'compliance_check':
            workflowData = createComplianceCheckWorkflow(contract.id, 'system');
            break;
        }

        if (metadata) {
          workflowData.metadata = { ...workflowData.metadata, ...metadata };
        }

        const workflow = workflowEngine.createWorkflow(workflowData);
        results.push({ contractId: contract.id, workflows: [workflow] });
      } catch (error) {
        results.push({
          contractId: contract.id,
          workflows: [],
          error: error instanceof Error ? error.message : 'Workflow creation failed'
        });
      }
    }

    setBulkResults(prev => ({
      ...prev,
      workflows: results
    }));

    return results;
  }, [contracts]);

  return {
    contracts,
    contractsLoading,
    bulkResults,
    performBulkCalculations,
    performBulkComplianceCheck,
    createBulkWorkflows,
    refetchContracts
  };
}

export default useEnhancedContractManagement;