import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import { useLatePaymentCustomers, useAutoCreateLegalCases } from '@/hooks/usePaymentLegalIntegration';
import { rentalArrearsReviewLabels } from '@/services/rentalArrears';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  FileText, 
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Car,
  Scale
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { HelpIcon } from '@/components/help/HelpIcon';
import '@/styles/legal-system.css';

export const DefaultersList: React.FC = () => {
  const { data, isLoading, error, scopeKey } = useLatePaymentCustomers();
  const lateCustomers=data?.verified;
  const reviews=data?.review||[];
  const autoCreateCases = useAutoCreateLegalCases();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [conversionErrors,setConversionErrors] = useState<Array<{contractId:string;message:string}>>([]);
  useEffect(()=>{setSelectedCustomers([]);setConversionErrors([]);},[scopeKey]);
  const eligibleCustomers=lateCustomers?.filter(row=>row.days_overdue>=30)||[];
  const selectedEligible=eligibleCustomers.filter(row=>selectedCustomers.includes(row.contract_id));
  const getRowId = (customer: { contract_id?: string; customer_id: string }) =>
    customer.contract_id || customer.customer_id;

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEligible.length === eligibleCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(eligibleCustomers.map(getRowId));
    }
  };

  const handleCreateLegalCases = async () => {
    if (!lateCustomers) return;
    
    const selectedCustomerData = eligibleCustomers.filter(c =>
      selectedCustomers.includes(getRowId(c))
    );
    
    try {
      const result = await autoCreateCases.mutateAsync(selectedCustomerData);
      setConversionErrors(result.failed);
      setSelectedCustomers(result.failed.map(item=>item.contractId));
    } catch (error) {
      setConversionErrors([{contractId:'',message:error instanceof Error ? error.message : 'تعذر تأكيد التحويل؛ تحقق من حالة العقود.'}]);
    }
  };

  const getDaysOverdueBadge = (days: number) => {
    if (days >= 60) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {days} يوم
      </Badge>;
    } else if (days >= 30) {
      return <Badge variant="destructive" className="gap-1">
        {days} يوم
      </Badge>;
    } else {
      return <Badge variant="outline" className="gap-1">
        {days} يوم
      </Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const totalOutstanding = (lateCustomers?.reduce((sum, c) => sum + Math.round(c.total_outstanding*100), 0) || 0)/100;
  const eligibleForLegalAction = lateCustomers?.filter(c => c.days_overdue >= 30).length || 0;

  return (
    <div className="legal-system min-h-screen">
      <div className="container mx-auto py-6 space-y-6">
        {/* Page Header */}
        <Card className="bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-500 shadow-sm">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl text-slate-900">قائمة المتأخرين عن الدفع</CardTitle>
                    <HelpIcon
                      topic="defaultersList"
                      size="md"
                    />
                  </div>
                  <CardDescription className="text-base mt-1 text-slate-600">
                    العملاء المتأخرون عن سداد الإيجار الشهري
                  </CardDescription>
                </div>
              </div>
              {selectedEligible.length > 0 && (
                <Button
                  onClick={handleCreateLegalCases}
                  disabled={autoCreateCases.isPending}
                  className="bg-teal-500 hover:bg-teal-600 rounded-xl shadow-sm"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  إنشاء قضايا قانونية ({selectedEligible.length})
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

      {conversionErrors.length > 0 && <Alert variant="destructive">
        <AlertDescription>
          <p>لم يُؤكد تحويل العقود التالية. تحقق من حالتها قبل إعادة المحاولة:</p>
          <ul>{conversionErrors.map((item,index)=><li key={item.contractId || index}>
            {lateCustomers?.find(customer=>customer.contract_id===item.contractId)?.contract_number || item.contractId}: {item.message}
          </li>)}</ul>
        </AlertDescription>
      </Alert>}
      {reviews.length>0 && <Alert>
        <AlertTriangle className="h-4 w-4"/><AlertDescription>
          <p>عقود تحتاج مطابقة ({reviews.length}) — مستبعدة من الإجمالي والتحويل، ولا تعني رصيدًا صفرًا:</p>
          <ul>{reviews.map(row=><li key={row.contract_id}>{row.contract_number} — {row.customer_name}: {row.review_reasons.map(code=>rentalArrearsReviewLabels[code]).join('، ')}</li>)}</ul>
        </AlertDescription>
      </Alert>}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">إجمالي العقود المتأخرة</CardTitle>
            <div className="p-2 rounded-xl bg-teal-500 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{lateCustomers?.length || 0}</div>
            <p className="text-xs text-slate-500">
              {eligibleForLegalAction} تجاوز 30 يومًا؛ يتطلب تحقق المسار القانوني
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">إجمالي المبالغ المستحقة</CardTitle>
            <div className="p-2 rounded-xl bg-teal-500 shadow-sm">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-slate-500">
              متأخرات غير مدفوعة
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">متوسط التأخير</CardTitle>
            <div className="p-2 rounded-xl bg-teal-500 shadow-sm">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {lateCustomers && lateCustomers.length > 0
                ? Math.round(lateCustomers.reduce((sum, c) => sum + c.days_overdue, 0) / lateCustomers.length)
                : 0} يوم
            </div>
            <p className="text-xs text-slate-500">
              متوسط أيام التأخير
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Defaulters Table */}
      <Card className="bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">تفاصيل المتأخرين</CardTitle>
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={autoCreateCases.isPending||eligibleCustomers.length===0} className="border-slate-200 hover:border-teal-500/50 rounded-xl">
              {selectedEligible.length>0&&selectedEligible.length===eligibleCustomers.length ? 'إلغاء التحديد' : 'تحديد الكل'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ResponsiveTable>
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedEligible.length===eligibleCustomers.length&&eligibleCustomers.length>0}
                      disabled={autoCreateCases.isPending||eligibleCustomers.length===0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>المركبة</TableHead>
                  <TableHead>أيام التأخير</TableHead>
                  <TableHead>الأشهر غير المدفوعة</TableHead>
                  <TableHead>المبلغ المستحق</TableHead>
                  <TableHead>الإيجار الشهري</TableHead>
                  <TableHead>الغرامات</TableHead>
                  <TableHead>آخر دفعة</TableHead>
                  <TableHead>التواصل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lateCustomers && lateCustomers.length > 0 ? (
                  lateCustomers.map((customer) => {
                    const rowId = getRowId(customer);
                    return (
                    <TableRow 
                      key={rowId}
                      className={selectedCustomers.includes(rowId) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(rowId)}
                          disabled={customer.days_overdue<30||autoCreateCases.isPending}
                          onChange={() => handleSelectCustomer(rowId)}
                          className="rounded border-slate-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.contract_number}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3 text-muted-foreground" />
                          {customer.vehicle_plate || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getDaysOverdueBadge(customer.days_overdue)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{customer.unpaid_months} شهر</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-destructive">
                        {formatCurrency(customer.total_outstanding)}
                      </TableCell>
                      <TableCell>{customer.monthly_rent===null?'غير متوفر':formatCurrency(customer.monthly_rent)}</TableCell>
                      <TableCell>
                        غير محسوبة في هذا التقرير
                      </TableCell>
                      <TableCell>
                        {customer.last_payment_date ? (
                          format(parseISO(customer.last_payment_date), 'dd MMM yyyy', { locale: ar })
                        ) : (
                          'لا يوجد'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {customer.customer_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.customer_phone}
                            </div>
                          )}
                          {customer.customer_email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.customer_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {reviews.length>0?'لا توجد متأخرات متحققة حاليًا؛ توجد عقود تحتاج مطابقة.':'لا توجد فواتير إيجار متأخرة ضمن البيانات المتحققة.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
</ResponsiveTable>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {lateCustomers && lateCustomers.length > 0 && (
        <Alert className="bg-white border border-slate-200 rounded-xl">
          <FileText className="h-4 w-4 text-teal-600" />
          <AlertDescription className="text-slate-700">
            <strong>ملاحظة:</strong> يحسب التقرير المتبقي على فواتير الإيجار بعد استحقاقها من تخصيصات الدفعات الحالية، ولا يشمل الغرامات والمخالفات.
            تجاوز 30 يومًا يتيح طلب التحويل؛ ولا يغني عن التحقق من المستندات والمطالبة القانونية.
          </AlertDescription>
        </Alert>
      )}
      </div>
    </div>
  );
};

export default DefaultersList;

