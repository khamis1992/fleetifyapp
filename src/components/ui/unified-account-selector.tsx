import React, { useState } from 'react';
import { Check, ChevronDown, Building, TrendingDown, CreditCard, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useUnifiedAccountSelector, UnifiedAccount, UnifiedAccountSelectorOptions, filterAccountsBySearch } from '@/hooks/useUnifiedAccountSelector';

interface UnifiedAccountSelectorProps extends UnifiedAccountSelectorOptions {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowSearch?: boolean;
  showAccountType?: boolean;
  showParentAccount?: boolean;
}

const getAccountTypeIcon = (accountType: string) => {
  switch (accountType.toLowerCase()) {
    case 'liabilities':
      return <CreditCard className="h-4 w-4 text-orange-500" />;
    case 'expenses':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'assets':
      return <Building className="h-4 w-4 text-blue-500" />;
    case 'revenue':
      return <TrendingDown className="h-4 w-4 text-green-500 rotate-180" />;
    case 'equity':
      return <Building className="h-4 w-4 text-purple-500" />;
    default:
      return <Building className="h-4 w-4 text-muted-foreground" />;
  }
};

const getAccountTypeBadge = (accountType: string) => {
  switch (accountType.toLowerCase()) {
    case 'liabilities':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">خصوم</Badge>;
    case 'expenses':
      return <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">مصاريف</Badge>;
    case 'assets':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">أصول</Badge>;
    case 'revenue':
      return <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">إيرادات</Badge>;
    case 'equity':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">حقوق ملكية</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{accountType}</Badge>;
  }
};

export const UnifiedAccountSelector: React.FC<UnifiedAccountSelectorProps> = ({
  value,
  onValueChange,
  placeholder = "اختر الحساب المحاسبي",
  disabled = false,
  className,
  allowSearch = true,
  showAccountType = true,
  showParentAccount = true,
  filterLevel = 'level_5_6',
  includeUnavailable = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const { data: accounts, isLoading, error } = useUnifiedAccountSelector({
    filterLevel,
    includeUnavailable
  });

  const selectedAccount = accounts?.find(account => account.id === value);
  const filteredAccounts = filterAccountsBySearch(accounts || [], searchValue);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive text-sm">
        حدث خطأ في تحميل الحسابات
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-[2.5rem] text-right",
            className
          )}
          disabled={disabled}
        >
          {selectedAccount ? (
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-2 w-full">
                {showAccountType && getAccountTypeIcon(selectedAccount.account_type)}
                <div className="flex flex-col items-start flex-1">
                  <span className="font-medium text-sm">
                    {selectedAccount.account_code} - {selectedAccount.account_name_ar || selectedAccount.account_name}
                  </span>
                  {selectedAccount.account_name_ar && (
                    <span className="text-xs text-muted-foreground">
                      {selectedAccount.account_name}
                    </span>
                  )}
                  {showParentAccount && selectedAccount.parent_account_name && (
                    <span className="text-xs text-muted-foreground">
                      تحت: {selectedAccount.parent_account_name}
                    </span>
                  )}
                </div>
                {showAccountType && (
                  <div className="flex items-center gap-1">
                    {getAccountTypeBadge(selectedAccount.account_type)}
                    <Badge variant="outline" className="text-xs">
                      مستوى {selectedAccount.account_level}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 min-w-[400px]" align="start">
        <Command>
          {allowSearch && (
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="البحث في الحسابات..."
                value={searchValue}
                onValueChange={setSearchValue}
                className="flex h-11"
              />
            </div>
          )}
          <CommandList className="max-h-[300px]">
            <CommandEmpty>لا توجد حسابات مطابقة للبحث.</CommandEmpty>
            <CommandGroup>
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.id}
                  onSelect={() => {
                    onValueChange(account.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  disabled={!includeUnavailable && account.is_available === false}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {showAccountType && getAccountTypeIcon(account.account_type)}
                    <div className="flex flex-col items-start flex-1">
                      <span className="font-medium text-sm">
                        {account.account_code} - {account.account_name_ar || account.account_name}
                      </span>
                      {account.account_name_ar && (
                        <span className="text-xs text-muted-foreground">
                          {account.account_name}
                        </span>
                      )}
                      {showParentAccount && account.parent_account_name && (
                        <span className="text-xs text-muted-foreground">
                          تحت: {account.parent_account_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showAccountType && (
                      <>
                        {getAccountTypeBadge(account.account_type)}
                        <Badge variant="outline" className="text-xs">
                          مستوى {account.account_level}
                        </Badge>
                      </>
                    )}
                    {account.is_available === false && (
                      <Badge variant="destructive" className="text-xs">مستخدم</Badge>
                    )}
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
          {filteredAccounts.length > 0 && (
            <div className="border-t p-2 text-xs text-muted-foreground text-center">
              {filteredAccounts.length} حساب متاح - المستوى {filterLevel === 'level_4_5' ? '4-5' : filterLevel === 'level_5_6' ? '5-6' : '3+'}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};