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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  customer_type: 'individual' | 'corporate';
  is_blacklisted: boolean;
  is_active: boolean;
  phone?: string;
  email?: string;
}

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
  const { companyId, getQueryKey, browsedCompany, isBrowsingMode, isAuthenticating, authError } = useUnifiedCompanyAccess();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

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

  // Get customers for the company with server-side search (matching customer page behavior)
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers, error: customersError } = useQuery({
    queryKey: getQueryKey(['customers-for-contracts'], [searchValue]),
    queryFn: async () => {
      if (!companyId) {
        console.log('❌ [CustomerSelector] No company ID available');
        return [];
      }
      
      console.log('🔍 [CustomerSelector] Fetching customers for company:', companyId, 'with search:', searchValue);
      
      let query = supabase
        .from('customers')
        .select(`
          id, 
          first_name, 
          last_name, 
          company_name, 
          customer_type, 
          is_blacklisted, 
          is_active,
          phone,
          email
        `)
        .eq('company_id', companyId);

      // Apply server-side search filtering (same as customer page)
      if (searchValue && searchValue.trim()) {
        const searchText = searchValue.trim();
        query = query.or(
          `first_name.ilike.%${searchText}%,` +
          `last_name.ilike.%${searchText}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%`
        );
      }

      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ [CustomerSelector] Error fetching customers:', error);
        throw error;
      }
      
      console.log('✅ [CustomerSelector] Fetched customers:', data?.length || 0, 'for search term:', searchValue);
      return data as Customer[];
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds - shorter for search
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  // No need for client-side filtering anymore since we do server-side search
  const filteredCustomers = customers || [];

  console.log('🔍 [CustomerSelector] Search results:', {
    searchValue,
    customersCount: filteredCustomers.length,
    isLoading: customersLoading,
    hasError: !!customersError
  });

  const selectedCustomer = customers?.find(customer => customer.id === value);

  const handleCustomerCreated = (newCustomer: any) => {
    console.log('✅ [CustomerSelector] Customer created:', newCustomer);
    setCustomerFormOpen(false);
    if (newCustomer?.id) {
      onValueChange(newCustomer.id);
    }
    refetchCustomers(); // Refresh customer list
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
                    {selectedCustomer.is_blacklisted && (
                      <Badge variant="destructive" className="text-xs">محظور</Badge>
                    )}
                    {!selectedCustomer.is_active && (
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
              <Command>
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
                  {customersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <LoadingSpinner />
                      <span className="mr-2 text-sm text-muted-foreground">جاري تحميل العملاء...</span>
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
                            disabled={customer.is_blacklisted || !customer.is_active}
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
                              {customer.is_blacklisted && (
                                <Badge variant="destructive" className="text-xs">محظور</Badge>
                              )}
                              {!customer.is_active && (
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
                {!customersLoading && !customersError && (
                  <div className="border-t p-2 text-xs text-muted-foreground text-center">
                    {filteredCustomers.length} عميل
                    {searchValue && ` للبحث "${searchValue}"`}
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