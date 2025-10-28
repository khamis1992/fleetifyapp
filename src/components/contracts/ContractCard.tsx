import React from 'react';
import { RefreshCw, FileText, Calendar, DollarSign, Users, Settings, XCircle, Trash2, Car, FileEdit, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NativeCard, NativeCardContent } from '@/components/ui/native';
import { Badge } from '@/components/ui/badge';
import { useContractHelpers } from '@/hooks/useContractHelpers';
import { formatDateInGregorian } from '@/utils/dateFormatter';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { useContractValidationBadges, useContractIssuesCount } from '@/hooks/useContractValidationBadges';

interface ContractCardProps {
  contract: any;
  onRenew?: (contract: any) => void;
  onManageStatus?: (contract: any) => void;
  onViewDetails?: (contract: any) => void;
  onCancelContract?: (contract: any) => void;
  onDeleteContract?: (contract: any) => void;
  onAmendContract?: (contract: any) => void;
  showRenewButton?: boolean;
  showManageButton?: boolean;
  showCancelButton?: boolean;
  showDeleteButton?: boolean;
  showAmendButton?: boolean;
}

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  onRenew,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  onDeleteContract,
  onAmendContract,
  showRenewButton = false,
  showManageButton = false,
  showCancelButton = false,
  showDeleteButton = false,
  showAmendButton = true
}) => {
  const { getStatusColor, getStatusIcon, getContractTypeLabel, getCustomerName } = useContractHelpers();
  const { formatCurrency } = useCurrencyFormatter();
  const { isMobile } = useSimpleBreakpoint();
  const validationIssues = useContractValidationBadges(contract);
  const issuesCount = useContractIssuesCount(contract);

  const CardWrapper = isMobile ? NativeCard : Card;
  const ContentWrapper = isMobile ? NativeCardContent : CardContent;

  const hasIssues = validationIssues.length > 0;

  return (
    <CardWrapper 
      className={isMobile ? undefined : "hover:shadow-md transition-shadow font-cairo w-full"}
      {...(isMobile ? { pressable: true, ripple: true, variant: "elevated" as const } : {})}
    >
      <ContentWrapper className="p-4 md:p-6">
        <div className="space-y-4">
          {/* Contract header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-xl">
                عقد رقم{' '}
                <NumberDisplay value={contract.contract_number} className="inline" />
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Validation badges summary */}
              {hasIssues && (
                <div className="flex items-center gap-1">
                  {issuesCount.errors > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{issuesCount.errors}</span>
                    </Badge>
                  )}
                  {issuesCount.warnings > 0 && (
                    <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 bg-yellow-50">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{issuesCount.warnings}</span>
                    </Badge>
                  )}
                </div>
              )}
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
          </div>

          {/* Validation issues - detailed view */}
          {hasIssues && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h4 className="font-semibold text-sm text-red-900">
                  ملاحظات تحتاج معالجة ({validationIssues.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {validationIssues.map((issue, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded ${
                      issue.type === 'error'
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-yellow-50 border border-yellow-300'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{issue.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        issue.type === 'error' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {issue.message}
                      </p>
                    </div>
                    {issue.type === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    {issue.type === 'warning' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-700 mt-2">
                💡 اضغط على "عرض" أو "تعديل" لتحديث البيانات الناقصة
              </p>
            </div>
          )}

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
                  {formatCurrency(contract.contract_amount ?? 0)}
                </p>
                {contract.monthly_amount && (
                  <p className="text-sm text-muted-foreground mt-1">
                    الإيجار الشهري: <span className="font-semibold text-foreground">{formatCurrency(contract.monthly_amount)}</span>
                  </p>
                )}
              </div>
            </div>
            
            {/* Vehicle information */}
            {contract.vehicle && (
              <div className="flex items-center gap-3 md:col-span-2">
                <Car className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">المركبة</p>
                  <p className="font-medium truncate">
                    {contract.vehicle.make} {contract.vehicle.model} ({contract.vehicle.plate_number})
                  </p>
                </div>
              </div>
            )}
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
          <div className="flex gap-2 justify-end pt-2 border-t flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails?.(contract)}
            >
              عرض
            </Button>
            {showAmendButton && contract.status === 'active' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onAmendContract?.(contract)}
                className="border-blue-500 text-blue-700 hover:bg-blue-50"
              >
                <FileEdit className="h-4 w-4 mr-2" />
                تعديل
              </Button>
            )}
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
      </ContentWrapper>
    </CardWrapper>
  );
};