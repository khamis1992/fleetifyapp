import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Edit, Building, User, Calendar, DollarSign, FileText, Clock } from "lucide-react";
import { PropertyContract } from "@/modules/properties/types";
import { useProperties } from "@/modules/properties/hooks";
import { useTenants } from "@/modules/tenants/hooks";

interface PropertyContractDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: PropertyContract | null;
  onEdit?: () => void;
}

export function PropertyContractDetails({
  open,
  onOpenChange,
  contract,
  onEdit
}: PropertyContractDetailsProps) {
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();

  if (!contract) return null;

  const property = properties?.find(p => p.id === contract.property_id);
  const tenant = tenants?.find(t => t.id === contract.tenant_id);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "نشط", variant: "default" as const },
      pending: { label: "في الانتظار", variant: "secondary" as const },
      expired: { label: "منتهي", variant: "destructive" as const },
      cancelled: { label: "ملغي", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "secondary" as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getContractTypeName = (type: string) => {
    const types = {
      rental: "إيجار",
      sale: "بيع",
      lease: "تأجير طويل المدى"
    };
    return types[type as keyof typeof types] || type;
  };

  const getPaymentFrequencyName = (frequency: string) => {
    const frequencies = {
      monthly: "شهري",
      quarterly: "ربع سنوي",
      semi_annual: "نصف سنوي",
      annual: "سنوي"
    };
    return frequencies[frequency as keyof typeof frequencies] || frequency;
  };

  const getTenantName = () => {
    if (!tenant) return "غير محدد";
    return tenant.full_name || tenant.full_name_ar || "غير محدد";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>تفاصيل عقد الإيجار</DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(contract.status)}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">رقم العقد:</span>
                <span className="font-medium">{contract.contract_number}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">العقار:</span>
                <span className="font-medium">{property?.property_name || "غير محدد"}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">المستأجر:</span>
                <span className="font-medium">{getTenantName()}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">نوع العقد:</span>
                <span className="font-medium">{getContractTypeName(contract.contract_type)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">تكرار الدفع:</span>
                <span className="font-medium">{getPaymentFrequencyName(contract.payment_frequency)}</span>
              </div>
              
              {contract.grace_period_days && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">فترة السماح:</span>
                  <span className="font-medium">{contract.grace_period_days} يوم</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contract Dates */}
          <div>
            <h3 className="text-lg font-semibold mb-3">فترة العقد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">تاريخ البداية:</span>
                <span className="font-medium">
                  {format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">تاريخ النهاية:</span>
                <span className="font-medium">
                  {format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">المعلومات المالية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">مبلغ الإيجار:</span>
                <span className="font-medium text-lg">
                  {contract.rental_amount?.toLocaleString()} د.ك
                </span>
              </div>
              
              {contract.deposit_amount && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">مبلغ الضمان:</span>
                  <span className="font-medium">
                    {contract.deposit_amount.toLocaleString()} د.ك
                  </span>
                </div>
              )}
              
              {contract.commission_amount && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">العمولة:</span>
                  <span className="font-medium">
                    {contract.commission_amount.toLocaleString()} د.ك
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          {contract.terms && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">الشروط والأحكام</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm leading-6 whitespace-pre-wrap">
                    {contract.terms}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Property Details */}
          {property && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">تفاصيل العقار</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">العنوان:</span>
                    <p className="font-medium">{property.address || "غير محدد"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">النوع:</span>
                    <p className="font-medium">{property.property_type || "غير محدد"}</p>
                  </div>
                  {property.area_sqm && (
                    <div>
                      <span className="text-muted-foreground">المساحة:</span>
                      <p className="font-medium">{property.area_sqm} متر مربع</p>
                    </div>
                  )}
                  {property.bedrooms && (
                    <div>
                      <span className="text-muted-foreground">غرف النوم:</span>
                      <p className="font-medium">{property.bedrooms}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tenant Details */}
          {tenant && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">تفاصيل المستأجر</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الاسم:</span>
                    <p className="font-medium">{getTenantName()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">النوع:</span>
                    <p className="font-medium">
                      {tenant.tenant_type === 'individual' ? 'فرد' : 'شركة'}
                    </p>
                  </div>
                  {tenant.phone && (
                    <div>
                      <span className="text-muted-foreground">الهاتف:</span>
                      <p className="font-medium">{tenant.phone}</p>
                    </div>
                  )}
                  {tenant.email && (
                    <div>
                      <span className="text-muted-foreground">البريد الإلكتروني:</span>
                      <p className="font-medium">{tenant.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}