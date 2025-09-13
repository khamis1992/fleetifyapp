import React, { useState } from 'react';
import { Property } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPin,
  Home,
  Bed,
  Bath,
  Car,
  Ruler,
  Calendar,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Star,
  DollarSign,
  Wrench,
} from 'lucide-react';
import { PropertyStatusBadge } from './PropertyStatusBadge';
import { PropertyMaintenanceForm } from './PropertyMaintenanceForm';
import { PropertyAccountingIntegration } from '@/components/property/PropertyAccountingIntegration';
import { useCurrencyFormatter } from '@/modules/core/hooks/useCurrencyFormatter';
import { formatDateInGregorian } from '@/modules/core/utils/dateUtils';
import { usePropertyContracts, usePropertyPayments } from '../hooks';

interface PropertyDetailsViewProps {
  property: Property;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  property,
  onEdit,
  onDelete,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();
  
  // Get property contracts and payments
  const { data: contracts = [] } = usePropertyContracts(property.id);
  const { data: payments = [] } = usePropertyPayments();

  const propertyTypeLabels = {
    apartment: 'شقة',
    villa: 'فيلا',
    office: 'مكتب',
    shop: 'محل تجاري',
    warehouse: 'مستودع',
    land: 'أرض',
  };

  const conditionLabels = {
    excellent: 'ممتاز',
    very_good: 'جيد جداً',
    good: 'جيد',
    fair: 'مقبول',
    poor: 'سيء',
  };

  const images = property.images || [];
  const hasImages = images.length > 0;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{property.property_name}</h1>
          <p className="text-muted-foreground flex items-center mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            {property.address}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowMaintenanceForm(true)}
            variant="outline"
            className="gap-2"
          >
            <Wrench className="h-4 w-4" />
            طلب صيانة
          </Button>
          {onEdit && (
            <Button onClick={onEdit}>
              تعديل العقار
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              حذف العقار
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الصور */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>صور العقار</CardTitle>
          </CardHeader>
          <CardContent>
            {hasImages ? (
              <div className="space-y-4">
                {/* الصورة الرئيسية */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={images[currentImageIndex]}
                    alt={`صورة العقار ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* أزرار التنقل */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* مؤشر الصورة الحالية */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                      <Badge variant="secondary">
                        {currentImageIndex + 1} / {images.length}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* الصور المصغرة */}
                {images.length > 1 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`
                          aspect-square rounded-md overflow-hidden border-2 transition-colors
                          ${index === currentImageIndex 
                            ? 'border-primary' 
                            : 'border-transparent hover:border-muted-foreground'
                          }
                        `}
                      >
                        <img
                          src={image}
                          alt={`صورة مصغرة ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* معاينة الصورة بالحجم الكامل */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      عرض بالحجم الكامل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>
                        صورة العقار {currentImageIndex + 1}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video">
                      <img
                        src={images[currentImageIndex]}
                        alt={`صورة العقار ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد صور متاحة لهذا العقار</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* المعلومات الأساسية */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل العقار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* رقم العقار والحالة */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-muted-foreground">رقم العقار</span>
                <p className="font-mono font-medium">{property.property_code}</p>
              </div>
              <PropertyStatusBadge status={property.property_status as any} />
            </div>

            <Separator />

            {/* نوع العقار وحالته */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">نوع العقار</span>
                <p className="flex items-center mt-1">
                  <Home className="h-4 w-4 mr-1" />
                  {propertyTypeLabels[property.property_type]}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">حالة العقار</span>
                <p className="mt-1">جيد</p>
              </div>
            </div>

            <Separator />

            {/* المواصفات */}
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">المواصفات</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center">
                  <Ruler className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{property.area_sqm || 0} م²</span>
                </div>
                <div className="flex items-center">
                  <Bed className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{property.bedrooms} غرفة</span>
                </div>
                <div className="flex items-center">
                  <Bath className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{property.bathrooms} حمام</span>
                </div>
                <div className="flex items-center">
                  <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{property.parking_spaces} موقف</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* الميزات */}
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">الميزات</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  {property.furnished ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  )}
                  <span className="text-sm">مفروش</span>
                </div>
                <div className="flex items-center">
                  {false ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  )}
                  <span className="text-sm">مصعد</span>
                </div>
                <div className="flex items-center">
                  {false ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  )}
                  <span className="text-sm">حديقة</span>
                </div>
                <div className="flex items-center">
                  {false ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  )}
                  <span className="text-sm">مسبح</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* تاريخ الإنشاء */}
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">تاريخ الإضافة:</span>
              <span className="text-sm mr-2">{formatDateInGregorian(property.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* معلومات المالك */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات المالك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {property.property_owners ? (
              <>
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{property.property_owners.full_name_ar}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.property_owners.full_name}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">رقم المالك:</span>
                    <span className="text-sm mr-2 font-mono">
                      {property.property_owners?.owner_code}
                    </span>
                  </div>

                  {property.property_owners?.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">الهاتف:</span>
                      <span className="text-sm mr-2 font-mono">
                        {property.property_owners.phone}
                      </span>
                    </div>
                  )}

                  {property.property_owners?.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">البريد:</span>
                      <span className="text-sm mr-2">
                        {property.property_owners.email}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                لا توجد معلومات المالك متاحة
              </p>
            )}
          </CardContent>
        </Card>

        {/* الأسعار */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الأسعار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {property.sale_price && property.sale_price > 0 && (
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">سعر البيع</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(property.sale_price)}
                  </p>
                  {property.area_sqm && property.area_sqm > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(property.sale_price / property.area_sqm)} / م²
                    </p>
                  )}
                </div>
              )}

              {property.rental_price && property.rental_price > 0 && (
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">سعر الإيجار الشهري</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(property.rental_price)}
                  </p>
                  {property.area_sqm && property.area_sqm > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(property.rental_price / property.area_sqm)} / م²
                    </p>
                  )}
                </div>
              )}

              {(!property.sale_price || property.sale_price === 0) && 
               (!property.rental_price || property.rental_price === 0) && (
                <div className="col-span-full text-center p-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لم يتم تحديد أسعار لهذا العقار</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* الوصف والملاحظات */}
        {property.description && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>وصف العقار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {property.description && (
                <div>
                  <h4 className="font-medium mb-2">الوصف</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* قسم التكامل المحاسبي */}
        {(contracts.length > 0 || payments.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                التكامل المحاسبي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* عرض العقود النشطة مع قيودها المحاسبية */}
                {contracts.filter(c => c.status === 'active').map((contract) => (
                  <PropertyAccountingIntegration
                    key={contract.id}
                    contract={contract}
                    onViewJournalEntry={(id) => {
                      // Navigate to journal entry
                      window.open(`/finance/journal-entries/${id}`, '_blank');
                    }}
                  />
                ))}
                
                {/* عرض آخر الدفعات مع قيودها المحاسبية */}
                {payments.slice(0, 3).map((payment) => (
                  <PropertyAccountingIntegration
                    key={payment.id}
                    payment={payment}
                    onViewJournalEntry={(id) => {
                      // Navigate to journal entry
                      window.open(`/finance/journal-entries/${id}`, '_blank');
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* نموذج طلب الصيانة */}
      <PropertyMaintenanceForm
        open={showMaintenanceForm}
        onOpenChange={setShowMaintenanceForm}
        propertyId={property.id}
        onSuccess={() => setShowMaintenanceForm(false)}
      />
    </div>
  );
};