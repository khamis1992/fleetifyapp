/**
 * Fix Missing Invoices Component
 * Allows users to fix missing invoices after contract data updates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  FileText,
  Calendar,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MissingInvoiceReport {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  contract_start_date: string;
  contract_end_date: string | null;
  monthly_amount: number;
  expected_invoices: number;
  existing_invoices: number;
  missing_invoices: number;
  missing_months: string[];
}

interface FixResult {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  invoices_created: number;
  invoices_skipped: number;
  total_amount: number;
  months_covered: string;
  status: string;
  error_message: string | null;
}

export const FixMissingInvoices: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [report, setReport] = useState<MissingInvoiceReport[]>([]);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);

  const handleCheckMissing = async () => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return;
    }

    setIsChecking(true);
    setReport([]);

    try {
      const { data, error } = await supabase.rpc('check_missing_invoices_report', {
        p_company_id: companyId,
        p_contract_id: null
      });

      if (error) throw error;

      setReport(data || []);
      
      const totalMissing = (data || []).reduce((sum, r) => sum + r.missing_invoices, 0);

      if (totalMissing > 0) {
        toast.warning(
          `تم العثور على ${totalMissing} فاتورة مفقودة في ${(data || []).filter(r => r.missing_invoices > 0).length} عقد`
        );
      } else {
        toast.success('جميع الفواتير موجودة - لا توجد فواتير مفقودة');
      }
    } catch (error: unknown) {
      console.error('Error checking missing invoices:', error);
      toast.error('حدث خطأ أثناء فحص الفواتير المفقودة');
    } finally {
      setIsChecking(false);
    }
  };

  const handleFixMissing = async () => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return;
    }

    setIsFixing(true);
    setFixResults([]);

    try {
      const { data, error } = await supabase.rpc('fix_missing_invoices_for_contracts', {
        p_company_id: companyId,
        p_contract_id: null,
        p_from_date: null,
        p_to_date: null
      });

      if (error) throw error;

      setFixResults(data || []);
      
      const totalCreated = (data || []).reduce((sum, r) => sum + r.invoices_created, 0);
      const totalSkipped = (data || []).reduce((sum, r) => sum + r.invoices_skipped, 0);
      const totalAmount = (data || []).reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

      if (totalCreated > 0) {
        toast.success(
          `✅ تم إنشاء ${totalCreated} فاتورة جديدة\n` +
          `💰 إجمالي المبلغ: ${totalAmount.toFixed(2)} د.ك\n` +
          `⏭️ تم تخطي ${totalSkipped} فاتورة موجودة`,
          { duration: 6000 }
        );
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        
        // Refresh report
        await handleCheckMissing();
      } else {
        toast.info('لا توجد فواتير مفقودة للإنشاء');
      }
    } catch (error: unknown) {
      console.error('Error fixing missing invoices:', error);
      toast.error('حدث خطأ أثناء إصلاح الفواتير المفقودة');
    } finally {
      setIsFixing(false);
    }
  };

  const contractsWithMissing = report.filter(r => r.missing_invoices > 0);
  const totalMissing = report.reduce((sum, r) => sum + r.missing_invoices, 0);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-blue-600" />
                إصلاح الفواتير المفقودة
              </CardTitle>
              <CardDescription className="mt-2">
                بعد تعديل بيانات العقود، قد تكون بعض الفواتير مفقودة. استخدم هذا الأداة للفحص والإنشاء.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleCheckMissing}
              disabled={isChecking || !companyId}
              variant="outline"
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الفحص...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  فحص الفواتير المفقودة
                </>
              )}
            </Button>
            
            <Button
              onClick={handleFixMissing}
              disabled={isFixing || !companyId || totalMissing === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الإصلاح...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  إصلاح الفواتير المفقودة ({totalMissing})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {report.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير الفواتير المفقودة
            </CardTitle>
            <CardDescription>
              تم فحص {report.length} عقد نشط
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">العقود المفحوصة</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{report.length}</div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">عقود تحتاج إصلاح</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{contractsWithMissing.length}</div>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">إجمالي الفواتير المفقودة</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{totalMissing}</div>
              </div>
            </div>

            {/* Table */}
            {contractsWithMissing.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم العقد</TableHead>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>تاريخ البدء</TableHead>
                      <TableHead>المبلغ الشهري</TableHead>
                      <TableHead>المتوقع</TableHead>
                      <TableHead>الموجود</TableHead>
                      <TableHead>مفقود</TableHead>
                      <TableHead>الأشهر المفقودة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractsWithMissing.map((item) => (
                      <TableRow key={item.contract_id}>
                        <TableCell className="font-medium">{item.contract_number}</TableCell>
                        <TableCell>{item.customer_name || 'غير محدد'}</TableCell>
                        <TableCell>
                          {format(new Date(item.contract_start_date), 'yyyy-MM-dd', { locale: ar })}
                        </TableCell>
                        <TableCell>{Number(item.monthly_amount || 0).toFixed(2)} د.ك</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.expected_invoices}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.existing_invoices}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{item.missing_invoices}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.missing_months.slice(0, 3).map((month) => (
                              <Badge key={month} variant="outline" className="text-xs">
                                {month}
                              </Badge>
                            ))}
                            {item.missing_months.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.missing_months.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ممتاز! جميع العقود لديها فواتير كاملة - لا توجد فواتير مفقودة
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fix Results */}
      {fixResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              نتائج الإصلاح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم العقد</TableHead>
                    <TableHead>اسم العميل</TableHead>
                    <TableHead>تم الإنشاء</TableHead>
                    <TableHead>تم التخطي</TableHead>
                    <TableHead>المبلغ الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixResults.map((result) => (
                    <TableRow key={result.contract_id}>
                      <TableCell className="font-medium">{result.contract_number}</TableCell>
                      <TableCell>{result.customer_name || 'غير محدد'}</TableCell>
                      <TableCell>
                        {result.invoices_created > 0 ? (
                          <Badge variant="default" className="bg-green-600">
                            {result.invoices_created}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.invoices_skipped > 0 ? (
                          <Badge variant="secondary">{result.invoices_skipped}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {Number(result.total_amount || 0).toFixed(2)} د.ك
                      </TableCell>
                      <TableCell>
                        {result.status === 'success' ? (
                          <Badge variant="default" className="bg-green-600">
                            نجح
                          </Badge>
                        ) : result.status === 'error' ? (
                          <Badge variant="destructive">خطأ</Badge>
                        ) : (
                          <Badge variant="secondary">تم التخطي</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>ملاحظة:</strong> سيتم إنشاء الفواتير المفقودة بناءً على بيانات العقود الحالية.
          تأكد من أن بيانات العقود (تاريخ البدء، المبلغ الشهري) محدثة قبل الإصلاح.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default FixMissingInvoices;

