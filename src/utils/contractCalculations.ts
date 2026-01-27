/**
 * Contract Calculations Utility
 * دوال مساعدة لحساب القيم المالية للعقود
 * 
 * @description
 * يوفر هذا الملف دوال موحدة لحساب القيم المالية للعقود
 * لضمان الاتساق عبر جميع أجزاء التطبيق
 */

import { differenceInDays } from 'date-fns';

/**
 * حساب القيمة الإجمالية للعقد
 * يحسب القيمة بناءً على: الإيجار الشهري × عدد الأشهر
 * 
 * @param contract - بيانات العقد
 * @returns القيمة الإجمالية المحسوبة
 * 
 * @example
 * const total = calculateContractTotalAmount({
 *   monthly_amount: 1000,
 *   start_date: '2024-01-01',
 *   end_date: '2024-12-31'
 * });
 * // returns 12000
 */
export const calculateContractTotalAmount = (contract: {
  monthly_amount?: number;
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
}): number => {
  // إذا لم تكن التواريخ موجودة، استخدم القيمة المخزنة كـ fallback
  if (!contract.start_date || !contract.end_date) {
    return contract.contract_amount || 0;
  }

  // إذا لم يكن هناك إيجار شهري، استخدم القيمة المخزنة
  if (!contract.monthly_amount) {
    return contract.contract_amount || 0;
  }

  try {
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    
    // التحقق من صحة التواريخ
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return contract.contract_amount || 0;
    }

    const totalDays = differenceInDays(endDate, startDate);
    
    // إذا كانت المدة سالبة أو صفر، استخدم القيمة المخزنة
    if (totalDays <= 0) {
      return contract.contract_amount || 0;
    }

    const totalMonths = Math.ceil(totalDays / 30);
    
    return (contract.monthly_amount || 0) * totalMonths;
  } catch (error) {
    // في حالة حدوث أي خطأ، استخدم القيمة المخزنة
    console.error('Error calculating contract total amount:', error);
    return contract.contract_amount || 0;
  }
};

/**
 * حساب عدد الأشهر في العقد
 * 
 * @param contract - بيانات العقد
 * @returns عدد الأشهر
 */
export const calculateContractMonths = (contract: {
  start_date?: string;
  end_date?: string;
}): number => {
  if (!contract.start_date || !contract.end_date) {
    return 0;
  }

  try {
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 0;
    }

    const totalDays = differenceInDays(endDate, startDate);
    
    if (totalDays <= 0) {
      return 0;
    }

    return Math.ceil(totalDays / 30);
  } catch (error) {
    console.error('Error calculating contract months:', error);
    return 0;
  }
};

/**
 * حساب المبلغ المتبقي في العقد
 * 
 * @param contract - بيانات العقد
 * @returns المبلغ المتبقي
 */
export const calculateContractBalance = (contract: {
  monthly_amount?: number;
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
  total_paid?: number;
}): number => {
  const totalAmount = calculateContractTotalAmount(contract);
  const totalPaid = contract.total_paid || 0;
  
  return Math.max(0, totalAmount - totalPaid);
};
