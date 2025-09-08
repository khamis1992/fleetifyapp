import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

// 🎯 واجهات نظام الغرامات المتقدم
interface AdvancedLateFineSettings {
  id?: string;
  company_id: string;
  is_active: boolean;
  fine_per_day: number; // ريال كويتي
  max_fine_amount: number | null; // حد أقصى
  grace_period_days: number;
  auto_apply: boolean;
  escalation_rules: {
    tier1_days: number;
    tier1_multiplier: number;
    tier2_days: number;
    tier2_multiplier: number;
    tier3_days: number;
    tier3_multiplier: number;
  };
  waiver_rules: {
    max_waiver_amount: number;
    requires_approval: boolean;
    auto_waiver_conditions: string[];
  };
  notification_rules: {
    notify_at_days: number[];
    email_templates: Record<string, string>;
  };
}

interface LateFineCalculationResult {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  due_date: string;
  payment_date?: string;
  days_overdue: number;
  base_amount: number;
  fine_calculation: {
    grace_period: number;
    billable_days: number;
    daily_rate: number;
    gross_fine: number;
    tier_multiplier: number;
    calculated_fine: number;
    capped_fine: number;
    final_fine: number;
  };
  waiver_info?: {
    is_waived: boolean;
    waiver_reason: string;
    waived_amount: number;
    approved_by?: string;
  };
  status: 'pending' | 'applied' | 'waived' | 'paid';
  invoice_id?: string;
}

interface BulkLateFineOperation {
  total_contracts: number;
  processed: number;
  successful: number;
  failed: number;
  total_fines_calculated: number;
  total_amount: number;
  errors: string[];
  results: LateFineCalculationResult[];
}

