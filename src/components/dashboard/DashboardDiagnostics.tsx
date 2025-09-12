import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * مكون تشخيصي لمراقبة تبديل لوحات التحكم
 * يساعد في تتبع المشاكل والتأكد من عمل النظام بشكل صحيح
 */
export const DashboardDiagnostics: React.FC = () => {
  const { user, loading } = useAuth();
  const renderCountRef = useRef(0);
  const lastBusinessTypeRef = useRef<string | null>(null);

  useEffect(() => {
    renderCountRef.current += 1;
    
    const currentBusinessType = user?.company?.business_type;
    const companyName = user?.company?.name;
    
    // تتبع تغييرات business_type
    if (lastBusinessTypeRef.current !== currentBusinessType) {
      console.log('🔄 [DASHBOARD_DIAGNOSTICS] Business type changed:', {
        from: lastBusinessTypeRef.current,
        to: currentBusinessType,
        company: companyName,
        renderCount: renderCountRef.current
      });
      
      // تحذير إذا تغير business_type بعد العرض الأول
      if (renderCountRef.current > 1 && lastBusinessTypeRef.current !== null) {
        console.warn('⚠️ [DASHBOARD_DIAGNOSTICS] RACE CONDITION DETECTED!', {
          previousType: lastBusinessTypeRef.current,
          newType: currentBusinessType,
          company: companyName,
          renderCount: renderCountRef.current
        });
      }
      
      lastBusinessTypeRef.current = currentBusinessType;
    }

    // معلومات مفصلة عن كل render
    console.log('📊 [DASHBOARD_DIAGNOSTICS] Render #' + renderCountRef.current, {
      loading,
      userId: user?.id,
      companyId: user?.company?.id,
      companyName,
      businessType: currentBusinessType,
      hasCompany: !!user?.company,
      timestamp: new Date().toISOString()
    });
  });

  // لا نعرض شيئاً - هذا مكون تشخيصي فقط
  return null;
};

export default DashboardDiagnostics;
