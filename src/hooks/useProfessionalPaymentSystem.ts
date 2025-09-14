/**
 * Hook النظام الاحترافي للمدفوعات - Professional Payment System Hook
 * Hook شامل يجمع جميع مكونات النظام الاحترافي للمدفوعات
 */

import { useState, useCallback, useEffect } from 'react';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

// استيراد جميع مكونات النظام
import { 
  SmartContractMatchingEngine, 
  AutoInvoiceSystem,
  createSmartContractMatchingEngine,
  createAutoInvoiceSystem,
  PaymentData,
  ContractData,
  InvoiceData,
  ContractMatch,
  LinkingSuggestion,
  AutoInvoiceConfig
} from '@/utils/professionalPaymentLinking';

import {
  PaymentAllocationEngine,
  createPaymentAllocationEngine,
  PaymentAllocation,
  AllocationRule,
  AllocationResult
} from '@/utils/paymentAllocationEngine';

import {
  AccountingIntegrationSystem,
  createAccountingIntegrationSystem,
  AccountingResult,
  AccountingTemplate
} from '@/utils/accountingIntegration';

import {
  AuditTrailSystem,
  ApprovalWorkflowSystem,
  createAuditTrailSystem,
  createApprovalWorkflowSystem,
  AuditLog,
  AuditSummary
} from '@/utils/auditTrailSystem';

// ===============================
// أنواع النظام الاحترافي
// ===============================

export interface ProfessionalPaymentSystemConfig {
  // إعدادات الربط الذكي
  contractMatching: {
    enabled: boolean;
    autoLinkThreshold: number; // الحد الأدنى للثقة للربط التلقائي
    fuzzySearchEnabled: boolean;
  };

  // إعدادات الفواتير التلقائية
  autoInvoicing: AutoInvoiceConfig;

  // إعدادات التوزيع
  allocation: {
    enabled: boolean;
    autoAllocate: boolean;
    defaultRules: AllocationRule[];
  };

  // إعدادات المحاسبة
  accounting: {
    enabled: boolean;
    autoCreateEntries: boolean;
    autoPostEntries: boolean;
    requireApproval: boolean;
  };

  // إعدادات المراجعة
  audit: {
    enabled: boolean;
    logAllActions: boolean;
    retentionDays: number;
  };
}

export interface PaymentProcessingResult {
  payment: PaymentData;
  contractMatch?: ContractMatch;
  linkingSuggestion?: LinkingSuggestion;
  invoice?: InvoiceData;
  allocations: PaymentAllocation[];
  journalEntry?: any;
  auditLogs: AuditLog[];
  success: boolean;
  errors: string[];
  warnings: string[];
  processingTime: number;
}

export interface SystemStatus {
  contractMatching: boolean;
  autoInvoicing: boolean;
  allocation: boolean;
  accounting: boolean;
  audit: boolean;
  lastUpdate: string;
}

// ===============================
// Hook النظام الاحترافي
// ===============================

