
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export const AccountLinkingMigration: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    hasColumns: boolean;
    needsMigration: boolean;
    accountsCount: number;
  } | null>(null);
  
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();

  // فحص حالة قاعدة البيانات
  const checkDatabaseStatus = async () => {
    if (!companyId) return;

    setIsChecking(true);
    try {
      // فحص وجود الأعمدة الجديدة - نتحقق من الأعمدة الموجودة فعلاً
      const { data: sampleAccount, error: sampleError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', companyId)
        .limit(1)
        .single();

      const hasColumns = !sampleError && sampleAccount !== null;

      // عد الحسابات
      const { count: accountsCount } = await supabase
        .from('chart_of_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      setMigrationStatus({
        hasColumns,
        needsMigration: false, // تعطيل التحديث حتى يتم إضافة الأعمدة في قاعدة البيانات
        accountsCount: accountsCount || 0
      });

      if (hasColumns) {
        toast({
          title: "قاعدة البيانات جاهزة",
          description: "تم العثور على الحسابات في الشركة",
        });
      } else {
        toast({
          title: "لا توجد حسابات",
          description: "لم يتم العثور على حسابات في الشركة",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      toast({
        title: "خطأ في الفحص",
        description: `فشل في فحص قاعدة البيانات: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  // تطبيق التحديث - معطل مؤقتاً
  const applyMigration = async () => {
    toast({
      title: "التحديث غير متاح",
      description: "يجب إضافة أعمدة ربط الحسابات إلى قاعدة البيانات أولاً",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            تحديث قاعدة البيانات - ربط الحسابات
          </CardTitle>
          <CardDescription>
            فحص وتحديث قاعدة البيانات لدعم ربط الحسابات بالعملاء والموردين والموظفين
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* معلومات التحديث */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              هذا التحديث سيضيف أعمدة جديدة لقاعدة البيانات لتمكين ربط الحسابات:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>can_link_customers</code> - إمكانية ربط الحساب بالعملاء</li>
                <li><code>can_link_vendors</code> - إمكانية ربط الحساب بالموردين</li>
                <li><code>can_link_employees</code> - إمكانية ربط الحساب بالموظفين</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* حالة قاعدة البيانات */}
          {migrationStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{migrationStatus.accountsCount}</p>
                      <p className="text-sm text-gray-600">إجمالي الحسابات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {migrationStatus.hasColumns ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {migrationStatus.hasColumns ? 'جاهزة' : 'تحتاج إعداد'}
                      </p>
                      <p className="text-sm text-gray-600">حالة قاعدة البيانات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={migrationStatus.needsMigration ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {migrationStatus.needsMigration ? 'مطلوب' : 'غير متاح'}
                    </Badge>
                    <div>
                      <p className="text-sm text-gray-600">التحديث</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* الأزرار */}
          <div className="flex gap-3">
            <Button 
              onClick={checkDatabaseStatus} 
              disabled={isChecking}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              فحص قاعدة البيانات
            </Button>
            
            <Button 
              onClick={applyMigration} 
              disabled={true}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              التحديث غير متاح
            </Button>
          </div>

          {/* تحذير */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>ملاحظة:</strong> يجب إضافة أعمدة ربط الحسابات إلى جدول <code>chart_of_accounts</code> 
              في قاعدة البيانات أولاً قبل استخدام هذه الميزة.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
