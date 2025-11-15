import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import {
  Home,
  Users,
  FileText,
  Car,
  Building,
  DollarSign,
  Package,
  TrendingUp,
  BarChart,
  Settings,
  UserPlus,
  FilePlus,
  Receipt,
  Search,
  Sun,
  Moon,
  Clock,
  Sparkles,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  Home,
  Users,
  FileText,
  Car,
  Building,
  DollarSign,
  Package,
  TrendingUp,
  BarChart,
  Settings,
  UserPlus,
  FilePlus,
  Receipt,
  Search,
  Sun,
  Moon,
  Clock,
  Sparkles,
};

export const CommandPalette: React.FC = () => {
  const {
    open,
    setOpen,
    recentPages,
    allCommands,
    navigationCommands,
    actionCommands,
    themeCommands,
  } = useCommandPalette();

  const [search, setSearch] = React.useState('');

  // Filter commands based on search
  const filteredCommands = React.useMemo(() => {
    if (!search) return allCommands;

    const lowerSearch = search.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerSearch) ||
        cmd.description?.toLowerCase().includes(lowerSearch) ||
        cmd.keywords?.some((k) => k.toLowerCase().includes(lowerSearch))
    );
  }, [search, allCommands]);

  // Group filtered commands by category
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, typeof filteredCommands> = {};
    filteredCommands.forEach((cmd) => {
      const category = cmd.category || 'أخرى';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Get recent page commands
  const recentCommands = React.useMemo(() => {
    return recentPages
      .map((path) => navigationCommands.find((cmd) => cmd.action.toString().includes(path)))
      .filter(Boolean)
      .slice(0, 5);
  }, [recentPages, navigationCommands]);

  return (
    <AnimatePresence>
      {open && (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {/* Command input with icon */}
            <div className="flex items-center border-b px-3">
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="ابحث عن صفحة أو إجراء... (Ctrl+K)"
                value={search}
                onValueChange={setSearch}
                className="border-0 focus:ring-0"
              />
              {search && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {filteredCommands.length}
                </Badge>
              )}
            </div>

            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-muted p-3">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
                  <p className="text-xs text-muted-foreground">جرب كلمات بحث أخرى</p>
                </div>
              </CommandEmpty>

              {/* Recent pages */}
              {!search && recentCommands.length > 0 && (
                <>
                  <CommandGroup heading="الصفحات الأخيرة">
                    {recentCommands.map((cmd) => {
                      if (!cmd) return null;
                      const Icon = iconMap[cmd.icon || ''] || Home;
                      return (
                        <CommandItem key={cmd.id} onSelect={() => cmd.action()}>
                          <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
                          <Icon className="ml-2 h-4 w-4" />
                          <span>{cmd.label}</span>
                          {cmd.description && (
                            <span className="mr-auto text-xs text-muted-foreground">
                              {cmd.description}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Grouped commands */}
              {Object.entries(groupedCommands).map(([category, commands]) => (
                <React.Fragment key={category}>
                  <CommandGroup heading={category}>
                    {commands.map((cmd) => {
                      const Icon = iconMap[cmd.icon || ''] || Sparkles;
                      return (
                        <CommandItem
                          key={cmd.id}
                          onSelect={() => cmd.action()}
                          className="group"
                        >
                          <Icon className="ml-2 h-4 w-4 group-hover:text-primary transition-colors" />
                          <div className="flex-1">
                            <span>{cmd.label}</span>
                            {cmd.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {cmd.description}
                              </p>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <Badge variant="outline" className="mr-auto text-xs">
                              {cmd.shortcut}
                            </Badge>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              ))}

              {/* Footer hint */}
              {!search && (
                <div className="p-4 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        <Command className="h-3 w-3" />
                        K
                      </kbd>
                      <span>للفتح/الإغلاق</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        ↑↓
                      </kbd>
                      <span>للتنقل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        Enter
                      </kbd>
                      <span>للاختيار</span>
                    </div>
                  </div>
                </div>
              )}
            </CommandList>
          </motion.div>
        </CommandDialog>
      )}
    </AnimatePresence>
  );
};

// Keyboard shortcut hint component (for UI hints)
export const CommandPaletteHint: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <span>اضغط</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
        <Command className="h-3 w-3" />
        K
      </kbd>
      <span>للبحث السريع</span>
    </div>
  );
};
