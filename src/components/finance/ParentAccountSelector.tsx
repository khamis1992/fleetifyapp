import React from 'react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { wouldCreateCircularReference } from '@/utils/accountHierarchy';

interface ParentAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  currentAccountId?: string; // ID of current account to prevent circular refs
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ParentAccountSelector: React.FC<ParentAccountSelectorProps> = ({
  value,
  onValueChange,
  currentAccountId,
  placeholder = "اختر الحساب الأب (اختياري)",
  disabled = false,
  className
}) => {
  const { data: accounts, isLoading } = useChartOfAccounts();
  const [open, setOpen] = useState(false);

  // Filter to show all active accounts as potential parents with hierarchy validation
  const parentAccounts = accounts?.filter(account => 
    account.is_active && 
    (!currentAccountId || account.id !== currentAccountId) && // Prevent selecting self as parent
    (!currentAccountId || !wouldCreateCircularReference(currentAccountId, account.id, accounts)) // Prevent circular refs
  ) || [];

  const selectedAccount = parentAccounts.find(account => account.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-right",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedAccount ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {selectedAccount.account_code}
                </span>
                <span>{selectedAccount.account_name_ar || selectedAccount.account_name}</span>
              </div>
              <div className="flex items-center gap-1">
                 <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                   <Layers className="h-3 w-3 mr-1" />
                   مستوى {selectedAccount.account_level || 1}
                 </Badge>
                 <Badge variant={selectedAccount.is_header ? "default" : "outline"} className="h-5 px-1.5 text-xs">
                   {selectedAccount.is_header ? "رئيسي" : "فرعي"}
                 </Badge>
              </div>
            </div>
          ) : (
            placeholder
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="البحث في الحسابات الأب..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "جاري التحميل..." : "لا توجد حسابات أب متاحة"}
            </CommandEmpty>
            <CommandGroup>
              {parentAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  onSelect={() => {
                    onValueChange(account.id === value ? "" : account.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {account.account_code}
                    </span>
                    <span>{account.account_name_ar || account.account_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge variant="outline" className="h-5 px-1.5 text-xs">
                       <Layers className="h-3 w-3 mr-1" />
                       مستوى {account.account_level || 1}
                     </Badge>
                     <Badge variant={account.is_header ? "default" : "secondary"} className="h-5 px-1.5 text-xs">
                       {account.is_header ? "رئيسي" : "فرعي"}
                     </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {account.account_type === 'assets' && 'أصول'}
                      {account.account_type === 'liabilities' && 'خصوم'}
                      {account.account_type === 'equity' && 'حقوق ملكية'}
                      {account.account_type === 'revenue' && 'إيرادات'}
                      {account.account_type === 'expenses' && 'مصروفات'}
                    </Badge>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === account.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};