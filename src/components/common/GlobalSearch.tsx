import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Users, FileText, Receipt, Car, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'customer' | 'contract' | 'invoice' | 'vehicle';
  title: string;
  subtitle?: string;
  path: string;
}

interface GlobalSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open: controlledOpen, onOpenChange }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { companyId } = useUnifiedCompanyAccess();

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  const searchFn = useCallback(async (query: string) => {
    if (!query.trim() || !companyId) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchPattern = `%${query}%`;
      const results: SearchResult[] = [];

      const [customersRes, contractsRes, invoicesRes, vehiclesRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, first_name, last_name, phone')
          .eq('company_id', companyId)
          .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(5),
        supabase
          .from('contracts')
          .select('id, contract_number')
          .eq('company_id', companyId)
          .ilike('contract_number', searchPattern)
          .limit(5),
        supabase
          .from('invoices')
          .select('id, invoice_number')
          .eq('company_id', companyId)
          .ilike('invoice_number', searchPattern)
          .limit(5),
        supabase
          .from('vehicles')
          .select('id, plate_number')
          .eq('company_id', companyId)
          .ilike('plate_number', searchPattern)
          .limit(5),
      ]);

      if (customersRes.data) {
        customersRes.data.forEach((c) => {
          results.push({
            id: c.id,
            type: 'customer',
            title: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'عميل',
            subtitle: c.phone || undefined,
            path: `/customers/${c.id}`,
          });
        });
      }

      if (contractsRes.data) {
        contractsRes.data.forEach((c) => {
          results.push({
            id: c.id,
            type: 'contract',
            title: c.contract_number,
            path: `/contracts/${c.contract_number}`,
          });
        });
      }

      if (invoicesRes.data) {
        invoicesRes.data.forEach((i) => {
          results.push({
            id: i.id,
            type: 'invoice',
            title: i.invoice_number,
            path: `/finance/billing?invoice=${i.id}`,
          });
        });
      }

      if (vehiclesRes.data) {
        vehiclesRes.data.forEach((v) => {
          results.push({
            id: v.id,
            type: 'vehicle',
            title: v.plate_number,
            path: `/fleet/vehicles/${v.id}`,
          });
        });
      }

      setResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFn(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchFn]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearch('');
    setResults([]);
    navigate(result.path);
  };

  const typeIcons = {
    customer: Users,
    contract: FileText,
    invoice: Receipt,
    vehicle: Car,
  };

  const typeLabels = {
    customer: 'العملاء',
    contract: 'العقود',
    invoice: 'الفواتير',
    vehicle: 'المركبات',
  };

  const groupedResults = results.reduce((acc, result) => {
    const type = result.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="بحث في العملاء، العقود، الفواتير، المركبات..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Search className="h-4 w-4 animate-pulse" />
            <span className="mr-2">جاري البحث...</span>
          </div>
        ) : (
          <>
            <CommandEmpty>لم يتم العثور على نتائج</CommandEmpty>
            {Object.entries(groupedResults).map(([type, items]) => {
              const Icon = typeIcons[type as keyof typeof typeIcons];
              return (
                <React.Fragment key={type}>
                  <CommandGroup heading={typeLabels[type as keyof typeof typeLabels]}>
                    {items.map((item) => (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item)}
                        className="cursor-pointer"
                      >
                        <Icon className="ml-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;