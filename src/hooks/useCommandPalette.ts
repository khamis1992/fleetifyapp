import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  category?: string;
  action: () => void;
  shortcut?: string;
}

export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const navigate = useNavigate();

  // Keyboard shortcut handler
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

  // Load recent pages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentPages');
    if (stored) {
      setRecentPages(JSON.parse(stored));
    }
  }, []);

  const addRecentPage = (path: string) => {
    const updated = [path, ...recentPages.filter((p) => p !== path)].slice(0, 10);
    setRecentPages(updated);
    localStorage.setItem('recentPages', JSON.stringify(updated));
  };

  const navigateAndClose = (path: string) => {
    navigate(path);
    addRecentPage(path);
    setOpen(false);
  };

  // Define all navigation commands
  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'لوحة التحكم',
      description: 'العودة إلى الصفحة الرئيسية',
      icon: 'Home',
      category: 'التنقل',
      keywords: ['home', 'dashboard', 'الرئيسية'],
      action: () => navigateAndClose('/'),
    },
    {
      id: 'nav-customers',
      label: 'العملاء',
      description: 'إدارة العملاء',
      icon: 'Users',
      category: 'التنقل',
      keywords: ['customers', 'clients', 'عملاء'],
      action: () => navigateAndClose('/customers'),
    },
    {
      id: 'nav-contracts',
      label: 'العقود',
      description: 'عرض وإدارة العقود',
      icon: 'FileText',
      category: 'التنقل',
      keywords: ['contracts', 'agreements', 'عقود'],
      action: () => navigateAndClose('/contracts'),
    },
    {
      id: 'nav-fleet',
      label: 'الأسطول',
      description: 'إدارة المركبات',
      icon: 'Car',
      category: 'التنقل',
      keywords: ['fleet', 'vehicles', 'cars', 'أسطول', 'مركبات'],
      action: () => navigateAndClose('/fleet'),
    },
    {
      id: 'nav-properties',
      label: 'العقارات',
      description: 'إدارة العقارات والوحدات',
      icon: 'Building',
      category: 'التنقل',
      keywords: ['properties', 'real estate', 'عقارات'],
      action: () => navigateAndClose('/properties'),
    },
    {
      id: 'nav-finance',
      label: 'المالية',
      description: 'الحسابات والفواتير',
      icon: 'DollarSign',
      category: 'التنقل',
      keywords: ['finance', 'accounting', 'invoices', 'مالية', 'محاسبة'],
      action: () => navigateAndClose('/finance'),
    },
    {
      id: 'nav-inventory',
      label: 'المخزون',
      description: 'إدارة المخزون والمنتجات',
      icon: 'Package',
      category: 'التنقل',
      keywords: ['inventory', 'stock', 'products', 'مخزون'],
      action: () => navigateAndClose('/inventory'),
    },
    {
      id: 'nav-sales',
      label: 'المبيعات',
      description: 'مسار المبيعات والفرص',
      icon: 'TrendingUp',
      category: 'التنقل',
      keywords: ['sales', 'opportunities', 'leads', 'مبيعات'],
      action: () => navigateAndClose('/sales/pipeline'),
    },
    {
      id: 'nav-reports',
      label: 'التقارير',
      description: 'التقارير والتحليلات',
      icon: 'BarChart',
      category: 'التنقل',
      keywords: ['reports', 'analytics', 'تقارير'],
      action: () => navigateAndClose('/reports'),
    },
    {
      id: 'nav-settings',
      label: 'الإعدادات',
      description: 'إعدادات النظام',
      icon: 'Settings',
      category: 'التنقل',
      keywords: ['settings', 'configuration', 'إعدادات'],
      action: () => navigateAndClose('/settings'),
    },
  ];

  // Define quick action commands
  const actionCommands: CommandItem[] = [
    {
      id: 'action-new-customer',
      label: 'إضافة عميل جديد',
      icon: 'UserPlus',
      category: 'إجراءات سريعة',
      keywords: ['new customer', 'add customer', 'عميل جديد'],
      action: () => {
        navigateAndClose('/customers');
        // Will trigger add customer dialog in customers page
      },
    },
    {
      id: 'action-new-contract',
      label: 'إنشاء عقد جديد',
      icon: 'FilePlus',
      category: 'إجراءات سريعة',
      keywords: ['new contract', 'create contract', 'عقد جديد'],
      action: () => {
        navigateAndClose('/contracts');
        // Will trigger add contract dialog
      },
    },
    {
      id: 'action-new-invoice',
      label: 'إنشاء فاتورة جديدة',
      icon: 'Receipt',
      category: 'إجراءات سريعة',
      keywords: ['new invoice', 'create invoice', 'فاتورة جديدة'],
      action: () => {
        navigateAndClose('/finance/invoices');
      },
    },
    {
      id: 'action-search',
      label: 'بحث عام',
      icon: 'Search',
      category: 'إجراءات سريعة',
      keywords: ['search', 'find', 'بحث'],
      action: () => {
        // Toggle search in current page
        setOpen(false);
      },
    },
  ];

  // Theme commands
  const themeCommands: CommandItem[] = [
    {
      id: 'theme-light',
      label: 'الوضع النهاري',
      icon: 'Sun',
      category: 'المظهر',
      keywords: ['light mode', 'نهاري'],
      action: () => {
        document.documentElement.classList.remove('dark');
        setOpen(false);
      },
    },
    {
      id: 'theme-dark',
      label: 'الوضع الليلي',
      icon: 'Moon',
      category: 'المظهر',
      keywords: ['dark mode', 'ليلي'],
      action: () => {
        document.documentElement.classList.add('dark');
        setOpen(false);
      },
    },
  ];

  const allCommands = [...navigationCommands, ...actionCommands, ...themeCommands];

  return {
    open,
    setOpen,
    recentPages,
    allCommands,
    navigationCommands,
    actionCommands,
    themeCommands,
  };
};
