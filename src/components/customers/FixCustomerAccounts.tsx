import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Users, Wrench } from 'lucide-react';
import { useAutoCreateCustomerAccounts } from '@/hooks/useEnhancedCustomerAccounts';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface Customer {
  id: string;
  customer_code: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  customer_type: string | null;
}

export const FixCustomerAccounts: React.FC = () => {
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const autoCreateMutation = useAutoCreateCustomerAccounts();
  
  const [customersWithoutAccounts, setCustomersWithoutAccounts] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({ 
    success: 0, 
    failed: 0, 
    errors: [] 
  });

  const fetchCustomersWithoutAccounts = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_code,
          first_name,
          last_name,
          company_name,
          customer_type
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .not('id', 'in', `(
          SELECT DISTINCT customer_id 
          FROM customer_accounts 
          WHERE is_active = true
        )`);

      if (error) throw error;
      setCustomersWithoutAccounts(data || []);
    } catch (error) {
      console.error('Error fetching customers without accounts:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب العملاء بدون حسابات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fixAccountsForAllCustomers = async () => {
    if (!customersWithoutAccounts.length) return;
    
    setFixing(true);
    setProgress(0);
    const newResults = { success: 0, failed: 0, errors: [] as string[] };
    
    for (let i = 0; i < customersWithoutAccounts.length; i++) {
      const customer = customersWithoutAccounts[i];
      const customerName = getCustomerDisplayName(customer);
      
      try {
        console.log(`🔧 Fixing accounts for customer: ${customerName}`);
        
        const result = await autoCreateMutation.mutateAsync({
          customerId: customer.id,
          companyId: companyId!
        });
        
        const typedResult = result as any;
        if (typedResult?.success && typedResult?.created_accounts > 0) {
          newResults.success++;
          console.log(`✅ Successfully created ${typedResult.created_accounts} accounts for ${customerName}`);
        } else {
          newResults.failed++;
          const errorMsg = `${customerName}: ${typedResult?.error || 'فشل في إنشاء الحسابات'}`;
          newResults.errors.push(errorMsg);
          console.error(`❌ Failed to create accounts for ${customerName}:`, typedResult?.error);
        }
      } catch (error: unknown) {
        newResults.failed++;
        const errorMsg = `${customerName}: ${error instanceof Error ? error.message : 'خطأ غير متوقع'}`;
        newResults.errors.push(errorMsg);
        console.error(`💥 Error fixing accounts for ${customerName}:`, error);
      }
      
      setProgress(((i + 1) / customersWithoutAccounts.length) * 100);
      setResults({ ...newResults });
    }
    
    setFixing(false);
    
    // إعادة جلب القائمة بعد الإصلاح
    await fetchCustomersWithoutAccounts();
    
    // إظهار رسالة النتيجة
    if (newResults.success > 0) {
      toast({
        title: "تم إصلاح الحسابات",
        description: `تم إنشاء حسابات لـ ${newResults.success} عميل بنجاح`,
      });
    }
    
    if (newResults.failed > 0) {
      toast({
        title: "تحذير",
        description: `فشل في إنشاء حسابات لـ ${newResults.failed} عميل`,
        variant: "destructive",
      });
    }
  };

  const getCustomerDisplayName = (customer: Customer): string => {
    if (customer.customer_type === 'individual') {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.company_name || 'عميل غير محدد';
  };

  React.useEffect(() => {
    fetchCustomersWithoutAccounts();
  }, [companyId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          إصلاح حسابات العملاء الموجودين
        </CardTitle>
        <CardDescription>
          إنشاء الحسابات المحاسبية للعملاء الذين لا يملكون حسابات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">جاري البحث عن العملاء...</p>
          </div>
        ) : customersWithoutAccounts.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ممتاز! جميع العملاء لديهم حسابات محاسبية مرتبطة.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تم العثور على {customersWithoutAccounts.length} عميل بدون حسابات محاسبية
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                العملاء بدون حسابات (أول 10):
              </h4>
              <div className="space-y-1 text-sm">
                {customersWithoutAccounts.slice(0, 10).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>
                      {getCustomerDisplayName(customer)} ({customer.customer_code})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                    </span>
                  </div>
                ))}
                {customersWithoutAccounts.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    ...و {customersWithoutAccounts.length - 10} عميل آخر
                  </p>
                )}
              </div>
            </div>

            {fixing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>جاري إصلاح الحسابات...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                
                {(results.success > 0 || results.failed > 0) && (
                  <div className="space-y-1 text-xs">
                    {results.success > 0 && (
                      <p className="text-green-600">✅ نجح: {results.success}</p>
                    )}
                    {results.failed > 0 && (
                      <p className="text-red-600">❌ فشل: {results.failed}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">أخطاء في الإصلاح:</p>
                    <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {results.errors.slice(0, 5).map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                      {results.errors.length > 5 && (
                        <p>...و {results.errors.length - 5} خطأ آخر</p>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={fixAccountsForAllCustomers}
                disabled={fixing || customersWithoutAccounts.length === 0}
                className="flex-1"
              >
                {fixing ? 'جاري الإصلاح...' : `إصلاح حسابات ${customersWithoutAccounts.length} عميل`}
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchCustomersWithoutAccounts}
                disabled={loading || fixing}
              >
                تحديث
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
