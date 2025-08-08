import React, { useState } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, Check, ChevronsUpDown, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const CompanySelector: React.FC = () => {
  const { user } = useAuth();
  const { data: companies, isLoading } = useCompanies();
  const { browsedCompany, setBrowsedCompany, isBrowsingMode, exitBrowseMode } = useCompanyContext();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Only show for super admins
  if (!user?.roles?.includes('super_admin')) {
    return null;
  }

  const handleSelectCompany = (company: any) => {
    setBrowsedCompany(company);
    setOpen(false);
    setSearchValue('');
  };

  const handleExitBrowseMode = () => {
    exitBrowseMode();
  };

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    company.name_ar?.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  return (
    <div className="flex items-center gap-2">
      {/* Browse Mode Indicator */}
      <AnimatePresence>
        {isBrowsingMode && browsedCompany && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg"
          >
            <Eye className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-primary font-medium">مشاهدة شركة</span>
              <span className="text-xs text-muted-foreground">
                {browsedCompany.name_ar || browsedCompany.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitBrowseMode}
              className="h-6 w-6 p-0 hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Company Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between min-w-[200px] hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {isBrowsingMode && browsedCompany 
                  ? (browsedCompany.name_ar || browsedCompany.name)
                  : 'اختيار شركة'
                }
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="البحث عن شركة..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  <CommandEmpty>لا توجد شركات</CommandEmpty>
                  <CommandGroup>
                    {filteredCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.id}
                        onSelect={() => handleSelectCompany(company)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {company.name_ar || company.name}
                            </span>
                            {company.name_ar && company.name && (
                              <span className="text-xs text-muted-foreground">
                                {company.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {company.subscription_status && (
                            <Badge 
                              variant={company.subscription_status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {company.subscription_status === 'active' ? 'نشطة' : 'غير نشطة'}
                            </Badge>
                          )}
                          <Check
                            className={cn(
                              "h-4 w-4",
                              browsedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};