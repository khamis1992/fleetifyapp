import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Building2, Phone, Mail, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { DuplicateCustomer } from '@/hooks/useCustomerDuplicateCheck';
import { useNavigate } from 'react-router-dom';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface DuplicateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateCustomer[];
  onProceedAnyway?: () => void;
  onCancel?: () => void;
  allowProceed?: boolean;
}

const getFieldLabel = (field: string) => {
  switch (field) {
    case 'national_id':
      return 'البطاقة المدنية';
    case 'passport_number':
      return 'رقم الجواز';
    case 'phone':
      return 'رقم الهاتف';
    case 'email':
      return 'البريد الإلكتروني';
    case 'company_details':
      return 'بيانات الشركة';
    default:
      return field;
  }
};

const getFieldIcon = (field: string) => {
  switch (field) {
    case 'national_id':
      return <CreditCard className="h-4 w-4" />;
    case 'passport_number':
      return <FileText className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'company_details':
      return <Building2 className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

export const DuplicateCustomerDialog: React.FC<DuplicateCustomerDialogProps> = ({
  open,
  onOpenChange,
  duplicates,
  onProceedAnyway,
  onCancel,
  allowProceed = false
}) => {
  const navigate = useNavigate();
  const { companyId } = useUnifiedCompanyAccess();

  const handleViewCustomer = (customerId: string) => {
    navigate(`/customers/${customerId}`);
    onOpenChange(false);
  };

  const handleProceed = () => {
    if (onProceedAnyway) {
      onProceedAnyway();
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            تم العثور على عملاء مشابهين
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-muted-foreground">
            تم العثور على {duplicates.length} عميل(عملاء) مشابه(ين) في النظام. يرجى مراجعة البيانات قبل المتابعة.
          </div>


          <div className="space-y-3 max-h-96 overflow-y-auto">
            {duplicates.map((duplicate, index) => {
              const isFromDifferentCompany = duplicate.company_id !== companyId;
              
              return (
                <div
                  key={`${duplicate.id}-${index}`}
                  className={`border rounded-lg p-4 ${
                    isFromDifferentCompany 
                      ? 'bg-destructive/5 border-destructive/20' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {duplicate.customer_type === 'individual' ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Building2 className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium">{duplicate.name}</span>
                      {isFromDifferentCompany && (
                        <Badge variant="destructive" className="text-xs">
                          شركة أخرى
                        </Badge>
                      )}
                    </div>
                    <Badge variant={duplicate.customer_type === 'individual' ? 'default' : 'secondary'}>
                      {duplicate.customer_type === 'individual' ? 'فرد' : 'شركة'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    {getFieldIcon(duplicate.duplicate_field)}
                    <span>
                      تطابق في {getFieldLabel(duplicate.duplicate_field)}: 
                      <span className="font-medium text-foreground mr-1">
                        {duplicate.duplicate_value}
                      </span>
                    </span>
                  </div>

                   {/* معلومات الشركة */}
                   <div className="text-xs text-muted-foreground mb-3 space-y-1">
                     {duplicate.company_name && (
                       <div>اسم الشركة: {duplicate.company_name}</div>
                     )}
                    {isFromDifferentCompany && (
                      <div className="text-destructive font-medium">
                        ⚠️ هذا العميل ينتمي لشركة أخرى
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCustomer(duplicate.id)}
                      className="flex-1"
                      disabled={isFromDifferentCompany}
                    >
                      {isFromDifferentCompany ? 'غير متاح' : 'عرض بيانات العميل'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {allowProceed && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-warning text-sm font-medium mb-1">
                <AlertTriangle className="h-4 w-4" />
                تحذير
              </div>
              <div className="text-sm text-muted-foreground">
                يمكنك المتابعة مع إنشاء العميل على الرغم من وجود بيانات مشابهة، لكن ننصح بمراجعة العملاء الموجودين أولاً.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            إلغاء
          </Button>
          
          {allowProceed && (
            <Button 
              variant="destructive" 
              onClick={handleProceed}
              className="bg-warning hover:bg-warning/90"
            >
              متابعة على أي حال
            </Button>
          )}
          
          <Button variant="default" onClick={handleCancel}>
            مراجعة العملاء الموجودين
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};