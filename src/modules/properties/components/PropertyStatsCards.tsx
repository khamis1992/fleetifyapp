import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  TrendingUp, 
  DollarSign, 
  Users,
  Building,
  MapPin,
  Percent,
  Calculator
} from 'lucide-react';
import { PropertyStats } from '../types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface PropertyStatsCardsProps {
  stats: PropertyStats;
  isLoading?: boolean;
}

export const PropertyStatsCards: React.FC<PropertyStatsCardsProps> = ({
  stats,
  isLoading = false,
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const occupancyRate = stats.total_properties > 0 
    ? ((stats.rented_properties / stats.total_properties) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إجمالي العقارات */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العقارات</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_properties}</div>
            <p className="text-xs text-muted-foreground">عقار مسجل</p>
          </CardContent>
        </Card>

        {/* العقارات المؤجرة */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقارات المؤجرة</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.rented_properties}</div>
            <p className="text-xs text-muted-foreground">
              {occupancyRate}% نسبة الإشغال
            </p>
          </CardContent>
        </Card>

        {/* العقارات المتاحة */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقارات المتاحة</CardTitle>
            <Home className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.available_properties}</div>
            <p className="text-xs text-muted-foreground">متاح للإيجار/البيع</p>
          </CardContent>
        </Card>

        {/* إجمالي الإيرادات */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_monthly_rent)}
            </div>
            <p className="text-xs text-muted-foreground">إيراد شهري متوقع</p>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات متقدمة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* نسبة الإشغال */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الإشغال</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 transition-all duration-300"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* متوسط سعر المتر */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط سعر المتر</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.average_rent_per_sqm)}
            </div>
            <p className="text-xs text-muted-foreground">{formatCurrency(1).replace(/[0-9.,\s]/g, '').trim()} / م²</p>
          </CardContent>
        </Card>

        {/* العقارات المباعة */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقارات المباعة</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.for_sale_properties}</div>
            <p className="text-xs text-muted-foreground">عقار مباع</p>
          </CardContent>
        </Card>

        {/* عدد الملاك */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد الملاك</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">مالك مسجل</p>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات حسب النوع */}
      {stats.properties_by_type && Object.keys(stats.properties_by_type).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              توزيع العقارات حسب النوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.properties_by_type).map(([type, count]) => {
                const typeLabels = {
                  apartment: 'شقق',
                  villa: 'فلل',
                  office: 'مكاتب',
                  shop: 'محلات',
                  warehouse: 'مستودعات',
                  land: 'أراضي',
                };

                return (
                  <div key={type} className="text-center">
                    <div className="text-lg font-bold">{count}</div>
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[type as keyof typeof typeLabels] || type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* إحصائيات حسب المنطقة */}
      {stats.properties_by_area && Object.keys(stats.properties_by_area).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              توزيع العقارات حسب المنطقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.properties_by_area).slice(0, 5).map(([area, count]) => (
                <div key={area} className="flex justify-between items-center">
                  <span className="text-sm">{area}</span>
                  <Badge variant="outline">{count} عقار</Badge>
                </div>
              ))}
              {Object.keys(stats.properties_by_area).length > 5 && (
                <div className="text-center pt-2">
                  <Badge variant="secondary">
                    +{Object.keys(stats.properties_by_area).length - 5} منطقة أخرى
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};