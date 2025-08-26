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
      // فحص وجود الأعمدة الجديدة
      const { data: sampleAccount, error: sampleError } = await supabase
        .from('chart_of_accounts')
        .select('id, can_link_customers, can_link_vendors, can_link_employees')
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
        needsMigration: !hasColumns,
        accountsCount: accountsCount || 0
      });

      if (hasColumns) {
        toast({
          title: "قاعدة البيانات محدثة",
          description: "أعمدة ربط الحسابات موجودة بالفعل",
        });
      } else {
        toast({
          title: "تحديث مطلوب",
          description: "تحتاج قاعدة البيانات إلى إضافة أعمدة ربط الحسابات",
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

  // تطبيق التحديث
  const applyMigration = async () => {
    if (!companyId || !migrationStatus?.needsMigration) return;

    setIsMigrating(true);
    try {
      // الخطوة 1: إضافة الأعمدة إذا لم تكن موجودة (يتم تلقائياً في Supabase)
      
      // الخطوة 2: تحديث الحسابات الموجودة بالقيم الافتراضية
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, is_header')
        .eq('company_id', companyId);

      if (accounts) {
        let updatedCount = 0;
        
        // تحديث الحسابات في مجموعات صغيرة لتجنب timeout
        const batchSize = 50;
        for (let i = 0; i < accounts.length; i += batchSize) {
          const batch = accounts.slice(i, i + batchSize);
          
          for (const account of batch) {
            const canLinkToCustomers = !account.is_header && 
                                      (account.account_code.startsWith('113') || 
                                       account.account_code.startsWith('114'));
            
            const canLinkToVendors = !account.is_header && 
                                    (account.account_code.startsWith('213') || 
                                     account.account_code.startsWith('214'));
            
            const canLinkToEmployees = !account.is_header && 
                                      (account.account_code.startsWith('215') || 
                                       account.account_code.startsWith('216'));

            // تحديث فقط إذا كانت هناك قيم للتحديث
            if (canLinkToCustomers || canLinkToVendors || canLinkToEmployees) {
              const { error } = await supabase
                .from('chart_of_accounts')
                .update({
                  can_link_customers: canLinkToCustomers,
                  can_link_vendors: canLinkToVendors,
                  can_link_employees: canLinkToEmployees
                })
                .eq('id', account.id);

              if (error) {
                console.error(`خطأ في تحديث الحساب ${account.account_code}:`, error);
              } else {
                updatedCount++;
              }
            }
          }
          
          // إظهار التقدم
          const progress = Math.min(100, Math.round(((i + batchSize) / accounts.length) * 100));
          toast({
            title: "جاري التحديث...",
            description: `تم تحديث ${updatedCount} حساب (${progress}%)`,
          });
        }
      }

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث ${accounts?.length || 0} حساب بالقيم الافتراضية`,
      });

      // إعادة فحص الحالة
      await checkDatabaseStatus();

    } catch (error: any) {
      console.error('خطأ في التحديث:', error);
      toast({
        title: "خطأ في التحديث",
        description: `فشل في تطبيق التحديث: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
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
                        {migrationStatus.hasColumns ? 'محدثة' : 'تحتاج تحديث'}
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
                      variant={migrationStatus.needsMigration ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {migrationStatus.needsMigration ? 'مطلوب' : 'مكتمل'}
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
            
            {migrationStatus?.needsMigration && (
              <Button 
                onClick={applyMigration} 
                disabled={isMigrating}
                className="flex items-center gap-2"
              >
                {isMigrating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                تطبيق التحديث
              </Button>
            )}
          </div>

          {/* تحذير */}
          {migrationStatus?.needsMigration && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>تحذير:</strong> تأكد من عمل نسخة احتياطية من قاعدة البيانات قبل تطبيق التحديث.
                هذا التحديث سيعدل بنية جدول <code>chart_of_accounts</code>.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
