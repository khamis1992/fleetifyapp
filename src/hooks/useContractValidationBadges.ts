import { useMemo } from 'react';

export interface ContractValidationIssue {
  type: 'error' | 'warning';
  message: string;
  field: string;
  icon?: string;
}

/**
 * Hook للتحقق من البيانات الناقصة أو الخاطئة في العقد
 * وإرجاع قائمة بالمشاكل التي تحتاج معالجة
 */
export function useContractValidationBadges(contract: any): ContractValidationIssue[] {
  return useMemo(() => {
    const issues: ContractValidationIssue[] = [];

    if (!contract) return issues;

    // 1. التحقق من تاريخ الانتهاء
    if (!contract.end_date) {
      issues.push({
        type: 'error',
        message: 'تاريخ الانتهاء مفقود',
        field: 'end_date',
        icon: '📅'
      });
    }

    // 2. التحقق من تاريخ البداية
    if (!contract.start_date) {
      issues.push({
        type: 'error',
        message: 'تاريخ البداية مفقود',
        field: 'start_date',
        icon: '📅'
      });
    }

    // 3. التحقق من العميل
    if (!contract.customer_id) {
      issues.push({
        type: 'error',
        message: 'العميل غير محدد',
        field: 'customer_id',
        icon: '👤'
      });
    }

    // 4. التحقق من بيانات العميل
    if (contract.customers) {
      const customer = contract.customers;
      
      // التحقق من رقم الجوال
      if (!customer.phone || customer.phone.trim() === '') {
        issues.push({
          type: 'warning',
          message: 'رقم الجوال مفقود',
          field: 'customer_phone',
          icon: '📞'
        });
      } else if (customer.phone === '0000' || customer.phone === '00000000' || /^0+$/.test(customer.phone)) {
        issues.push({
          type: 'error',
          message: 'رقم جوال غير صحيح',
          field: 'customer_phone',
          icon: '📞'
        });
      } else if (customer.phone.length < 8) {
        issues.push({
          type: 'warning',
          message: 'رقم جوال قصير جداً',
          field: 'customer_phone',
          icon: '📞'
        });
      }

      // التحقق من اسم العميل
      if (customer.customer_type === 'individual') {
        if (!customer.first_name_ar || customer.first_name_ar.trim() === '') {
          issues.push({
            type: 'warning',
            message: 'اسم العميل مفقود',
            field: 'customer_name',
            icon: '👤'
          });
        }
      } else if (customer.customer_type === 'company') {
        if (!customer.company_name_ar || customer.company_name_ar.trim() === '') {
          issues.push({
            type: 'warning',
            message: 'اسم الشركة مفقود',
            field: 'company_name',
            icon: '🏢'
          });
        }
      }

      // التحقق من الهوية/السجل التجاري
      if (!customer.civil_id && !customer.commercial_registration) {
        issues.push({
          type: 'warning',
          message: 'رقم الهوية/السجل التجاري مفقود',
          field: 'customer_id_number',
          icon: '🆔'
        });
      }
    }

    // 5. التحقق من المركبة
    if (!contract.vehicle_id && !contract.vehicle) {
      issues.push({
        type: 'warning',
        message: 'المركبة غير محددة',
        field: 'vehicle_id',
        icon: '🚗'
      });
    }

    // 6. التحقق من قيمة العقد
    if (!contract.contract_amount || contract.contract_amount === 0) {
      issues.push({
        type: 'error',
        message: 'قيمة العقد مفقودة أو صفر',
        field: 'contract_amount',
        icon: '💰'
      });
    }

    // 7. التحقق من القيمة الشهرية
    if (!contract.monthly_amount || contract.monthly_amount === 0) {
      issues.push({
        type: 'warning',
        message: 'القيمة الشهرية مفقودة',
        field: 'monthly_amount',
        icon: '💵'
      });
    }

    // 8. التحقق من نوع العقد
    if (!contract.contract_type) {
      issues.push({
        type: 'error',
        message: 'نوع العقد غير محدد',
        field: 'contract_type',
        icon: '📝'
      });
    }

    // 9. التحقق من صحة التواريخ (البداية أقدم من النهاية)
    if (contract.start_date && contract.end_date) {
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      
      if (startDate >= endDate) {
        issues.push({
          type: 'error',
          message: 'تاريخ البداية يجب أن يكون أقدم من تاريخ الانتهاء',
          field: 'dates',
          icon: '⚠️'
        });
      }
    }

    // 10. التحقق من انتهاء العقد
    if (contract.end_date && contract.status === 'active') {
      const endDate = new Date(contract.end_date);
      const today = new Date();
      
      if (endDate < today) {
        issues.push({
          type: 'warning',
          message: 'العقد منتهي ولكن لا يزال نشط',
          field: 'status',
          icon: '⏰'
        });
      }
    }

    // 11. التحقق من رقم العقد
    if (!contract.contract_number || contract.contract_number.trim() === '') {
      issues.push({
        type: 'error',
        message: 'رقم العقد مفقود',
        field: 'contract_number',
        icon: '🔢'
      });
    }

    return issues;
  }, [contract]);
}

/**
 * Hook لاستخراج فقط الأخطاء الحرجة (errors)
 */
export function useContractErrors(contract: any): ContractValidationIssue[] {
  const allIssues = useContractValidationBadges(contract);
  return useMemo(() => allIssues.filter(issue => issue.type === 'error'), [allIssues]);
}

/**
 * Hook لاستخراج فقط التحذيرات (warnings)
 */
export function useContractWarnings(contract: any): ContractValidationIssue[] {
  const allIssues = useContractValidationBadges(contract);
  return useMemo(() => allIssues.filter(issue => issue.type === 'warning'), [allIssues]);
}

/**
 * Hook للحصول على عدد المشاكل
 */
export function useContractIssuesCount(contract: any): { errors: number; warnings: number; total: number } {
  const allIssues = useContractValidationBadges(contract);
  
  return useMemo(() => {
    const errors = allIssues.filter(issue => issue.type === 'error').length;
    const warnings = allIssues.filter(issue => issue.type === 'warning').length;
    
    return {
      errors,
      warnings,
      total: errors + warnings
    };
  }, [allIssues]);
}

