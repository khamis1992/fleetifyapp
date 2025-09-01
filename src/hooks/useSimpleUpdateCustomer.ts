import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomerFormData } from '@/types/customer';

export const useSimpleUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: CustomerFormData }) => {
      console.log('🔄 [CUSTOMER_UPDATE] Starting customer update:', { customerId, data });
      
      // الحصول على البيانات الحالية للعميل للمقارنة
      const { data: currentCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        console.error('❌ [CUSTOMER_UPDATE] Failed to fetch current customer data:', fetchError);
        throw new Error('فشل في الحصول على بيانات العميل الحالية');
      }

      console.log('📄 [CUSTOMER_UPDATE] Current customer data:', currentCustomer);
      
      // تنظيف البيانات مع الحفاظ على company_id
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
      
      // التأكد من الحفاظ على company_id من البيانات الحالية
      if (currentCustomer.company_id) {
        customerData.company_id = currentCustomer.company_id;
      }

      console.log('📝 [CUSTOMER_UPDATE] Clean data for update:', customerData);
      console.log('🔒 [CUSTOMER_UPDATE] Ensuring company_id preservation:', {
        originalCompanyId: currentCustomer.company_id,
        finalCompanyId: customerData.company_id
      });

      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('❌ [CUSTOMER_UPDATE] Update error:', error);
        console.error('❌ [CUSTOMER_UPDATE] Failed data:', customerData);
        throw error;
      }

      console.log('✅ [CUSTOMER_UPDATE] Customer updated successfully:', updatedCustomer);
      
      // التحقق من أن company_id لم يتغير
      if (updatedCustomer.company_id !== currentCustomer.company_id) {
        console.warn('⚠️ [CUSTOMER_UPDATE] Company ID changed unexpectedly:', {
          before: currentCustomer.company_id,
          after: updatedCustomer.company_id
        });
      }
      
      return updatedCustomer;
    },
    onSuccess: (updatedCustomer) => {
      console.log('✅ [CUSTOMER_UPDATE] Update successful, updated customer:', updatedCustomer);
      
      // إعادة تحميل البيانات بطرق متعددة لضمان التحديث الشامل
      console.log('🔄 [CUSTOMER_UPDATE] Invalidating queries...');
      
      // إلغاء صحة جميع استعلامات العملاء
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['customer', updatedCustomer.id] });
      
      // إلغاء صحة استعلامات الشركات أيضاً للتأكد من التحديث
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      
      // تحديث cache مباشرة
      queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer);
      
      // إعادة تحميل جميع البيانات ذات الصلة
      queryClient.refetchQueries({ queryKey: ['customers'] });
      
      console.log('✅ [CUSTOMER_UPDATE] Cache invalidation completed');
      toast.success('تم تحديث بيانات العميل بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ [CUSTOMER_UPDATE] Error updating customer:', error);
      
      let errorMessage = 'حدث خطأ أثناء تحديث بيانات العميل';
      
      // معالجة أخطاء محددة
      if (error?.message) {
        if (error.message.includes('company_id')) {
          errorMessage = 'خطأ في ربط العميل بالشركة. يرجى المحاولة مرة أخرى.';
        } else if (error.message.includes('RLS')) {
          errorMessage = 'ليس لديك صلاحية لتحديث هذا العميل.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error('❌ [CUSTOMER_UPDATE] Final error message:', errorMessage);
      toast.error(errorMessage);
    }
  });
};