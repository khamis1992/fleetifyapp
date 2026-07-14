import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const DuplicateContractsDiagnostic = () => {
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  const [refreshKey, setRefreshKey] = useState(0);

  // Direct database query for debugging
  const { data: diagnosticData, isLoading, error } = useQuery({
    queryKey: ['duplicate-contracts-diagnostic', companyId, refreshKey],
    queryFn: async () => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      console.log('🔧 [Diagnostic] Starting comprehensive analysis...');
      
      const results: any = {};
      
      try {
        // 1. User info
        results.userInfo = {
          userId: user?.id,
          userEmail: user?.email,
          companyId,
          timestamp: new Date().toISOString()
        };

        // 2. Total contracts count
        const { data: totalContracts, error: totalError } = await supabase
          .from('contracts')
          .select('id, contract_number, customer_id, company_id, status')
          .eq('company_id', companyId);

        if (totalError) {
          console.error('🚨 [Diagnostic] Error fetching total contracts:', totalError);
          results.totalContractsError = totalError;
        } else {
          results.totalContracts = totalContracts?.length || 0;
          results.contractsSample = totalContracts?.slice(0, 5);
        }

        // 3. Manual analysis approach (reliable)
        console.log('🔍 [Diagnostic] Using manual analysis approach...');

        // 4. Manual count approach
        try {
          const { data: contractCounts, error: countError } = await supabase
            .from('contracts')
            .select('contract_number')
            .eq('company_id', companyId);

          if (!countError && contractCounts) {
            const counts: Record<string, number> = {};
            contractCounts.forEach(c => {
              counts[c.contract_number] = (counts[c.contract_number] || 0) + 1;
            });
            
            const duplicatesCount = Object.values(counts).filter(count => count > 1).length;
            results.contractNumberCounts = {
              totalUniqueNumbers: Object.keys(counts).length,
              duplicateNumbers: duplicatesCount,
              counts: Object.entries(counts).filter(([_, count]) => count > 1)
            };
          }
        } catch (err) {
          console.log('ℹ️ [Diagnostic] Contract count failed:', err);
          results.countError = err;
        }

        // 5. Manual grouping
        if (totalContracts) {
          const grouped = totalContracts.reduce((acc: any, contract: any) => {
            if (!acc[contract.contract_number]) {
              acc[contract.contract_number] = [];
            }
            acc[contract.contract_number].push(contract);
            return acc;
          }, {});

          const duplicateGroups = Object.entries(grouped)
            .filter(([_, contracts]: [string, any]) => contracts.length > 1);

          results.manualDuplicateAnalysis = {
            totalGroups: Object.keys(grouped).length,
            duplicateGroups: duplicateGroups.length,
            duplicateDetails: duplicateGroups.map(([contractNumber, contracts]: [string, any]) => ({
              contractNumber,
              count: contracts.length,
              contractIds: contracts.map((c: any) => c.id)
            }))
          };
        }

        console.log('🔧 [Diagnostic] Analysis complete:', results);
        return results;

      } catch (error) {
        console.error('🚨 [Diagnostic] Fatal error:', error);
        results.fatalError = error;
        return results;
      }
    },
    enabled: !!companyId,
  });

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            تشخيص العقود المكررة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            جاري التحليل...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              تشخيص العقود المكررة
            </div>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                خطأ في التشخيص: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {diagnosticData && (
            <>
              {/* User Info */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">معلومات المستخدم</h3>
                <pre className="text-sm text-muted-foreground">
                  {JSON.stringify(diagnosticData.userInfo, null, 2)}
                </pre>
              </div>

              {/* Total Contracts */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">إجمالي العقود</h3>
                <p>العدد الكلي: {diagnosticData.totalContracts || 'غير متوفر'}</p>
                {diagnosticData.totalContractsError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription>
                      خطأ: {JSON.stringify(diagnosticData.totalContractsError)}
                    </AlertDescription>
                  </Alert>
                )}
                {diagnosticData.contractsSample && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">عينة من العقود</summary>
                    <pre className="text-xs mt-2 bg-background p-2 rounded">
                      {JSON.stringify(diagnosticData.contractsSample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* Manual Duplicate Analysis */}
              {diagnosticData.manualDuplicateAnalysis && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">تحليل العقود المكررة (يدوي)</h3>
                  <p>مجموعات العقود: {diagnosticData.manualDuplicateAnalysis.totalGroups}</p>
                  <p>مجموعات مكررة: {diagnosticData.manualDuplicateAnalysis.duplicateGroups}</p>
                  
                  {diagnosticData.manualDuplicateAnalysis.duplicateDetails?.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">تفاصيل العقود المكررة</summary>
                      <pre className="text-xs mt-2 bg-background p-2 rounded">
                        {JSON.stringify(diagnosticData.manualDuplicateAnalysis.duplicateDetails, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Contract Number Analysis */}
              {diagnosticData.contractNumberCounts && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">تحليل أرقام العقود</h3>
                  <p>أرقام عقود فريدة: {diagnosticData.contractNumberCounts.totalUniqueNumbers}</p>
                  <p>أرقام مكررة: {diagnosticData.contractNumberCounts.duplicateNumbers}</p>
                  
                  {diagnosticData.contractNumberCounts.counts?.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">الأرقام المكررة</summary>
                      <div className="mt-2 space-y-1">
                        {diagnosticData.contractNumberCounts.counts.map(([number, count]: [string, number]) => (
                          <div key={number} className="text-sm bg-background p-2 rounded">
                            رقم العقد: <span className="font-mono">{number}</span> - التكرارات: {count}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Errors */}
              {diagnosticData.fatalError && (
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-destructive">خطأ فادح</h3>
                  <pre className="text-xs text-destructive">
                    {JSON.stringify(diagnosticData.fatalError, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DuplicateContractsDiagnostic;
