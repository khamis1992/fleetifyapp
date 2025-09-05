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
    <Card className="hover:shadow-md transition-shadow font-cairo w-full">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {/* Contract header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-xl">
                عقد رقم{' '}
                <NumberDisplay value={contract.contract_number} className="inline" />
              </h3>
            </div>
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

          {/* Contract details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 border-y border-border/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">نوع العقد</p>
                <p className="font-medium truncate">{getContractTypeLabel(contract.contract_type)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">العميل</p>
                <p className="font-medium truncate">{getCustomerName(contract.customers)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">فترة العقد</p>
                <p className="font-medium text-sm">
                  {formatDateInGregorian(contract.start_date)} - {formatDateInGregorian(contract.end_date)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">قيمة العقد</p>
                <p className="font-bold text-lg">
                  {formatCurrency(contract.contract_amount ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </p>
              </div>
            </div>
          </div>
            
          {/* Cost center */}
          {(contract.cost_center || contract.cost_center_id) && (
            <div className="flex items-center gap-3 py-2 bg-muted/30 rounded-md px-3">
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">مركز التكلفة</p>
                <p className="font-medium">
                  <NumberDisplay value={contract.cost_center?.center_code || '—'} className="inline" />
                  {contract.cost_center?.center_name ? ` • ${contract.cost_center.center_name}` : ''}
                </p>
              </div>
            </div>
          )}
          
          {/* Description */}
          {contract.description && (
            <div className="bg-muted/20 rounded-md p-3">
              <p className="text-sm leading-relaxed">{contract.description}</p>
            </div>
          )}

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