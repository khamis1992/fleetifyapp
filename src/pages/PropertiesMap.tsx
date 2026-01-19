import React, { useState, useEffect, useRef } from 'react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useProperties } from '@/modules/properties/hooks';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MapPin, Filter, Search, Building, Home, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PropertyMapView: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const propertyMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });
  
  const { data: propertiesData = [] } = useProperties(filters.search ? { search: filters.search } : undefined);
  
  // Transform real data to map format
  const properties = propertiesData.filter(p => p.location_coordinates?.latitude && p.location_coordinates?.longitude).map(p => ({
    id: p.id,
    name: p.property_name,
    type: p.property_type,
    status: p.property_status,
    location: { lat: p.location_coordinates.latitude, lng: p.location_coordinates.longitude },
    address: p.address || '',
    price: p.rental_price || 0,
    tenantName: null
  }));

  const [filteredProperties, setFilteredProperties] = useState(properties);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rented': return 'bg-green-500';
      case 'available': return 'bg-blue-500';
      case 'maintenance': return 'bg-orange-500';
      case 'for_sale': return 'bg-purple-500';
      default: return 'bg-slate-500';
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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize the map
    mapRef.current = L.map(mapContainerRef.current).setView([29.3759, 47.9774], 11);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Function to focus on a property in the map
  const focusOnProperty = (property: any) => {
    if (!mapRef.current) return;
    
    // Pan to property location with smooth animation
    mapRef.current.setView([property.location.lat, property.location.lng], 15, {
      animate: true,
      duration: 1
    });
    
    // Find and open the marker popup for this property
    const marker = propertyMarkersRef.current.get(property.id);
    if (marker) {
      // Close any open popups first
      mapRef.current.closePopup();
      // Open this property's popup
      setTimeout(() => {
        marker.openPopup();
      }, 500); // Delay to allow pan animation to complete
    }
  };

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = [];
    propertyMarkersRef.current.clear();

    // Add new markers
    filteredProperties.forEach((property) => {
      if (!mapRef.current) return;

      // Create custom icon based on property status
      const getMarkerColor = (status: string) => {
        switch (status) {
          case 'rented': return '#22c55e'; // green
          case 'available': return '#3b82f6'; // blue
          case 'maintenance': return '#f97316'; // orange
          case 'for_sale': return '#a855f7'; // purple
          default: return '#6b7280'; // gray
        }
      };

      // Check if this property is selected to make it stand out
      const isSelected = selectedProperty?.id === property.id;
      const iconSize: [number, number] = isSelected ? [32, 32] : [24, 24];
      const iconAnchor: [number, number] = isSelected ? [16, 16] : [12, 12];

      const customIcon = L.divIcon({
        html: `
          <div style="
            width: ${iconSize[0]}px;
            height: ${iconSize[1]}px;
            background-color: ${getMarkerColor(property.status)};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '16px' : '12px'};
            transition: all 0.3s ease;
            ${isSelected ? 'transform: scale(1.1); z-index: 1000;' : ''}
          ">
            ${property.type === 'residential' ? '🏠' : property.type === 'commercial' ? '🏢' : '🏬'}
          </div>
        `,
        className: `custom-marker ${isSelected ? 'selected' : ''}`,
        iconSize: iconSize,
        iconAnchor: iconAnchor
      });

      const marker = L.marker([property.location.lat, property.location.lng], {
        icon: customIcon
      }).addTo(mapRef.current);

      // Add popup
      const popupContent = `
        <div style="direction: rtl; text-align: right; font-family: system-ui;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${property.name}</h3>
          <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${property.address}</p>
          <p style="margin: 0 0 4px 0;"><strong>النوع:</strong> ${getTypeLabel(property.type)}</p>
          <p style="margin: 0 0 4px 0;"><strong>الحالة:</strong> ${getStatusLabel(property.status)}</p>
          <p style="margin: 0 0 8px 0;"><strong>الإيجار:</strong> ${formatCurrency(property.price)} / شهرياً</p>
          ${property.tenantName ? `<p style="margin: 0; color: #666;"><strong>المستأجر:</strong> ${property.tenantName}</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      // Add click event
      marker.on('click', () => {
        setSelectedProperty(property);
      });

      markersRef.current.push(marker);
      propertyMarkersRef.current.set(property.id, marker);
    });
  }, [filteredProperties, formatCurrency, selectedProperty]);

  // Apply filters
  useEffect(() => {
    let filtered = properties;

    if (filters.type !== 'all') {
      filtered = filtered.filter(property => property.type === filters.type);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(property => property.status === filters.status);
    }

    if (filters.search) {
      filtered = filtered.filter(property => 
        property.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        property.address.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredProperties(filtered);
  }, [filters]);

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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map View */}
        <div className="lg:col-span-3">
          <Card className="relative">
            <CardContent className="p-0 h-[600px]">
              <div 
                ref={mapContainerRef}
                className="w-full h-full rounded-lg"
                style={{ minHeight: '600px' }}
              />
              
              {/* Legend - positioned better to avoid overlap */}
              <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 space-y-2 z-[1000] shadow-lg border">
                <h4 className="font-medium text-sm text-center">وسائل الإيضاح</h4>
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
            </CardContent>
          </Card>
        </div>

        {/* Properties Sidebar */}
        <div className="space-y-4">
          {/* Selected Property Details - Show at top when selected */}
          {selectedProperty && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-first"
            >
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-primary">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">العقار المحدد</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSelectedProperty(null)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-base">{selectedProperty.name}</h4>
                    <p className="text-xs text-muted-foreground">{selectedProperty.address}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">النوع:</span>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(selectedProperty.type)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الحالة:</span>
                      <Badge 
                        variant={selectedProperty.status === 'rented' ? 'default' : 'secondary'}
                        className={cn("text-xs", getStatusColor(selectedProperty.status), "text-white")}
                      >
                        {getStatusLabel(selectedProperty.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الإيجار:</span>
                      <span className="font-medium text-primary">{formatCurrency(selectedProperty.price)}</span>
                    </div>
                    {selectedProperty.tenantName && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">المستأجر:</span>
                        <span className="font-medium text-xs">{selectedProperty.tenantName}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button size="sm" className="w-full text-xs">
                      عرض التفاصيل الكاملة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Properties List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                قائمة العقارات ({filteredProperties.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className={cn("overflow-y-auto", selectedProperty ? "max-h-[300px]" : "max-h-[500px]")}>
                {filteredProperties.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد عقارات متاحة</p>
                    <p className="text-xs">تأكد من تسجيل الدخول وإضافة عقارات</p>
                  </div>
                ) : (
                  filteredProperties.map((property) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-3 border-b cursor-pointer transition-all duration-200 hover:bg-accent/50",
                        selectedProperty?.id === property.id && "bg-accent border-primary/20"
                      )}
                      onClick={() => {
                        setSelectedProperty(property);
                        focusOnProperty(property);
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(property.type)}
                          <h4 className="font-medium text-sm truncate">{property.name}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {property.address}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(property.type)}
                            </Badge>
                          </div>
                          <Badge 
                            variant={property.status === 'rented' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {getStatusLabel(property.status)}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-primary">
                          {formatCurrency(property.price)} / شهرياً
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default PropertyMapView;