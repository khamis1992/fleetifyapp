import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Clock, User, Building2 } from 'lucide-react';

interface Customer {
  id: string;
  customer_type: 'individual' | 'corporate';
  first_name: string;
  last_name: string;
  company_name: string;
  customer_code: string;
}

export const CreateAccountsForExistingCustomers: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const [customersWithoutAccounts, setCustomersWithoutAccounts] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: string[];
    failed: { customer: Customer; error: string }[];
  }>({ success: [], failed: [] });

  const fetchCustomersWithoutAccounts = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_type,
          first_name,
          last_name,
          company_name,
          customer_code
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .not('id', 'in', `(
          SELECT DISTINCT customer_id 
          FROM customer_accounts 
          WHERE is_active = true
        )`);

      if (error) throw error;

      setCustomersWithoutAccounts(customers || []);
    } catch (error: unknown) {
      console.error('Error fetching customers without accounts:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل في جلب العملاء بدون حسابات محاسبية",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccountsForAllCustomers = async () => {
    if (!companyId || customersWithoutAccounts.length === 0) return;

    setCreating(true);
    setProgress(0);
    setResults({ success: [], failed: [] });

    const successfulCustomers: string[] = [];
    const failedCustomers: { customer: Customer; error: string }[] = [];

    for (let i = 0; i < customersWithoutAccounts.length; i++) {
      const customer = customersWithoutAccounts[i];
      
      try {
        const { data, error } = await supabase.rpc('auto_create_customer_accounts', {
          company_id_param: companyId,
          customer_id_param: customer.id,
        });

        if (error) throw error;

        const result = data as any;
        if (result.success) {
          successfulCustomers.push(customer.id);
          console.log(`✅ Account created for customer ${customer.customer_code}: ${result.message}`);
        } else {
          failedCustomers.push({ 
            customer, 
            error: result.error || result.message || 'Unknown error' 
          });
        }
      } catch (error: unknown) {
        console.error(`❌ Failed to create account for customer ${customer.customer_code}:`, error);
        failedCustomers.push({ 
          customer, 
          error: error.message || 'حدث خطأ غير متوقع' 
        });
      }

      setProgress(((i + 1) / customersWithoutAccounts.length) * 100);
    }

    setResults({ success: successfulCustomers, failed: failedCustomers });
    setCreating(false);

    if (successfulCustomers.length > 0) {
      toast({
        title: "تم إنشاء الحسابات بنجاح",
        description: `تم إنشاء حسابات محاسبية لـ ${successfulCustomers.length} عميل`,
      });
    }

    if (failedCustomers.length > 0) {
      toast({
        variant: "destructive",
        title: "بعض الحسابات فشلت",
        description: `فشل في إنشاء ${failedCustomers.length} حساب محاسبي`,
      });
    }

    // Refresh the list
    await fetchCustomersWithoutAccounts();
  };

  const getCustomerDisplayName = (customer: Customer) => {
    return customer.customer_type === 'individual' 
      ? `${customer.first_name} ${customer.last_name}`.trim()
      : customer.company_name;
  };

  React.useEffect(() => {
    fetchCustomersWithoutAccounts();
  }, [companyId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          إنشاء حسابات محاسبية للعملاء الموجودين
        </CardTitle>
        <CardDescription>
          إنشاء حسابات محاسبية تلقائياً للعملاء الذين لا يملكون حسابات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {customersWithoutAccounts.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  جميع العملاء لديهم حسابات محاسبية مرتبطة
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    وُجد {customersWithoutAccounts.length} عميل بدون حسابات محاسبية
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">العملاء بدون حسابات محاسبية:</h4>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {customersWithoutAccounts.slice(0, 10).map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {customer.customer_type === 'individual' ? (
                            <User className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Building2 className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium">
                            {getCustomerDisplayName(customer)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {customer.customer_code}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                        </Badge>
                      </div>
                    ))}
                    {customersWithoutAccounts.length > 10 && (
                      <div className="text-sm text-muted-foreground text-center">
                        ... و {customersWithoutAccounts.length - 10} عميل آخر
                      </div>
                    )}
                  </div>
                </div>

                {creating && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 animate-spin" />
                      جارٍ إنشاء الحسابات المحاسبية...
                    </div>
                    <Progress value={progress} className="w-full" />
                    <div className="text-xs text-muted-foreground">
                      {Math.round(progress)}% مكتمل
                    </div>
                  </div>
                )}

                {results.success.length > 0 || results.failed.length > 0 ? (
                  <div className="space-y-2">
                    {results.success.length > 0 && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          تم إنشاء {results.success.length} حساب محاسبي بنجاح
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {results.failed.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          فشل في إنشاء {results.failed.length} حساب محاسبي:
                          <ul className="mt-2 space-y-1">
                            {results.failed.slice(0, 3).map((item, index) => (
                              <li key={index} className="text-xs">
                                • {getCustomerDisplayName(item.customer)}: {item.error}
                              </li>
                            ))}
                            {results.failed.length > 3 && (
                              <li className="text-xs">... و {results.failed.length - 3} أخطاء أخرى</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button 
                    onClick={createAccountsForAllCustomers}
                    disabled={creating || customersWithoutAccounts.length === 0}
                    className="flex-1"
                  >
                    {creating ? 'جارٍ الإنشاء...' : `إنشاء حسابات لجميع العملاء (${customersWithoutAccounts.length})`}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={fetchCustomersWithoutAccounts}
                    disabled={loading || creating}
                  >
                    تحديث
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};