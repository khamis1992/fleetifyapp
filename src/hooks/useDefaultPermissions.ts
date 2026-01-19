import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useDefaultPermissions = () => {
  const { user } = useAuth();
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  useEffect(() => {
    const ensureDefaultPermissions = async () => {
      if (!user?.id || !companyId) return;

      try {
        console.log('🔑 [DEFAULT_PERMISSIONS] Checking default permissions for:', {
          userId: user.id,
          companyId,
          hasCompanyAdminAccess
        });

        // التحقق من وجود صلاحيات للمستخدم
        const { data: existingPermissions } = await supabase
          .from('user_permissions')
          .select('permission_id')
          .eq('user_id', user.id);

        // إذا كان المستخدم مدير شركة ولا توجد صلاحيات، أنشئ الصلاحيات الأساسية
        if (hasCompanyAdminAccess && (!existingPermissions || existingPermissions.length === 0)) {
          console.log('🔑 [DEFAULT_PERMISSIONS] Creating default admin permissions...');
          
          // قائمة الصلاحيات الأساسية لمدير الشركة
          const adminPermissions = [
            'finance.view',
            'finance.accounts.view',
            'finance.accounts.write',
            'finance.payments.view',
            'finance.payments.write',
            'finance.ledger.view',
            'finance.ledger.write',
            'finance.reports.view',
            'finance.treasury.view',
            'finance.cost_centers.view'
          ];

          // إنشاء الصلاحيات مباشرة (تجاوز مؤقت لحين إصلاح جدول الصلاحيات)
          console.log('✅ [DEFAULT_PERMISSIONS] Skipping permission creation (table needs setup)');

          // سيتم تفعيل هذا عند إعداد جدول الصلاحيات
        }

        // للمستخدمين العاديين، أعط صلاحيات المشاهدة الأساسية
        if (!hasCompanyAdminAccess && (!existingPermissions || existingPermissions.length === 0)) {
          console.log('🔑 [DEFAULT_PERMISSIONS] Creating default user permissions...');
          
          const basicPermissions = [
            'finance.view',
            'finance.accounts.view',
            'finance.payments.view',
            'finance.reports.view'
          ];

          // سيتم تفعيل هذا عند إعداد جدول الصلاحيات
        }

      } catch (error) {
        console.error('❌ [DEFAULT_PERMISSIONS] Error:', error);
      }
    };

    // تأخير قصير للتأكد من تحميل جميع البيانات
    const timer = setTimeout(ensureDefaultPermissions, 1000);
    
    return () => clearTimeout(timer);
  }, [user?.id, companyId, hasCompanyAdminAccess, toast]);

  return {
    // يمكن إضافة وظائف أخرى هنا حسب الحاجة
  };
};