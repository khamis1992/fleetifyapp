import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, DollarSign, User, Building, Check, ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  const [customerOpen, setCustomerOpen] = useState(false);
  const { currency } = useCurrencyFormatter();

  // Get customers for filter options
  const { data: customers } = useQuery({
    queryKey: ['customers-filter', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await (supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', user.profile.company_id as any)
        .eq('is_active', true as any)
        .order('created_at', { ascending: false }) as any);
      return (data as unknown as Array<{id: string; first_name: string; last_name: string; company_name: string; customer_type: string}>) || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Get cost centers for filter options
  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers-filter', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      const { data } = await (supabase
        .from('cost_centers')
        .select('id, center_name, center_code')
        .eq('company_id', user.profile.company_id as any)
        .eq('is_active', true as any)
        .order('center_name') as any);
      return (data as unknown as Array<{id: string; center_name: string; center_code: string}>) || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  const handleFilterChange = (key: string, value: unknown) => {
    console.log('🔧 [FILTER_CHANGE]', key, '=', value)
    
    // منع تحديث الصفحة عند تغيير الفلاتر
    const newFilters = { ...activeFilters };
    
    if (value === '' || value === null || value === undefined || value === 'all') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    console.log('🔧 [FILTER_CHANGE] New filters:', newFilters)
    
    // استخدام setTimeout لتجنب تحديث الصفحة الفوري
    setTimeout(() => {
      onFiltersChange(newFilters);
    }, 0);
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
              <SelectContent className="bg-white dark:bg-slate-700 z-50">
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
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
              <SelectContent className="bg-white dark:bg-slate-700 z-50">
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="rent_to_own">إيجار حتى التملك</SelectItem>
                <SelectItem value="rental">إيجار</SelectItem>
                <SelectItem value="daily_rental">إيجار يومي</SelectItem>
                <SelectItem value="weekly_rental">إيجار أسبوعي</SelectItem>
                <SelectItem value="monthly_rental">إيجار شهري</SelectItem>
                <SelectItem value="yearly_rental">إيجار سنوي</SelectItem>
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
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      className="w-full justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {activeFilters.customer_id && activeFilters.customer_id !== 'all' ? (
                          <>
                            {customers?.find(c => c.id === activeFilters.customer_id)?.customer_type === 'individual' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Building className="h-4 w-4" />
                            )}
                            <span>
                              {customers?.find(c => c.id === activeFilters.customer_id)?.customer_type === 'individual'
                                ? `${customers?.find(c => c.id === activeFilters.customer_id)?.first_name} ${customers?.find(c => c.id === activeFilters.customer_id)?.last_name}`
                                : customers?.find(c => c.id === activeFilters.customer_id)?.company_name
                              }
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">جميع العملاء</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full min-w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="بحث عن عميل..." />
                      <CommandEmpty>لم يتم العثور على عملاء.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            handleFilterChange('customer_id', '');
                            setCustomerOpen(false);
                          }}
                          className="flex items-center space-x-2 p-3"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              (!activeFilters.customer_id || activeFilters.customer_id === 'all') ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>جميع العملاء</span>
                        </CommandItem>
                        {customers?.map((customer) => {
                          const displayName = customer.customer_type === 'individual' 
                            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                            : customer.company_name || 'عميل غير مسمى';
                          
                          return (
                            <CommandItem
                              key={customer.id}
                              value={`${displayName} ${customer.first_name || ''} ${customer.last_name || ''} ${customer.company_name || ''}`}
                              onSelect={() => {
                                handleFilterChange('customer_id', customer.id);
                                setCustomerOpen(false);
                              }}
                              className="flex items-center space-x-2 p-3"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  activeFilters.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {customer.customer_type === 'individual' ? (
                                  <User className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Building className="h-4 w-4 text-green-500" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm">
                                    {displayName}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                  <SelectContent className="bg-white dark:bg-slate-700 z-50">
                    <SelectItem value="all">جميع المراكز</SelectItem>
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
                <Label>الحد الأدنى للمبلغ ({currency})</Label>
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
                <Label>الحد الأقصى للمبلغ ({currency})</Label>
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
            {Object.entries(activeFilters).map(([key, value]) => {
              let displayValue = value;
              if (key === 'customer_id' && customers) {
                const customer = customers.find(c => c.id === value);
                if (customer) {
                  displayValue = customer.customer_type === 'individual'
                    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                    : customer.company_name || 'عميل غير مسمى';
                }
              }
              
              return (
                <Badge key={key} variant="secondary" className="flex items-center gap-1">
                  {key === 'search' && `البحث: ${displayValue}`}
                  {key === 'status' && `الحالة: ${displayValue}`}
                  {key === 'contract_type' && `النوع: ${displayValue}`}
                  {key === 'customer_id' && `العميل: ${displayValue}`}
                  {key === 'cost_center_id' && `مركز التكلفة: ${displayValue}`}
                  {key === 'start_date' && `من: ${displayValue}`}
                  {key === 'end_date' && `إلى: ${displayValue}`}
                  {key === 'min_amount' && `الحد الأدنى: ${displayValue} ${currency}`}
                  {key === 'max_amount' && `الحد الأقصى: ${displayValue} ${currency}`}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleFilterChange(key, '')}
                  />
                </Badge>
              );
            })}
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