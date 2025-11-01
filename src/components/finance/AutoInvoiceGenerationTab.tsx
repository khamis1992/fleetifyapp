/**
 * Auto Invoice Generation Tab Component
 * Embedded version for use within Invoices page
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  PlayCircle, 
  History,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BackfillResult {
  contract_id: string;
  contract_number: string;
  months_processed?: number;
  invoices_created: number;
  invoices_updated?: number;
  invoices_skipped: number;
  message?: string;
}

interface MonthlyResult {
  contract_id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  status: string;
}

export const AutoInvoiceGenerationTab: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false);
  const [backfillResults, setBackfillResults] = useState<BackfillResult[]>([]);
  const [monthlyResults, setMonthlyResults] = useState<MonthlyResult[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM-01')
  );

  const handleBackfill = async () => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return;
    }

    setIsBackfilling(true);
    setBackfillResults([]);

    try {
      // Use the new smart backfill function
      const { data, error } = await supabase.rpc('smart_backfill_contract_invoices', {
        p_company_id: companyId,
        p_contract_id: null,
        p_update_wrong_dates: true
      });

      if (error) throw error;

      setBackfillResults(data || []);
      
      const totalCreated = (data || []).reduce((sum, r) => sum + r.invoices_created, 0);
      const totalUpdated = (data || []).reduce((sum, r) => sum + (r.invoices_updated || 0), 0);
      const totalSkipped = (data || []).reduce((sum, r) => sum + r.invoices_skipped, 0);

      if (totalCreated > 0 || totalUpdated > 0) {
        toast.success(
          `✅ تم بنجاح:\n` +
          `• ${totalCreated} فاتورة جديدة تم إنشاؤها\n` +
          `• ${totalUpdated} فاتورة تم تحديث تاريخها\n` +
          `• ${totalSkipped} فاتورة موجودة تم تخطيها`,
          { duration: 5000 }
        );
      } else {
        toast.info(`جميع الفواتير موجودة بالفعل. تم تخطي ${totalSkipped} فاتورة.`);
      }
      
      // Refresh invoices list
      if (totalCreated > 0 || totalUpdated > 0) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      }
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error(error.message || 'حدث خطأ أثناء توليد الفواتير التاريخية');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleGenerateForMonth = async () => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return;
    }

    if (!selectedMonth) {
      toast.error('يرجى اختيار تاريخ الشهر');
      return;
    }

    setIsGeneratingMonthly(true);
    setMonthlyResults([]);

    try {
      // Ensure the date is the first day of the month
      const invoiceMonth = new Date(selectedMonth);
      invoiceMonth.setDate(1);
      const invoiceMonthStr = format(invoiceMonth, 'yyyy-MM-dd');

      console.log('Generating invoices for month:', invoiceMonthStr, 'Company ID:', companyId);

      const { data, error } = await supabase.rpc('generate_monthly_invoices_for_date', {
        p_company_id: companyId,
        p_invoice_month: invoiceMonthStr
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('RPC Result:', data);

      setMonthlyResults(data || []);
      
      const created = (data || []).filter(r => r.status === 'created').length;
      const skipped = (data || []).filter(r => r.status === 'skipped').length;
      const errors = (data || []).filter(r => r.status?.startsWith('error')).length;

      if (errors > 0) {
        toast.warning(`تم إنشاء ${created} فاتورة. تم تخطي ${skipped}. حدثت ${errors} أخطاء.`);
      } else {
        toast.success(`تم إنشاء ${created} فاتورة. تم تخطي ${skipped}.`);
      }

      // Refresh invoices list
      if (created > 0) {
        // Invalidate queries to refresh the invoices list
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      }
    } catch (error: any) {
      console.error('Monthly generation error:', error);
      toast.error(error.message || 'حدث خطأ أثناء توليد الفواتير');
    } finally {
      setIsGeneratingMonthly(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">🤖 نظام توليد الفواتير التلقائي:</p>
            <ul className="text-sm space-y-1 mr-4">
              <li>• يتم إنشاء فاتورة لكل عقد نشط في اليوم الأول من كل شهر</li>
              <li>• تاريخ الفاتورة وتاريخ الاستحقاق: اليوم الأول من الشهر</li>
              <li>• التشغيل التلقائي: يوم 28 من كل شهر</li>
              <li>• استخدم "الملء التاريخي" لإنشاء الفواتير السابقة للعقود القديمة</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">
            <Calendar className="h-4 w-4 ml-2" />
            توليد شهري
          </TabsTrigger>
          <TabsTrigger value="backfill">
            <History className="h-4 w-4 ml-2" />
            الملء التاريخي
          </TabsTrigger>
        </TabsList>

        {/* Monthly Generation Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>توليد الفواتير لشهر محدد</CardTitle>
              <CardDescription>
                إنشاء فواتير لجميع العقود النشطة لشهر معين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="month">اختر الشهر</Label>
                <Input
                  id="month"
                  type="date"
                  value={selectedMonth}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setDate(1); // Ensure it's the first day of the month
                    setSelectedMonth(format(date, 'yyyy-MM-dd'));
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  سيتم إنشاء الفواتير لليوم الأول من الشهر المحدد ({format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar })})
                </p>
              </div>

              <Button
                onClick={handleGenerateForMonth}
                disabled={isGeneratingMonthly}
                size="lg"
                className="w-full"
              >
                {isGeneratingMonthly ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5 ml-2" />
                    توليد الفواتير للشهر المحدد
                  </>
                )}
              </Button>

              {/* Monthly Results */}
              {monthlyResults.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">
                    النتائج - {format(new Date(selectedMonth), 'MMMM yyyy', { locale: ar })}
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <div className="text-2xl font-bold">{monthlyResults.length}</div>
                      <div className="text-sm text-muted-foreground">إجمالي</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {monthlyResults.filter(r => r.status === 'created').length}
                      </div>
                      <div className="text-sm text-muted-foreground">تم الإنشاء</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {monthlyResults.filter(r => r.status === 'skipped').length}
                      </div>
                      <div className="text-sm text-muted-foreground">تم التخطي</div>
                    </div>
                  </div>
                  
                  {/* Show errors if any */}
                  {monthlyResults.some(r => r.status?.startsWith('error')) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h5 className="font-medium text-red-800 mb-2">الأخطاء:</h5>
                      <div className="space-y-1 text-sm text-red-700">
                        {monthlyResults
                          .filter(r => r.status?.startsWith('error'))
                          .map((result, idx) => (
                            <div key={idx}>• {result.status}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Show detailed results table */}
                  {monthlyResults.length > 0 && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-sm">التفاصيل</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>رقم العقد</TableHead>
                              <TableHead>رقم الفاتورة</TableHead>
                              <TableHead>الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthlyResults.map((result, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {result.contract_id?.substring(0, 8)}...
                                </TableCell>
                                <TableCell>
                                  {result.invoice_number || '-'}
                                </TableCell>
                                <TableCell>
                                  {result.status === 'created' && (
                                    <Badge variant="default" className="bg-green-600">
                                      <CheckCircle className="h-3 w-3 ml-1" />
                                      تم الإنشاء
                                    </Badge>
                                  )}
                                  {result.status === 'skipped' && (
                                    <Badge variant="secondary">
                                      تم التخطي
                                    </Badge>
                                  )}
                                  {result.status?.startsWith('error') && (
                                    <Badge variant="destructive">
                                      <XCircle className="h-3 w-3 ml-1" />
                                      خطأ
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backfill Tab */}
        <TabsContent value="backfill" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>توليد الفواتير التاريخية</CardTitle>
              <CardDescription>
                إنشاء جميع الفواتير الناقصة من تاريخ بداية كل عقد حتى اليوم
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>تنبيه:</strong> هذه العملية ستقوم بإنشاء جميع الفواتير الناقصة للعقود النشطة.
                  قد تستغرق بعض الوقت حسب عدد العقود.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleBackfill}
                disabled={isBackfilling}
                size="lg"
                className="w-full"
              >
                {isBackfilling ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-5 w-5 ml-2" />
                    بدء توليد الفواتير التاريخية
                  </>
                )}
              </Button>

              {/* Backfill Results */}
              {backfillResults.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">نتائج التوليد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم العقد</TableHead>
                          <TableHead className="text-center">تم إنشاؤها</TableHead>
                          <TableHead className="text-center">تم تحديثها</TableHead>
                          <TableHead className="text-center">تم تخطيها</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backfillResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {result.contract_number}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default" className="bg-green-600">
                                {result.invoices_created}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-600">
                                {result.invoices_updated || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {result.invoices_skipped}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {result.message && (
                                <span className="text-xs text-gray-500">
                                  {result.message}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Summary */}
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">{backfillResults.length}</div>
                          <div className="text-sm text-muted-foreground">عقود</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {backfillResults.reduce((sum, r) => sum + r.invoices_created, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">فواتير جديدة</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {backfillResults.reduce((sum, r) => sum + (r.invoices_updated || 0), 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">تم تحديثها</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-600">
                            {backfillResults.reduce((sum, r) => sum + r.invoices_skipped, 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">تم تخطيها</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoInvoiceGenerationTab;

