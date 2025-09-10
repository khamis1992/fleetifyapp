import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { 
  PropertyTable, 
  PropertyFilters, 
  PropertyStatsCards 
} from '@/modules/properties/components';
import { useProperties, usePropertiesStats } from '@/modules/properties/hooks';
import { PropertySearchFilters } from '@/modules/properties/types';
import { Link } from 'react-router-dom';

export default function Properties() {
  const [filters, setFilters] = useState<PropertySearchFilters>({});
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties(filters);
  const { data: stats, isLoading: isLoadingStats } = usePropertiesStats();

  return (
    <ModuleLayout moduleName="properties">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة العقارات</h1>
            <p className="text-muted-foreground mt-2">
              إدارة شاملة للعقارات والملاك والعقود
            </p>
          </div>
          <Link to="/properties/add">
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة عقار جديد
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <PropertyStatsCards 
          stats={stats || {
            total_properties: 0,
            rented_properties: 0,
            available_properties: 0,
            for_sale_properties: 0,
            maintenance_properties: 0,
            total_monthly_rent: 0,
            total_yearly_rent: 0,
            occupancy_rate: 0,
            average_rent_per_sqm: 0,
            properties_by_type: {},
            properties_by_area: {}
          }} 
          isLoading={isLoadingStats} 
        />

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة العقارات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PropertyFilters 
              filters={filters} 
              onFiltersChange={setFilters}
              onReset={() => setFilters({})}
            />
            <PropertyTable 
              properties={properties} 
              loading={isLoadingProperties}
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}