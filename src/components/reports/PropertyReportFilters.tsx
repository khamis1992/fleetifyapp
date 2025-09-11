import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface PropertyReportFilters {
  dateRange: {
    from?: Date;
    to?: Date;
  };
  propertyType: string;
  location: string;
  status: string;
  ownerId: string;
  priceRange: {
    min?: number;
    max?: number;
  };
  reportType: string;
}

interface PropertyReportFiltersProps {
  filters: PropertyReportFilters;
  onFiltersChange: (filters: PropertyReportFilters) => void;
  onClearFilters: () => void;
}

export const PropertyReportFilters: React.FC<PropertyReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const updateFilter = (key: keyof PropertyReportFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (typeof value === 'string') return value !== '';
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined && v !== '' && v !== null);
    }
    return false;
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر التقارير
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              مسح الفلاتر
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* نوع التقرير */}
        <div className="space-y-2">
          <Label htmlFor="reportType">نوع التقرير</Label>
          <Select
            value={filters.reportType}
            onValueChange={(value) => updateFilter('reportType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع التقرير" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financial">التقارير المالية</SelectItem>
              <SelectItem value="occupancy">تقارير الإشغال</SelectItem>
              <SelectItem value="performance">تقارير الأداء</SelectItem>
              <SelectItem value="portfolio">تقارير المحفظة</SelectItem>
              <SelectItem value="owners">تقارير الملاك</SelectItem>
              <SelectItem value="tenants">تقارير المستأجرين</SelectItem>
              <SelectItem value="maintenance">تقارير الصيانة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* نطاق التاريخ */}
        <div className="space-y-2">
          <Label>نطاق التاريخ</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    format(filters.dateRange.from, "PPP", { locale: ar })
                  ) : (
                    "من تاريخ"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, from: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.to ? (
                    format(filters.dateRange.to, "PPP", { locale: ar })
                  ) : (
                    "إلى تاريخ"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, to: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* نوع العقار */}
        <div className="space-y-2">
          <Label htmlFor="propertyType">نوع العقار</Label>
          <Select
            value={filters.propertyType}
            onValueChange={(value) => updateFilter('propertyType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">جميع الأنواع</SelectItem>
              <SelectItem value="residential">سكني</SelectItem>
              <SelectItem value="commercial">تجاري</SelectItem>
              <SelectItem value="office">مكاتب</SelectItem>
              <SelectItem value="warehouse">مخازن</SelectItem>
              <SelectItem value="retail">محلات تجارية</SelectItem>
              <SelectItem value="industrial">صناعي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* الموقع */}
        <div className="space-y-2">
          <Label htmlFor="location">المنطقة</Label>
          <Select
            value={filters.location}
            onValueChange={(value) => updateFilter('location', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع المناطق" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">جميع المناطق</SelectItem>
              <SelectItem value="hawally">حولي</SelectItem>
              <SelectItem value="farwaniya">الفروانية</SelectItem>
              <SelectItem value="ahmadi">الأحمدي</SelectItem>
              <SelectItem value="jahra">الجهراء</SelectItem>
              <SelectItem value="mubarak_alkabeer">مبارك الكبير</SelectItem>
              <SelectItem value="capital">العاصمة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* حالة العقار */}
        <div className="space-y-2">
          <Label htmlFor="status">حالة العقار</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">جميع الحالات</SelectItem>
              <SelectItem value="occupied">مؤجر</SelectItem>
              <SelectItem value="vacant">شاغر</SelectItem>
              <SelectItem value="maintenance">تحت الصيانة</SelectItem>
              <SelectItem value="available">متاح للإيجار</SelectItem>
              <SelectItem value="sale">للبيع</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* نطاق السعر */}
        <div className="space-y-2">
          <Label>نطاق السعر (دينار كويتي)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="الحد الأدنى"
              type="number"
              value={filters.priceRange.min || ''}
              onChange={(e) => updateFilter('priceRange', {
                ...filters.priceRange,
                min: e.target.value ? Number(e.target.value) : undefined
              })}
            />
            <Input
              placeholder="الحد الأعلى"
              type="number"
              value={filters.priceRange.max || ''}
              onChange={(e) => updateFilter('priceRange', {
                ...filters.priceRange,
                max: e.target.value ? Number(e.target.value) : undefined
              })}
            />
          </div>
        </div>

        {/* عدد الفلاتر النشطة */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              الفلاتر النشطة: {Object.values(filters).filter(value => {
                if (typeof value === 'string') return value !== '';
                if (typeof value === 'object' && value !== null) {
                  return Object.values(value).some(v => v !== undefined && v !== '' && v !== null);
                }
                return false;
              }).length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};