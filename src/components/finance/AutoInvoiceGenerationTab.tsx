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
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BackfillResult {
  contract_id: string;
  contract_number: string;
  months_processed: number;
  invoices_created: number;
  invoices_skipped: number;
}

interface MonthlyResult {
  contract_id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  status: string;
}

export const AutoInvoiceGenerationTab: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
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
      const { data, error } = await supabase.rpc('backfill_contract_invoices', {
        p_company_id: companyId,
        p_contract_id: null
      });

      if (error) throw error;

      setBackfillResults(data || []);
      
      const totalCreated = (data || []).reduce((sum, r) => sum + r.invoices_created, 0);
      const totalSkipped = (data || []).reduce((sum, r) => sum + r.invoices_skipped, 0);

      toast.success(`تم إنشاء ${totalCreated} فاتورة بنجاح. تم تخطي ${totalSkipped} فاتورة موجودة.`);
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
      const { data, error } = await supabase.rpc('generate_monthly_invoices_for_date', {
        p_company_id: companyId,
        p_invoice_month: selectedMonth
      });

      if (error) throw error;

      setMonthlyResults(data || []);
      
      const created = (data || []).filter(r => r.status === 'created').length;
      const skipped = (data || []).filter(r => r.status === 'skipped').length;

      toast.success(`تم إنشاء ${created} فاتورة. تم تخطي ${skipped}.`);
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
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  سيتم إنشاء الفواتير لليوم الأول من الشهر المحدد
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
                  <div className="grid grid-cols-3 gap-4 text-center">
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
                          <TableHead className="text-center">عدد الأشهر</TableHead>
                          <TableHead className="text-center">تم إنشاؤها</TableHead>
                          <TableHead className="text-center">تم تخطيها</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backfillResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {result.contract_number}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.months_processed}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default" className="bg-green-600">
                                {result.invoices_created}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {result.invoices_skipped}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Summary */}
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
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

