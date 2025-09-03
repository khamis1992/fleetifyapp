import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useCallback } from 'react';

/**
 * Hook مخصص لإدارة كاش العملاء بشكل شامل
 * يضمن تحديث جميع الاستعلامات المتعلقة بالعملاء
 */
export const useCustomerCacheManager = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  /**
   * تحديث شامل لكاش العملاء بعد إنشاء عميل جديد
   */
  const refreshCustomerCache = useCallback((newCustomer?: any) => {
    console.log('🔄 [CACHE_MANAGER] Starting comprehensive customer cache refresh');

    // جميع أنماط query keys المحتملة للعملاء
    const queryPatterns = [
      ['customers'],
      ['enhanced-customers'],
      ['customers', companyId],
      ['enhanced-customers', companyId]
    ];

    // إبطال جميع الاستعلامات المتعلقة بالعملاء
    queryPatterns.forEach(pattern => {
      queryClient.invalidateQueries({ queryKey: pattern });
    });

    // إذا كان هناك عميل جديد، أضفه للكاش مباشرة
    if (newCustomer) {
      queryPatterns.forEach(pattern => {
        queryClient.setQueriesData({ queryKey: pattern }, (oldData: any) => {
          if (!oldData) return [newCustomer];
          
          // تحقق من عدم وجود العميل مسبقاً لتجنب التكرار
          const exists = oldData.some((c: any) => c.id === newCustomer.id);
          if (exists) return oldData;
          
          // أضف العميل الجديد في بداية القائمة
          return [newCustomer, ...oldData];
        });
      });

      // تحديث كاش العميل الفردي
      queryClient.setQueryData(['customer', newCustomer.id], newCustomer);
    }

    // إعادة جلب البيانات للتأكد من التطابق
    setTimeout(() => {
      queryPatterns.forEach(pattern => {
        queryClient.refetchQueries({ 
          queryKey: pattern,
          type: 'active'
        });
      });
    }, 100);

    console.log('✅ [CACHE_MANAGER] Customer cache refresh completed');
  }, [queryClient, companyId]);

  /**
   * تحديث عميل موجود في الكاش
   */
  const updateCustomerInCache = useCallback((updatedCustomer: any) => {
    console.log('📝 [CACHE_MANAGER] Updating customer in cache:', updatedCustomer.id);

    const queryPatterns = [
      ['customers'],
      ['enhanced-customers'],
      ['customers', companyId],
      ['enhanced-customers', companyId]
    ];

    queryPatterns.forEach(pattern => {
      queryClient.setQueriesData({ queryKey: pattern }, (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.map((customer: any) => 
          customer.id === updatedCustomer.id ? { ...customer, ...updatedCustomer } : customer
        );
      });
    });

    // تحديث كاش العميل الفردي
    queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer);
  }, [queryClient, companyId]);

  /**
   * حذف عميل من الكاش
   */
  const removeCustomerFromCache = useCallback((customerId: string) => {
    console.log('🗑️ [CACHE_MANAGER] Removing customer from cache:', customerId);

    const queryPatterns = [
      ['customers'],
      ['enhanced-customers'],
      ['customers', companyId],
      ['enhanced-customers', companyId]
    ];

    queryPatterns.forEach(pattern => {
      queryClient.setQueriesData({ queryKey: pattern }, (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.filter((customer: any) => customer.id !== customerId);
      });
    });

    // حذف كاش العميل الفردي
    queryClient.removeQueries({ queryKey: ['customer', customerId] });
  }, [queryClient, companyId]);

  /**
   * إعادة تحميل شاملة لجميع بيانات العملاء
   */
  const forceRefreshAllCustomers = useCallback(() => {
    console.log('🔄 [CACHE_MANAGER] Force refreshing all customer data');

    const queryPatterns = [
      ['customers'],
      ['enhanced-customers'],
      ['customers', companyId],
      ['enhanced-customers', companyId]
    ];

    // إبطال وإعادة جلب جميع الاستعلامات
    queryPatterns.forEach(pattern => {
      queryClient.invalidateQueries({ queryKey: pattern });
      queryClient.refetchQueries({ 
        queryKey: pattern,
        type: 'active'
      });
    });
  }, [queryClient, companyId]);

  return {
    refreshCustomerCache,
    updateCustomerInCache,
    removeCustomerFromCache,
    forceRefreshAllCustomers
  };
};
