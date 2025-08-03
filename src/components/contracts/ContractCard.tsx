import React from 'react';
import { RefreshCw, FileText, Calendar, DollarSign, Users, Settings, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useContractHelpers } from '@/hooks/useContractHelpers';
import { formatDateInGregorian } from '@/utils/dateFormatter';

interface ContractCardProps {
  contract: any;
  onRenew?: (contract: any) => void;
  onManageStatus?: (contract: any) => void;
  onViewDetails?: (contract: any) => void;
  onCancelContract?: (contract: any) => void;
  showRenewButton?: boolean;
  showManageButton?: boolean;
  showCancelButton?: boolean;
}

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  onRenew,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  showRenewButton = false,
  showManageButton = false,
  showCancelButton = false
}) => {
  const { getStatusColor, getStatusIcon, getContractTypeLabel, getCustomerName } = useContractHelpers();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-2">
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
          </div>
          
          <div className="flex-1 space-y-2 mr-4">
            <div className="flex items-center gap-2 justify-end">
              <Badge className={getStatusColor(contract.status)}>
                {getStatusIcon(contract.status)}
                <span className="mr-1">
                  {contract.status === 'active' ? 'نشط' :
                   contract.status === 'draft' ? 'مسودة' :
                   contract.status === 'expired' ? 'منتهي' :
                   contract.status === 'suspended' ? 'معلق' :
                   contract.status === 'cancelled' ? 'ملغي' :
                   contract.status === 'renewed' ? 'مجدد' : contract.status}
                </span>
              </Badge>
              <h3 className="font-semibold text-lg">{contract.contract_number} عقد رقم</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm">
                   {getContractTypeLabel(contract.contract_type)}
                </span>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm">
                  {formatDateInGregorian(contract.start_date)} - {formatDateInGregorian(contract.end_date)}
                </span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-medium">
                  {contract.contract_amount?.toFixed(3)} د.ك
                </span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm">
                  {getCustomerName(contract.customers)}
                </span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {contract.description && (
              <p className="text-sm text-muted-foreground text-right">{contract.description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};