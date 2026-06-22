/**
 * Vehicle Gallery Component
 * Visual vehicle selection with images, filters, and availability calendar
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Car,
  Search,
  Filter,
  Check,
  Calendar,
  Fuel,
  Users,
  Gauge,
  ChevronLeft,
  ChevronRight,
  X,
  ImageOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// Types
interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  image_url?: string;
  daily_rate?: number;
  status: 'available' | 'rented' | 'maintenance' | 'reserved';
  fuel_type?: string;
  seats?: number;
  mileage?: number;
  transmission?: string;
}

interface VehicleGalleryProps {
  /** List of vehicles */
  vehicles: Vehicle[];
  /** Loading state */
  isLoading?: boolean;
  /** Selected vehicle ID */
  selectedVehicleId?: string;
  /** Callback when vehicle is selected */
  onSelect: (vehicleId: string) => void;
  /** Show only available vehicles */
  availableOnly?: boolean;
  /** Date range for availability check */
  dateRange?: { start: string; end: string };
  /** Compact mode (smaller cards) */
  compact?: boolean;
  /** Grid columns */
  columns?: 2 | 3 | 4;
}

// Status badge component
const StatusBadge: React.FC<{ status: Vehicle['status'] }> = ({ status }) => {
  const config = {
    available: { label: 'متاح', color: 'bg-green-100 text-green-800' },
    rented: { label: 'مؤجر', color: 'bg-red-100 text-red-800' },
    maintenance: { label: 'صيانة', color: 'bg-amber-100 text-amber-800' },
    reserved: { label: 'محجوز', color: 'bg-blue-100 text-blue-800' },
    reserved_employee: { label: 'محجوز لموظف', color: 'bg-indigo-100 text-indigo-800' },
  };

  return (
    <Badge className={cn('text-xs', config[status].color)}>
      {config[status].label}
    </Badge>
  );
};

// Vehicle Card Component
const VehicleCard: React.FC<{
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}> = ({ vehicle, isSelected, onSelect, compact }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const [imageError, setImageError] = useState(false);

  const isAvailable = vehicle.status === 'available';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isAvailable}
      className={cn(
        'w-full rounded-xl overflow-hidden border-2 transition-all text-right',
        isAvailable && 'hover:border-coral-300 hover:shadow-md cursor-pointer',
        isSelected && 'border-rose-500 shadow-lg ring-2 ring-rose-500/20',
        !isSelected && 'border-neutral-200',
        !isAvailable && 'opacity-60 cursor-not-allowed'
      )}
    >
      {/* Image */}
      <div className={cn(
        'relative bg-neutral-100',
        compact ? 'h-32' : 'h-40'
      )}>
        {vehicle.image_url && !imageError ? (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="h-12 w-12 text-neutral-300" />
          </div>
        )}

        {/* Status Badge - Top Right */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={vehicle.status} />
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2 p-1.5 bg-rose-500 rounded-full">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Price Badge - Bottom */}
        {vehicle.daily_rate && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-lg">
            <span className="text-white text-sm font-semibold">
              {formatCurrency(vehicle.daily_rate)}/يوم
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className={cn('p-3', compact && 'p-2')}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={cn(
              'font-bold text-neutral-900',
              compact ? 'text-sm' : 'text-base'
            )}>
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-xs text-neutral-500">{vehicle.year}</p>
          </div>
          <span className={cn(
            'text-neutral-400 font-mono',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {vehicle.plate_number}
          </span>
        </div>

        {/* Quick Stats */}
        {!compact && (
          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
            {vehicle.fuel_type && (
              <span className="flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                {vehicle.fuel_type === 'petrol' ? 'بنزين' : 
                 vehicle.fuel_type === 'diesel' ? 'ديزل' : 
                 vehicle.fuel_type === 'electric' ? 'كهربائي' : vehicle.fuel_type}
              </span>
            )}
            {vehicle.seats && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {vehicle.seats} مقاعد
              </span>
            )}
            {vehicle.mileage && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {Math.round(vehicle.mileage / 1000)}K كم
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// Loading Skeleton
const VehicleSkeleton: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <Card>
    <Skeleton className={cn('w-full', compact ? 'h-32' : 'h-40')} />
    <CardContent className="p-3 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardContent>
  </Card>
);

// Main Component
export const VehicleGallery: React.FC<VehicleGalleryProps> = ({
  vehicles,
  isLoading,
  selectedVehicleId,
  onSelect,
  availableOnly = false,
  dateRange,
  compact = false,
  columns = 3,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [makeFilter, setMakeFilter] = useState<string>('all');

  // Get unique makes for filter
  const uniqueMakes = useMemo(() => {
    const makes = new Set(vehicles.map((v) => v.make));
    return Array.from(makes).sort();
  }, [vehicles]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          vehicle.plate_number.toLowerCase().includes(query) ||
          vehicle.make.toLowerCase().includes(query) ||
          vehicle.model.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (availableOnly && vehicle.status !== 'available') return false;
      if (statusFilter !== 'all' && vehicle.status !== statusFilter) return false;

      // Make filter
      if (makeFilter !== 'all' && vehicle.make !== makeFilter) return false;

      return true;
    });
  }, [vehicles, searchQuery, statusFilter, makeFilter, availableOnly]);

  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[columns];

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridClass)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <VehicleSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="ابحث برقم اللوحة أو الموديل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-neutral-400 hover:text-neutral-600" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        {!availableOnly && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="available">متاح</SelectItem>
              <SelectItem value="rented">مؤجر</SelectItem>
              <SelectItem value="maintenance">صيانة</SelectItem>
              <SelectItem value="reserved">محجوز</SelectItem>
              <SelectItem value="reserved_employee">محجوز لموظف</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Make Filter */}
        <Select value={makeFilter} onValueChange={setMakeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="الشركة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الشركات</SelectItem>
            {uniqueMakes.map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          {filteredVehicles.length} مركبة
          {availableOnly && ' متاحة'}
        </span>
        {dateRange && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {dateRange.start} إلى {dateRange.end}
          </span>
        )}
      </div>

      {/* Vehicle Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12">
          <Car className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-500">لا توجد مركبات مطابقة</p>
          <Button
            variant="link"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setMakeFilter('all');
            }}
          >
            إعادة ضبط الفلاتر
          </Button>
        </div>
      ) : (
        <div className={cn('grid gap-4', gridClass)}>
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedVehicleId === vehicle.id}
              onSelect={() => onSelect(vehicle.id)}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleGallery;

