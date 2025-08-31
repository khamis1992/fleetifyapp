import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomerFormData } from '@/types/customer';

export const useSimpleUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: CustomerFormData }) => {
      console.log('🔄 Starting simple customer update:', { customerId, data });
      
      // الحصول على البيانات الحالية للعميل للتأكد من company_id
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('company_id, first_name, last_name, company_name')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching existing customer:', fetchError);
        throw new Error('فشل في جلب بيانات العميل الحالية');
      }

      console.log('📋 Existing customer data:', existingCustomer);
      
      // تنظيف البيانات بحفظ القيم الفارغة كـ null
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([key, value]) => {
          // إزالة القيم undefined فقط
          if (value === undefined) return false;
          // احتفظ بجميع القيم الأخرى (null, empty strings, 0, etc.)
          return true;
        }).map(([key, value]) => {
          // تحويل القيم الفارغة إلى null للحقول الاختيارية
          if (typeof value === 'string' && value.trim() === '') {
            return [key, null];
          }
          return [key, value];
        })
      );

      // إزالة الحقول التي لا تخص جدول العملاء
      const { selectedCompanyId, ...customerData } = cleanData;

      // التأكد من الحفاظ على company_id الأصلي
      if (existingCustomer.company_id) {
        customerData.company_id = existingCustomer.company_id;
      }

      console.log('📝 Clean data for update (with preserved company_id):', customerData);
      console.log('🏢 Preserving company_id:', existingCustomer.company_id);

      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('❌ Update error:', error);
        throw error;
      }

      console.log('✅ Customer updated successfully:', updatedCustomer);
      return updatedCustomer;
    },
    onSuccess: (updatedCustomer) => {
      console.log('✅ Update successful, updated customer:', updatedCustomer);
      console.log('🏢 Company ID after update:', updatedCustomer.company_id);
      
      // التحقق من وجود company_id في النتيجة
      if (!updatedCustomer.company_id) {
        console.warn('⚠️ Warning: Updated customer missing company_id');
      }
      
      // إعادة تحميل البيانات بطرق متعددة لضمان التحديث
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['customer', updatedCustomer.id] });
      
      // تحديث cache مباشرة أيضاً
      queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer);
      
      // إعادة تحميل جميع استعلامات الشركات أيضاً للتأكد
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      toast.success('تم تحديث بيانات العميل بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ Error updating customer:', error);
      let errorMessage = 'حدث خطأ أثناء تحديث بيانات العميل';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  });
};