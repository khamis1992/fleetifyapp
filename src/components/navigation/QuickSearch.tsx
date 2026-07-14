import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock,
  TrendingUp,
  Users,
  Car,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Receipt,
  CreditCard,
  Loader2,
  User,
  Building,
  Gavel,
  Package,
} from 'lucide-react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  path: string;
  category: string;
  icon: React.ComponentType<any>;
  keywords: string[];
}

interface DataSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  type: 'customer' | 'contract' | 'vehicle' | 'invoice' | 'payment' | 'employee' | 'vendor' | 'legal_case';
}

const pageSearchItems: SearchItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    title: 'لوحة التحكم',
    description: 'نظرة عامة على النظام',
    path: '/dashboard',
    category: 'الصفحات',
    icon: BarChart3,
    keywords: ['dashboard', 'لوحة', 'تحكم', 'رئيسية', 'نظرة عامة']
  },
  // Fleet
  {
    id: 'fleet',
    title: 'إدارة الأسطول',
    description: 'إدارة المركبات والصيانة',
    path: '/fleet',
    category: 'الصفحات',
    icon: Car,
    keywords: ['fleet', 'أسطول', 'مركبات', 'سيارات', 'vehicles']
  },
  // Contracts
  {
    id: 'contracts',
    title: 'العقود',
    description: 'إدارة عقود الإيجار',
    path: '/contracts',
    category: 'الصفحات',
    icon: FileText,
    keywords: ['contracts', 'عقود', 'إيجار', 'rental']
  },
  // Customers
  {
    id: 'customers',
    title: 'العملاء',
    description: 'إدارة بيانات العملاء',
    path: '/customers',
    category: 'الصفحات',
    icon: Users,
    keywords: ['customers', 'عملاء', 'زبائن']
  },
  // Finance
  {
    id: 'finance',
    title: 'المالية',
    description: 'إدارة الشؤون المالية',
    path: '/finance',
    category: 'الصفحات',
    icon: DollarSign,
    keywords: ['finance', 'مالية', 'محاسبة']
  },
  // Invoices
  {
    id: 'invoices',
    title: 'الفواتير',
    description: 'إدارة الفواتير',
    path: '/finance/invoices',
    category: 'الصفحات',
    icon: Receipt,
    keywords: ['invoices', 'فواتير']
  },
  // Payments
  {
    id: 'payments',
    title: 'المدفوعات',
    description: 'تتبع المدفوعات',
    path: '/finance/payments',
    category: 'الصفحات',
    icon: CreditCard,
    keywords: ['payments', 'مدفوعات', 'دفع']
  },
  // HR
  {
    id: 'employees',
    title: 'الموظفون',
    description: 'إدارة الموظفين',
    path: '/hr/employees',
    category: 'الصفحات',
    icon: Users,
    keywords: ['employees', 'موظفين']
  },
  // Settings
  {
    id: 'settings',
    title: 'الإعدادات',
    description: 'إعدادات النظام',
    path: '/settings',
    category: 'الصفحات',
    icon: Settings,
    keywords: ['settings', 'إعدادات']
  }
];

const typeIcons: Record<DataSearchResult['type'], React.ComponentType<any>> = {
  customer: User,
  contract: FileText,
  vehicle: Car,
  invoice: Receipt,
  payment: CreditCard,
  employee: Users,
  vendor: Building,
  legal_case: Gavel,
};

const typeLabels: Record<DataSearchResult['type'], string> = {
  customer: 'العملاء',
  contract: 'العقود',
  vehicle: 'المركبات',
  invoice: 'الفواتير',
  payment: 'المدفوعات',
  employee: 'الموظفون',
  vendor: 'الموردين',
  legal_case: 'القضايا',
};

const typePaths: Record<DataSearchResult['type'], string> = {
  customer: '/customers',
  contract: '/contracts',
  vehicle: '/fleet/vehicles',
  invoice: '/finance/invoices',
  payment: '/finance/payments',
  employee: '/hr/employees',
  vendor: '/finance/vendors',
  legal_case: '/legal/cases',
};

