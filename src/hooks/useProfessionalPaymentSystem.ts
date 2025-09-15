/**
 * Hook النظام الاحترافي للمدفوعات - Professional Payment System Hook
 * Hook شامل يجمع جميع مكونات النظام الاحترافي في واجهة موحدة
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

// استيراد جميع مكونات النظام الاحترافي
import {
  PaymentData,
  ContractData,
  InvoiceData,
  SmartContractMatchingEngine,
  AutoInvoiceSystem,
  ContractMatch,
  LinkingSuggestion,
  createSmartContractMatchingEngine,
  createAutoInvoiceSystem,
  AutoInvoiceConfig,
  InvoiceTemplate,
  InvoiceNumberingSystem
} from '@/utils/professionalPaymentLinking';

import {
  PaymentAllocation,
  AllocationResult,
  AllocationRule,
  FinancialObligation,
  PaymentAllocationEngine,
  createPaymentAllocationEngine
} from '@/utils/paymentAllocationEngine';

import {
  JournalEntry,
  JournalEntryLine,
  AccountingResult,
  AccountingTemplate,
  AccountingIntegrationSystem,
  createAccountingIntegrationSystem
} from '@/utils/accountingIntegration';

import {
  AuditLog,
  AuditReport,
  ComplianceCheck,
  AuditTrailSystem,
  createAuditTrailSystem
} from '@/utils/auditTrailSystem';

// ===============================
// أنواع Hook النظام الاحترافي
// ===============================

export interface ProfessionalPaymentSystemState {
  // حالة التحميل
  isLoading: boolean;
  isProcessing: boolean;
  
  // البيانات
  payments: PaymentData[];
  unlinkedPayments: PaymentData[];
  contracts: ContractData[];
  invoices: InvoiceData[];
  obligations: FinancialObligation[];
  
  // نتائج المعالجة
  linkingResults: LinkingResult[];
  allocationResults: AllocationResult[];
  accountingResults: AccountingResult[];
  
  // الإحصائيات
  statistics: SystemStatistics;
  
  // الأخطاء والتحذيرات
  errors: string[];
  warnings: string[];
  
  // التكوين
  configuration: SystemConfiguration;
}

export interface LinkingResult {
  payment: PaymentData;
  suggestion: LinkingSuggestion;
  applied: boolean;
  appliedAt?: string;
  appliedBy?: string;
  errors?: string[];
}

export interface SystemStatistics {
  totalPayments: number;
  linkedPayments: number;
  unlinkedPayments: number;
  totalAllocated: number;
  totalUnallocated: number;
  journalEntriesCreated: number;
  autoLinkingSuccessRate: number;
  averageLinkingConfidence: number;
  lastProcessingDate?: string;
}

export interface SystemConfiguration {
  autoLinking: {
    enabled: boolean;
    confidenceThreshold: number;
    maxSuggestions: number;
  };
  autoAllocation: {
    enabled: boolean;
    defaultRules: AllocationRule[];
  };
  autoInvoicing: {
    enabled: boolean;
    config: AutoInvoiceConfig;
  };
  autoAccounting: {
    enabled: boolean;
    autoPost: boolean;
    templates: AccountingTemplate[];
  };
  auditTrail: {
    enabled: boolean;
    retentionDays: number;
  };
}

export interface ProcessingOptions {
  autoLink?: boolean;
  autoAllocate?: boolean;
  autoInvoice?: boolean;
  autoAccounting?: boolean;
  manualReview?: boolean;
  batchSize?: number;
}

export interface ProcessingResult {
  success: boolean;
  processedCount: number;
  linkedCount: number;
  allocatedCount: number;
  invoicedCount: number;
  journalEntriesCount: number;
  errors: string[];
  warnings: string[];
  results: {
    linking: LinkingResult[];
    allocation: AllocationResult[];
    accounting: AccountingResult[];
  };
}

// ===============================
// Hook النظام الاحترافي الرئيسي
// ===============================

export const useProfessionalPaymentSystem = () => {
  // السياق الأساسي
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  // حالة النظام
  const [state, setState] = useState<ProfessionalPaymentSystemState>({
    isLoading: false,
    isProcessing: false,
    payments: [],
    unlinkedPayments: [],
    contracts: [],
    invoices: [],
    obligations: [],
    linkingResults: [],
    allocationResults: [],
    accountingResults: [],
    statistics: {
      totalPayments: 0,
      linkedPayments: 0,
      unlinkedPayments: 0,
      totalAllocated: 0,
      totalUnallocated: 0,
      journalEntriesCreated: 0,
      autoLinkingSuccessRate: 0,
      averageLinkingConfidence: 0
    },
    errors: [],
    warnings: [],
    configuration: {
      autoLinking: {
        enabled: true,
        confidenceThreshold: 0.8,
        maxSuggestions: 5
      },
      autoAllocation: {
        enabled: true,
        defaultRules: []
      },
      autoInvoicing: {
        enabled: false,
        config: {
          enabled: false,
          template: {
            id: '',
            name: '',
            description: '',
            defaultTerms: '',
            defaultDueDays: 30,
            autoGenerate: false,
            requiredFields: []
          },
          numberingSystem: {
            prefix: 'INV',
            format: 'INV-YYYY-NNNN',
            nextNumber: 1,
            resetYearly: true
          },
          triggerConditions: []
        }
      },
      autoAccounting: {
        enabled: true,
        autoPost: false,
        templates: []
      },
      auditTrail: {
        enabled: true,
        retentionDays: 2555 // 7 سنوات
      }
    }
  });

  // إنشاء مثيلات المحركات
  const engines = useMemo(() => {
    if (!companyId) return null;

    return {
      contractMatching: createSmartContractMatchingEngine(companyId),
      paymentAllocation: createPaymentAllocationEngine(companyId),
      accountingIntegration: createAccountingIntegrationSystem(companyId),
      auditTrail: createAuditTrailSystem(companyId, user?.id, user?.user_metadata?.name)
    };
  }, [companyId, user]);

  // ===============================
  // دوال تحميل البيانات
  // ===============================

  /**
   * تحميل البيانات الأساسية
   */
  const loadSystemData = useCallback(async () => {
    if (!companyId || !engines) return;

    setState(prev => ({ ...prev, isLoading: true, errors: [] }));

    try {
      console.log('🔄 تحميل بيانات النظام الاحترافي...');

      // تحميل البيانات بالتوازي
      const [
        paymentsResult,
        contractsResult,
        invoicesResult,
        obligationsResult,
        templatesResult,
        rulesResult
      ] = await Promise.allSettled([
        loadPayments(),
        loadContracts(),
        loadInvoices(),
        loadObligations(),
        engines.accountingIntegration.loadAccountingTemplates(),
        engines.paymentAllocation.loadAllocationRules()
      ]);

      // معالجة النتائج
      const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];
      const contracts = contractsResult.status === 'fulfilled' ? contractsResult.value : [];
      const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value : [];
      const obligations = obligationsResult.status === 'fulfilled' ? obligationsResult.value : [];
      const templates = templatesResult.status === 'fulfilled' ? templatesResult.value : [];
      const rules = rulesResult.status === 'fulfilled' ? rulesResult.value : [];

      // حساب الإحصائيات
      const statistics = calculateStatistics(payments, contracts, invoices);

      // تحديد المدفوعات غير المربوطة
      const unlinkedPayments = payments.filter(p => !p.contract_id && !p.invoice_id);

      setState(prev => ({
        ...prev,
        payments,
        unlinkedPayments,
        contracts,
        invoices,
        obligations,
        statistics,
        configuration: {
          ...prev.configuration,
          autoAllocation: {
            ...prev.configuration.autoAllocation,
            defaultRules: rules
          },
          autoAccounting: {
            ...prev.configuration.autoAccounting,
            templates
          }
        },
        isLoading: false
      }));

      console.log('✅ تم تحميل بيانات النظام بنجاح');

    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات النظام:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: [`خطأ في تحميل البيانات: ${error}`]
      }));
    }
  }, [companyId, engines]);

  /**
   * تحميل المدفوعات
   */
  const loadPayments = async (): Promise<PaymentData[]> => {
    if (!companyId) return [];

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          customer_type
        ),
        contracts (
          id,
          contract_number,
          contract_status
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return payments || [];
  };

  /**
   * تحميل العقود
   */
  const loadContracts = async (): Promise<ContractData[]> => {
    if (!companyId) return [];

    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          customer_type
        )
      `)
      .eq('company_id', companyId)
      .eq('contract_status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return contracts || [];
  };

  /**
   * تحميل الفواتير
   */
  const loadInvoices = async (): Promise<InvoiceData[]> => {
    if (!companyId) return [];

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          company_name
        )
      `)
      .eq('company_id', companyId)
      .in('invoice_status', ['sent', 'overdue'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return invoices || [];
  };

  /**
   * تحميل الالتزامات المالية
   */
  const loadObligations = async (): Promise<FinancialObligation[]> => {
    if (!companyId) return [];

    const { data: obligations, error } = await supabase
      .from('customer_financial_obligations')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['pending', 'overdue', 'partially_paid'])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return obligations || [];
  };

  // ===============================
  // دوال المعالجة الاحترافية
  // ===============================

  /**
   * معالجة مدفوعة واحدة احترافياً
   */
  const processPaymentProfessionally = useCallback(async (
    payment: PaymentData,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> => {
    if (!engines) {
      throw new Error('المحركات غير متوفرة');
    }

    const {
      autoLink = true,
      autoAllocate = true,
      autoInvoice = false,
      autoAccounting = true,
      manualReview = false
    } = options;

    setState(prev => ({ ...prev, isProcessing: true }));

    const result: ProcessingResult = {
      success: true,
      processedCount: 1,
      linkedCount: 0,
      allocatedCount: 0,
      invoicedCount: 0,
      journalEntriesCount: 0,
      errors: [],
      warnings: [],
      results: {
        linking: [],
        allocation: [],
        accounting: []
      }
    };

    try {
      console.log('🚀 بدء المعالجة الاحترافية للمدفوعة:', payment.payment_number);

      // 1. تسجيل بداية العملية
      await engines.auditTrail.logPaymentCreation(payment);

      // 2. الربط الذكي بالعقود
      let linkingResult: LinkingResult | null = null;
      if (autoLink && state.configuration.autoLinking.enabled) {
        linkingResult = await performSmartLinking(payment);
        if (linkingResult?.applied) {
          result.linkedCount = 1;
          result.results.linking.push(linkingResult);
        }
      }

      // 3. التوزيع التلقائي
      let allocationResult: AllocationResult | null = null;
      if (autoAllocate && state.configuration.autoAllocation.enabled) {
        allocationResult = await performAutoAllocation(payment, linkingResult?.suggestion);
        if (allocationResult?.success) {
          result.allocatedCount = 1;
          result.results.allocation.push(allocationResult);
        }
      }

      // 4. إنشاء الفواتير التلقائي
      let invoiceResult: InvoiceData | null = null;
      if (autoInvoice && state.configuration.autoInvoicing.enabled) {
        invoiceResult = await performAutoInvoicing(payment, linkingResult?.suggestion);
        if (invoiceResult) {
          result.invoicedCount = 1;
        }
      }

      // 5. إنشاء القيود المحاسبية
      let accountingResult: AccountingResult | null = null;
      if (autoAccounting && state.configuration.autoAccounting.enabled) {
        accountingResult = await performAutoAccounting(payment, allocationResult?.allocations || []);
        if (accountingResult?.success) {
          result.journalEntriesCount = 1;
          result.results.accounting.push(accountingResult);
        }
      }

      // 6. تحديث الإحصائيات
      await updateStatistics();

      console.log('✅ تمت المعالجة الاحترافية بنجاح');

    } catch (error) {
      console.error('❌ خطأ في المعالجة الاحترافية:', error);
      result.success = false;
      result.errors.push(`خطأ في المعالجة: ${error}`);
      
      // تسجيل الخطأ
      if (engines.auditTrail) {
        await engines.auditTrail.logSystemError(error as Error, { payment_id: payment.id });
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }

    return result;
  }, [engines, state.configuration]);

  /**
   * معالجة مجمعة للمدفوعات
   */
  const processBatchPayments = useCallback(async (
    payments: PaymentData[],
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> => {
    if (!engines) {
      throw new Error('المحركات غير متوفرة');
    }

    const { batchSize = 10 } = options;
    const batches = chunkArray(payments, batchSize);
    
    const result: ProcessingResult = {
      success: true,
      processedCount: 0,
      linkedCount: 0,
      allocatedCount: 0,
      invoicedCount: 0,
      journalEntriesCount: 0,
      errors: [],
      warnings: [],
      results: {
        linking: [],
        allocation: [],
        accounting: []
      }
    };

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      console.log(`🚀 بدء المعالجة المجمعة لـ ${payments.length} مدفوعة`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 معالجة المجموعة ${i + 1}/${batches.length} (${batch.length} مدفوعة)`);

        // معالجة المجموعة بالتوازي
        const batchResults = await Promise.allSettled(
          batch.map(payment => processPaymentProfessionally(payment, options))
        );

        // تجميع النتائج
        batchResults.forEach((batchResult, index) => {
          if (batchResult.status === 'fulfilled') {
            const paymentResult = batchResult.value;
            result.processedCount += paymentResult.processedCount;
            result.linkedCount += paymentResult.linkedCount;
            result.allocatedCount += paymentResult.allocatedCount;
            result.invoicedCount += paymentResult.invoicedCount;
            result.journalEntriesCount += paymentResult.journalEntriesCount;
            result.errors.push(...paymentResult.errors);
            result.warnings.push(...paymentResult.warnings);
            result.results.linking.push(...paymentResult.results.linking);
            result.results.allocation.push(...paymentResult.results.allocation);
            result.results.accounting.push(...paymentResult.results.accounting);
          } else {
            result.errors.push(`خطأ في معالجة مدفوعة ${batch[index]?.payment_number}: ${batchResult.reason}`);
          }
        });

        // تأخير قصير بين المجموعات لتجنب الحمل الزائد
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // تحديث الإحصائيات النهائية
      await updateStatistics();

      console.log('✅ تمت المعالجة المجمعة بنجاح:', {
        processed: result.processedCount,
        linked: result.linkedCount,
        allocated: result.allocatedCount,
        invoiced: result.invoicedCount,
        journalEntries: result.journalEntriesCount
      });

    } catch (error) {
      console.error('❌ خطأ في المعالجة المجمعة:', error);
      result.success = false;
      result.errors.push(`خطأ في المعالجة المجمعة: ${error}`);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }

    return result;
  }, [engines, processPaymentProfessionally]);

  // ===============================
  // دوال المعالجة المساعدة
  // ===============================

  /**
   * تنفيذ الربط الذكي
   */
  const performSmartLinking = async (payment: PaymentData): Promise<LinkingResult | null> => {
    if (!engines?.contractMatching) return null;

    try {
      const suggestion = await engines.contractMatching.suggestLinking(payment);
      
      const result: LinkingResult = {
        payment,
        suggestion,
        applied: false
      };

      // تطبيق الربط إذا كان الثقة عالية
      if (suggestion.recommendation === 'auto_link' && 
          suggestion.confidence >= state.configuration.autoLinking.confidenceThreshold) {
        
        if (suggestion.primaryMatch?.contract) {
          // ربط المدفوعة بالعقد
          await supabase
            .from('payments')
            .update({
              contract_id: suggestion.primaryMatch.contract.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          result.applied = true;
          result.appliedAt = new Date().toISOString();
          result.appliedBy = user?.id;

          // تسجيل الربط
          await engines.auditTrail.logPaymentContractLinking(
            payment.id!,
            suggestion.primaryMatch.contract.id,
            'auto',
            suggestion.confidence
          );

          console.log('✅ تم الربط الذكي للمدفوعة:', payment.payment_number);
        }
      }

      return result;

    } catch (error) {
      console.error('❌ خطأ في الربط الذكي:', error);
      return {
        payment,
        suggestion: {
          primaryMatch: null,
          alternativeMatches: [],
          confidence: 0,
          recommendation: 'create_new_contract',
          reasons: ['خطأ في الربط']
        },
        applied: false,
        errors: [`خطأ في الربط: ${error}`]
      };
    }
  };

  /**
   * تنفيذ التوزيع التلقائي
   */
  const performAutoAllocation = async (
    payment: PaymentData,
    linkingSuggestion?: LinkingSuggestion
  ): Promise<AllocationResult | null> => {
    if (!engines?.paymentAllocation) return null;

    try {
      // إعداد التوزيعات اليدوية إذا كان هناك عقد مرتبط
      const manualAllocations: Partial<PaymentAllocation>[] = [];
      
      if (linkingSuggestion?.primaryMatch?.contract) {
        manualAllocations.push({
          allocation_type: 'contract',
          target_id: linkingSuggestion.primaryMatch.contract.id,
          amount: payment.amount,
          notes: 'توزيع تلقائي بناءً على الربط الذكي'
        });
      }

      const result = await engines.paymentAllocation.allocatePayment(payment, {
        autoAllocate: true,
        manualAllocations
      });

      // تسجيل التوزيع
      await engines.auditTrail.logPaymentAllocation(
        payment.id!,
        result.allocations,
        'auto'
      );

      return result;

    } catch (error) {
      console.error('❌ خطأ في التوزيع التلقائي:', error);
      return {
        payment,
        allocations: [],
        totalAllocated: 0,
        remainingAmount: payment.amount,
        success: false,
        errors: [`خطأ في التوزيع: ${error}`],
        warnings: []
      };
    }
  };

  /**
   * تنفيذ إنشاء الفواتير التلقائي
   */
  const performAutoInvoicing = async (
    payment: PaymentData,
    linkingSuggestion?: LinkingSuggestion
  ): Promise<InvoiceData | null> => {
    if (!engines?.contractMatching || !state.configuration.autoInvoicing.enabled) return null;

    try {
      const autoInvoiceSystem = createAutoInvoiceSystem(companyId!, state.configuration.autoInvoicing.config);
      
      const contract = linkingSuggestion?.primaryMatch?.contract;
      const invoice = await autoInvoiceSystem.createInvoiceForPayment(payment, contract || undefined);

      if (invoice) {
        await autoInvoiceSystem.linkPaymentToInvoice(payment, invoice);
        console.log('✅ تم إنشاء الفاتورة التلقائية:', invoice.invoice_number);
      }

      return invoice;

    } catch (error) {
      console.error('❌ خطأ في إنشاء الفاتورة التلقائية:', error);
      return null;
    }
  };

  /**
   * تنفيذ المحاسبة التلقائية
   */
  const performAutoAccounting = async (
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): Promise<AccountingResult | null> => {
    if (!engines?.accountingIntegration || !state.configuration.autoAccounting.enabled) return null;

    try {
      const result = await engines.accountingIntegration.createJournalEntryForPayment(
        payment,
        allocations,
        {
          autoPost: state.configuration.autoAccounting.autoPost
        }
      );

      if (result.success) {
        // تسجيل إنشاء القيد
        await engines.auditTrail.logJournalEntryCreation(
          payment.id!,
          result.journalEntry,
          result.entries
        );

        console.log('✅ تم إنشاء القيد المحاسبي:', result.journalEntry.entry_number);
      }

      return result;

    } catch (error) {
      console.error('❌ خطأ في المحاسبة التلقائية:', error);
      return {
        journalEntry: {} as JournalEntry,
        entries: [],
        success: false,
        errors: [`خطأ في المحاسبة: ${error}`],
        warnings: []
      };
    }
  };

  // ===============================
  // دوال الإدارة والتكوين
  // ===============================

  /**
   * تحديث الإحصائيات
   */
  const updateStatistics = useCallback(async () => {
    if (!companyId) return;

    try {
      const [paymentsResult, linkedResult] = await Promise.allSettled([
        supabase
          .from('payments')
          .select('id, amount, contract_id, invoice_id')
          .eq('company_id', companyId),
        supabase
          .from('payments')
          .select('id, amount')
          .eq('company_id', companyId)
          .not('contract_id', 'is', null)
      ]);

      const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : [];
      const linkedPayments = linkedResult.status === 'fulfilled' ? linkedResult.value.data || [] : [];

      const statistics: SystemStatistics = {
        totalPayments: payments.length,
        linkedPayments: linkedPayments.length,
        unlinkedPayments: payments.length - linkedPayments.length,
        totalAllocated: linkedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        totalUnallocated: (payments.length - linkedPayments.length) * 1000, // تقدير
        journalEntriesCreated: 0, // سيتم تحديثه لاحقاً
        autoLinkingSuccessRate: linkedPayments.length / Math.max(payments.length, 1),
        averageLinkingConfidence: 0.85, // سيتم حسابها من قاعدة البيانات
        lastProcessingDate: new Date().toISOString()
      };

      setState(prev => ({ ...prev, statistics }));

    } catch (error) {
      console.error('❌ خطأ في تحديث الإحصائيات:', error);
    }
  }, [companyId]);

  /**
   * تحديث التكوين
   */
  const updateConfiguration = useCallback((newConfig: Partial<SystemConfiguration>) => {
    setState(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        ...newConfig
      }
    }));

    toast.success('تم تحديث التكوين بنجاح');
  }, []);

  /**
   * إعادة تعيين النظام
   */
  const resetSystem = useCallback(async () => {
    setState(prev => ({
      ...prev,
      payments: [],
      unlinkedPayments: [],
      contracts: [],
      invoices: [],
      obligations: [],
      linkingResults: [],
      allocationResults: [],
      accountingResults: [],
      errors: [],
      warnings: [],
      statistics: {
        totalPayments: 0,
        linkedPayments: 0,
        unlinkedPayments: 0,
        totalAllocated: 0,
        totalUnallocated: 0,
        journalEntriesCreated: 0,
        autoLinkingSuccessRate: 0,
        averageLinkingConfidence: 0
      }
    }));

    await loadSystemData();
    toast.success('تم إعادة تعيين النظام بنجاح');
  }, [loadSystemData]);

  // ===============================
  // دوال المراجعة والتقارير
  // ===============================

  /**
   * إنشاء تقرير المراجعة
   */
  const generateAuditReport = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<AuditReport | null> => {
    if (!engines?.auditTrail) return null;

    try {
      return await engines.auditTrail.generateAuditReport(startDate, endDate);
    } catch (error) {
      console.error('❌ خطأ في إنشاء تقرير المراجعة:', error);
      return null;
    }
  }, [engines]);

  /**
   * فحص الامتثال
   */
  const performComplianceCheck = useCallback(async (): Promise<ComplianceCheck[]> => {
    if (!engines?.auditTrail) return [];

    try {
      return await engines.auditTrail.performComplianceCheck();
    } catch (error) {
      console.error('❌ خطأ في فحص الامتثال:', error);
      return [];
    }
  }, [engines]);

  // ===============================
  // التحميل التلقائي عند بدء التشغيل
  // ===============================

  useEffect(() => {
    if (companyId && engines) {
      loadSystemData();
    }
  }, [companyId, engines, loadSystemData]);

  // ===============================
  // تصدير الواجهة
  // ===============================

  return {
    // الحالة
    ...state,
    
    // المحركات
    engines,
    
    // دوال التحميل
    loadSystemData,
    refreshData: loadSystemData,
    
    // دوال المعالجة
    processPaymentProfessionally,
    processBatchPayments,
    
    // دوال الإدارة
    updateConfiguration,
    resetSystem,
    
    // دوال المراجعة
    generateAuditReport,
    performComplianceCheck,
    
    // دوال مساعدة
    calculateStatistics: useCallback(() => calculateStatistics(state.payments, state.contracts, state.invoices), [state.payments, state.contracts, state.invoices])
  };
};

// ===============================
// الدوال المساعدة
// ===============================

/**
 * تقسيم المصفوفة إلى مجموعات
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * حساب الإحصائيات
 */
function calculateStatistics(
  payments: PaymentData[],
  contracts: ContractData[],
  invoices: InvoiceData[]
): SystemStatistics {
  const linkedPayments = payments.filter(p => p.contract_id || p.invoice_id);
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const linkedAmount = linkedPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    totalPayments: payments.length,
    linkedPayments: linkedPayments.length,
    unlinkedPayments: payments.length - linkedPayments.length,
    totalAllocated: linkedAmount,
    totalUnallocated: totalAmount - linkedAmount,
    journalEntriesCreated: 0, // سيتم تحديثه من قاعدة البيانات
    autoLinkingSuccessRate: payments.length > 0 ? linkedPayments.length / payments.length : 0,
    averageLinkingConfidence: 0.85, // سيتم حسابها من قاعدة البيانات
    lastProcessingDate: new Date().toISOString()
  };
}

// إضافة استيراد supabase
import { supabase } from '@/integrations/supabase/client';
