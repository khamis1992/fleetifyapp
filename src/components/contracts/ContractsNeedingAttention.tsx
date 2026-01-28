import { AlertTriangle, FileText, User, Car, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string | null;
  vehicle_id: string | null;
  contract_amount: number;
  monthly_amount: number;
  status: string;
  end_date: string | null;
  customers?: {
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    company_name?: string;
    company_name_ar?: string;
    customer_type?: string;
  };
  vehicles?: {
    plate_number?: string;
    make?: string;
    model?: string;
  };
}

interface ContractsNeedingAttentionProps {
  contracts: Contract[];
}

export const ContractsNeedingAttention = ({ contracts }: ContractsNeedingAttentionProps) => {
  const navigate = useNavigate();

  // تصنيف العقود التي تحتاج انتباه
  const needsAttention = contracts.filter(c => {
    const isZeroAmount = (c.contract_amount === 0 || c.contract_amount === null) && 
                         (c.monthly_amount === 0 || c.monthly_amount === null);
    const missingCustomer = !c.customer_id;
    const missingVehicle = !c.vehicle_id;
    const isExpired = c.end_date && new Date(c.end_date) < new Date() && c.status === 'active';
    
    return isZeroAmount || missingCustomer || missingVehicle || isExpired;
  });

  // تصنيف حسب نوع المشكلة
  const categorized = {
    zeroAmount: needsAttention.filter(c => 
      (c.contract_amount === 0 || c.contract_amount === null) && 
      (c.monthly_amount === 0 || c.monthly_amount === null)
    ),
    missingCustomer: needsAttention.filter(c => !c.customer_id),
    missingVehicle: needsAttention.filter(c => !c.vehicle_id),
    expired: needsAttention.filter(c => 
      c.end_date && new Date(c.end_date) < new Date() && c.status === 'active'
    ),
  };

  if (needsAttention.length === 0) {
    return null;
  }

  const getCustomerName = (contract: Contract) => {
    if (!contract.customers) return 'غير محدد';
    const c = contract.customers;
    if (c.customer_type === 'corporate') {
      return c.company_name_ar || c.company_name || 'شركة غير محددة';
    }
    return `${c.first_name_ar || c.first_name || ''} ${c.last_name_ar || c.last_name || ''}`.trim() || 'غير محدد';
  };

  const getIssueType = (contract: Contract) => {
    const issues = [];
    if ((contract.contract_amount === 0 || contract.contract_amount === null) && 
        (contract.monthly_amount === 0 || contract.monthly_amount === null)) {
      issues.push({ label: 'قيمة صفرية', color: 'orange' });
    }
    if (!contract.customer_id) {
      issues.push({ label: 'بدون عميل', color: 'red' });
    }
    if (!contract.vehicle_id) {
      issues.push({ label: 'بدون مركبة', color: 'red' });
    }
    if (contract.end_date && new Date(contract.end_date) < new Date() && contract.status === 'active') {
      issues.push({ label: 'منتهي', color: 'yellow' });
    }
    return issues;
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="h-5 w-5" />
          <span>عقود تحتاج انتباهك ({needsAttention.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* ملخص المشاكل */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categorized.zeroAmount.length > 0 && (
              <div className="p-3 bg-orange-100 rounded-lg">
                <div className="text-sm text-orange-600 mb-1">قيمة صفرية</div>
                <div className="text-2xl font-bold text-orange-900">{categorized.zeroAmount.length}</div>
              </div>
            )}
            {categorized.missingCustomer.length > 0 && (
              <div className="p-3 bg-red-100 rounded-lg">
                <div className="text-sm text-red-600 mb-1">بدون عميل</div>
                <div className="text-2xl font-bold text-red-900">{categorized.missingCustomer.length}</div>
              </div>
            )}
            {categorized.missingVehicle.length > 0 && (
              <div className="p-3 bg-red-100 rounded-lg">
                <div className="text-sm text-red-600 mb-1">بدون مركبة</div>
                <div className="text-2xl font-bold text-red-900">{categorized.missingVehicle.length}</div>
              </div>
            )}
            {categorized.expired.length > 0 && (
              <div className="p-3 bg-yellow-100 rounded-lg">
                <div className="text-sm text-yellow-600 mb-1">منتهي ونشط</div>
                <div className="text-2xl font-bold text-yellow-900">{categorized.expired.length}</div>
              </div>
            )}
          </div>

          {/* قائمة العقود (أول 5) */}
          <div className="space-y-2">
            {needsAttention.slice(0, 5).map(contract => {
              const issues = getIssueType(contract);
              return (
                <div
                  key={contract.id}
                  className="p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">
                          {contract.contract_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{getCustomerName(contract)}</span>
                      </div>
                      {contract.vehicles && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Car className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {contract.vehicles.plate_number || 'غير محدد'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {issues.map((issue, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`text-xs bg-${issue.color}-100 text-${issue.color}-700 border-${issue.color}-300`}
                        >
                          {issue.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {needsAttention.length > 5 && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/contracts?filter=needs-attention')}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                عرض جميع العقود ({needsAttention.length})
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