export function useProfessionalPaymentSystem(config?: Partial<ProfessionalPaymentSystemConfig>) {
  const { companyId, user } = useUnifiedCompanyAccess();
  
  // حالة النظام
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    contractMatching: false,
    autoInvoicing: false,
    allocation: false,
    accounting: false,
    audit: false,
    lastUpdate: new Date().toISOString()
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // مكونات النظام
  const [contractMatchingEngine, setContractMatchingEngine] = useState<SmartContractMatchingEngine | null>(null);
  const [autoInvoiceSystem, setAutoInvoiceSystem] = useState<AutoInvoiceSystem | null>(null);
  const [allocationEngine, setAllocationEngine] = useState<PaymentAllocationEngine | null>(null);
  const [accountingSystem, setAccountingSystem] = useState<AccountingIntegrationSystem | null>(null);
  const [auditSystem, setAuditSystem] = useState<AuditTrailSystem | null>(null);
  const [approvalSystem, setApprovalSystem] = useState<ApprovalWorkflowSystem | null>(null);

  // الإعدادات الافتراضية
  const defaultConfig: ProfessionalPaymentSystemConfig = {
    contractMatching: {
      enabled: true,
      autoLinkThreshold: 0.8,
      fuzzySearchEnabled: true
    },
    autoInvoicing: {
      enabled: false,
      template: {
        id: 'default',
        name: 'القالب الافتراضي',
        description: 'قالب فاتورة افتراضي',
        defaultTerms: 'شكراً لدفعكم',
        defaultDueDays: 30,
        autoGenerate: false,
        requiredFields: ['customer_id', 'amount']
      },
      numberingSystem: {
        prefix: 'INV',
        format: 'PREFIX-YYYY-NNNN',
        nextNumber: 1,
        resetYearly: true
      },
      triggerConditions: []
    },
    allocation: {
      enabled: true,
      autoAllocate: true,
      defaultRules: []
    },
    accounting: {
      enabled: true,
      autoCreateEntries: true,
      autoPostEntries: false,
      requireApproval: true
    },
    audit: {
      enabled: true,
      logAllActions: true,
      retentionDays: 365
    }
  };

  const finalConfig = { ...defaultConfig, ...config };

  // ===============================
  // تهيئة النظام
  // ===============================

  useEffect(() => {
    if (!companyId) return;

    initializeSystem();
  }, [companyId, finalConfig]);

  const initializeSystem = useCallback(async () => {
    try {
      console.log('🚀 تهيئة النظام الاحترافي للمدفوعات...');

      // تهيئة محرك الربط الذكي
      if (finalConfig.contractMatching.enabled) {
        const contractEngine = createSmartContractMatchingEngine(companyId);
        setContractMatchingEngine(contractEngine);
        setSystemStatus(prev => ({ ...prev, contractMatching: true }));
        console.log('✅ تم تهيئة محرك الربط الذكي');
      }

      // تهيئة نظام الفواتير التلقائية
      if (finalConfig.autoInvoicing.enabled) {
        const invoiceSystem = createAutoInvoiceSystem(companyId, finalConfig.autoInvoicing);
        setAutoInvoiceSystem(invoiceSystem);
        setSystemStatus(prev => ({ ...prev, autoInvoicing: true }));
        console.log('✅ تم تهيئة نظام الفواتير التلقائية');
      }

      // تهيئة محرك التوزيع
      if (finalConfig.allocation.enabled) {
        const allocationEngine = createPaymentAllocationEngine(companyId);
        await allocationEngine.loadAllocationRules();
        setAllocationEngine(allocationEngine);
        setSystemStatus(prev => ({ ...prev, allocation: true }));
        console.log('✅ تم تهيئة محرك التوزيع');
      }

      // تهيئة النظام المحاسبي
      if (finalConfig.accounting.enabled) {
        const accountingSystem = createAccountingIntegrationSystem(companyId);
        await accountingSystem.loadAccountingTemplates();
        setAccountingSystem(accountingSystem);
        setSystemStatus(prev => ({ ...prev, accounting: true }));
        console.log('✅ تم تهيئة النظام المحاسبي');
      }

      // تهيئة نظام المراجعة
      if (finalConfig.audit.enabled) {
        const auditSystem = createAuditTrailSystem(companyId);
        setAuditSystem(auditSystem);
        setSystemStatus(prev => ({ ...prev, audit: true }));
        console.log('✅ تم تهيئة نظام المراجعة');
      }

      // تهيئة نظام الموافقات
      const approvalSystem = createApprovalWorkflowSystem(companyId);
      setApprovalSystem(approvalSystem);

      setSystemStatus(prev => ({ 
        ...prev, 
        lastUpdate: new Date().toISOString() 
      }));

      console.log('🎉 تم تهيئة النظام الاحترافي بنجاح');

    } catch (error) {
      console.error('❌ خطأ في تهيئة النظام الاحترافي:', error);
      toast.error('خطأ في تهيئة النظام الاحترافي');
    }
  }, [companyId, finalConfig]);

  // ===============================
  // معالجة المدفوعات الاحترافية
  // ===============================

  const processPayment = useCallback(async (
    payment: PaymentData,
    options: {
      autoLink?: boolean;
      autoInvoice?: boolean;
      autoAllocate?: boolean;
      autoAccounting?: boolean;
      logAudit?: boolean;
    } = {}
  ): Promise<PaymentProcessingResult> => {
    const startTime = Date.now();
    
    const {
      autoLink = finalConfig.contractMatching.enabled,
      autoInvoice = finalConfig.autoInvoicing.enabled,
      autoAllocate = finalConfig.allocation.autoAllocate,
      autoAccounting = finalConfig.accounting.autoCreateEntries,
      logAudit = finalConfig.audit.logAllActions
    } = options;

    const result: PaymentProcessingResult = {
      payment,
      allocations: [],
      auditLogs: [],
      success: true,
      errors: [],
      warnings: [],
      processingTime: 0
    };

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      console.log('🔄 بدء معالجة المدفوعة الاحترافية...', payment.payment_number);

      // 1. تسجيل بداية العملية
      if (logAudit && auditSystem) {
        await auditSystem.logPaymentCreation(
          payment,
          user?.id || 'system',
          user?.profile?.first_name || 'النظام',
          user?.role || 'system'
        );
      }

      setProcessingProgress(10);

      // 2. ربط ذكي بالعقود
      if (autoLink && contractMatchingEngine) {
        console.log('🔍 البحث عن أفضل تطابقات للعقود...');
        
        const matches = await contractMatchingEngine.findBestMatches(payment);
        const suggestion = await contractMatchingEngine.suggestLinking(payment);

        result.linkingSuggestion = suggestion;

        if (suggestion.recommendation === 'auto_link' && suggestion.primaryMatch) {
          result.contractMatch = suggestion.primaryMatch;
          payment.contract_id = suggestion.primaryMatch.contract.id;
          payment.customer_id = suggestion.primaryMatch.contract.customer_id;

          // تسجيل الربط
          if (logAudit && auditSystem) {
            await auditSystem.logPaymentLinking(
              payment.id!,
              payment.payment_number,
              suggestion.primaryMatch.contract.id,
              suggestion.primaryMatch.contract.contract_number,
              suggestion.primaryMatch.confidence,
              user?.id || 'system',
              user?.profile?.first_name || 'النظام',
              user?.role || 'system'
            );
          }

          console.log('✅ تم ربط المدفوعة بالعقد تلقائياً');
        } else {
          result.warnings.push('يتطلب مراجعة يدوية للربط بالعقد');
        }
      }

      setProcessingProgress(30);

      // 3. إنشاء فاتورة تلقائية
      if (autoInvoice && autoInvoiceSystem && result.contractMatch) {
        console.log('📄 إنشاء فاتورة تلقائية...');
        
        const invoice = await autoInvoiceSystem.createInvoiceForPayment(
          payment,
          result.contractMatch.contract
        );

        if (invoice) {
          result.invoice = invoice;
          payment.invoice_id = invoice.id;

          // ربط المدفوعة بالفاتورة
          await autoInvoiceSystem.linkPaymentToInvoice(payment, invoice);
          console.log('✅ تم إنشاء الفاتورة التلقائية');
        }
      }

      setProcessingProgress(50);

      // 4. توزيع المدفوعة
      if (autoAllocate && allocationEngine) {
        console.log('💰 توزيع المدفوعة...');
        
        const allocationResult = await allocationEngine.allocatePayment(payment, {
          autoAllocate: true
        });

        result.allocations = allocationResult.allocations;
        result.errors.push(...allocationResult.errors);
        result.warnings.push(...allocationResult.warnings);

        // تسجيل التوزيع
        if (logAudit && auditSystem && result.allocations.length > 0) {
          await auditSystem.logPaymentAllocation(
            payment.id!,
            payment.payment_number,
            result.allocations,
            user?.id || 'system',
            user?.profile?.first_name || 'النظام',
            user?.role || 'system'
          );
        }

        console.log('✅ تم توزيع المدفوعة على', result.allocations.length, 'هدف');
      }

      setProcessingProgress(70);

      // 5. إنشاء القيد المحاسبي
      if (autoAccounting && accountingSystem) {
        console.log('📊 إنشاء القيد المحاسبي...');
        
        const accountingResult = await accountingSystem.createJournalEntryForPayment(
          payment,
          result.allocations,
          {
            autoPost: finalConfig.accounting.autoPostEntries,
            customDescription: `معالجة احترافية للمدفوعة ${payment.payment_number}`
          }
        );

        if (accountingResult.success) {
          result.journalEntry = accountingResult.journalEntry;
          console.log('✅ تم إنشاء القيد المحاسبي');
        } else {
          result.errors.push(...accountingResult.errors);
          result.warnings.push(...accountingResult.warnings);
        }

        // تسجيل إنشاء القيد
        if (logAudit && auditSystem && result.journalEntry) {
          await auditSystem.logJournalEntryCreation(
            result.journalEntry,
            user?.id || 'system',
            user?.profile?.first_name || 'النظام',
            user?.role || 'system'
          );
        }
      }

      setProcessingProgress(90);

      // 6. تسجيل نجاح العملية
      if (logAudit && auditSystem) {
        await auditSystem.logAction({
          user_id: user?.id || 'system',
          user_name: user?.profile?.first_name || 'النظام',
          user_role: user?.role || 'system',
          action_type: 'update',
          entity_type: 'payment',
          entity_id: payment.id!,
          entity_name: payment.payment_number,
          new_values: {
            processing_status: 'completed',
            contract_linked: !!result.contractMatch,
            invoice_created: !!result.invoice,
            allocations_count: result.allocations.length,
            journal_entry_created: !!result.journalEntry
          },
          severity: result.errors.length > 0 ? 'warning' : 'info',
          message: `تمت معالجة المدفوعة ${payment.payment_number} بنجاح`
        });
      }

      setProcessingProgress(100);
      result.processingTime = Date.now() - startTime;

      console.log('🎉 تمت معالجة المدفوعة بنجاح في', result.processingTime, 'ms');

      // عرض النتائج
      if (result.errors.length > 0) {
        toast.warning(`تمت المعالجة مع ${result.errors.length} تحذير`);
      } else {
        toast.success('تمت معالجة المدفوعة بنجاح');
      }

      return result;

    } catch (error) {
      console.error('❌ خطأ في معالجة المدفوعة:', error);
      
      result.success = false;
      result.errors.push(`خطأ في المعالجة: ${error}`);
      result.processingTime = Date.now() - startTime;

      // تسجيل الخطأ
      if (logAudit && auditSystem) {
        await auditSystem.logAction({
          user_id: user?.id || 'system',
          user_name: user?.profile?.first_name || 'النظام',
          user_role: user?.role || 'system',
          action_type: 'update',
          entity_type: 'payment',
          entity_id: payment.id!,
          entity_name: payment.payment_number,
          severity: 'error',
          message: `فشل في معالجة المدفوعة ${payment.payment_number}: ${error}`
        });
      }

      toast.error('فشل في معالجة المدفوعة');
      return result;

    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [
    companyId,
    user,
    finalConfig,
    contractMatchingEngine,
    autoInvoiceSystem,
    allocationEngine,
    accountingSystem,
    auditSystem
  ]);

  // ===============================
  // وظائف إضافية
  // ===============================

  // البحث عن عقود مطابقة
  const findContractMatches = useCallback(async (payment: PaymentData): Promise<ContractMatch[]> => {
    if (!contractMatchingEngine) return [];
    
    try {
      return await contractMatchingEngine.findBestMatches(payment);
    } catch (error) {
      console.error('❌ خطأ في البحث عن العقود:', error);
      return [];
    }
  }, [contractMatchingEngine]);

  // اقتراح الربط
  const suggestLinking = useCallback(async (payment: PaymentData): Promise<LinkingSuggestion | null> => {
    if (!contractMatchingEngine) return null;
    
    try {
      return await contractMatchingEngine.suggestLinking(payment);
    } catch (error) {
      console.error('❌ خطأ في اقتراح الربط:', error);
      return null;
    }
  }, [contractMatchingEngine]);

  // توزيع المدفوعة يدوياً
  const allocatePaymentManually = useCallback(async (
    payment: PaymentData,
    allocations: Partial<PaymentAllocation>[]
  ): Promise<AllocationResult | null> => {
    if (!allocationEngine) return null;
    
    try {
      return await allocationEngine.allocatePayment(payment, {
        autoAllocate: false,
        manualAllocations: allocations
      });
    } catch (error) {
      console.error('❌ خطأ في التوزيع اليدوي:', error);
      return null;
    }
  }, [allocationEngine]);

  // إنشاء قيد محاسبي يدوياً
  const createJournalEntryManually = useCallback(async (
    payment: PaymentData,
    allocations: PaymentAllocation[],
    templateId?: string
  ): Promise<AccountingResult | null> => {
    if (!accountingSystem) return null;
    
    try {
      return await accountingSystem.createJournalEntryForPayment(payment, allocations, {
        templateId,
        autoPost: false
      });
    } catch (error) {
      console.error('❌ خطأ في إنشاء القيد المحاسبي:', error);
      return null;
    }
  }, [accountingSystem]);

  // الحصول على ملخص المراجعة
  const getAuditSummary = useCallback(async (
    dateFrom?: string,
    dateTo?: string
  ): Promise<AuditSummary | null> => {
    if (!auditSystem) return null;
    
    try {
      return await auditSystem.getAuditSummary(dateFrom, dateTo);
    } catch (error) {
      console.error('❌ خطأ في الحصول على ملخص المراجعة:', error);
      return null;
    }
  }, [auditSystem]);

  // البحث في سجل المراجعة
  const searchAuditLogs = useCallback(async (query: any): Promise<AuditLog[]> => {
    if (!auditSystem) return [];
    
    try {
      return await auditSystem.searchAuditLogs({
        company_id: companyId,
        ...query
      });
    } catch (error) {
      console.error('❌ خطأ في البحث في سجل المراجعة:', error);
      return [];
    }
  }, [auditSystem, companyId]);

  // إعادة تهيئة النظام
  const reinitializeSystem = useCallback(async () => {
    await initializeSystem();
  }, [initializeSystem]);

  // ===============================
  // إرجاع النتائج
  // ===============================

  return {
    // حالة النظام
    systemStatus,
    isProcessing,
    processingProgress,
    
    // الوظائف الرئيسية
    processPayment,
    findContractMatches,
    suggestLinking,
    allocatePaymentManually,
    createJournalEntryManually,
    getAuditSummary,
    searchAuditLogs,
    reinitializeSystem,
    
    // مكونات النظام (للاستخدام المتقدم)
    contractMatchingEngine,
    autoInvoiceSystem,
    allocationEngine,
    accountingSystem,
    auditSystem,
    approvalSystem,
    
    // الإعدادات
    config: finalConfig
  };
}
