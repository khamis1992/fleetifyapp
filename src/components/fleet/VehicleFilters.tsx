import { useState } from 'react';
import { Search, Filter, X, Calendar, Wrench, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleFilters as IVehicleFilters, useVehicleMakes, useVehicleModels } from '@/hooks/useVehiclesPaginated';

interface VehicleFiltersProps {
  filters: IVehicleFilters;
  onFiltersChange: (filters: IVehicleFilters) => void;
  activeFiltersCount: number;
}

const statusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'available', label: 'متاحة' },
  { value: 'rented', label: 'مؤجرة' },
  { value: 'maintenance', label: 'قيد الصيانة' },
  { value: 'out_of_service', label: 'خارج الخدمة' },
  { value: 'reserved', label: 'محجوزة' },
  { value: 'reserved_employee', label: 'محجوزة لموظف' },
  { value: 'accident', label: 'حادث' },
  { value: 'stolen', label: 'مسروقة' },
  { value: 'police_station', label: 'في المخفر' }
];

const fuelTypeOptions = [
  { value: '', label: 'جميع أنواع الوقود' },
  { value: 'petrol', label: 'بنزين' },
  { value: 'diesel', label: 'ديزل' },
  { value: 'hybrid', label: 'هجين' },
  { value: 'electric', label: 'كهربائي' }
];

const transmissionOptions = [
  { value: '', label: 'جميع أنواع النقل' },
  { value: 'manual', label: 'يدوي' },
  { value: 'automatic', label: 'أوتوماتيك' },
  { value: 'cvt', label: 'CVT' }
];

export function VehicleFilters({ filters, onFiltersChange, activeFiltersCount }: VehicleFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { data: makes = [] } = useVehicleMakes();
  const { data: models = [] } = useVehicleModels(filters.make);

  const handleFilterChange = (key: keyof IVehicleFilters, value: unknown) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset model when make changes
    if (key === 'make') {
      newFilters.model = '';
    }
    
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getActiveFilters = () => {
    const active = [];
    if (filters.search) active.push({ key: 'search', label: `البحث: ${filters.search}`, value: filters.search });
    if (filters.status && filters.status !== 'all') active.push({ key: 'status', label: `الحالة: ${statusOptions.find(s => s.value === filters.status)?.label}`, value: filters.status });
    if (filters.make) active.push({ key: 'make', label: `الماركة: ${filters.make}`, value: filters.make });
    if (filters.model) active.push({ key: 'model', label: `الموديل: ${filters.model}`, value: filters.model });
    if (filters.yearFrom) active.push({ key: 'yearFrom', label: `من سنة: ${filters.yearFrom}`, value: filters.yearFrom });
    if (filters.yearTo) active.push({ key: 'yearTo', label: `إلى سنة: ${filters.yearTo}`, value: filters.yearTo });
    if (filters.fuelType) active.push({ key: 'fuelType', label: `الوقود: ${fuelTypeOptions.find(f => f.value === filters.fuelType)?.label}`, value: filters.fuelType });
    if (filters.transmission) active.push({ key: 'transmission', label: `النقل: ${transmissionOptions.find(t => t.value === filters.transmission)?.label}`, value: filters.transmission });
    if (filters.maintenanceDue) active.push({ key: 'maintenanceDue', label: 'صيانة مستحقة', value: true });
    if (filters.insuranceExpiring) active.push({ key: 'insuranceExpiring', label: 'تأمين منتهي', value: true });
    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="space-y-4">
      {/* Search and Main Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث برقم اللوحة، الماركة، أو الموديل..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="حالة المركبة" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              تصفية متقدمة
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">تصفية متقدمة</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    disabled={activeFiltersCount === 0}
                  >
                    مسح الكل
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Make and Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الماركة</Label>
                    <Select value={filters.make || ''} onValueChange={(value) => handleFilterChange('make', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الماركة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الماركات</SelectItem>
                        {makes.map((make) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>الموديل</Label>
                    <Select 
                      value={filters.model || ''} 
                      onValueChange={(value) => handleFilterChange('model', value)}
                      disabled={!filters.make}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموديل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الموديلات</SelectItem>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Year Range */}
                <div className="space-y-2">
                  <Label>نطاق السنة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="من سنة"
                      value={filters.yearFrom || ''}
                      onChange={(e) => handleFilterChange('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                      min="1990"
                      max="2030"
                    />
                    <Input
                      type="number"
                      placeholder="إلى سنة"
                      value={filters.yearTo || ''}
                      onChange={(e) => handleFilterChange('yearTo', e.target.value ? parseInt(e.target.value) : undefined)}
                      min="1990"
                      max="2030"
                    />
                  </div>
                </div>

                {/* Fuel Type and Transmission */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع الوقود</Label>
                    <Select value={filters.fuelType || ''} onValueChange={(value) => handleFilterChange('fuelType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="نوع الوقود" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>نوع النقل</Label>
                    <Select value={filters.transmission || ''} onValueChange={(value) => handleFilterChange('transmission', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="نوع النقل" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Special Filters */}
                <div className="space-y-3">
                  <Label>تصفية خاصة</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="maintenanceDue"
                        checked={filters.maintenanceDue || false}
                        onCheckedChange={(checked) => handleFilterChange('maintenanceDue', checked)}
                      />
                      <Label htmlFor="maintenanceDue" className="flex items-center">
                        <Wrench className="h-4 w-4 mr-2 text-yellow-600" />
                        صيانة مستحقة (خلال شهر)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="insuranceExpiring"
                        checked={filters.insuranceExpiring || false}
                        onCheckedChange={(checked) => handleFilterChange('insuranceExpiring', checked)}
                      />
                      <Label htmlFor="insuranceExpiring" className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-red-600" />
                        تأمين منتهي الصلاحية (خلال شهر)
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="flex items-center gap-1">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => handleFilterChange(filter.key as keyof IVehicleFilters, 
                  filter.key === 'maintenanceDue' || filter.key === 'insuranceExpiring' ? false : 
                  filter.key === 'status' ? 'all' : '')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}