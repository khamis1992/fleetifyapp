import React from 'react';
import { RefreshCw, FileText, Calendar, DollarSign, Users, Settings, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useContractHelpers } from '@/hooks/useContractHelpers';
import { formatDateInGregorian } from '@/utils/dateFormatter';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { NumberDisplay } from '@/components/ui/NumberDisplay';

interface ContractCardProps {
  contract: any;
  onRenew?: (contract: any) => void;
  onManageStatus?: (contract: any) => void;
  onViewDetails?: (contract: any) => void;
  onCancelContract?: (contract: any) => void;
  onDeleteContract?: (contract: any) => void;
  showRenewButton?: boolean;
  showManageButton?: boolean;
  showCancelButton?: boolean;
  showDeleteButton?: boolean;
}

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  onRenew,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  onDeleteContract,
  showRenewButton = false,
  showManageButton = false,
  showCancelButton = false,
  showDeleteButton = false
}) => {
  const { getStatusColor, getStatusIcon, getContractTypeLabel, getCustomerName } = useContractHelpers();
  const { formatCurrency } = useCurrencyFormatter();

  return (
    <Card className="hover:shadow-md transition-shadow font-cairo">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Contract main content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-start">
              <h3 className="font-semibold text-lg">
                عقد رقم{' '}
                <NumberDisplay value={contract.contract_number} className="inline" />
              </h3>
              <Badge className={getStatusColor(contract.status)}>
                {getStatusIcon(contract.status)}
                <span className="ml-1">
                  {contract.status === 'active' ? 'نشط' :
                   contract.status === 'draft' ? 'مسودة' :
                   contract.status === 'expired' ? 'منتهي' :
                   contract.status === 'suspended' ? 'معلق' :
                   contract.status === 'cancelled' ? 'ملغي' :
                   contract.status === 'renewed' ? 'مجدد' : contract.status}
                </span>
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 justify-start">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                   {getContractTypeLabel(contract.contract_type)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 justify-start">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {formatDateInGregorian(contract.start_date)} - {formatDateInGregorian(contract.end_date)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 justify-start">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatCurrency(contract.contract_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 justify-start">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {getCustomerName(contract.customers)}
                </span>
              </div>
            </div>
            
            {/* Cost center badge */}
            {(contract.cost_center || contract.cost_center_id) && (
              <div className="flex items-center justify-start mt-1 gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  <NumberDisplay value={contract.cost_center?.center_code || '—'} className="inline" />
                  {contract.cost_center?.center_name ? ` • ${contract.cost_center.center_name}` : ''}
                </Badge>
                <span>مركز التكلفة:</span>
              </div>
            )}
            
            {contract.description && (
              <p className="text-sm text-muted-foreground text-left">{contract.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails?.(contract)}
            >
              عرض
            </Button>
            {showRenewButton && contract.status === 'active' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onRenew?.(contract)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                تجديد
              </Button>
            )}
            {showManageButton && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onManageStatus?.(contract)}
              >
                <Settings className="h-4 w-4 mr-2" />
                إدارة
              </Button>
            )}
            {showCancelButton && contract.status === 'active' && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onCancelContract?.(contract)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                إلغاء
              </Button>
            )}
            {showDeleteButton && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onDeleteContract?.(contract)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                حذف
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};