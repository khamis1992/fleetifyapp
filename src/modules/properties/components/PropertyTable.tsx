import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MapPin,
  Square,
  Bed,
  Bath,
  Car
} from 'lucide-react';
import { Property } from '../types';
import { PropertyStatusBadge } from './PropertyStatusBadge';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { formatDateInGregorian } from '@/utils/dateFormatter';

interface PropertyTableProps {
  properties: Property[];
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  loading?: boolean;
}

export const PropertyTable: React.FC<PropertyTableProps> = ({
  properties,
  onView,
  onEdit,
  onDelete,
  loading = false
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العقار</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المالك</TableHead>
              <TableHead>المساحة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded w-28 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العقار</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المالك</TableHead>
              <TableHead>المساحة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                لا توجد عقارات متاحة
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العقار</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>المالك</TableHead>
            <TableHead>التفاصيل</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>تاريخ الإضافة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id}>
              {/* Property Info */}
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {property.property_name || `عقار رقم ${property.property_code}`}
                  </div>
                  {property.property_code && (
                    <div className="text-sm text-muted-foreground">
                      كود: <NumberDisplay value={property.property_code} className="inline" />
                    </div>
                  )}
                  {property.address && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{property.address}</span>
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Type */}
              <TableCell>
                <Badge variant="outline">
                  {property.property_type === 'apartment' ? 'شقة' :
                   property.property_type === 'villa' ? 'فيلا' :
                   property.property_type === 'office' ? 'مكتب' :
                   property.property_type === 'shop' ? 'محل' :
                   property.property_type === 'warehouse' ? 'مستودع' :
                   property.property_type === 'land' ? 'أرض' : property.property_type}
                </Badge>
              </TableCell>

              {/* Status */}
              <TableCell>
                <PropertyStatusBadge status={property.property_status as any} size="sm" />
              </TableCell>

              {/* Owner */}
              <TableCell>
                {property.property_owners ? (
                  <div className="text-sm">
                    {property.property_owners.full_name || property.property_owners.full_name_ar}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">غير محدد</span>
                )}
              </TableCell>

              {/* Details */}
              <TableCell>
                <div className="flex flex-wrap gap-2 text-xs">
                  {property.area_sqm && (
                    <div className="flex items-center gap-1">
                      <Square className="h-3 w-3" />
                      <NumberDisplay value={property.area_sqm} className="inline" />م²
                    </div>
                  )}
                  {property.bedrooms !== null && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-3 w-3" />
                      <NumberDisplay value={property.bedrooms} className="inline" />
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-3 w-3" />
                      <NumberDisplay value={property.bathrooms} className="inline" />
                    </div>
                  )}
                  {property.parking_spaces !== null && property.parking_spaces > 0 && (
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <NumberDisplay value={property.parking_spaces} className="inline" />
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Price */}
              <TableCell>
                <div className="space-y-1">
                  {property.sale_price && (
                    <div className="font-semibold">
                      {formatCurrency(property.sale_price)}
                      <div className="text-xs text-muted-foreground">للبيع</div>
                    </div>
                  )}
                  {property.rental_price && (
                    <div className="font-medium text-sm">
                      {formatCurrency(property.rental_price)}
                      <div className="text-xs text-muted-foreground">شهرياً</div>
                    </div>
                  )}
                  {!property.sale_price && !property.rental_price && (
                    <span className="text-muted-foreground text-sm">غير محدد</span>
                  )}
                </div>
              </TableCell>

              {/* Created Date */}
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatDateInGregorian(property.created_at)}
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView?.(property)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(property)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete?.(property)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};