# Widget Integration Example - FleetAvailability Widget

**Purpose:** Complete working example of integrating filters into a dashboard widget

---

## Original Widget (Before Filters)

```typescript
// src/components/dashboard/car-rental/FleetAvailabilityWidget.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVehicles } from '@/hooks/useVehicles';

export const FleetAvailabilityWidget: React.FC = () => {
  const { data: vehicles, isLoading } = useVehicles();

  const statusCounts = React.useMemo(() => {
    if (!vehicles) return [];
    // Calculate counts by status
    const counts = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [vehicles]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>توفر الأسطول</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display status counts */}
      </CardContent>
    </Card>
  );
};
```

---

## Updated Widget (With Filters)

```typescript
// src/components/dashboard/car-rental/FleetAvailabilityWidget.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { Car, Wrench, CheckCircle } from 'lucide-react';
import {
  FilterBar,
  DateRangePicker,
  MultiSelectFilter,
  AdvancedSearch,
  FilterPresets,
  useFilterState,
  type FilterState,
  type MultiSelectOption
} from '@/components/filters';

// ============================================================================
// Component
// ============================================================================

export const FleetAvailabilityWidget: React.FC = () => {
  const { data: vehicles, isLoading } = useVehicles();

  // ============================================================================
  // Filter State
  // ============================================================================

  const {
    filters,
    setDateRange,
    setMultiSelect,
    setSearch,
    resetFilters,
    applyPreset,
    activeFilterCount,
    isFiltering
  } = useFilterState({
    syncWithUrl: true,
    storageKey: 'fleet-availability-filters',
    debounceUrlUpdate: 500
  });

  // ============================================================================
  // Filter Options
  // ============================================================================

  const statusOptions: MultiSelectOption[] = useMemo(
    () => [
      { value: 'available', label: 'متاح', icon: CheckCircle, count: 0 },
      { value: 'rented', label: 'مؤجر', icon: Car, count: 0 },
      { value: 'maintenance', label: 'صيانة', icon: Wrench, count: 0 },
      { value: 'out_of_service', label: 'خارج الخدمة', count: 0 }
    ],
    []
  );

  const vehicleTypeOptions: MultiSelectOption[] = useMemo(() => {
    if (!vehicles) return [];
    const types = [...new Set(vehicles.map((v) => v.vehicle_type))].filter(Boolean);
    return types.map((type) => ({
      value: type,
      label: type,
      count: vehicles.filter((v) => v.vehicle_type === type).length
    }));
  }, [vehicles]);

  // ============================================================================
  // Filtered Data
  // ============================================================================

  const filteredVehicles = useMemo(() => {
    let result = vehicles || [];

    // Date range filter (check created_at or last_service_date)
    if (filters.dateRange?.start && filters.dateRange?.end) {
      result = result.filter((vehicle) => {
        const vehicleDate = new Date(vehicle.created_at || vehicle.last_service_date);
        return (
          vehicleDate >= filters.dateRange!.start! &&
          vehicleDate <= filters.dateRange!.end!
        );
      });
    }

    // Status filter
    if (filters.multiSelect?.status && filters.multiSelect.status.length > 0) {
      result = result.filter((vehicle) =>
        filters.multiSelect!.status.includes(vehicle.status)
      );
    }

    // Vehicle type filter
    if (filters.multiSelect?.vehicleType && filters.multiSelect.vehicleType.length > 0) {
      result = result.filter((vehicle) =>
        filters.multiSelect!.vehicleType.includes(vehicle.vehicle_type)
      );
    }

    // Search filter (name, license plate, VIN)
    if (filters.search?.query) {
      const query = filters.search.query.toLowerCase().trim();
      result = result.filter(
        (vehicle) =>
          vehicle.name?.toLowerCase().includes(query) ||
          vehicle.license_plate?.toLowerCase().includes(query) ||
          vehicle.vin?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [vehicles, filters]);

  // ============================================================================
  // Calculate Counts from Filtered Data
  // ============================================================================

  const statusCounts = useMemo(() => {
    if (!filteredVehicles) return [];

    const counts: Record<string, number> = {
      available: 0,
      rented: 0,
      maintenance: 0,
      out_of_service: 0
    };

    filteredVehicles.forEach((vehicle) => {
      const status = vehicle.status?.toLowerCase() || 'available';
      if (status in counts) {
        counts[status]++;
      }
    });

    return [
      {
        status: 'available',
        count: counts.available,
        label: 'متاح',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: CheckCircle
      },
      {
        status: 'rented',
        count: counts.rented,
        label: 'مؤجر',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: Car
      },
      {
        status: 'maintenance',
        count: counts.maintenance,
        label: 'صيانة',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: Wrench
      },
      {
        status: 'out_of_service',
        count: counts.out_of_service,
        label: 'خارج الخدمة',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      }
    ];
  }, [filteredVehicles]);

  const totalFiltered = filteredVehicles?.length || 0;
  const totalVehicles = vehicles?.length || 0;

  // ============================================================================
  // Search Suggestions
  // ============================================================================

  const searchSuggestions = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.slice(0, 10).map((vehicle) => ({
      value: vehicle.name || vehicle.license_plate || '',
      label: `${vehicle.name} - ${vehicle.license_plate}`,
      category: vehicle.vehicle_type || 'أخرى'
    }));
  }, [vehicles]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>توفر الأسطول</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">توفر الأسطول</CardTitle>
            {isFiltering && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} تصفية
              </Badge>
            )}
          </div>
          {isFiltering && (
            <Badge variant="outline" className="text-xs">
              {totalFiltered} من {totalVehicles} مركبة
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onClearAll={resetFilters}
          showClearButton={true}
          showActiveFilters={true}
          collapsible={true}
          defaultCollapsed={false}
          variant="compact"
          className="mb-6"
        >
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => setDateRange(range.start, range.end, range.preset)}
            placeholder="اختر الفترة الزمنية"
            showPresets={true}
            position="right"
          />

          <MultiSelectFilter
            label="الحالة"
            options={statusOptions.map((opt) => ({
              ...opt,
              count: statusCounts.find((s) => s.status === opt.value)?.count || 0
            }))}
            value={filters.multiSelect?.status || []}
            onChange={(selected) => setMultiSelect('status', selected)}
            showSearch={false}
            showSelectAll={true}
            showCount={true}
          />

          <MultiSelectFilter
            label="نوع المركبة"
            options={vehicleTypeOptions}
            value={filters.multiSelect?.vehicleType || []}
            onChange={(selected) => setMultiSelect('vehicleType', selected)}
            showSearch={true}
            showSelectAll={true}
          />

          <AdvancedSearch
            value={filters.search?.query}
            onChange={(query) => setSearch(query, ['name', 'license_plate', 'vin'])}
            placeholder="بحث في المركبات..."
            suggestions={searchSuggestions}
            fields={['name', 'license_plate', 'vin']}
            showRecentSearches={true}
          />
        </FilterBar>

        {/* Filter Presets */}
        <div className="mb-4">
          <FilterPresets
            currentFilters={filters}
            onApplyPreset={applyPreset}
            module="car_rental"
            widgetId="fleet-availability-widget"
            showSaveButton={true}
            showLoadButton={true}
            showImportExport={true}
          />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusCounts.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.status}
                className={`p-4 rounded-lg border ${item.bgColor} transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <div className="text-3xl font-bold">{item.count}</div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {totalFiltered === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد مركبات تطابق التصفية الحالية</p>
            <button
              onClick={resetFilters}
              className="mt-2 text-blue-600 hover:underline"
            >
              مسح التصفية
            </button>
          </div>
        )}

        {/* Vehicle List (Optional) */}
        {totalFiltered > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              المركبات المصفاة ({totalFiltered})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredVehicles.slice(0, 10).map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <span className="font-medium">{vehicle.name}</span>
                    <span className="text-sm text-gray-500 mr-2">
                      {vehicle.license_plate}
                    </span>
                  </div>
                  <Badge variant="outline">{vehicle.status}</Badge>
                </div>
              ))}
              {filteredVehicles.length > 10 && (
                <p className="text-xs text-gray-500 text-center">
                  و {filteredVehicles.length - 10} مركبة أخرى...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## Key Changes Explained

### 1. Import Filter Components
```typescript
import {
  FilterBar,
  DateRangePicker,
  MultiSelectFilter,
  AdvancedSearch,
  FilterPresets,
  useFilterState,
  type FilterState,
  type MultiSelectOption
} from '@/components/filters';
```

### 2. Initialize Filter State
```typescript
const {
  filters,
  setDateRange,
  setMultiSelect,
  setSearch,
  resetFilters,
  applyPreset,
  activeFilterCount,
  isFiltering
} = useFilterState({
  syncWithUrl: true,
  storageKey: 'fleet-availability-filters',
  debounceUrlUpdate: 500
});
```

### 3. Define Filter Options
```typescript
const statusOptions: MultiSelectOption[] = [
  { value: 'available', label: 'متاح', icon: CheckCircle, count: 0 },
  { value: 'rented', label: 'مؤجر', icon: Car, count: 0 },
  // ...
];
```

### 4. Apply Filters to Data
```typescript
const filteredVehicles = useMemo(() => {
  let result = vehicles || [];

  // Date range
  if (filters.dateRange?.start && filters.dateRange?.end) {
    result = result.filter(/* date logic */);
  }

  // Multi-select
  if (filters.multiSelect?.status && filters.multiSelect.status.length > 0) {
    result = result.filter((vehicle) =>
      filters.multiSelect!.status.includes(vehicle.status)
    );
  }

  // Search
  if (filters.search?.query) {
    result = result.filter(/* search logic */);
  }

  return result;
}, [vehicles, filters]);
```

### 5. Add FilterBar to UI
```typescript
<FilterBar filters={filters} onClearAll={resetFilters}>
  <DateRangePicker {...} />
  <MultiSelectFilter {...} />
  <AdvancedSearch {...} />
</FilterBar>
```

### 6. Show Filter Status
```typescript
{isFiltering && (
  <Badge>
    {activeFilterCount} تصفية
  </Badge>
)}
```

### 7. Empty State with Clear Filters
```typescript
{totalFiltered === 0 && (
  <div>
    <p>لا توجد نتائج</p>
    <button onClick={resetFilters}>مسح التصفية</button>
  </div>
)}
```

---

## Testing Checklist for This Widget

- [ ] Date range filter updates counts
- [ ] Status multi-select filters vehicles
- [ ] Vehicle type multi-select filters vehicles
- [ ] Search finds vehicles by name/plate/VIN
- [ ] Combined filters work together
- [ ] Clear all filters resets widget
- [ ] Save filter preset
- [ ] Load filter preset
- [ ] URL updates when filters change
- [ ] Copy URL and paste - filters load
- [ ] Browser back/forward works
- [ ] Filtered count displays correctly
- [ ] Empty state shows when no results
- [ ] Mobile responsive
- [ ] RTL layout correct

---

## Estimated Time per Widget

- **Simple widgets** (1-2 filters): ~1 hour
- **Medium widgets** (3-4 filters): ~2 hours
- **Complex widgets** (5+ filters): ~3 hours

**Average:** ~1.5 hours per widget × 20 widgets = **30 hours (~4 days)**

---

## Tips for Fast Integration

1. **Copy this example** as a template
2. **Identify data source** (which hook provides data?)
3. **Determine filter types** needed (date, status, category, etc.)
4. **Create filter options** from data
5. **Apply filters** in useMemo
6. **Add FilterBar** to UI
7. **Test** thoroughly

---

**Next Widget:** Copy this pattern and adapt to RentalAnalyticsWidget!
