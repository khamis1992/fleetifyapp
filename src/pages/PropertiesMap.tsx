import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MapPin, Filter, Search, Building, Home, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

const PropertyMapView: React.FC = () => {
  // Mock data for demonstration
  const mockProperties = [
    {
      id: '1',
      name: 'فيلا العارضية',
      type: 'residential',
      status: 'rented',
      location: { lat: 29.3759, lng: 47.9774 },
      address: 'العارضية، الكويت',
      price: 1200,
      tenantName: 'أحمد محمد'
    },
    {
      id: '2',
      name: 'شقة الجابرية',
      type: 'apartment',
      status: 'available',
      location: { lat: 29.3117, lng: 48.0370 },
      address: 'الجابرية، الكويت',
      price: 800,
      tenantName: null
    },
    {
      id: '3',
      name: 'مكتب السالمية',
      type: 'commercial',
      status: 'rented',
      location: { lat: 29.3375, lng: 48.0564 },
      address: 'السالمية، الكويت',
      price: 1500,
      tenantName: 'شركة النور'
    }
  ];

  const [filteredProperties, setFilteredProperties] = useState(mockProperties);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rented': return 'bg-green-500';
      case 'available': return 'bg-blue-500';
      case 'maintenance': return 'bg-orange-500';
      case 'for_sale': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rented': return 'مؤجر';
      case 'available': return 'متاح';
      case 'maintenance': return 'صيانة';
      case 'for_sale': return 'للبيع';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'residential': return <Home className="h-4 w-4" />;
      case 'commercial': return <Building className="h-4 w-4" />;
      case 'warehouse': return <Warehouse className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'residential': return 'سكني';
      case 'commercial': return 'تجاري';
      case 'warehouse': return 'مستودع';
      case 'apartment': return 'شقة';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">خريطة العقارات</h1>
          <p className="text-muted-foreground">
            عرض وإدارة العقارات على الخريطة التفاعلية
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر البحث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو العنوان..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="نوع العقار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="residential">سكني</SelectItem>
                <SelectItem value="commercial">تجاري</SelectItem>
                <SelectItem value="apartment">شقة</SelectItem>
                <SelectItem value="warehouse">مستودع</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="حالة العقار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="available">متاح</SelectItem>
                <SelectItem value="rented">مؤجر</SelectItem>
                <SelectItem value="maintenance">صيانة</SelectItem>
                <SelectItem value="for_sale">للبيع</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setFilters({ type: 'all', status: 'all', search: '' })}>
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                {/* Mock Map Interface */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-green-100/50" />
                
                {/* Property Markers */}
                {filteredProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "absolute w-10 h-10 rounded-full border-4 border-white shadow-lg cursor-pointer transition-all hover:scale-110",
                      getStatusColor(property.status)
                    )}
                    style={{
                      left: `${20 + index * 25}%`,
                      top: `${30 + index * 15}%`
                    }}
                    onClick={() => setSelectedProperty(property)}
                  >
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      {getTypeIcon(property.type)}
                    </div>
                  </motion.div>
                ))}

                {/* Map Controls */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Button size="sm" variant="secondary">+</Button>
                  <Button size="sm" variant="secondary">-</Button>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
                  <h4 className="font-medium text-sm">وسائل الإيضاح</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>مؤجر</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>متاح</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span>صيانة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>للبيع</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-muted-foreground">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-primary/30" />
                  <p className="text-lg font-medium">خريطة العقارات التفاعلية</p>
                  <p className="text-sm">سيتم دمج خريطة حقيقية هنا (Google Maps أو Mapbox)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قائمة العقارات ({filteredProperties.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {filteredProperties.map((property) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-4 border-b cursor-pointer transition-colors hover:bg-accent/50",
                      selectedProperty?.id === property.id && "bg-accent"
                    )}
                    onClick={() => setSelectedProperty(property)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(property.type)}
                          <h4 className="font-medium">{property.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {property.address}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(property.type)}
                          </Badge>
                          <Badge 
                            variant={property.status === 'rented' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {getStatusLabel(property.status)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {property.price} د.ك / شهرياً
                        </p>
                        {property.tenantName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            المستأجر: {property.tenantName}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Property Details */}
          {selectedProperty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    تفاصيل العقار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">{selectedProperty.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">النوع:</span>
                        <p className="font-medium">{getTypeLabel(selectedProperty.type)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الحالة:</span>
                        <p className="font-medium">{getStatusLabel(selectedProperty.status)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الإيجار:</span>
                        <p className="font-medium">{selectedProperty.price} د.ك</p>
                      </div>
                      {selectedProperty.tenantName && (
                        <div>
                          <span className="text-muted-foreground">المستأجر:</span>
                          <p className="font-medium">{selectedProperty.tenantName}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1">
                        عرض التفاصيل
                      </Button>
                      <Button size="sm" variant="outline">
                        تحرير
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyMapView;