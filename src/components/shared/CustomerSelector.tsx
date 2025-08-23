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
  const { companyId, user } = useUnifiedCompanyAccess();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-selector', companyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!companyId) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_type,
          first_name,
          last_name,
          company_name,
          phone,
          email,
          is_active
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  const selectedCustomer = customers?.find(customer => customer.id === value);

  const getCustomerDisplayName = (customer: any) => {
    if (customer.customer_type === 'individual') {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.company_name || 'عميل غير مسمى';
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
        <Command>
          <CommandInput placeholder="بحث عن عميل..." />
          <CommandEmpty>لم يتم العثور على عملاء.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {isLoading ? (
              <CommandItem disabled>
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>جاري التحميل...</span>
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
                        <div className="text-xs text-muted-foreground truncate">
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