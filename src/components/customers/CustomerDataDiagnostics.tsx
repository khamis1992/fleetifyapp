import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Database, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CustomerDataDiagnosticsProps {
  currentCustomersCount: number;
}

export const CustomerDataDiagnostics: React.FC<CustomerDataDiagnosticsProps> = ({
  currentCustomersCount
}) => {
  const { user } = useAuth();
  const { companyId, filter, isBrowsingMode, browsedCompany, hasGlobalAccess } = useUnifiedCompanyAccess();
  const { exitBrowseMode } = useCompanyContext();
  const queryClient = useQueryClient();

  // Query to get actual database count for current company
  const { data: dbCount, refetch: refetchDbCount } = useQuery({
    queryKey: ['customers-db-count', companyId, filter.company_id],
    queryFn: async () => {
      console.log('🔢 [DB_COUNT] Fetching database count for company:', companyId);
      
      let query = supabase
        .from('customers')
        .select('id', { count: 'exact', head: true });

      if (filter.company_id) {
        query = query.eq('company_id', filter.company_id);
      } else if (companyId && !hasGlobalAccess) {
        query = query.eq('company_id', companyId);
      }

      query = query.eq('is_active', true);

      const { count, error } = await query;

      if (error) {
        console.error('❌ [DB_COUNT] Error:', error);
        throw error;
      }

      console.log('✅ [DB_COUNT] Database count:', count);
      return count || 0;
    },
    enabled: !!(companyId || hasGlobalAccess)
  });

  // Query to get count for user's actual company (not browsed)
  const { data: userCompanyCount } = useQuery({
    queryKey: ['customers-user-company-count', user?.company?.id],
    queryFn: async () => {
      const userCompanyId = user?.company?.id;
      if (!userCompanyId) return 0;

      console.log('🔢 [USER_COMPANY_COUNT] Fetching count for user company:', userCompanyId);
      
      const { count, error } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userCompanyId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ [USER_COMPANY_COUNT] Error:', error);
        return 0;
      }

      console.log('✅ [USER_COMPANY_COUNT] User company count:', count);
      return count || 0;
    },
    enabled: !!user?.company?.id
  });

  const handleClearCache = () => {
    console.log('🧹 [CACHE] Clearing customers cache');
    queryClient.removeQueries({ queryKey: ['customers'] });
    queryClient.refetchQueries({ queryKey: ['customers'] });
    refetchDbCount();
  };

  const handleExitBrowseMode = () => {
    console.log('🚪 [BROWSE] Exiting browse mode');
    exitBrowseMode();
    handleClearCache();
  };

  const isDiscrepancy = currentCustomersCount !== dbCount;

  return (
    <Card className={`border-2 ${isDiscrepancy ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" />
          تشخيص بيانات العملاء
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* المقارنة */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{currentCustomersCount}</div>
            <div className="text-sm text-blue-700">عدد العملاء في الواجهة</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{dbCount ?? '...'}</div>
            <div className="text-sm text-green-700">عدد العملاء في قاعدة البيانات</div>
          </div>
        </div>

        {/* التفاصيل */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>الشركة النشطة:</span>
            <Badge variant={isBrowsingMode ? "secondary" : "default"}>
              {isBrowsingMode ? browsedCompany?.name : user?.company?.name}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span>وضع التصفح:</span>
            <Badge variant={isBrowsingMode ? "destructive" : "default"}>
              {isBrowsingMode ? 'نشط' : 'معطل'}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span>معرف الشركة المستخدم:</span>
            <code className="bg-muted px-2 py-1 rounded text-xs">
              {filter.company_id || companyId || 'غير محدد'}
            </code>
          </div>

          <div className="flex justify-between">
            <span>صلاحيات عامة:</span>
            <Badge variant={hasGlobalAccess ? "secondary" : "outline"}>
              {hasGlobalAccess ? 'نعم' : 'لا'}
            </Badge>
          </div>

          {user?.company?.id && (
            <div className="flex justify-between">
              <span>عملاء شركتك الفعلية:</span>
              <span className="font-mono">{userCompanyCount ?? '...'}</span>
            </div>
          )}
        </div>

        {/* التحذيرات */}
        {isDiscrepancy && (
          <div className="p-3 bg-orange-100 border border-orange-200 rounded-md">
            <p className="text-orange-800 text-sm font-medium">
              ⚠️ يوجد تضارب في عدد العملاء! هذا قد يكون بسبب:
            </p>
            <ul className="text-orange-700 text-xs mt-1 list-disc list-inside">
              <li>مشاكل في الكاش (Cache)</li>
              <li>عرض بيانات من شركة خاطئة</li>
              <li>مشاكل في منطق التصفية</li>
            </ul>
          </div>
        )}

        {/* الأزرار */}
        <div className="flex gap-2">
          <Button
            onClick={handleClearCache}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            مسح الكاش
          </Button>
          
          {isBrowsingMode && (
            <Button
              onClick={handleExitBrowseMode}
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              خروج من وضع التصفح
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};