import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, RefreshCw, Users, DollarSign } from 'lucide-react';
import { useExpiringContracts } from '@/hooks/useContractRenewal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { formatDateForDocument } from '@/utils/dateFormatter';

interface ContractExpirationAlertsProps {
  onRenewContract?: (contract: any) => void;
  onViewContract?: (contract: any) => void;
  daysAhead?: number;
}

export const ContractExpirationAlerts: React.FC<ContractExpirationAlertsProps> = ({
  onRenewContract,
  onViewContract,
  daysAhead = 30
}) => {
  const { data: expiringContracts, isLoading } = useExpiringContracts(daysAhead);
  const { formatCurrency } = useCurrencyFormatter();

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return 'bg-red-100 text-red-800';
    if (daysUntilExpiry <= 15) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getUrgencyText = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 0) return 'منتهي';
    if (daysUntilExpiry <= 7) return 'عاجل';
    if (daysUntilExpiry <= 15) return 'قريب';
    return 'تنبيه';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!expiringContracts || expiringContracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            تنبيهات انتهاء العقود
          </CardTitle>
          <CardDescription>
            لا توجد عقود تنتهي خلال الـ {daysAhead} يوم القادمة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">جميع العقود سارية المفعول</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          تنبيهات انتهاء العقود ({expiringContracts.length})
        </CardTitle>
        <CardDescription>
          العقود التي تنتهي خلال الـ {daysAhead} يوم القادمة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expiringContracts.map((contract) => {
          const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
          const customer = contract.customer as any;
          const customerName = Array.isArray(customer) || !customer ? 'غير محدد' :
            customer.customer_type === 'individual' 
            ? `${customer.first_name} ${customer.last_name}`
            : customer.company_name || 'غير محدد';

          return (
            <div key={contract.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">
                      <NumberDisplay value={contract.contract_number} className="inline" />
                      {' '}عقد رقم
                    </h4>
                    <Badge className={getUrgencyColor(daysUntilExpiry)}>
                      {getUrgencyText(daysUntilExpiry)}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{customerName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>ينتهي في {formatDateForDocument(contract.end_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatCurrency(contract.contract_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    </div>
                    
                    {contract.vehicle && !Array.isArray(contract.vehicle) && (contract.vehicle as any).plate_number && (
                      <div className="flex items-center gap-2">
                        <span>🚗</span>
                        <span>{(contract.vehicle as any).plate_number}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">
                      {daysUntilExpiry <= 0 ? 'منتهي الصلاحية' : 
                       daysUntilExpiry === 1 ? 'ينتهي خلال يوم واحد' :
                       <>ينتهي خلال <NumberDisplay value={daysUntilExpiry} className="inline" /> أيام</>}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {onViewContract && (
                    <Button variant="outline" size="sm" onClick={() => onViewContract(contract)}>
                      عرض
                    </Button>
                  )}
                  {onRenewContract && (
                    <Button 
                      size="sm" 
                      onClick={() => onRenewContract(contract)}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      تجديد
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};