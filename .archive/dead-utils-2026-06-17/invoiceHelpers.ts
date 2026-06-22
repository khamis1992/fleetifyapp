/**
 * Invoice Helper Functions
 * دوال مساعدة مركزية للفواتير وسندات القبض
 */

/**
 * استخراج رقم المركبة من بيانات الفاتورة أو العقد
 * يبحث في جميع المسارات الممكنة لإيجاد رقم المركبة
 */
export const extractVehicleNumber = (invoice: any, contract?: any): string => {
  // أولاً: من الفاتورة مباشرة
  if (invoice?.vehicle_number) return invoice.vehicle_number;
  
  // ثانياً: من بيانات المركبة المرفقة بالفاتورة
  if (invoice?.vehicle?.plate_number) return invoice.vehicle.plate_number;
  if (invoice?.vehicle?.license_plate) return invoice.vehicle.license_plate;
  
  // ثالثاً: من العقد المرفق بالفاتورة
  if (invoice?.contract?.vehicle_number) return invoice.contract.vehicle_number;
  if (invoice?.contract?.vehicle?.plate_number) return invoice.contract.vehicle?.plate_number;
  if (invoice?.contracts?.vehicle_number) return invoice.contracts.vehicle_number;
  if (invoice?.contracts?.vehicles?.plate_number) return invoice.contracts.vehicles.plate_number;
  
  // رابعاً: من العقد الممرر كمعامل منفصل
  if (contract?.vehicle_number) return contract.vehicle_number;
  if (contract?.vehicle?.plate_number) return contract.vehicle.plate_number;
  if (contract?.vehicles?.plate_number) return contract.vehicles.plate_number;
  
  return '';
};

/**
 * استخراج اسم العميل من بيانات الفاتورة
 */
export const extractCustomerName = (invoice: any): string => {
  // من بيانات العميل المرفقة (customer أو customers من Supabase join)
  const customerData = invoice?.customer || invoice?.customers;
  
  if (customerData?.full_name) return customerData.full_name;
  if (customerData?.company_name_ar) return customerData.company_name_ar;
  if (customerData?.company_name) return customerData.company_name;
  
  // تجميع الاسم من الأجزاء
  const firstNameAr = customerData?.first_name_ar || '';
  const lastNameAr = customerData?.last_name_ar || '';
  if (firstNameAr || lastNameAr) return `${firstNameAr} ${lastNameAr}`.trim();
  
  const firstName = customerData?.first_name || '';
  const lastName = customerData?.last_name || '';
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();
  
  // من اسم العميل المباشر
  if (invoice?.customer_name) return invoice.customer_name;
  
  return 'عميل';
};

export type InvoicePaymentStatus = 'unpaid' | 'partial' | 'paid';

/**
 * حساب حالة الفاتورة بعد إلغاء/حذف دفعة (عكس مبلغ مدفوع سابقاً)
 *
 * ملاحظة: النظام يستخدم قيم payment_status التالية: unpaid | partial | paid
 */
export const calculateInvoiceTotalsAfterPaymentReversal = ({
  totalAmount,
  currentPaidAmount,
  reversedAmount,
}: {
  totalAmount: number;
  currentPaidAmount: number;
  reversedAmount: number;
}): { paidAmount: number; balanceDue: number; paymentStatus: InvoicePaymentStatus } => {
  const safeTotal = Number(totalAmount) || 0;
  const safeCurrentPaid = Number(currentPaidAmount) || 0;
  const safeReversed = Number(reversedAmount) || 0;

  const paidAmount = Math.max(0, safeCurrentPaid - safeReversed);
  const balanceDue = Math.max(0, safeTotal - paidAmount);

  let paymentStatus: InvoicePaymentStatus = 'unpaid';
  if (paidAmount >= safeTotal && safeTotal > 0) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  }

  return { paidAmount, balanceDue, paymentStatus };
};