export function useAdvancedLateFineSystem() {
  const { companyId, user } = useUnifiedCompanyAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<AdvancedLateFineSettings | null>(null);
  const [calculationResults, setCalculationResults] = useState<LateFineCalculationResult[]>([]);

  // 📋 جلب إعدادات الغرامات المتقدمة
  const loadAdvancedSettings = useCallback(async () => {
    if (!companyId) return null;

    try {
      const { data, error } = await supabase
        .from('late_fine_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const defaultSettings: AdvancedLateFineSettings = {
        company_id: companyId,
        is_active: true,
        fine_per_day: 120,
        max_fine_amount: 3000,
        grace_period_days: 7,
        auto_apply: false,
        escalation_rules: {
          tier1_days: 30,
          tier1_multiplier: 1.0,
          tier2_days: 60,
          tier2_multiplier: 1.2,
          tier3_days: 90,
          tier3_multiplier: 1.5
        },
        waiver_rules: {
          max_waiver_amount: 1000,
          requires_approval: true,
          auto_waiver_conditions: [
            'first_time_late',
            'payment_within_24h',
            'vip_customer'
          ]
        },
        notification_rules: {
          notify_at_days: [1, 7, 15, 30],
          email_templates: {
            '1': 'تنبيه: استحقاق دفعة اليوم',
            '7': 'تحذير: تأخير 7 أيام - غرامة قادمة',
            '15': 'إنذار: غرامة تأخير مطبقة',
            '30': 'إنذار أخير: غرامة متزايدة'
          }
        }
      };

      const settings = data ? { ...defaultSettings, ...data } : defaultSettings;
      setCurrentSettings(settings);
      return settings;

    } catch (error: any) {
      toast.error(`خطأ في جلب إعدادات الغرامات: ${error.message}`);
      return null;
    }
  }, [companyId]);

  // ⚡ حاسبة الغرامات الفائقة الذكاء
  const calculateAdvancedLateFine = useCallback((
    dueDate: string,
    paymentDate: string | null,
    baseAmount: number,
    settings: AdvancedLateFineSettings
  ) => {
    const due = new Date(dueDate);
    const paid = paymentDate ? new Date(paymentDate) : new Date();
    const diffTime = paid.getTime() - due.getTime();
    const totalDaysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // فترة السماح
    const gracePeriod = settings.grace_period_days;
    const billableDays = Math.max(0, totalDaysOverdue - gracePeriod);
    
    if (billableDays <= 0) {
      return {
        grace_period: gracePeriod,
        billable_days: 0,
        daily_rate: 120,
        gross_fine: 0,
        tier_multiplier: 1.0,
        calculated_fine: 0,
        capped_fine: 0,
        final_fine: 0
      };
    }

    // حساب الغرامة الأساسية
    const dailyRate = 120;
    const grossFine = billableDays * dailyRate;
    
    // تطبيق قواعد التصعيد
    let tierMultiplier = 1.0;
    const { escalation_rules } = settings;
    
    if (billableDays >= escalation_rules.tier3_days) {
      tierMultiplier = escalation_rules.tier3_multiplier;
    } else if (billableDays >= escalation_rules.tier2_days) {
      tierMultiplier = escalation_rules.tier2_multiplier;
    } else if (billableDays >= escalation_rules.tier1_days) {
      tierMultiplier = escalation_rules.tier1_multiplier;
    }

    const calculatedFine = grossFine * tierMultiplier;
    const cappedFine = Math.min(calculatedFine, settings.max_fine_amount);
    
    return {
      grace_period: gracePeriod,
      billable_days: billableDays,
      daily_rate: dailyRate,
      gross_fine: grossFine,
      tier_multiplier: tierMultiplier,
      calculated_fine: calculatedFine,
      capped_fine: cappedFine,
      final_fine: cappedFine
    };
  }, []);

  // 🔍 تحليل العقود المتأخرة
  const analyzeOverdueContracts = useCallback(async (): Promise<LateFineCalculationResult[]> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    const settings = await loadAdvancedSettings();
    if (!settings || !settings.is_active) {
      throw new Error('إعدادات الغرامات غير مفعلة');
    }

    setIsProcessing(true);

    try {
      // جلب العقود النشطة مع تواريخ الاستحقاق
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          end_date,
          monthly_amount,
          contract_amount,
          status,
          customer:customers(
            id
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'overdue']);

      if (contractsError) throw contractsError;

      if (!contracts || contracts.length === 0) {
        toast.info('لا توجد عقود للتحليل');
        return [];
      }

      const results: LateFineCalculationResult[] = [];
      const today = new Date();

      for (const contract of contracts) {
        // التحقق من وجود مدفوعات حديثة
        const { data: recentPayments } = await supabase
          .from('payments')
          .select('payment_date, amount')
          .eq('contract_id', contract.id)
          .eq('payment_status', 'completed')
          .order('payment_date', { ascending: false })
          .limit(1);

        const lastPaymentDate = recentPayments?.[0]?.payment_date;
        const dueDate = contract.end_date;
        const baseAmount = contract.monthly_amount || contract.contract_amount;

        // حساب الغرامة
        const fineCalculation = calculateAdvancedLateFine(
          dueDate,
          lastPaymentDate,
          baseAmount,
          settings
        );

        if (fineCalculation.final_fine > 0) {
          const daysOverdue = Math.ceil(
            (today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          results.push({
            contract_id: contract.id,
            contract_number: contract.contract_number,
            customer_name: 'عميل غير محدد',
            due_date: dueDate,
            payment_date: lastPaymentDate,
            days_overdue: daysOverdue,
            base_amount: baseAmount,
            fine_calculation: fineCalculation,
            status: 'pending'
          });
        }
      }

      setCalculationResults(results);
      
      const totalAmount = results.reduce((sum, r) => sum + r.fine_calculation.final_fine, 0);
      
      toast.success(
        `تم تحليل ${contracts.length} عقد - وُجدت ${results.length} حالة تأخير بإجمالي غرامات ${totalAmount.toLocaleString()} ريال`
      );

      return results;

    } finally {
      setIsProcessing(false);
    }
  }, [companyId, loadAdvancedSettings, calculateAdvancedLateFine]);

  // 🎯 تطبيق الغرامات بشكل مجمع
  const applyBulkLateFines = useCallback(async (
    selectedResults: LateFineCalculationResult[]
  ): Promise<BulkLateFineOperation> => {
    
    setIsProcessing(true);
    
    const operation: BulkLateFineOperation = {
      total_contracts: selectedResults.length,
      processed: 0,
      successful: 0,
      failed: 0,
      total_fines_calculated: 0,
      total_amount: 0,
      errors: [],
      results: []
    };

    try {
      for (const result of selectedResults) {
        operation.processed++;
        
        try {
          // إنشاء فاتورة الغرامة
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              company_id: companyId,
              customer_id: result.contract_id, // سيتم تصحيحها لاحقاً
              contract_id: result.contract_id,
              invoice_number: `FINE-${new Date().getFullYear()}-${Date.now()}-${operation.processed}`,
              invoice_type: 'sale',
              invoice_date: new Date().toISOString().split('T')[0],
              due_date: new Date().toISOString().split('T')[0],
              subtotal: result.fine_calculation.final_fine,
              tax_amount: 0,
              total_amount: result.fine_calculation.final_fine,
              status: 'pending',
              notes: `غرامة تأخير - ${result.days_overdue} يوم × 120 ريال = ${result.fine_calculation.final_fine} ريال`,
              created_by: user?.id
            })
            .select()
            .single();

          if (invoiceError) throw invoiceError;

          // إنشاء عنصر الفاتورة
          await supabase
            .from('invoice_items')
            .insert({
              invoice_id: invoice.id,
              line_number: 1,
              item_description: `غرامة تأخير - العقد ${result.contract_number}`,
              quantity: result.fine_calculation.billable_days,
              unit_price: 120,
              line_total: result.fine_calculation.final_fine,
              tax_rate: 0,
              tax_amount: 0
            });

          // تحديث العقد بمعلومات الغرامة
          await supabase
            .from('contracts')
            .update({
              late_fine_amount: result.fine_calculation.final_fine,
              days_overdue: result.days_overdue,
              status: 'overdue'
            })
            .eq('id', result.contract_id);

          const updatedResult = {
            ...result,
            status: 'applied' as const,
            invoice_id: invoice.id
          };

          operation.results.push(updatedResult);
          operation.successful++;
          operation.total_fines_calculated++;
          operation.total_amount += result.fine_calculation.final_fine;

        } catch (error: any) {
          operation.failed++;
          operation.errors.push(`العقد ${result.contract_number}: ${error.message}`);
          
          const failedResult = {
            ...result,
            status: 'pending' as const
          };
          operation.results.push(failedResult);
        }
      }

      toast.success(
        `تم تطبيق ${operation.successful} غرامة بنجاح من أصل ${operation.total_contracts}`
      );

      if (operation.failed > 0) {
        toast.warning(`فشل في تطبيق ${operation.failed} غرامة`);
      }

      return operation;

    } finally {
      setIsProcessing(false);
    }
  }, [companyId, user]);

  // 🎭 إعفاء من الغرامة
  const waiveLateFine = useCallback(async (
    contractId: string,
    reason: string,
    amount?: number
  ) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          late_fine_amount: 0,
          late_fine_waived: true,
          late_fine_waiver_reason: reason,
          late_fine_waived_by: user?.id,
          late_fine_waived_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;

      toast.success('تم إعفاء العقد من الغرامة بنجاح');

    } catch (error: any) {
      toast.error(`خطأ في الإعفاء: ${error.message}`);
    }
  }, [user]);

  // 📊 إحصائيات الغرامات
  const getLateFineStatistics = useCallback(() => {
    if (!calculationResults.length) return null;

    const stats = {
      total_contracts: calculationResults.length,
      total_amount: calculationResults.reduce((sum, r) => sum + r.fine_calculation.final_fine, 0),
      average_days_overdue: calculationResults.reduce((sum, r) => sum + r.days_overdue, 0) / calculationResults.length,
      max_fine: Math.max(...calculationResults.map(r => r.fine_calculation.final_fine)),
      min_fine: Math.min(...calculationResults.map(r => r.fine_calculation.final_fine)),
      by_tier: {
        tier1: calculationResults.filter(r => r.days_overdue <= 30).length,
        tier2: calculationResults.filter(r => r.days_overdue > 30 && r.days_overdue <= 60).length,
        tier3: calculationResults.filter(r => r.days_overdue > 60).length
      }
    };

    return stats;
  }, [calculationResults]);

  return {
    isProcessing,
    currentSettings,
    calculationResults,
    loadAdvancedSettings,
    calculateAdvancedLateFine,
    analyzeOverdueContracts,
    applyBulkLateFines,
    waiveLateFine,
    getLateFineStatistics
  };
}
