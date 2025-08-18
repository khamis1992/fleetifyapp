import React, { useState, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronDown, Search, TreePine, Target, Lightbulb, ArrowRight } from 'lucide-react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { AccountMoveValidator } from './AccountMoveValidator';
import { cn } from '@/lib/utils';

interface SmartParentSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  currentAccountId?: string;
  accountType?: string;
  placeholder?: string;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
  level: number;
  path: string[];
  isRecommended: boolean;
  reason?: string;
}

export const SmartParentSelector: React.FC<SmartParentSelectorProps> = ({
  value,
  onValueChange,
  currentAccountId,
  accountType = 'assets',
  placeholder = 'اختر الحساب الأب'
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: allAccounts } = useChartOfAccounts();
  const validator = new AccountMoveValidator(allAccounts || []);

  // إعداد خيارات الحسابات المناسبة
  const accountOptions = useMemo(() => {
    if (!allAccounts || !currentAccountId) return [];

    const currentAccount = allAccounts.find(acc => acc.id === currentAccountId);
    if (!currentAccount) return [];

    // احصل على الاقتراحات الذكية
    const recommendations = validator.suggestBestParent(currentAccount);
    const recommendedIds = new Set(recommendations.map(r => r.id));

    // فلتر الحسابات المناسبة
    const suitableAccounts = allAccounts.filter(account => 
      account.is_header && // يجب أن يكون حساب رئيسي
      account.id !== currentAccountId && // ليس الحساب نفسه
      account.account_type === accountType && // نفس نوع الحساب
      (account.account_level || 1) <= 4 // لا يكون في مستوى عميق جداً
    );

    // تحويل إلى خيارات مع معلومات إضافية
    const options: AccountOption[] = suitableAccounts.map(account => {
      const path = buildAccountPath(account, allAccounts);
      const isRecommended = recommendedIds.has(account.id);
      
      let reason = '';
      if (isRecommended) {
        reason = 'موصى به - مناسب لنوع الحساب والمستوى';
      } else if ((account.account_level || 1) === 1) {
        reason = 'حساب رئيسي - مستوى أول';
      } else if ((account.account_level || 1) <= 3) {
        reason = 'مستوى مناسب للحسابات الفرعية';
      }

      return {
        id: account.id,
        code: account.account_code,
        name: account.account_name,
        nameAr: account.account_name_ar,
        type: account.account_type,
        level: account.account_level || 1,
        path,
        isRecommended,
        reason
      };
    });

    // ترتيب الخيارات: الموصى بها أولاً، ثم حسب المستوى والكود
    return options.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      
      const levelDiff = a.level - b.level;
      if (levelDiff !== 0) return levelDiff;
      
      return a.code.localeCompare(b.code);
    });
  }, [allAccounts, currentAccountId, accountType]);

  // فلتر الخيارات حسب البحث
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return accountOptions;
    
    const query = searchQuery.toLowerCase().trim();
    return accountOptions.filter(option =>
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.nameAr?.toLowerCase().includes(query)
    );
  }, [accountOptions, searchQuery]);

  // بناء المسار للحساب
  const buildAccountPath = (account: any, accounts: any[]): string[] => {
    const path: string[] = [];
    let current = account;
    
    while (current) {
      path.unshift(current.account_name_ar || current.account_name);
      if (!current.parent_account_id) break;
      current = accounts.find(acc => acc.id === current.parent_account_id);
    }
    
    return path;
  };

  // الحصول على الحساب المحدد
  const selectedAccount = allAccounts?.find(acc => acc.id === value);

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              {selectedAccount ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedAccount.account_code}
                  </Badge>
                  <span>{selectedAccount.account_name_ar || selectedAccount.account_name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start" dir="rtl">
          <Command className="w-full">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="بحث في الحسابات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-right"
                dir="rtl"
              />
            </div>
            
            <ScrollArea className="max-h-80">
              {/* الحسابات الموصى بها */}
              {filteredOptions.filter(opt => opt.isRecommended).length > 0 && (
                <CommandGroup heading="الحسابات الموصى بها">
                  {filteredOptions
                    .filter(opt => opt.isRecommended)
                    .map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.id}
                        onSelect={() => {
                          onValueChange(option.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          <Badge variant="outline" className="font-mono text-xs">
                            {option.code}
                          </Badge>
                          <div className="flex flex-col flex-1">
                            <span className="text-sm font-medium">
                              {option.nameAr || option.name}
                            </span>
                            {option.reason && (
                              <span className="text-xs text-muted-foreground">
                                {option.reason}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            مستوى {option.level}
                          </Badge>
                        </div>
                        {value === option.id && (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {/* باقي الحسابات */}
              {filteredOptions.filter(opt => !opt.isRecommended).length > 0 && (
                <CommandGroup heading="حسابات أخرى مناسبة">
                  {filteredOptions
                    .filter(opt => !opt.isRecommended)
                    .map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.id}
                        onSelect={() => {
                          onValueChange(option.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <TreePine className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="font-mono text-xs">
                            {option.code}
                          </Badge>
                          <div className="flex flex-col flex-1">
                            <span className="text-sm">
                              {option.nameAr || option.name}
                            </span>
                            {option.path.length > 1 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {option.path.slice(0, -1).map((pathItem, index) => (
                                  <React.Fragment key={index}>
                                    <span>{pathItem}</span>
                                    {index < option.path.length - 2 && (
                                      <ArrowRight className="h-3 w-3" />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            مستوى {option.level}
                          </Badge>
                        </div>
                        {value === option.id && (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {filteredOptions.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'لم يتم العثور على حسابات مطابقة' : 'لا توجد حسابات مناسبة'}
                </CommandEmpty>
              )}
            </ScrollArea>

            {/* خيار عدم تحديد حساب أب */}
            <div className="border-t p-2">
              <CommandItem
                onSelect={() => {
                  onValueChange('');
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                <span>حساب رئيسي (بدون حساب أب)</span>
                {!value && <Check className="h-4 w-4 text-success" />}
              </CommandItem>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* معاينة الاختيار */}
      {selectedAccount && (
        <div className="p-3 bg-accent/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">المسار المحدد</Badge>
          </div>
          <div className="text-sm">
            {buildAccountPath(selectedAccount, allAccounts || []).map((pathItem, index, array) => (
              <React.Fragment key={index}>
                <span className={index === array.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                  {pathItem}
                </span>
                {index < array.length - 1 && (
                  <ArrowRight className="h-3 w-3 inline mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};