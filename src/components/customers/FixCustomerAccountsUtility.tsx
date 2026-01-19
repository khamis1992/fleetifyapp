import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, RefreshCw, Users, Wrench } from 'lucide-react';

export const FixCustomerAccountsUtility: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isApplyingMigration, setIsApplyingMigration] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [fixResults, setFixResults] = useState<any>(null);

  const analyzeCustomers = async () => {
    if (!companyId) return;

    setIsAnalyzing(true);
    try {
      // Get customers without accounts
      const { data: customersWithoutAccounts, error: customersError } = await supabase
        .from('customers')
        .select(`
          id,
          customer_type,
          first_name,
          last_name,
          company_name,
          customer_code,
          created_at
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .not('id', 'in', `(
          SELECT DISTINCT customer_id 
          FROM customer_accounts 
          WHERE is_active = true
        )`);

      if (customersError) throw customersError;

      // Get company settings
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('customer_account_settings')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      setAnalysisResults({
        customersWithoutAccounts: customersWithoutAccounts || [],
        totalCustomersWithoutAccounts: customersWithoutAccounts?.length || 0,
        companySettings: companyData?.customer_account_settings,
        autoCreateEnabled: (companyData?.customer_account_settings as any)?.auto_create_account || false
      });

      toast({
        title: "تم تحليل الوضع",
        description: `تم العثور على ${customersWithoutAccounts?.length || 0} عميل بدون حسابات مربوطة`,
      });
    } catch (error: unknown) {
      console.error('Error analyzing customers:', error);
      toast({
        variant: "destructive",
        title: "خطأ في التحليل",
        description: error.message || "حدث خطأ أثناء تحليل العملاء",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fixCustomerAccounts = async () => {
    if (!companyId) return;

    setIsFixing(true);
    setFixResults(null);

    try {
      // Call the database function to fix customers (note: function might not exist yet)
      const { data: result, error } = await supabase.rpc('fix_customers_without_accounts' as any, {
        target_company_id: companyId
      });

      if (error) throw error;

      setFixResults(result);

      toast({
        title: "تم إصلاح الحسابات",
        description: (result as any)?.message || "تم إصلاح حسابات العملاء بنجاح",
      });

      // Refresh analysis after fixing
      setTimeout(() => {
        analyzeCustomers();
      }, 1000);

    } catch (error: unknown) {
      console.error('Error fixing customer accounts:', error);
      toast({
        variant: "destructive",
        title: "خطأ في الإصلاح",
        description: error.message || "حدث خطأ أثناء إصلاح حسابات العملاء",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const enableAutoCreate = async () => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          customer_account_settings: {
            ...analysisResults?.companySettings,
            auto_create_account: true,
            enable_account_selection: true,
            account_prefix: 'CUST-',
            account_naming_pattern: 'customer_name',
            account_group_by: 'customer_type'
          }
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "تم تفعيل الإنشاء التلقائي",
        description: "سيتم إنشاء الحسابات تلقائياً للعملاء الجدد",
      });

      // Refresh analysis
      analyzeCustomers();

    } catch (error: unknown) {
      console.error('Error enabling auto create:', error);
      toast({
        variant: "destructive",
        title: "خطأ في التفعيل",
        description: error.message || "حدث خطأ أثناء تفعيل الإنشاء التلقائي",
      });
    }
  };

  const applyMigration = async () => {
    setIsApplyingMigration(true);
    
    try {
      // Step 1: Update all companies to enable auto_create_account
      console.log('🔄 Applying customer account migration...');
      
      // First, get all companies
      const { data: companies, error: fetchError } = await supabase
        .from('companies')
        .select('id, customer_account_settings');

      if (fetchError) throw fetchError;

      // Update each company individually
      for (const company of companies || []) {
        const existingSettings = (company.customer_account_settings as any) || {};
        const updatedSettings = {
          ...existingSettings,
          auto_create_account: true,
          enable_account_selection: true,
          account_prefix: 'CUST-',
          account_naming_pattern: 'customer_name',
          account_group_by: 'customer_type'
        };

        const { error: updateError } = await supabase
          .from('companies')
          .update({ customer_account_settings: updatedSettings })
          .eq('id', company.id);

        if (updateError) {
          console.error(`Error updating company ${company.id}:`, updateError);
          throw updateError;
        }
      }

      console.log('✅ Company settings updated successfully!');

      toast({
        title: "تم تطبيق الترقية بنجاح",
        description: "تم إصلاح مشكلة ربط الحسابات المحاسبية للعملاء",
      });

      // Refresh analysis after migration
      setTimeout(() => {
        analyzeCustomers();
      }, 1000);

    } catch (error: unknown) {
      console.error('❌ Migration failed:', error);
      toast({
        variant: "destructive",
        title: "فشل في تطبيق الترقية",
        description: error.message || "حدث خطأ أثناء تطبيق الترقية",
      });
    } finally {
      setIsApplyingMigration(false);
    }
  };

  const getCustomerDisplayName = (customer: any) => {
    return customer.customer_type === 'individual' 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : customer.company_name || '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            أداة إصلاح حسابات العملاء
          </CardTitle>
          <CardDescription>
            تشخيص وإصلاح مشاكل ربط الحسابات المحاسبية للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={applyMigration}
              disabled={isApplyingMigration}
              variant="default"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 ${isApplyingMigration ? 'animate-spin' : ''}`} />
              {isApplyingMigration ? 'جاري تطبيق الترقية...' : 'تطبيق ترقية الإصلاح'}
            </Button>

            <Button 
              onClick={analyzeCustomers}
              disabled={isAnalyzing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'جاري التحليل...' : 'تحليل الوضع'}
            </Button>

            {analysisResults && analysisResults.totalCustomersWithoutAccounts > 0 && (
              <Button 
                onClick={fixCustomerAccounts}
                disabled={isFixing}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className={`h-4 w-4 ${isFixing ? 'animate-pulse' : ''}`} />
                {isFixing ? 'جاري الإصلاح...' : 'إصلاح الحسابات'}
              </Button>
            )}

            {analysisResults && !analysisResults.autoCreateEnabled && (
              <Button 
                onClick={enableAutoCreate}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                تفعيل الإنشاء التلقائي
              </Button>
            )}
          </div>

          {analysisResults && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">عملاء بدون حسابات</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {analysisResults.totalCustomersWithoutAccounts}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">الإنشاء التلقائي</p>
                        <p className="text-lg font-bold">
                          <Badge variant={analysisResults.autoCreateEnabled ? "default" : "destructive"}>
                            {analysisResults.autoCreateEnabled ? 'مفعل' : 'معطل'}
                          </Badge>
                        </p>
                      </div>
                      <CheckCircle2 className={`h-8 w-8 ${analysisResults.autoCreateEnabled ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                {fixResults && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">تم إصلاحها</p>
                          <p className="text-2xl font-bold text-green-600">
                            {fixResults.fixed_customers}
                          </p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {!analysisResults.autoCreateEnabled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    الإنشاء التلقائي للحسابات معطل. يُنصح بتفعيله لضمان إنشاء الحسابات تلقائياً للعملاء الجدد.
                  </AlertDescription>
                </Alert>
              )}

              {analysisResults.totalCustomersWithoutAccounts > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    يوجد {analysisResults.totalCustomersWithoutAccounts} عميل بدون حسابات محاسبية مربوطة. 
                    استخدم "إصلاح الحسابات" لربط الحسابات تلقائياً.
                  </AlertDescription>
                </Alert>
              )}

              {analysisResults.customersWithoutAccounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">العملاء بدون حسابات مربوطة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {analysisResults.customersWithoutAccounts.map((customer: any) => (
                        <div 
                          key={customer.id} 
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <p className="font-medium">{getCustomerDisplayName(customer)}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.customer_code} • {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {new Date(customer.created_at).toLocaleDateString('ar-KW')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {fixResults && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>نتائج الإصلاح:</strong><br />
                    • تم إصلاح {fixResults.fixed_customers} عميل<br />
                    • فشل في إصلاح {fixResults.failed_customers} عميل<br />
                    {fixResults.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};