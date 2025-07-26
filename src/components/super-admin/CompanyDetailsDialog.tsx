import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  Settings,
  Edit,
  Globe,
  Clock,
  Navigation,
  Shield
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  commercial_register?: string;
  license_number?: string;
  subscription_status?: string;
  subscription_plan?: string;
  currency?: string;
  created_at?: string;
  office_latitude?: number;
  office_longitude?: number;
  allowed_radius?: number;
  work_start_time?: string;
  work_end_time?: string;
  auto_checkout_enabled?: boolean;
}

interface CompanyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onEdit: () => void;
}

export const CompanyDetailsDialog: React.FC<CompanyDetailsDialogProps> = ({
  open,
  onOpenChange,
  company,
  onEdit
}) => {
  if (!company) return null;

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'suspended': return 'معلق';
      default: return 'غير محدد';
    }
  };

  const getPlanLabel = (plan?: string) => {
    switch (plan) {
      case 'basic': return 'أساسي';
      case 'premium': return 'مميز';
      case 'enterprise': return 'مؤسسي';
      default: return 'غير محدد';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-KW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'غير محدد';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('ar-KW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              تفاصيل الشركة
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(company.subscription_status)}>
                {getStatusLabel(company.subscription_status)}
              </Badge>
              <Button onClick={onEdit} size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                تعديل
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                المعلومات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">اسم الشركة</p>
                    <p className="font-medium">{company.name}</p>
                  </div>
                  {company.name_ar && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">اسم الشركة بالعربية</p>
                      <p className="font-medium">{company.name_ar}</p>
                    </div>
                  )}
                  {company.commercial_register && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">السجل التجاري</p>
                      <p>{company.commercial_register}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {company.license_number && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">رقم الرخصة</p>
                      <p>{company.license_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">تاريخ الإنشاء</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(company.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">العملة</p>
                    <p className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {company.currency || 'KWD'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {company.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">البريد الإلكتروني</p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                          {company.email}
                        </a>
                      </p>
                    </div>
                  )}
                  {company.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">رقم الهاتف</p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                          {company.phone}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {company.city && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">المدينة</p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {company.city}
                      </p>
                    </div>
                  )}
                  {company.country && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">البلد</p>
                      <p className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {company.country}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {(company.address || company.address_ar) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {company.address && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">العنوان</p>
                        <p className="text-sm leading-relaxed">{company.address}</p>
                      </div>
                    )}
                    {company.address_ar && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">العنوان بالعربية</p>
                        <p className="text-sm leading-relaxed">{company.address_ar}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                معلومات الاشتراك
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">باقة الاشتراك</p>
                  <Badge variant="outline" className="text-sm">
                    {getPlanLabel(company.subscription_plan)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">حالة الاشتراك</p>
                  <Badge variant={getStatusVariant(company.subscription_status)}>
                    {getStatusLabel(company.subscription_status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">العملة</p>
                  <p>{company.currency || 'KWD'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Office Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                إعدادات المكتب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">مواعيد العمل</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>من {formatTime(company.work_start_time)} إلى {formatTime(company.work_end_time)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">تسجيل الخروج التلقائي</p>
                    <Badge variant={company.auto_checkout_enabled ? 'default' : 'secondary'}>
                      {company.auto_checkout_enabled ? 'مفعل' : 'غير مفعل'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {(company.office_latitude && company.office_longitude) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">موقع المكتب</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {company.office_latitude?.toFixed(6)}, {company.office_longitude?.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                  {company.allowed_radius && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">نطاق العمل المسموح</p>
                      <p className="text-sm">{company.allowed_radius} متر</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};