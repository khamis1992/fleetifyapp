import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContractSearchFiltersProps {
  onFiltersChange: (filters: any) => void;
  activeFilters: any;
}

export const ContractSearchFilters: React.FC<ContractSearchFiltersProps> = ({
  onFiltersChange,
  activeFilters
}) => {
  const { user } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get customers for filter options
  const { data: customers } = useQuery({
    queryKey: ['customers-filter', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Get cost centers for filter options
  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers-filter', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await supabase
        .from('cost_centers')
        .select('id, center_name, center_code')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('center_name');
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getActiveFiltersCount = () => {
    return Object.keys(activeFilters).length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
          <div className="flex items-center gap-2">
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} فلتر نشط
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'إخفاء' : 'عرض'} الخيارات المتقدمة
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>البحث العام</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="رقم العقد، اسم العميل..."
                value={activeFilters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>حالة العقد</Label>
            <Select
              value={activeFilters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="renewed">مجدد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>نوع العقد</Label>
            <Select
              value={activeFilters.contract_type || ''}
              onValueChange={(value) => handleFilterChange('contract_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع الأنواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الأنواع</SelectItem>
                <SelectItem value="rental">إيجار</SelectItem>
                <SelectItem value="service">خدمة</SelectItem>
                <SelectItem value="maintenance">صيانة</SelectItem>
                <SelectItem value="sales">مبيعات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select
                  value={activeFilters.customer_id || ''}
                  onValueChange={(value) => handleFilterChange('customer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع العملاء" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع العملاء</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_type === 'individual' 
                          ? `${customer.first_name} ${customer.last_name}`
                          : customer.company_name
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>مركز التكلفة</Label>
                <Select
                  value={activeFilters.cost_center_id || ''}
                  onValueChange={(value) => handleFilterChange('cost_center_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المراكز" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع المراكز</SelectItem>
                    {costCenters?.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.center_code} - {center.center_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={activeFilters.start_date || ''}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={activeFilters.end_date || ''}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحد الأدنى للمبلغ (د.ك)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={activeFilters.min_amount || ''}
                    onChange={(e) => handleFilterChange('min_amount', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الحد الأقصى للمبلغ (د.ك)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={activeFilters.max_amount || ''}
                    onChange={(e) => handleFilterChange('max_amount', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
            <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
            {Object.entries(activeFilters).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                {key === 'search' && `البحث: ${value}`}
                {key === 'status' && `الحالة: ${value}`}
                {key === 'contract_type' && `النوع: ${value}`}
                {key === 'start_date' && `من: ${value}`}
                {key === 'end_date' && `إلى: ${value}`}
                {key === 'min_amount' && `الحد الأدنى: ${value} د.ك`}
                {key === 'max_amount' && `الحد الأقصى: ${value} د.ك`}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange(key, '')}
                />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              مسح الكل
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};