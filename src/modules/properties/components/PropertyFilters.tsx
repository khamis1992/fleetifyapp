import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PropertySearchFilters as FilterType, PropertyType, PropertyStatus } from '../types';

interface PropertySearchFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onReset: () => void;
}

export const PropertyFilters: React.FC<PropertySearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.property_type) count++;
    if (filters.property_status) count++;
    if (filters.area) count++;
    if (filters.min_rent || filters.max_rent) count++;
    if (filters.min_area || filters.max_area) count++;
    if (filters.owner_id) count++;
    if (filters.furnished !== undefined) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في العقارات..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              تصفية
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">تصفية العقارات</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onReset();
                    setIsOpen(false);
                  }}
                  className="h-auto p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <Label>نوع العقار</Label>
                <Select 
                  value={Array.isArray(filters.property_type) ? '' : (filters.property_type || '')} 
                  onValueChange={(value) => updateFilter('property_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العقار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">شقة</SelectItem>
                    <SelectItem value="villa">فيلا</SelectItem>
                    <SelectItem value="office">مكتب</SelectItem>
                    <SelectItem value="shop">محل</SelectItem>
                    <SelectItem value="warehouse">مستودع</SelectItem>
                    <SelectItem value="land">أرض</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select 
                  value={Array.isArray(filters.property_status) ? '' : (filters.property_status || '')} 
                  onValueChange={(value) => updateFilter('property_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">متاح</SelectItem>
                    <SelectItem value="rented">مؤجر</SelectItem>
                    <SelectItem value="for_sale">للبيع</SelectItem>
                    <SelectItem value="maintenance">تحت الصيانة</SelectItem>
                    <SelectItem value="reserved">محجوز</SelectItem>
                    <SelectItem value="sold">مباع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label>المنطقة</Label>
                <Input
                  placeholder="اسم المنطقة"
                  value={filters.area || ''}
                  onChange={(e) => updateFilter('area', e.target.value)}
                />
              </div>

              {/* Rent Price Range */}
              <div className="space-y-2">
                <Label>نطاق سعر الإيجار</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="الحد الأدنى"
                    value={filters.min_rent || ''}
                    onChange={(e) => updateFilter('min_rent', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="الحد الأقصى"
                    value={filters.max_rent || ''}
                    onChange={(e) => updateFilter('max_rent', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>


              {/* Area Range */}
              <div className="space-y-2">
                <Label>نطاق المساحة (م²)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="الحد الأدنى"
                    value={filters.min_area || ''}
                    onChange={(e) => updateFilter('min_area', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="الحد الأقصى"
                    value={filters.max_area || ''}
                    onChange={(e) => updateFilter('max_area', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>


              {/* Furnished */}
              <div className="space-y-2">
                <Label>مفروش</Label>
                <Select 
                  value={filters.furnished?.toString() || ''} 
                  onValueChange={(value) => updateFilter('furnished', value === 'true' ? true : value === 'false' ? false : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مفروش</SelectItem>
                    <SelectItem value="false">غير مفروش</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onReset();
                    setIsOpen(false);
                  }}
                  className="flex-1"
                >
                  إعادة تعيين
                </Button>
                <Button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  تطبيق
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.property_type && (
            <Badge variant="secondary" className="gap-2">
              نوع: {filters.property_type === 'apartment' ? 'شقة' : 
                    filters.property_type === 'villa' ? 'فيلا' :
                    filters.property_type === 'office' ? 'مكتب' :
                    filters.property_type === 'warehouse' ? 'مستودع' :
                    filters.property_type === 'land' ? 'أرض' : filters.property_type}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('property_type', undefined)}
              />
            </Badge>
          )}
          
          {filters.property_status && (
            <Badge variant="secondary" className="gap-2">
              الحالة: {filters.property_status === 'available' ? 'متاح' :
                      filters.property_status === 'rented' ? 'مؤجر' :
                      filters.property_status === 'for_sale' ? 'للبيع' : filters.property_status}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('property_status', undefined)}
              />
            </Badge>
          )}

          {filters.area && (
            <Badge variant="secondary" className="gap-2">
              المنطقة: {filters.area}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('area', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};