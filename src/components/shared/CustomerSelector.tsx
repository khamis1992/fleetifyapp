import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
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
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "اختر العميل",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { companyId, user } = useUnifiedCompanyAccess();

  // Fetch customers list with search
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-selector', companyId, searchValue],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!companyId) throw new Error('Company not found');

      let query = supabase
        .from('customers')
        .select(`
          id,
          customer_type,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          company_name,
          company_name_ar,
          phone,
          email,
          is_active
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Add search filter if search value exists
      if (searchValue && searchValue.trim()) {
        const search = searchValue.trim();
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,company_name.ilike.%${search}%,company_name_ar.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  // Separately fetch the selected customer by ID to ensure it's always available
  const { data: selectedCustomerData } = useQuery({
    queryKey: ['customer-by-id', value],
    queryFn: async () => {
      if (!value) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_type,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          company_name,
          company_name_ar,
          phone,
          email,
          is_active
        `)
        .eq('id', value)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!value,
  });

  // Use selectedCustomerData if available, otherwise find from list
  const selectedCustomer = selectedCustomerData || customers?.find(customer => customer.id === value);

  const getCustomerDisplayName = (customer: any) => {
    if (customer.customer_type === 'individual') {
      // Prefer primary name fields, fallback to Arabic fields
      const firstName = customer.first_name || customer.first_name_ar || '';
      const lastName = customer.last_name || customer.last_name_ar || '';
      return `${firstName} ${lastName}`.trim() || 'عميل غير مسمى';
    }
    return customer.company_name || customer.company_name_ar || 'عميل غير مسمى';
  };

  const getCustomerSecondaryInfo = (customer: any) => {
    const info = [];
    if (customer.phone) info.push(customer.phone);
    if (customer.email) info.push(customer.email);
    return info.join(' • ');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {selectedCustomer ? (
              <>
                {selectedCustomer.customer_type === 'individual' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Building className="h-4 w-4" />
                )}
                <span>{getCustomerDisplayName(selectedCustomer)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="بحث عن عميل..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {isLoading ? 'جاري البحث...' : 'لم يتم العثور على عملاء.'}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {isLoading ? (
              <CommandItem disabled>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                  <span className="text-teal-600">جاري التحميل...</span>
                </div>
              </CommandItem>
            ) : (
              customers?.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${getCustomerDisplayName(customer)} ${customer.phone || ''} ${customer.email || ''}`}
                  onSelect={() => {
                    onValueChange(customer.id);
                    setOpen(false);
                  }}
                  className="flex items-center space-x-2 p-3"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
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
                        {getCustomerDisplayName(customer)}
                      </div>
                      {getCustomerSecondaryInfo(customer) && (
                        <div className="text-xs text-muted-foreground truncate" dir="ltr">
                          {getCustomerSecondaryInfo(customer)}
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};