import React, { useState } from 'react';
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
import { useLatePaymentCustomers, useAutoCreateLegalCases } from '@/hooks/usePaymentLegalIntegration';
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
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export const DefaultersList: React.FC = () => {
  const { data: lateCustomers, isLoading, error } = useLatePaymentCustomers();
  const autoCreateCases = useAutoCreateLegalCases();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === lateCustomers?.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(lateCustomers?.map(c => c.customer_id) || []);
    }
  };

  const handleCreateLegalCases = async () => {
    if (!lateCustomers) return;
    
    const selectedCustomerData = lateCustomers.filter(c => 
      selectedCustomers.includes(c.customer_id)
    );
    
    await autoCreateCases.mutateAsync(selectedCustomerData);
    setSelectedCustomers([]);
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
          حدث خطأ أثناء تحميل قائمة المتأخرين. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  const totalOutstanding = lateCustomers?.reduce((sum, c) => sum + c.total_outstanding, 0) || 0;
  const eligibleForLegalAction = lateCustomers?.filter(c => c.days_overdue >= 30).length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <Card className="bg-gradient-to-br from-destructive/5 via-destructive/3 to-background border-destructive/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl">قائمة المتأخرين عن الدفع</CardTitle>
                <CardDescription className="text-base mt-1">
                  العملاء المتأخرون عن سداد الإيجار الشهري
                </CardDescription>
              </div>
            </div>
            {selectedCustomers.length > 0 && (
              <Button 
                onClick={handleCreateLegalCases}
                disabled={autoCreateCases.isPending}
                variant="destructive"
              >
                <Scale className="h-4 w-4 mr-2" />
                إنشاء قضايا قانونية ({selectedCustomers.length})
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المتأخرين</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lateCustomers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {eligibleForLegalAction} مؤهل للإجراء القانوني
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ المستحقة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              متأخرات غير مدفوعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التأخير</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lateCustomers && lateCustomers.length > 0
                ? Math.round(lateCustomers.reduce((sum, c) => sum + c.days_overdue, 0) / lateCustomers.length)
                : 0} يوم
            </div>
            <p className="text-xs text-muted-foreground">
              متوسط أيام التأخير
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Defaulters Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>تفاصيل المتأخرين</CardTitle>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedCustomers.length === lateCustomers?.length ? 'إلغاء التحديد' : 'تحديد الكل'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === lateCustomers?.length && lateCustomers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
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
                  lateCustomers.map((customer) => (
                    <TableRow 
                      key={customer.customer_id}
                      className={selectedCustomers.includes(customer.customer_id) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.customer_id)}
                          onChange={() => handleSelectCustomer(customer.customer_id)}
                          className="rounded border-gray-300"
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
                      <TableCell>{formatCurrency(customer.monthly_rent)}</TableCell>
                      <TableCell>
                        {customer.total_fines > 0 ? (
                          <span className="text-destructive">{formatCurrency(customer.total_fines)}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.last_payment_date ? (
                          format(new Date(customer.last_payment_date), 'dd MMM yyyy', { locale: ar })
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      لا يوجد عملاء متأخرون عن الدفع
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {lateCustomers && lateCustomers.length > 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>ملاحظة:</strong> يتم إدراج العملاء تلقائياً في هذه القائمة إذا لم يدفعوا حتى يوم 10 من كل شهر.
            العملاء الذين تجاوزت متأخراتهم 30 يوماً مؤهلون لإنشاء قضايا قانونية تلقائياً.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DefaultersList;

