import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { 
  Car, 
  Search, 
  Filter, 
  X, 
  Check, 
  Calendar as CalendarIcon,
  DollarSign,
  Fuel,
  Users,
  Gauge,
  ImageOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface VehicleGalleryItem {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  status: 'available' | 'rented' | 'maintenance' | 'reserved';
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  seating_capacity?: number;
  fuel_type?: string;
  transmission_type?: string;
  current_mileage?: number;
  image_url?: string;
  vehicle_category?: string;
}

interface VehicleGallerySelectorProps {
  vehicles: VehicleGalleryItem[];
  selectedVehicleId?: string;
  onSelect: (vehicleId: string) => void;
  onClose?: () => void;
  showPricing?: boolean;
  filterByAvailability?: boolean;
}

const statusConfig = {
  available: { label: 'متاحة', color: 'bg-green-500', textColor: 'text-green-700' },
  rented: { label: 'مؤجرة', color: 'bg-red-500', textColor: 'text-red-700' },
  maintenance: { label: 'صيانة', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  reserved: { label: 'محجوزة', color: 'bg-blue-500', textColor: 'text-blue-700' },
  reserved_employee: { label: 'محجوزة لموظف', color: 'bg-indigo-500', textColor: 'text-indigo-700' }
};

export function VehicleGallerySelector({
  vehicles,
  selectedVehicleId,
  onSelect,
  onClose,
  showPricing = true,
  filterByAvailability = true
}: VehicleGallerySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(filterByAvailability ? 'available' : 'all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedVehicleForCalendar, setSelectedVehicleForCalendar] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Extract unique vehicle types
  const vehicleTypes = useMemo(() => {
    const types = new Set<string>();
    vehicles.forEach(v => {
      if (v.vehicle_category) types.add(v.vehicle_category);
    });
    return ['all', ...Array.from(types)];
  }, [vehicles]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Search filter
      const matchesSearch = !searchQuery || 
        vehicle.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = selectedType === 'all' || vehicle.vehicle_category === selectedType;

      // Status filter
      const matchesStatus = selectedStatus === 'all' || vehicle.status === selectedStatus;

      // Price filter
      let matchesPrice = true;
      if (priceRange !== 'all' && vehicle.daily_rate) {
        const price = vehicle.daily_rate;
        switch (priceRange) {
          case 'low':
            matchesPrice = price < 100;
            break;
          case 'medium':
            matchesPrice = price >= 100 && price < 200;
            break;
          case 'high':
            matchesPrice = price >= 200;
            break;
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesPrice;
    });
  }, [vehicles, searchQuery, selectedType, selectedStatus, priceRange]);

  const handleVehicleSelect = (vehicleId: string) => {
    onSelect(vehicleId);
    if (onClose) onClose();
  };

  const handleShowCalendar = (vehicleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicleForCalendar(vehicleId);
    setShowCalendar(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedStatus(filterByAvailability ? 'available' : 'all');
    setPriceRange('all');
  };

  const activeFiltersCount = [
    searchQuery !== '',
    selectedType !== 'all',
    selectedStatus !== (filterByAvailability ? 'available' : 'all'),
    priceRange !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters Header */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">تصفية المركبات</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} فلاتر نشطة</Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 ml-2" />
              مسح الكل
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم اللوحة، الماركة، أو الطراز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Vehicle Type */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="نوع المركبة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {vehicleTypes.filter(t => t !== 'all').map(type => (
                <SelectItem key={type} value={type}>
                  {type === 'sedan' ? 'سيدان' :
                   type === 'suv' ? 'دفع رباعي' :
                   type === 'truck' ? 'شاحنة' :
                   type === 'van' ? 'فان' : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="حالة المركبة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="available">متاحة</SelectItem>
              <SelectItem value="rented">مؤجرة</SelectItem>
              <SelectItem value="maintenance">صيانة</SelectItem>
              <SelectItem value="reserved">محجوزة</SelectItem>
              <SelectItem value="reserved_employee">محجوزة لموظف</SelectItem>
            </SelectContent>
          </Select>

          {/* Price Range */}
          {showPricing && (
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="نطاق السعر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأسعار</SelectItem>
                <SelectItem value="low">أقل من 100 د.ك/يوم</SelectItem>
                <SelectItem value="medium">100-200 د.ك/يوم</SelectItem>
                <SelectItem value="high">أكثر من 200 د.ك/يوم</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>عرض {filteredVehicles.length} من {vehicles.length} مركبة</span>
        {selectedVehicleId && (
          <Badge variant="outline">
            <Check className="h-3 w-3 ml-1" />
            تم الاختيار
          </Badge>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVehicles.map((vehicle) => {
          const isSelected = vehicle.id === selectedVehicleId;
          const statusInfo = statusConfig[vehicle.status];

          return (
            <Card
              key={vehicle.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg group relative overflow-hidden",
                isSelected && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => handleVehicleSelect(vehicle.id)}
            >
              {/* Vehicle Image */}
              <div className="relative h-48 bg-muted overflow-hidden">
                {vehicle.image_url ? (
                  <img
                    src={vehicle.image_url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <ImageOff className="h-12 w-12 mb-2" />
                    <span className="text-sm">لا توجد صورة</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge className={cn("text-white", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary text-white">
                      <Check className="h-3 w-3 ml-1" />
                      محدد
                    </Badge>
                  </div>
                )}

                {/* Calendar Button */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleShowCalendar(vehicle.id, e)}
                >
                  <CalendarIcon className="h-4 w-4 ml-1" />
                  التوفر
                </Button>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Vehicle Info */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-lg">
                      {vehicle.plate_number}
                    </span>
                    <Car className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </p>
                  {vehicle.color && (
                    <p className="text-xs text-muted-foreground">اللون: {vehicle.color}</p>
                  )}
                </div>

                {/* Specifications */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {vehicle.seating_capacity && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{vehicle.seating_capacity} مقاعد</span>
                    </div>
                  )}
                  {vehicle.fuel_type && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Fuel className="h-3 w-3" />
                      <span>{vehicle.fuel_type === 'gasoline' ? 'بنزين' : 
                             vehicle.fuel_type === 'diesel' ? 'ديزل' : 
                             vehicle.fuel_type === 'electric' ? 'كهربائي' : vehicle.fuel_type}</span>
                    </div>
                  )}
                  {vehicle.transmission_type && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      <span>{vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'مانيوال'}</span>
                    </div>
                  )}
                  {vehicle.current_mileage && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      <span>{vehicle.current_mileage.toLocaleString()} كم</span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                {showPricing && (vehicle.daily_rate || vehicle.weekly_rate || vehicle.monthly_rate) && (
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs font-medium">الأسعار</span>
                    </div>
                    {vehicle.daily_rate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">يومي:</span>
                        <span className="font-semibold">{vehicle.daily_rate.toLocaleString()} د.ك</span>
                      </div>
                    )}
                    {vehicle.weekly_rate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">أسبوعي:</span>
                        <span className="font-semibold">{vehicle.weekly_rate.toLocaleString()} د.ك</span>
                      </div>
                    )}
                    {vehicle.monthly_rate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">شهري:</span>
                        <span className="font-semibold">{vehicle.monthly_rate.toLocaleString()} د.ك</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredVehicles.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Car className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="font-semibold text-lg mb-2">لا توجد مركبات</h3>
              <p className="text-sm text-muted-foreground mb-4">
                لم يتم العثور على مركبات تطابق الفلاتر المحددة
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 ml-2" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">توفر المركبة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVehicleForCalendar && (() => {
              const vehicle = vehicles.find(v => v.id === selectedVehicleForCalendar);
              return vehicle ? (
                <>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="font-semibold">{vehicle.plate_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </p>
                    <Badge className={cn("mt-2", statusConfig[vehicle.status].color)}>
                      {statusConfig[vehicle.status].label}
                    </Badge>
                  </div>

                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    locale={ar}
                    className="rounded-md border"
                    disabled={(date) => {
                      // Disable past dates
                      return date < new Date(new Date().setHours(0, 0, 0, 0));
                    }}
                  />

                  {selectedDates.length > 0 && (
                    <div className="text-sm text-muted-foreground text-center">
                      التواريخ المحددة: {selectedDates.length}
                    </div>
                  )}

                  <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
                    <p className="mb-1">💡 تلميح:</p>
                    <ul className="list-disc list-inside space-y-1 mr-2">
                      <li>الأيام الخضراء: متاحة</li>
                      <li>الأيام الحمراء: محجوزة</li>
                      <li>الأيام الرمادية: غير متاحة</li>
                    </ul>
                  </div>
                </>
              ) : null;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
