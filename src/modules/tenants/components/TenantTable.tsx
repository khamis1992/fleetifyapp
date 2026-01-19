import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Phone, Mail } from "lucide-react";
import type { Tenant, TenantFilters, TenantStatus, TenantType } from "@/types/tenant";

interface TenantTableProps {
  tenants: Tenant[];
  isLoading?: boolean;
  onAddTenant: () => void;
  onEditTenant: (tenant: Tenant) => void;
  onViewTenant: (tenant: Tenant) => void;
  onDeleteTenant: (tenant: Tenant) => void;
  filters: TenantFilters;
  onFiltersChange: (filters: TenantFilters) => void;
}

const statusLabels: Record<TenantStatus, string> = {
  active: "نشط",
  inactive: "غير نشط", 
  suspended: "معلق",
  pending: "قيد المراجعة",
};

const statusColors: Record<TenantStatus, "default" | "destructive" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive", 
  pending: "outline",
};

const typeLabels: Record<TenantType, string> = {
  individual: "فرد",
  company: "شركة",
};

export function TenantTable({
  tenants,
  isLoading,
  onAddTenant,
  onEditTenant,
  onViewTenant,
  onDeleteTenant,
  filters,
  onFiltersChange,
}: TenantTableProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      status: value === "all" ? undefined : (value as TenantStatus) 
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      tenant_type: value === "all" ? undefined : (value as TenantType) 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري تحميل البيانات...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>إدارة المستأجرين</CardTitle>
          <Button onClick={onAddTenant}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة مستأجر جديد
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="البحث بالاسم، الهاتف، البريد أو الكود..."
                value={filters.search || ""}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
              <SelectItem value="suspended">معلق</SelectItem>
              <SelectItem value="pending">قيد المراجعة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.tenant_type || "all"} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="individual">فرد</SelectItem>
              <SelectItem value="company">شركة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">لا توجد مستأجرين</p>
            <Button onClick={onAddTenant} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              إضافة أول مستأجر
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الجنسية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.tenant_code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tenant.full_name}</div>
                      {tenant.full_name_ar && (
                        <div className="text-sm text-slate-500">{tenant.full_name_ar}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabels[tenant.tenant_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {tenant.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {tenant.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{tenant.nationality}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[tenant.status]}>
                      {statusLabels[tenant.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(tenant.created_at).toLocaleDateString('ar-KW')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewTenant(tenant)}>
                          <Eye className="h-4 w-4 mr-2" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditTenant(tenant)}>
                          <Edit className="h-4 w-4 mr-2" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteTenant(tenant)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}