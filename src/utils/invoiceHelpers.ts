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
  // من بيانات العميل المرفقة
  if (invoice?.customer?.full_name) return invoice.customer.full_name;
  if (invoice?.customer?.company_name_ar) return invoice.customer.company_name_ar;
  
  // تجميع الاسم من الأجزاء
  const firstNameAr = invoice?.customer?.first_name_ar || '';
  const lastNameAr = invoice?.customer?.last_name_ar || '';
  if (firstNameAr || lastNameAr) return `${firstNameAr} ${lastNameAr}`.trim();
  
  const firstName = invoice?.customer?.first_name || '';
  const lastName = invoice?.customer?.last_name || '';
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();
  
  // من اسم العميل المباشر
  if (invoice?.customer_name) return invoice.customer_name;
  
  return 'عميل';
};

