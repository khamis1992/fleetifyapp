import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Car,
  Building2,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  BarChart3,
  Package,
  TrendingUp,
  Calculator,
  Building,
  FileSpreadsheet,
  UserPlus,
  Plus,
  Download,
  Upload,
  Search,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
  badge?: string;
}

interface CommandPaletteProps {
  /** Is palette open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('commandPaletteRecent');
    if (recent) {
      setRecentCommands(JSON.parse(recent));
    }
  }, []);

  // Save recent command
  const saveRecentCommand = (commandId: string) => {
    const updated = [commandId, ...recentCommands.filter(id => id !== commandId)].slice(0, 5);
    setRecentCommands(updated);
    localStorage.setItem('commandPaletteRecent', JSON.stringify(updated));
  };

  // Define all commands
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-home',
      title: 'الصفحة الرئيسية',
      subtitle: 'العودة إلى لوحة التحكم',
      icon: Home,
      action: () => navigate('/'),
      category: 'التنقل',
      keywords: ['home', 'dashboard', 'main'],
    },
    {
      id: 'nav-car-rental',
      title: 'تأجير السيارات',
      subtitle: 'لوحة تحكم تأجير السيارات',
      icon: Car,
      action: () => navigate('/'),
      category: 'التنقل',
      keywords: ['car', 'rental', 'fleet'],
    },
    {
      id: 'nav-real-estate',
      title: 'العقارات',
      subtitle: 'لوحة تحكم العقارات',
      icon: Building2,
      action: () => navigate('/real-estate'),
      category: 'التنقل',
      keywords: ['real estate', 'property', 'building'],
    },
    {
      id: 'nav-retail',
      title: 'التجزئة',
      subtitle: 'لوحة تحكم التجزئة',
      icon: ShoppingCart,
      action: () => navigate('/retail'),
      category: 'التنقل',
      keywords: ['retail', 'sales', 'shop'],
    },
    {
      id: 'nav-contracts',
      title: 'العقود',
      subtitle: 'إدارة العقود والاتفاقيات',
      icon: FileText,
      action: () => navigate('/contracts'),
      category: 'التنقل',
      keywords: ['contracts', 'agreements'],
    },
    {
      id: 'nav-customers',
      title: 'العملاء',
      subtitle: 'إدارة العملاء',
      icon: Users,
      action: () => navigate('/customers'),
      category: 'التنقل',
      keywords: ['customers', 'clients'],
    },
    {
      id: 'nav-fleet',
      title: 'الأسطول',
      subtitle: 'إدارة المركبات',
      icon: Car,
      action: () => navigate('/fleet'),
      category: 'التنقل',
      keywords: ['fleet', 'vehicles'],
    },
    {
      id: 'nav-inventory',
      title: 'المخزون',
      subtitle: 'إدارة المخزون',
      icon: Package,
      action: () => navigate('/inventory'),
      category: 'التنقل',
      keywords: ['inventory', 'stock'],
    },
    {
      id: 'nav-properties',
      title: 'العقارات',
      subtitle: 'قائمة العقارات',
      icon: Building,
      action: () => navigate('/properties'),
      category: 'التنقل',
      keywords: ['properties', 'buildings'],
    },
    {
      id: 'nav-analytics',
      title: 'التحليلات',
      subtitle: 'التقارير والتحليلات',
      icon: BarChart3,
      action: () => navigate('/analytics'),
      category: 'التنقل',
      keywords: ['analytics', 'reports'],
    },
    {
      id: 'nav-finance',
      title: 'المالية',
      subtitle: 'الإدارة المالية',
      icon: Calculator,
      action: () => navigate('/finance'),
      category: 'التنقل',
      keywords: ['finance', 'accounting'],
    },
    {
      id: 'nav-settings',
      title: 'الإعدادات',
      subtitle: 'إعدادات النظام',
      icon: Settings,
      action: () => navigate('/settings'),
      category: 'التنقل',
      keywords: ['settings', 'preferences'],
    },

    // Quick Actions
    {
      id: 'action-new-contract',
      title: 'عقد جديد',
      subtitle: 'إنشاء عقد جديد',
      icon: Plus,
      action: () => {
        navigate('/contracts');
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('[data-action="new-contract"]')?.click();
        }, 100);
      },
      category: 'إجراءات سريعة',
      keywords: ['new', 'contract', 'create'],
      badge: 'جديد',
    },
    {
      id: 'action-new-customer',
      title: 'عميل جديد',
      subtitle: 'إضافة عميل جديد',
      icon: UserPlus,
      action: () => {
        navigate('/customers');
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('[data-action="new-customer"]')?.click();
        }, 100);
      },
      category: 'إجراءات سريعة',
      keywords: ['new', 'customer', 'add'],
      badge: 'جديد',
    },
    {
      id: 'action-new-invoice',
      title: 'فاتورة جديدة',
      subtitle: 'إنشاء فاتورة جديدة',
      icon: FileSpreadsheet,
      action: () => {
        navigate('/invoices');
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('[data-action="new-invoice"]')?.click();
        }, 100);
      },
      category: 'إجراءات سريعة',
      keywords: ['new', 'invoice', 'create'],
      badge: 'جديد',
    },
    {
      id: 'action-export-data',
      title: 'تصدير البيانات',
      subtitle: 'تصدير البيانات إلى Excel',
      icon: Download,
      action: () => {
        document.querySelector<HTMLButtonElement>('[data-action="export"]')?.click();
      },
      category: 'إجراءات سريعة',
      keywords: ['export', 'download', 'excel'],
    },
    {
      id: 'action-import-data',
      title: 'استيراد البيانات',
      subtitle: 'استيراد من ملف CSV',
      icon: Upload,
      action: () => {
        document.querySelector<HTMLButtonElement>('[data-action="import"]')?.click();
      },
      category: 'إجراءات سريعة',
      keywords: ['import', 'upload', 'csv'],
    },
  ];

  // Filter commands based on search
  const filteredCommands = React.useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(searchLower) ||
        cmd.subtitle?.toLowerCase().includes(searchLower) ||
        cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower))
    );
  }, [search]);

  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Get recent commands
  const recentCommandsList = React.useMemo(() => {
    return recentCommands
      .map((id) => commands.find((cmd) => cmd.id === id))
      .filter((cmd): cmd is CommandItem => cmd !== undefined)
      .slice(0, 3);
  }, [recentCommands]);

  const handleSelect = (command: CommandItem) => {
    saveRecentCommand(command.id);
    command.action();
    onClose();
    setSearch('');
  };

  // Close on Escape
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <Command
              className="rounded-lg border shadow-2xl bg-white dark:bg-gray-900 overflow-hidden"
              shouldFilter={false}
            >
              {/* Search Input */}
              <div className="flex items-center border-b px-4">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="ابحث عن أوامر، صفحات، أو إجراءات..."
                  className="flex h-14 w-full rounded-md bg-transparent py-3 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  لم يتم العثور على نتائج
                </Command.Empty>

                {/* Recent Commands */}
                {!search && recentCommandsList.length > 0 && (
                  <Command.Group
                    heading={
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        المستخدم مؤخراً
                      </div>
                    }
                  >
                    {recentCommandsList.map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        onSelect={() => handleSelect(cmd)}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer hover:bg-muted transition-colors"
                      >
                        <cmd.icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {cmd.subtitle}
                            </div>
                          )}
                        </div>
                        {cmd.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {cmd.badge}
                          </Badge>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Grouped Commands */}
                {Object.entries(groupedCommands).map(([category, items]) => (
                  <Command.Group
                    key={category}
                    heading={
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category}
                      </div>
                    }
                  >
                    {items.map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        onSelect={() => handleSelect(cmd)}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer hover:bg-muted transition-colors data-[selected=true]:bg-muted"
                      >
                        <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {cmd.subtitle}
                            </div>
                          )}
                        </div>
                        {cmd.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {cmd.badge}
                          </Badge>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background border">↑↓</kbd>
                    للتنقل
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background border">Enter</kbd>
                    للاختيار
                  </span>
                </div>
                <span>Ctrl + K</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
