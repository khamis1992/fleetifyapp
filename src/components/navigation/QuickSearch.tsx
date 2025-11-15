import React, { useState, useEffect, useMemo } from 'react';
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
  Command,
  Clock,
  TrendingUp,
  Users,
  Car,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  Building,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  path: string;
  category: string;
  icon: React.ComponentType<any>;
  keywords: string[];
}

const searchItems: SearchItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    title: 'لوحة التحكم',
    description: 'نظرة عامة على النظام',
    path: '/dashboard',
    category: 'عام',
    icon: BarChart3,
    keywords: ['dashboard', 'لوحة', 'تحكم', 'رئيسية', 'نظرة عامة']
  },
  
  // Fleet Management
  {
    id: 'fleet',
    title: 'إدارة الأسطول',
    description: 'إدارة المركبات والصيانة',
    path: '/fleet',
    category: 'الأسطول',
    icon: Car,
    keywords: ['fleet', 'أسطول', 'مركبات', 'سيارات', 'vehicles']
  },
  {
    id: 'maintenance',
    title: 'الصيانة',
    description: 'صيانة المركبات وجدولة الخدمات',
    path: '/fleet/maintenance',
    category: 'الأسطول',
    icon: Settings,
    keywords: ['maintenance', 'صيانة', 'خدمة', 'إصلاح', 'service']
  },
  {
    id: 'traffic-violations',
    title: 'المخالفات المرورية',
    description: 'إدارة المخالفات والغرامات',
    path: '/fleet/traffic-violations',
    category: 'الأسطول',
    icon: FileText,
    keywords: ['violations', 'مخالفات', 'غرامات', 'مرور', 'traffic']
  },
  
  // Contracts & Customers
  {
    id: 'contracts',
    title: 'العقود',
    description: 'إدارة عقود الإيجار والخدمات',
    path: '/contracts',
    category: 'العملاء',
    icon: FileText,
    keywords: ['contracts', 'عقود', 'إيجار', 'اتفاقيات', 'rental']
  },
  {
    id: 'tenants',
    title: 'المستأجرين',
    description: 'إدارة بيانات المستأجرين',
    path: '/tenants',
    category: 'المستأجرين',
    icon: Users,
    keywords: ['tenants', 'مستأجرين', 'إيجار', 'rental']
  },
  {
    id: 'quotations',
    title: 'عروض الأسعار',
    description: 'إنشاء وإدارة عروض الأسعار',
    path: '/quotations',
    category: 'العملاء',
    icon: FileText,
    keywords: ['quotations', 'عروض', 'أسعار', 'تسعير', 'quotes']
  },
  
  // Finance
  {
    id: 'finance',
    title: 'المالية',
    description: 'إدارة الشؤون المالية',
    path: '/finance',
    category: 'المالية',
    icon: DollarSign,
    keywords: ['finance', 'مالية', 'محاسبة', 'accounting']
  },
  {
    id: 'invoices',
    title: 'الفواتير',
    description: 'إنشاء وإدارة الفواتير',
    path: '/finance/invoices',
    category: 'المالية',
    icon: FileText,
    keywords: ['invoices', 'فواتير', 'billing', 'bills']
  },
  {
    id: 'payments',
    title: 'المدفوعات',
    description: 'تتبع المدفوعات والمقبوضات',
    path: '/finance/payments',
    category: 'المالية',
    icon: DollarSign,
    keywords: ['payments', 'مدفوعات', 'دفع', 'تسديد', 'pay']
  },
  
  // HR
  {
    id: 'employees',
    title: 'الموظفون',
    description: 'إدارة بيانات الموظفين',
    path: '/hr/employees',
    category: 'الموارد البشرية',
    icon: Users,
    keywords: ['employees', 'موظفين', 'staff', 'hr', 'personnel']
  },
  {
    id: 'attendance',
    title: 'الحضور والانصراف',
    description: 'تتبع حضور الموظفين',
    path: '/hr/attendance',
    category: 'الموارد البشرية',
    icon: Clock,
    keywords: ['attendance', 'حضور', 'انصراف', 'time', 'clock']
  },
  {
    id: 'payroll',
    title: 'الرواتب',
    description: 'إدارة رواتب الموظفين',
    path: '/hr/payroll',
    category: 'الموارد البشرية',
    icon: DollarSign,
    keywords: ['payroll', 'رواتب', 'salary', 'wages']
  },
  
  // Settings
  {
    id: 'settings',
    title: 'الإعدادات',
    description: 'إعدادات النظام والحساب',
    path: '/settings',
    category: 'الإعدادات',
    icon: Settings,
    keywords: ['settings', 'إعدادات', 'تكوين', 'configuration']
  },
  {
    id: 'profile',
    title: 'الملف الشخصي',
    description: 'إدارة الملف الشخصي',
    path: '/profile',
    category: 'الإعدادات',
    icon: Users,
    keywords: ['profile', 'ملف', 'شخصي', 'حساب', 'account']
  }
];

export const QuickSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { getRecentPages, getFrequentPages } = useNavigationHistory();

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

  const filteredItems = useMemo(() => {
    if (!query) return searchItems;

    const lowerQuery = query.toLowerCase();
    return searchItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">بحث سريع...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="ابحث في النظام..." 
          value={query}
          onValueChange={setQuery}
          dir="rtl"
        />
        <CommandList>
          <CommandEmpty>لا توجد نتائج.</CommandEmpty>
          
          {/* Recent Pages */}
          {!query && recentPages.length > 0 && (
            <CommandGroup heading="الصفحات الأخيرة">
              {(recentPages || []).map((page) => {
                const item = searchItems.find(item => item.path === page.path);
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

          {/* Frequent Pages */}
          {!query && frequentPages.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="الصفحات الأكثر زيارة">
                {(frequentPages || []).map((page) => {
                  const item = searchItems.find(item => item.path === page.path);
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

          {/* Search Results */}
          {query && Object.entries(groupedItems).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {(items || []).map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
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
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};