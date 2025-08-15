import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Plus, User, Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useCustomers } from '@/hooks/useEnhancedCustomers';
import { useDebounce } from '@/hooks/useDebounce';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { cn } from '@/lib/utils';
import { Customer } from '@/types/customer';

interface CustomerSelectorProps {
  value?: string;
  onValueChange: (customerId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "ابحث عن عميل أو أنشئ جديد...",
  disabled = false
}) => {
  const { companyId, browsedCompany, isBrowsingMode, isAuthenticating, authError } = useUnifiedCompanyAccess();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  
  // Use debounced search like the customer page
  const debouncedSearch = useDebounce(searchValue, 300);
  const filters = { search: debouncedSearch };

  // Debug logging for company context
  console.log('🏢 [CustomerSelector] Company context:', {
    companyId,
    isAuthenticating,
    authError,
    isBrowsingMode,
    browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
    searchValue,
    selectedValue: value
  });

  // Show loading while authenticating
  if (isAuthenticating) {
    return (
      <div className="space-y-2">
        <Label>العميل *</Label>
        <div className="flex items-center justify-center p-4 border rounded-md">
          <LoadingSpinner />
          <span className="mr-2 text-sm text-muted-foreground">جاري تحميل بيانات المستخدم...</span>
        </div>
      </div>
    );
  }

  // Show error if no company ID available
  if (!companyId) {
    return (
      <div className="space-y-2">
        <Label>العميل *</Label>
        <div className="flex flex-col items-center justify-center p-4 border border-destructive/20 rounded-md bg-destructive/5">
          <div className="text-sm text-destructive font-medium">لا يمكن تحديد الشركة الحالية</div>
          <div className="text-xs text-muted-foreground mt-1">
            {authError || 'المستخدم غير مرتبط بأي شركة'}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()} 
            className="mt-2"
          >
            إعادة تحميل الصفحة
          </Button>
        </div>
      </div>
    );
  }

  // Use the same useCustomers hook as the customer page for consistent behavior
  const { data: customers, isLoading: customersLoading, isFetching: customersFetching, error: customersError } = useCustomers(filters);
  
  const filteredCustomers = customers || [];

  console.log('🔍 [CustomerSelector] Search results:', {
    searchValue,
    debouncedSearch,
    customersCount: filteredCustomers.length,
    isLoading: customersLoading,
    isFetching: customersFetching,
    hasError: !!customersError
  });

  const selectedCustomer = customers?.find(customer => customer.id === value);

  const handleCustomerCreated = (newCustomer: any) => {
    console.log('✅ [CustomerSelector] Customer created:', newCustomer);
    setCustomerFormOpen(false);
    if (newCustomer?.id) {
      onValueChange(newCustomer.id);
    }
    // No need to manually refetch - useCustomers hook will handle cache invalidation
  };

  const getCustomerDisplayName = (customer: Customer) => {
    return customer.customer_type === 'individual' 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : customer.company_name || '';
  };

  return (
    <>
      <div className="space-y-2">
        <Label>العميل *</Label>
        <div className="flex gap-2">
          {/* Customer Search Selector */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={searchOpen}
                className="flex-1 justify-between h-auto min-h-[2.5rem] text-right"
                disabled={disabled}
              >
                {selectedCustomer ? (
                  <div className="flex items-center gap-2">
                    {selectedCustomer.customer_type === 'individual' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {getCustomerDisplayName(selectedCustomer)}
                      </span>
                      {selectedCustomer.phone && (
                        <span className="text-xs text-muted-foreground">
                          {selectedCustomer.phone}
                        </span>
                      )}
                    </div>
                     {selectedCustomer.is_blacklisted === true && (
                       <Badge variant="destructive" className="text-xs">محظور</Badge>
                     )}
                     {selectedCustomer.is_active === false && (
                       <Badge variant="secondary" className="text-xs">غير نشط</Badge>
                     )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 min-w-[400px]" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="البحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                    value={searchValue}
                    onValueChange={(value) => {
                      console.log('🔍 [CustomerSelector] Search value changed:', value);
                      setSearchValue(value);
                    }}
                    className="flex h-11"
                  />
                </div>
                <CommandList className="max-h-[300px]">
                  {(customersLoading || customersFetching) ? (
                    <div className="flex items-center justify-center py-6">
                      <LoadingSpinner />
                      <span className="mr-2 text-sm text-muted-foreground">
                        {customersFetching ? 'جاري البحث...' : 'جاري تحميل العملاء...'}
                      </span>
                    </div>
                  ) : customersError ? (
                    <div className="flex items-center justify-center py-6 text-red-500">
                      <span className="text-sm">خطأ في تحميل العملاء: {customersError.message}</span>
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>
                        <div className="py-6 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            {searchValue ? `لا توجد نتائج للبحث "${searchValue}"` : 'لا توجد عملاء'}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSearchOpen(false);
                              setCustomerFormOpen(true);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            إنشاء عميل جديد
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={() => {
                              onValueChange(customer.id);
                              setSearchOpen(false);
                              setSearchValue("");
                            }}
                            disabled={customer.is_blacklisted === true || customer.is_active === false}
                            className="flex items-center justify-between py-2"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {customer.customer_type === 'individual' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Building2 className="h-4 w-4" />
                              )}
                              <div className="flex flex-col items-start flex-1">
                                <span className="font-medium">
                                  {getCustomerDisplayName(customer)}
                                </span>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  {customer.phone && <span>{customer.phone}</span>}
                                  {customer.email && <span>{customer.email}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               {customer.is_blacklisted === true && (
                                 <Badge variant="destructive" className="text-xs">محظور</Badge>
                               )}
                               {customer.is_active === false && (
                                 <Badge variant="secondary" className="text-xs">غير نشط</Badge>
                               )}
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  value === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
                {!customersLoading && !customersFetching && !customersError && (
                  <div className="border-t p-2 text-xs text-muted-foreground text-center">
                    {filteredCustomers.length} عميل
                    {debouncedSearch && ` للبحث "${debouncedSearch}"`}
                    {companyId && (
                      <span className="block text-[10px] opacity-70">
                        معرف الشركة: {companyId}
                      </span>
                    )}
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          {/* Add New Customer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustomerFormOpen(true)}
            disabled={disabled}
            className="flex items-center gap-2 px-3"
          >
            <Plus className="h-4 w-4" />
            عميل جديد
          </Button>
        </div>
      </div>

      {/* Customer Creation Dialog */}
      <CustomerForm
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        mode="create"
        onSuccess={handleCustomerCreated}
      />
    </>
  );
};