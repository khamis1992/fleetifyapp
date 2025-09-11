import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Receipt, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { PropertyAccountingIntegration } from '@/components/property/PropertyAccountingIntegration';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePropertyContract, usePropertyPayments } from '@/modules/properties/hooks';
import { useCurrencyFormatter } from '@/modules/core/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function PropertyContractDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, isLoading, error } = usePropertyContract(id);
  const { data: payments = [] } = usePropertyPayments(id);
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <ModuleLayout moduleName="properties">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-9 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !contract) {
    return (
      <ModuleLayout moduleName="properties">
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>
              حدث خطأ في تحميل تفاصيل العقد أو أن العقد غير موجود.
            </AlertDescription>
          </Alert>
        </div>
      </ModuleLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: 'نشط', variant: 'default' as const },
      expired: { label: 'منتهي الصلاحية', variant: 'destructive' as const },
      terminated: { label: 'مفسوخ', variant: 'secondary' as const },
      draft: { label: 'مسودة', variant: 'outline' as const },
    };
    
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  const statusInfo = getStatusBadge(contract.status || 'draft');

  return (
    <ModuleLayout moduleName="properties">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/properties">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                العودة للقائمة
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                عقد رقم: {contract.contract_number}
              </h1>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                {contract.tenant_name && (
                  <>
                    • المستأجر: {contract.tenant_name}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Receipt className="h-4 w-4" />
              إنشاء فاتورة
            </Button>
            <Button variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              تسجيل دفعة
            </Button>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              تعديل العقد
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* تفاصيل العقد */}
          <div className="lg:col-span-2 space-y-6">
            {/* معلومات أساسية */}
            <Card>
              <CardHeader>
                <CardTitle>معلومات العقد</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">نوع العقد</label>
                  <p className="text-base">{contract.contract_type === 'rental' ? 'عقد إيجار' : 'عقد بيع'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">تاريخ البداية</label>
                  <p className="text-base">
                    {format(new Date(contract.start_date), 'PPP', { locale: ar })}
                  </p>
                </div>
                
                {contract.end_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">تاريخ النهاية</label>
                    <p className="text-base">
                      {format(new Date(contract.end_date), 'PPP', { locale: ar })}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">قيمة الإيجار</label>
                  <p className="text-base font-semibold">
                    {formatCurrency(contract.rental_amount || 0)}
                  </p>
                </div>

                {contract.deposit_amount && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">قيمة التأمين</label>
                    <p className="text-base">{formatCurrency(contract.deposit_amount)}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">تكرار الدفع</label>
                  <p className="text-base">
                    {contract.payment_frequency === 'monthly' ? 'شهري' : 
                     contract.payment_frequency === 'quarterly' ? 'ربع سنوي' :
                     contract.payment_frequency === 'annual' ? 'سنوي' : contract.payment_frequency}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* الشروط والملاحظات */}
            {contract.terms && (
              <Card>
                <CardHeader>
                  <CardTitle>شروط العقد</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {contract.terms}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* التكامل المحاسبي */}
            <PropertyAccountingIntegration
              contract={contract}
              onViewJournalEntry={(id) => {
                navigate(`/finance/journal-entries/${id}`);
              }}
            />
          </div>

          {/* الدفعات */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>آخر الدفعات</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    لا توجد دفعات مسجلة
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {formatCurrency(payment.amount)}
                          </span>
                          <Badge variant={
                            payment.status === 'paid' ? 'default' : 'secondary'
                          }>
                            {payment.status === 'paid' ? 'مدفوع' : 'معلق'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>التاريخ: {format(new Date(payment.payment_date), 'dd/MM/yyyy')}</p>
                          <p>النوع: {payment.payment_type === 'rental' ? 'إيجار' : payment.payment_type}</p>
                        </div>
                        
                        {payment.journal_entry_id && (
                          <PropertyAccountingIntegration
                            payment={payment}
                            onViewJournalEntry={(id) => {
                              navigate(`/finance/journal-entries/${id}`);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}