import { useState } from 'react';
import { Plus, Map, Users } from 'lucide-react';
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
import { PageHelp } from "@/components/help";
import { PropertiesPageHelpContent } from "@/components/help/content";

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
          <div className="flex gap-3">
            <Link to="/properties/map">
              <Button size="lg" variant="outline" className="gap-2">
                <Map className="h-4 w-4" />
                خريطة العقارات
              </Button>
            </Link>
            <Link to="/owners">
              <Button size="lg" variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                ملاك العقارات
              </Button>
            </Link>
            <Link to="/properties/add">
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة عقار جديد
              </Button>
            </Link>
          </div>
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