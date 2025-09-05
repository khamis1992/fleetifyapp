import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  DollarSign, 
  User, 
  FileText,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileContractsSearchProps {
  onSearch: (query: string) => void;
  onFiltersChange: (filters: any) => void;
  activeFilters: any;
  isVisible: boolean;
  onClose: () => void;
}

export const MobileContractsSearch: React.FC<MobileContractsSearchProps> = ({
  onSearch,
  onFiltersChange,
  activeFilters,
  isVisible,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState(activeFilters || {});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...selectedFilters };
    if (value === null || value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setSelectedFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    setSearchQuery('');
    onFiltersChange({});
    onSearch('');
  };

  const activeFilterCount = Object.keys(selectedFilters).length;

  const statusOptions = [
    { value: 'active', label: 'نشط', color: 'bg-green-100 text-green-800' },
    { value: 'suspended', label: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'expired', label: 'منتهي', color: 'bg-red-100 text-red-800' },
    { value: 'draft', label: 'مسودة', color: 'bg-gray-100 text-gray-800' }
  ];

  const contractTypes = [
    { value: 'monthly', label: 'شهري' },
    { value: 'yearly', label: 'سنوي' },
    { value: 'quarterly', label: 'ربع سنوي' },
    { value: 'custom', label: 'مخصص' }
  ];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-lg"
    >
      <div className="p-4 space-y-4">
        {/* Search Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="البحث في العقود..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 flex-wrap"
          >
            <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
            {Object.entries(selectedFilters).map(([key, value]) => (
              <Badge
                key={key}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <span className="text-xs">
                  {key === 'status' ? 'الحالة' : 
                   key === 'type' ? 'النوع' : 
                   key === 'customer' ? 'العميل' : key}: {String(value)}
                </span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange(key, null)}
                />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-6"
            >
              مسح الكل
            </Button>
          </motion.div>
        )}

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            فلاتر متقدمة
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              showAdvancedFilters && "rotate-180"
            )} />
          </Button>
          <span className="text-xs text-muted-foreground">
            {activeFilterCount} فلتر نشط
          </span>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-2"
            >
              <Separator />
              
              {/* Status Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">حالة العقد</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <Badge
                      key={status.value}
                      variant={selectedFilters.status === status.value ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedFilters.status === status.value 
                          ? status.color 
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => 
                        handleFilterChange(
                          'status', 
                          selectedFilters.status === status.value ? null : status.value
                        )
                      }
                    >
                      {status.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Contract Type Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">نوع العقد</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contractTypes.map((type) => (
                    <Badge
                      key={type.value}
                      variant={selectedFilters.type === type.value ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:bg-gray-100"
                      onClick={() => 
                        handleFilterChange(
                          'type', 
                          selectedFilters.type === type.value ? null : type.value
                        )
                      }
                    >
                      {type.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">من تاريخ</label>
                  <Input
                    type="date"
                    value={selectedFilters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={selectedFilters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">المبلغ من</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={selectedFilters.minAmount || ''}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">المبلغ إلى</label>
                  <Input
                    type="number"
                    placeholder="بدون حد أقصى"
                    value={selectedFilters.maxAmount || ''}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};