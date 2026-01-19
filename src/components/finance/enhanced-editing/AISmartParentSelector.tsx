import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronDown, Bot, TrendingUp, Users, Sparkles, Target, Clock, Hash } from 'lucide-react';
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
      return 'bg-green-100 text-green-800 border-green-200';
    case 'similar_name':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ai_suggested':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'usage_based':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'type_match':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
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
  const [autoOpened, setAutoOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<EnhancedSuggestion[]>([]);
  const { data: allAccounts } = useChartOfAccounts();
  const { generateEnhancedSuggestions, recordUserChoice, isAnalyzing } = useEnhancedAccountSuggestions();

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!accountName.trim()) return;
    
    try {
      const results = await generateEnhancedSuggestions(
        currentAccountId, // Can be undefined for new accounts
        accountName,
        accountType
      );
      setSuggestions(results);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    }
  }, [currentAccountId, accountName, accountType, generateEnhancedSuggestions]);

  // Auto-load suggestions on mount and open dropdown
  useEffect(() => {
    // Only auto-open for existing accounts (currentAccountId exists) or when we have account info
    if (accountName && accountType && !autoOpened) {
      const autoOpenDropdown = async () => {
        await loadSuggestions();
        // Only auto-open if we have a currentAccountId (editing existing account)
        if (currentAccountId) {
          setOpen(true);
        }
        setAutoOpened(true);
      };
      autoOpenDropdown();
    }
  }, [currentAccountId, accountName, accountType, loadSuggestions, autoOpened]);

  // Handle selection
  const handleSelect = useCallback((selectedValue: string) => {
    if (suggestions.length > 0) {
      recordUserChoice(
        currentAccountId, // Can be undefined for new accounts
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
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between arabic-body"
            disabled={disabled}
          >
            {selectedAccount ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs bg-muted px-1 rounded">
                  {selectedAccount.account_code}
                </span>
                <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                  <Hash className="h-3 w-3 mr-1" />
                  {selectedAccount.account_level || 1}
                </Badge>
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
        
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="ابحث في الحسابات..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="arabic-body"
            />
            <CommandList className="max-h-96">
              <CommandEmpty className="py-6 text-center text-sm arabic-body">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border border-primary border-t-transparent rounded-full" />
                    <span>جاري التحليل الذكي...</span>
                  </div>
                ) : (
                  "لا توجد حسابات مطابقة"
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
                      className="arabic-body p-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1 rounded">
                                {suggestion.code}
                              </span>
                              <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                                <Hash className="h-3 w-3 mr-1" />
                                {allAccounts?.find(acc => acc.id === suggestion.id)?.account_level || 1}
                              </Badge>
                              <span className="font-medium truncate">
                                {suggestion.name}
                              </span>
                            </div>
                            
                            {suggestion.path.length > 1 && (
                              <div className="text-xs text-muted-foreground truncate">
                                {suggestion.path.slice(0, -1).join(' / ')}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getCategoryColor(suggestion.category))}
                              >
                                <div className="flex items-center gap-1">
                                  {getCategoryIcon(suggestion.category)}
                                  <span>{suggestion.reason}</span>
                                </div>
                              </Badge>
                              
                              {suggestion.aiGenerated && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Bot className="h-3 w-3 text-purple-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>اقتراح مدعوم بالذكاء الاصطناعي</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-medium", getConfidenceColor(suggestion.confidence))}>
                                {Math.round(suggestion.confidence * 100)}%
                              </span>
                              {value === suggestion.id && <Check className="h-4 w-4 text-primary" />}
                            </div>
                            
                            <div className="w-16">
                              <Progress 
                                value={suggestion.confidence * 100} 
                                className="h-1"
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
                <div className="py-6 text-center">
                  <div className="text-sm text-muted-foreground arabic-body">
                    لم يتم العثور على اقتراحات ذكية
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 arabic-body">
                    جرب البحث عن حساب معين أو تحقق من اسم الحساب
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
  );
};