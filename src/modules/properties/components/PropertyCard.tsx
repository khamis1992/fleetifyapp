import React from 'react';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Car,
  Calendar,
  User,
  DollarSign,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { Property } from '../types';
import { PropertyStatusBadge } from './PropertyStatusBadge';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { formatDateInGregorian } from '@/utils/dateFormatter';

interface PropertyCardProps {
  property: Property;
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  showActions?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onView,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  const defaultImage = '/placeholder.svg';
  const propertyImage = property.images && property.images.length > 0 
    ? property.images[0] 
    : defaultImage;

  return (
    <Card className="hover:shadow-md transition-shadow font-cairo overflow-hidden">
      {/* Property Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={propertyImage} 
          alt={property.property_name || `عقار ${property.property_code}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = defaultImage;
          }}
        />
        <div className="absolute top-3 right-3">
          <PropertyStatusBadge status={property.property_status as any} size="sm" />
        </div>
        {property.property_type && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="text-xs">
              {property.property_type === 'apartment' ? 'شقة' :
               property.property_type === 'villa' ? 'فيلا' :
               property.property_type === 'office' ? 'مكتب' :
               property.property_type === 'shop' ? 'محل' :
               property.property_type === 'warehouse' ? 'مستودع' :
               property.property_type === 'land' ? 'أرض' : property.property_type}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Property Title and Code */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">
              {property.property_name || `عقار رقم ${property.property_code}`}
            </h3>
            {property.property_code && (
              <p className="text-sm text-muted-foreground">
                كود العقار: <NumberDisplay value={property.property_code} className="inline" />
              </p>
            )}
          </div>

          {/* Location */}
          {property.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{property.address}</span>
            </div>
          )}

          {/* Property Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {property.bedrooms !== null && (
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-primary" />
                <span><NumberDisplay value={property.bedrooms} className="inline" /> غرفة</span>
              </div>
            )}
            
            {property.bathrooms !== null && (
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-primary" />
                <span><NumberDisplay value={property.bathrooms} className="inline" /> حمام</span>
              </div>
            )}
            
            {property.area_sqm && (
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-primary" />
                <span><NumberDisplay value={property.area_sqm} className="inline" /> م²</span>
              </div>
            )}

            {property.parking_spaces !== null && property.parking_spaces > 0 && (
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span><NumberDisplay value={property.parking_spaces} className="inline" /> موقف</span>
              </div>
            )}
          </div>

          {/* Price */}
          {(property.sale_price || property.rental_price) && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  {property.sale_price && (
                    <p className="font-bold text-lg">
                      {formatCurrency(property.sale_price)} <span className="text-sm font-normal text-muted-foreground">للبيع</span>
                    </p>
                  )}
                  {property.rental_price && (
                    <p className="font-semibold">
                      {formatCurrency(property.rental_price)} <span className="text-sm font-normal text-muted-foreground">شهرياً</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Owner */}
          {property.property_owners && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
              <User className="h-4 w-4" />
              <span className="line-clamp-1">
                {property.property_owners.full_name || property.property_owners.full_name_ar}
              </span>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>أُضيف في {formatDateInGregorian(property.created_at)}</span>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2 pt-3 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onView?.(property)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                عرض
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit?.(property)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onDelete?.(property)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};