export const QuickSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dataResults, setDataResults] = useState<DataSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { getRecentPages, getFrequentPages } = useNavigationHistory();
  const { companyId } = useUnifiedCompanyAccess();
  
  const debouncedQuery = useDebounce(query, 300);

  const recentPages = getRecentPages(3);
  const frequentPages = getFrequentPages(3);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Helper function to build customer display name
  const getCustomerDisplayName = (customer: any): string => {
    if (customer.customer_type === 'company') {
      return customer.company_name || customer.company_name_ar || 'شركة';
    }
    const firstName = customer.first_name || customer.first_name_ar || '';
    const lastName = customer.last_name || customer.last_name_ar || '';
    return `${firstName} ${lastName}`.trim() || 'عميل';
  };

  // Search in database
  const searchDatabase = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2 || !companyId) {
      setDataResults([]);
      return;
    }

    setIsSearching(true);
    const results: DataSearchResult[] = [];

    try {
      // Search Customers - using correct column names
      const { data: customers } = await supabase
        .from('customers')
        .select('id, customer_type, first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, phone, national_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,first_name_ar.ilike.%${searchQuery}%,last_name_ar.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,company_name_ar.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,national_id.ilike.%${searchQuery}%`)
        .limit(5);

      customers?.forEach(c => {
        results.push({
          id: c.id,
          title: getCustomerDisplayName(c),
          subtitle: c.phone || c.national_id,
          path: `/customers/${c.id}`,
          type: 'customer',
        });
      });

      // Search Contracts - with correct customer fields
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, contract_number, customer:customers(first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, customer_type)')
        .eq('company_id', companyId)
        .ilike('contract_number', `%${searchQuery}%`)
        .limit(5);

      contracts?.forEach(c => {
        const customer = c.customer as any;
        const customerName = customer ? getCustomerDisplayName(customer) : undefined;
        results.push({
          id: c.id,
          title: `عقد ${c.contract_number}`,
          subtitle: customerName,
          path: `/contracts/${c.contract_number}`,
          type: 'contract',
        });
      });

      // Search Vehicles
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model')
        .eq('company_id', companyId)
        .or(`plate_number.ilike.%${searchQuery}%,make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
        .limit(5);

      vehicles?.forEach(v => {
        results.push({
          id: v.id,
          title: v.plate_number,
          subtitle: `${v.make || ''} ${v.model || ''}`.trim(),
          path: `/fleet/vehicles/${v.id}`,
          type: 'vehicle',
        });
      });

      // Search Invoices - with correct customer fields
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, customer:customers(first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, customer_type)')
        .eq('company_id', companyId)
        .ilike('invoice_number', `%${searchQuery}%`)
        .limit(5);

      invoices?.forEach(i => {
        const customer = i.customer as any;
        const customerName = customer ? getCustomerDisplayName(customer) : undefined;
        results.push({
          id: i.id,
          title: `فاتورة ${i.invoice_number}`,
          subtitle: customerName,
          path: `/finance/billing?tab=invoices&invoice=${i.id}`,
          type: 'invoice',
        });
      });

      // Search Vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, vendor_name, vendor_name_ar, phone')
        .eq('company_id', companyId)
        .or(`vendor_name.ilike.%${searchQuery}%,vendor_name_ar.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5);

      vendors?.forEach(v => {
        results.push({
          id: v.id,
          title: v.vendor_name_ar || v.vendor_name,
          subtitle: v.phone,
          path: '/finance/vendors',
          type: 'vendor',
        });
      });

      // Search Employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, employee_id, phone')
        .eq('company_id', companyId)
        .or(`full_name.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5);

      employees?.forEach(e => {
        results.push({
          id: e.id,
          title: e.full_name,
          subtitle: e.employee_id || e.phone,
          path: `/hr/employees/${e.id}`,
          type: 'employee',
        });
      });

      setDataResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setDataResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [companyId]);

  // Trigger search when debounced query changes
  useEffect(() => {
    searchDatabase(debouncedQuery);
  }, [debouncedQuery, searchDatabase]);

  const filteredPageItems = useMemo(() => {
    if (!query) return pageSearchItems;

    const lowerQuery = query.toLowerCase();
    return pageSearchItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  // Group data results by type
  const groupedDataResults = useMemo(() => {
    const groups: Record<string, DataSearchResult[]> = {};
    dataResults.forEach(result => {
      const label = typeLabels[result.type];
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(result);
    });
    return groups;
  }, [dataResults]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery('');
    setDataResults([]);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">بحث شامل...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="ابحث عن عميل، عقد، مركبة، فاتورة..." 
          value={query}
          onValueChange={setQuery}
          dir="rtl"
        />
        <CommandList>
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="mr-2 text-sm text-muted-foreground">جاري البحث...</span>
            </div>
          )}

          {!isSearching && query && dataResults.length === 0 && filteredPageItems.length === 0 && (
            <CommandEmpty>لا توجد نتائج للبحث "{query}"</CommandEmpty>
          )}
          
          {/* Data Search Results */}
          {!isSearching && query && Object.entries(groupedDataResults).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((result) => {
                const Icon = typeIcons[result.type];
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.subtitle || ''}`}
                    onSelect={() => handleSelect(result.path)}
                    className="flex items-center gap-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[result.type]}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}

          {/* Page Results */}
          {query && filteredPageItems.length > 0 && (
            <>
              {dataResults.length > 0 && <CommandSeparator />}
              <CommandGroup heading="الصفحات">
                {filteredPageItems.slice(0, 5).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.title}
                    onSelect={() => handleSelect(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Recent Pages - Show when no query */}
          {!query && recentPages.length > 0 && (
            <CommandGroup heading="الصفحات الأخيرة">
              {recentPages.map((page) => {
                const item = pageSearchItems.find(item => item.path === page.path);
                if (!item) return null;
                
                return (
                  <CommandItem
                    key={page.path}
                    value={item.title}
                    onSelect={() => handleSelect(page.path)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Frequent Pages - Show when no query */}
          {!query && frequentPages.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="الأكثر زيارة">
                {frequentPages.map((page) => {
                  const item = pageSearchItems.find(item => item.path === page.path);
                  if (!item) return null;
                  
                  return (
                    <CommandItem
                      key={page.path}
                      value={item.title}
                      onSelect={() => handleSelect(page.path)}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                      <Badge variant="outline" className="mr-auto">
                        {page.count}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Quick Tips - Show when no query */}
          {!query && (
            <>
              <CommandSeparator />
              <div className="px-4 py-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">💡 نصائح البحث:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>ابحث برقم العقد أو رقم لوحة المركبة</li>
                  <li>ابحث باسم العميل أو رقم هاتفه</li>
                  <li>ابحث برقم الفاتورة</li>
                </ul>
              </div>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
