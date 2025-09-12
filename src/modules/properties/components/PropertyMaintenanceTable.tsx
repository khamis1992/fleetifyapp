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
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PropertyMaintenance, PropertyMaintenanceType, PropertyMaintenancePriority } from '../types';
import { PropertyMaintenanceStatusBadge } from './PropertyMaintenanceStatusBadge';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { formatDateInGregorian } from '@/utils/dateFormatter';

interface PropertyMaintenanceTableProps {
  maintenance: PropertyMaintenance[];
  onView?: (maintenance: PropertyMaintenance) => void;
  onEdit?: (maintenance: PropertyMaintenance) => void;
  onDelete?: (maintenance: PropertyMaintenance) => void;
  onUpdateStatus?: (id: string, status: any) => void;
  loading?: boolean;
}

const maintenanceTypeLabels: Record<PropertyMaintenanceType, string> = {
  routine: 'دورية',
  emergency: 'طارئة',
  repair: 'إصلاح',
  improvement: 'تحسين',
  renovation: 'تجديد',
  inspection: 'فحص',
  cleaning: 'تنظيف',
  electrical: 'كهرباء',
  plumbing: 'سباكة',
  hvac: 'تكييف',
  painting: 'دهان',
  flooring: 'أرضيات',
};

const priorityLabels: Record<PropertyMaintenancePriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const priorityColors: Record<PropertyMaintenancePriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export const PropertyMaintenanceTable: React.FC<PropertyMaintenanceTableProps> = ({
  maintenance,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  loading = false
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الصيانة</TableHead>
              <TableHead>العقار</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الأولوية</TableHead>
              <TableHead>التاريخ المجدول</TableHead>
              <TableHead>التكلفة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (maintenance.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الصيانة</TableHead>
              <TableHead>العقار</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الأولوية</TableHead>
              <TableHead>التاريخ المجدول</TableHead>
              <TableHead>التكلفة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                لا توجد طلبات صيانة
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
            <TableHead>رقم الصيانة</TableHead>
            <TableHead>العقار</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الأولوية</TableHead>
            <TableHead>التاريخ المجدول</TableHead>
            <TableHead>التكلفة</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenance.map((item) => (
            <TableRow key={item.id}>
              {/* Maintenance Number */}
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    <NumberDisplay value={item.maintenance_number} className="inline" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.title}
                  </div>
                </div>
              </TableCell>

              {/* Property */}
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {item.property?.property_name || `عقار ${item.property?.property_code}`}
                  </div>
                  {item.property?.address && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{item.property.address}</span>
                    </div>
                  )}
                  {item.location_details && (
                    <div className="text-xs text-muted-foreground">
                      {item.location_details}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Type */}
              <TableCell>
                <Badge variant="outline">
                  {maintenanceTypeLabels[item.maintenance_type]}
                </Badge>
              </TableCell>

              {/* Priority */}
              <TableCell>
                <Badge className={priorityColors[item.priority]}>
                  {priorityLabels[item.priority]}
                </Badge>
              </TableCell>

              {/* Scheduled Date */}
              <TableCell>
                <div className="space-y-1">
                  {item.scheduled_date ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDateInGregorian(item.scheduled_date)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">غير محدد</span>
                  )}
                  {item.contractor_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {item.contractor_name}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Cost */}
              <TableCell>
                <div className="space-y-1">
                  {item.actual_cost ? (
                    <div className="font-semibold">
                      {formatCurrency(item.actual_cost)}
                      <div className="text-xs text-muted-foreground">فعلي</div>
                    </div>
                  ) : item.estimated_cost ? (
                    <div className="font-medium">
                      {formatCurrency(item.estimated_cost)}
                      <div className="text-xs text-muted-foreground">تقديري</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">غير محدد</span>
                  )}
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                <PropertyMaintenanceStatusBadge status={item.status} size="sm" />
              </TableCell>

              {/* Actions */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">فتح القائمة</span>
                      ⋮
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      عرض التفاصيل
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      تعديل
                    </DropdownMenuItem>
                    {onUpdateStatus && item.status === 'pending' && (
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'in_progress')}>
                        بدء التنفيذ
                      </DropdownMenuItem>
                    )}
                    {onUpdateStatus && item.status === 'in_progress' && (
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'completed')}>
                        إكمال الصيانة
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(item)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};