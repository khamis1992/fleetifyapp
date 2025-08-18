import React, { useState, useMemo, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronDown, Bot, TrendingUp, Users, Sparkles, Target, Clock, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnhancedAccountSuggestions, EnhancedSuggestion } from '@/hooks/useEnhancedAccountSuggestions';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';

interface AISmartParentSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  currentAccountId?: string;
  accountName: string;
  accountType?: string;
  placeholder?: string;
  disabled?: boolean;
}

const getCategoryIcon = (category: EnhancedSuggestion['category']) => {
  switch (category) {
    case 'perfect_match':
      return <Target className="h-3 w-3" />;
    case 'similar_name':
      return <Users className="h-3 w-3" />;
    case 'ai_suggested':
      return <Bot className="h-3 w-3" />;
    case 'usage_based':
      return <TrendingUp className="h-3 w-3" />;
    case 'type_match':
      return <Sparkles className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const getCategoryColor = (category: EnhancedSuggestion['category']) => {
  switch (category) {
    case 'perfect_match':
      return 'bg-success/10 text-success border-success/20';
    case 'similar_name':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'ai_suggested':
      return 'bg-accent/10 text-accent-foreground border-accent/30';
    case 'usage_based':
      return 'bg-warning/10 text-warning-foreground border-warning/20';
    case 'type_match':
      return 'bg-secondary/20 text-secondary-foreground border-secondary/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-success font-bold';
  if (confidence >= 0.6) return 'text-warning font-semibold';
  return 'text-destructive font-medium';
};

export const AISmartParentSelector: React.FC<AISmartParentSelectorProps> = ({
  value,
  onValueChange,
  currentAccountId,
  accountName,
  accountType,
  placeholder = "اختر الحساب الأب",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<EnhancedSuggestion[]>([]);
  const { data: allAccounts } = useChartOfAccounts();
  const { generateEnhancedSuggestions, recordUserChoice, isAnalyzing } = useEnhancedAccountSuggestions();

  // Load suggestions when opened
  const loadSuggestions = useCallback(async () => {
    if (currentAccountId && accountName) {
      const newSuggestions = await generateEnhancedSuggestions(
        currentAccountId,
        accountName,
        accountType,
        value
      );
      setSuggestions(newSuggestions);
    }
  }, [currentAccountId, accountName, accountType, value, generateEnhancedSuggestions]);

  // Handle selection
  const handleSelect = useCallback((selectedValue: string) => {
    if (currentAccountId && suggestions.length > 0) {
      recordUserChoice(
        currentAccountId,
        value || '',
        suggestions.map(s => s.id),
        selectedValue
      );
    }
    onValueChange(selectedValue);
    setOpen(false);
  }, [currentAccountId, value, suggestions, recordUserChoice, onValueChange]);

  // Filter suggestions based on search
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return suggestions;
    
    const query = searchQuery.toLowerCase();
    return suggestions.filter(suggestion =>
      suggestion.name.toLowerCase().includes(query) ||
      suggestion.code.toLowerCase().includes(query) ||
      suggestion.path.some(p => p.toLowerCase().includes(query))
    );
  }, [suggestions, searchQuery]);

  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, EnhancedSuggestion[]> = {};
    
    filteredSuggestions.forEach(suggestion => {
      if (!groups[suggestion.category]) {
        groups[suggestion.category] = [];
      }
      groups[suggestion.category].push(suggestion);
    });
    
    return groups;
  }, [filteredSuggestions]);

  // Get selected account info
  const selectedAccount = useMemo(() => {
    if (!value || !allAccounts) return null;
    return allAccounts.find(acc => acc.id === value);
  }, [value, allAccounts]);

  const categoryLabels: Record<string, string> = {
    'perfect_match': 'تطابق مثالي',
    'similar_name': 'أسماء متشابهة',
    'ai_suggested': 'اقتراح ذكي',
    'usage_based': 'الأكثر استخداماً',
    'type_match': 'تطابق النوع'
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between arabic-body"
            disabled={disabled}
            onClick={loadSuggestions}
          >
            {selectedAccount ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs bg-muted px-1 rounded">
                  {selectedAccount.account_code}
                </span>
                <span className="truncate">
                  {selectedAccount.account_name_ar || selectedAccount.account_name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <div className="flex items-center gap-1">
              {isAnalyzing && (
                <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full" />
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[500px] p-0 shadow-elevated" align="start">
          <div className="border-b border-border bg-gradient-accent p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-lg arabic-heading-sm">اقتراحات ذكية لاختيار الحساب الأب</h3>
                <p className="text-sm text-muted-foreground arabic-body-sm">مدعوم بالذكاء الاصطناعي لاختيار أفضل حساب أب مناسب</p>
              </div>
            </div>
          </div>
          
          <Command>
            <CommandInput
              placeholder="ابحث في الحسابات المقترحة..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="arabic-body border-0 focus:ring-0"
            />
            <CommandList className="max-h-[400px]">
              <CommandEmpty className="py-8 text-center text-sm arabic-body">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary animate-pulse" />
                      <span className="font-medium">جاري التحليل الذكي للحسابات...</span>
                    </div>
                    <p className="text-xs text-muted-foreground">يتم تحليل البيانات لإعطائك أفضل الاقتراحات</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>لا توجد حسابات مطابقة للبحث</p>
                  </div>
                )}
              </CommandEmpty>

              {/* Target Option */}
              <CommandGroup heading="الخيارات الأساسية">
                <CommandItem
                  value="target"
                  onSelect={() => handleSelect('')}
                  className="arabic-body"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span>حساب رئيسي (بدون أب)</span>
                    </div>
                    {!value && <Check className="h-4 w-4" />}
                  </div>
                </CommandItem>
              </CommandGroup>

              {/* AI Suggestions by Category */}
              {Object.entries(groupedSuggestions)
                .sort(([, a], [, b]) => Math.max(...b.map(s => s.confidence)) - Math.max(...a.map(s => s.confidence)))
                .map(([category, suggestions]) => (
                <CommandGroup 
                  key={category} 
                  heading={
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category as EnhancedSuggestion['category'])}
                      <span>{categoryLabels[category] || category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {suggestions.length}
                      </Badge>
                    </div>
                  }
                >
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.id}
                      value={suggestion.id}
                      onSelect={() => handleSelect(suggestion.id)}
                      className="arabic-body p-4 transition-smooth hover:bg-card-hover cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-md border">
                                {suggestion.code}
                              </span>
                              <span className="font-semibold text-base truncate text-foreground">
                                {suggestion.name}
                              </span>
                            </div>
                            
                            {suggestion.path.length > 1 && (
                              <div className="text-sm text-muted-foreground truncate mr-2">
                                المسار: {suggestion.path.slice(0, -1).join(' ← ')}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 mt-1">
                              <Badge 
                                variant="outline" 
                                className={cn("text-sm px-3 py-1 font-medium", getCategoryColor(suggestion.category))}
                              >
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(suggestion.category)}
                                  <span>{suggestion.reason}</span>
                                </div>
                              </Badge>
                              
                              {suggestion.aiGenerated && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded-md border border-accent/20">
                                      <Bot className="h-3 w-3 text-accent-foreground" />
                                      <span className="text-xs font-medium text-accent-foreground">AI</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>اقتراح مدعوم بالذكاء الاصطناعي</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center gap-3 min-w-[120px]">
                            <div className="flex items-center gap-3">
                              <span className={cn("text-2xl font-bold", getConfidenceColor(suggestion.confidence))}>
                                {Math.round(suggestion.confidence * 100)}%
                              </span>
                              {value === suggestion.id && (
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success text-success-foreground">
                                  <Check className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            
                            <div className="w-full max-w-[100px]">
                              <Progress 
                                value={suggestion.confidence * 100} 
                                variant="success"
                                className="h-3 bg-secondary/30"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              
              {filteredSuggestions.length === 0 && !isAnalyzing && (
                <div className="py-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />
                    <div className="text-base font-medium text-muted-foreground arabic-body">
                      لم يتم العثور على اقتراحات ذكية
                    </div>
                    <div className="text-sm text-muted-foreground arabic-body-sm max-w-xs">
                      لا توجد اقتراحات متاحة لهذا الحساب حالياً. جرب تحديث اسم الحساب أو نوعه للحصول على اقتراحات أفضل.
                    </div>
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};